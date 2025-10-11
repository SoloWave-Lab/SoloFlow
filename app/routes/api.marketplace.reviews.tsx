import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '~/lib/router-utils';
import { requireUser } from "~/lib/auth.server";
import { z } from "zod";
import { marketplaceRepository } from "../lib/marketplace/repository";

const createReviewSchema = z.object({
  purchaseId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(100).optional(),
  comment: z.string().max(1000).optional(),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const listingId = url.searchParams.get("listingId");

  if (!listingId) {
    return json({ error: "Listing ID required" }, { status: 400 });
  }

  const reviews = await marketplaceRepository.listReviewsForListing(listingId);

  return json({ reviews });
}

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const body = await request.json();
  const parsed = createReviewSchema.safeParse(body);

  if (!parsed.success) {
    return json({ errors: parsed.error.flatten() }, { status: 400 });
  }

  // Verify purchase exists and belongs to user
  const purchase = await marketplaceRepository.getPurchaseByOrderId(parsed.data.purchaseId);
  if (!purchase || purchase.buyer_id !== user.userId) {
    return json({ error: "Purchase not found or unauthorized" }, { status: 404 });
  }

  // Check if review already exists for this purchase
  const existingReviews = await marketplaceRepository.listReviewsForListing(purchase.listing_id);
  const alreadyReviewed = existingReviews.some((r) => r.purchase_id === parsed.data.purchaseId);

  if (alreadyReviewed) {
    return json({ error: "Review already submitted for this purchase" }, { status: 409 });
  }

  try {
    const review = await marketplaceRepository.createReview({
      listingId: purchase.listing_id,
      buyerId: user.userId,
      purchaseId: parsed.data.purchaseId,
      rating: parsed.data.rating,
      title: parsed.data.title,
      comment: parsed.data.comment,
    });

    return json({ review }, { status: 201 });
  } catch (error) {
    console.error("Review creation failed", error);
    return json({ error: "Failed to create review" }, { status: 500 });
  }
}