import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '~/lib/router-utils';
import { requireUser } from "~/lib/auth.server";
import { z } from "zod";
import { marketplaceRepository } from "../lib/marketplace/repository";

const createDisputeSchema = z.object({
  purchaseId: z.string().uuid(),
  reason: z.string().min(10).max(200),
  description: z.string().max(2000).optional(),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);

  // Get disputes where user is buyer
  const purchases = await marketplaceRepository.getPurchasesForBuyer(user.userId);
  const purchaseIds = purchases.map((p) => p.id);

  // TODO: Add repository method to get disputes by buyer
  // For now return empty array
  return json({ disputes: [] });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const body = await request.json();
  const parsed = createDisputeSchema.safeParse(body);

  if (!parsed.success) {
    return json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  // Verify purchase exists and belongs to user
  const purchase = await marketplaceRepository.getPurchaseByOrderId(parsed.data.purchaseId);
  if (!purchase || purchase.buyer_id !== user.userId) {
    return json({ error: "Purchase not found or unauthorized" }, { status: 404 });
  }

  // Get seller info
  const listing = await marketplaceRepository.getListingById(purchase.listing_id);
  if (!listing) {
    return json({ error: "Listing not found" }, { status: 404 });
  }

  try {
    const dispute = await marketplaceRepository.createDispute({
      purchaseId: purchase.id,
      buyerId: user.userId,
      sellerId: listing.seller_id,
      reason: parsed.data.reason,
      description: parsed.data.description,
    });

    return json({ dispute }, { status: 201 });
  } catch (error) {
    console.error("Dispute creation failed", error);
    return json({ error: "Failed to create dispute" }, { status: 500 });
  }
}