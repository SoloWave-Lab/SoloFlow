import { json, type ActionFunctionArgs } from '~/lib/router-utils';
import { requireUser } from "~/lib/auth.server";
import { z } from "zod";
import { marketplaceRepository } from "../lib/marketplace/repository";
import { createRazorpayOrder } from "../lib/marketplace/payment";

const createOrderSchema = z.object({
  listingId: z.string().uuid(),
  licensePlanId: z.string().uuid(),
});

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const body = await request.json();
  const parsed = createOrderSchema.safeParse(body);

  if (!parsed.success) {
    return json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  const listing = await marketplaceRepository.getListingById(parsed.data.listingId);
  if (!listing || listing.status !== "published") {
    return json({ error: "Listing not available" }, { status: 404 });
  }

  const licensePlans = await marketplaceRepository.listLicensePlans(listing.id);
  const plan = licensePlans.find((lp) => lp.id === parsed.data.licensePlanId);
  if (!plan) {
    return json({ error: "License plan not found" }, { status: 404 });
  }

  const subtotalCents = plan.price_cents;
  const totalCents = subtotalCents; // extend later with taxes/fees

  const order = await marketplaceRepository.createOrder({
    buyerId: user.userId,
    listingId: listing.id,
    licensePlanId: plan.id,
    subtotalCents,
    totalCents,
  });

  try {
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

    return json({ order, razorpay: razorpayOrder }, { status: 201 });
  } catch (error) {
    await marketplaceRepository.updateOrderStatus({ orderId: order.id, status: "failed" });
    console.error("Razorpay order creation failed", error);
    return json({ error: "Failed to initiate payment" }, { status: 500 });
  }
}