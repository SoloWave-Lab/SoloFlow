import { db } from "../db.server";
import { marketplaceRepository } from "./repository";
import { createRazorpayOrder, verifyRazorpaySignature } from "./payment";
import { requestSignedDownload } from "./storage";
import type { MarketplaceListingRecord, MarketplacePurchaseRecord } from "./db.types";

export async function publishListing(listingId: string): Promise<MarketplaceListingRecord | null> {
  return marketplaceRepository.updateListing({ listingId, status: "pending_review" });
}

export async function approveListing(listingId: string): Promise<MarketplaceListingRecord | null> {
  return marketplaceRepository.updateListing({ listingId, status: "published" });
}

export async function rejectListing(listingId: string, reason: string): Promise<void> {
  await marketplaceRepository.updateListing({
    listingId,
    status: "rejected",
    metadata: { moderation_reason: reason },
  });
}

export async function initiateCheckout(params: {
  buyerId: string;
  listingId: string;
  licensePlanId: string;
}): Promise<{
  orderId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
}> {
  const listing = await marketplaceRepository.getListingById(params.listingId);
  if (!listing || listing.status !== "published") {
    throw new Error("Listing not available for purchase");
  }

  const plans = await marketplaceRepository.listLicensePlans(listing.id);
  const plan = plans.find((p) => p.id === params.licensePlanId);
  if (!plan) {
    throw new Error("License plan not found");
  }

  const subtotalCents = plan.price_cents;
  const totalCents = subtotalCents;

  const order = await marketplaceRepository.createOrder({
    buyerId: params.buyerId,
    listingId: listing.id,
    licensePlanId: plan.id,
    subtotalCents,
    totalCents,
  });

  const razorpayOrder = await createRazorpayOrder({
    amountCents: totalCents,
    currency: listing.currency ?? "INR",
    receipt: order.id,
    notes: {
      listing_id: listing.id,
      license_plan_id: plan.id,
    },
  });

  await marketplaceRepository.updateOrderStatus({
    orderId: order.id,
    status: "payment_required",
    razorpayOrderId: razorpayOrder.id,
  });

  return {
    orderId: order.id,
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
  };
}

export async function finalizePurchase(params: {
  orderId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<MarketplacePurchaseRecord> {
  const order = await marketplaceRepository.getPurchaseByOrderId(params.orderId);
  if (order) {
    return order;
  }

  const signatureOk = verifyRazorpaySignature({
    orderId: params.razorpayOrderId,
    paymentId: params.razorpayPaymentId,
    signature: params.razorpaySignature,
  });

  if (!signatureOk) {
    throw new Error("Invalid Razorpay signature");
  }

  const { rows } = await db.query<{
    order_id: string;
    buyer_id: string;
    listing_id: string;
    license_plan_id: string;
    total_cents: number;
  }>(
    `select id as order_id, buyer_id, listing_id, license_plan_id, total_cents
     from marketplace_orders
     where id = $1`,
    [params.orderId]
  );

  const record = rows[0];
  if (!record) {
    throw new Error("Order not found");
  }

  await marketplaceRepository.recordTransaction({
    orderId: record.order_id,
    razorpayPaymentId: params.razorpayPaymentId,
    razorpaySignature: params.razorpaySignature,
    status: "paid",
    amountCents: record.total_cents,
    paymentMethod: "razorpay",
  });

  await marketplaceRepository.updateOrderStatus({ orderId: record.order_id, status: "paid" });

  return marketplaceRepository.grantPurchase({
    orderId: record.order_id,
    buyerId: record.buyer_id,
    listingId: record.listing_id,
    licensePlanId: record.license_plan_id,
  });
}

export async function generateDownloadLink(params: {
  purchaseId: string;
  assetId: string;
}) {
  const signed = await requestSignedDownload(params.assetId);
  return marketplaceRepository.createDownload({
    purchaseId: params.purchaseId,
    assetId: params.assetId,
    downloadUrl: signed.downloadUrl,
    expiresAt: signed.expiresAt,
  });
}