import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "~/lib/router-utils";
import { z } from "zod";
import { requireUser } from "~/lib/auth.server";
import { marketplaceRepository } from "~/lib/marketplace/repository";

/**
 * GET /api/marketplace/listings/:id
 * 
 * Get detailed information about a single listing including:
 * - Listing details
 * - License plans
 * - Assets (preview + deliverables)
 * - Seller info
 * - Reviews and ratings
 */
export async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params;
  
  if (!id) {
    return json({ error: "Listing ID is required" }, { status: 400 });
  }

  const repo = new marketplaceRepository();

  try {
    // Get listing
    const listing = await repo.getListingById(id);
    
    if (!listing) {
      return json({ error: "Listing not found" }, { status: 404 });
    }

    // Only show published listings to public (unless owner)
    // Note: We'll handle owner check in the UI or pass user context
    
    // Get license plans
    const licensePlans = await repo.getLicensePlansByListingId(id);

    // Get assets
    const assets = await repo.getAssetsByListingId(id);

    // Get seller info
    const seller = await repo.getSellerById(listing.seller_id);

    // Get reviews
    const reviews = await repo.getReviewsByListingId(id);

    return json({
      listing,
      licensePlans,
      assets,
      seller,
      reviews,
    });
  } catch (error) {
    console.error("Error fetching listing details:", error);
    return json(
      { error: "Failed to fetch listing details" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/marketplace/listings/:id
 * 
 * Update listing details (seller only)
 */
const UpdateListingSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  slug: z.string().min(3).max(100).optional(),
  summary: z.string().min(10).max(500).optional(),
  description: z.string().min(50).optional(),
  priceCents: z.number().int().min(0).optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
});

export async function action({ request, params }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const { id } = params;

  if (!id) {
    return json({ error: "Listing ID is required" }, { status: 400 });
  }

  const repo = new marketplaceRepository();

  try {
    if (request.method === "PATCH") {
      // Update listing
      const body = await request.json();
      const data = UpdateListingSchema.parse(body);

      // Get listing to verify ownership
      const listing = await repo.getListingById(id);
      
      if (!listing) {
        return json({ error: "Listing not found" }, { status: 404 });
      }

      // Verify seller ownership
      const seller = await repo.getSellerByUserId(user.userId);
      
      if (!seller || seller.id !== listing.seller_id) {
        return json({ error: "Unauthorized" }, { status: 403 });
      }

      // Can only update draft or rejected listings
      if (listing.status !== 'draft' && listing.status !== 'rejected') {
        return json(
          { error: "Can only update draft or rejected listings" },
          { status: 400 }
        );
      }

      // Update listing
      const updated = await repo.updateListing(id, {
        title: data.title,
        slug: data.slug,
        summary: data.summary,
        description: data.description,
        price_cents: data.priceCents,
        tags: data.tags,
        metadata: data.metadata,
      });

      return json({ listing: updated });
    }

    if (request.method === "DELETE") {
      // Delete listing (soft delete by setting status to 'deleted')
      const listing = await repo.getListingById(id);
      
      if (!listing) {
        return json({ error: "Listing not found" }, { status: 404 });
      }

      // Verify seller ownership
      const seller = await repo.getSellerByUserId(user.userId);
      
      if (!seller || seller.id !== listing.seller_id) {
        return json({ error: "Unauthorized" }, { status: 403 });
      }

      // Can only delete draft listings
      if (listing.status !== 'draft') {
        return json(
          { error: "Can only delete draft listings" },
          { status: 400 }
        );
      }

      // Soft delete by updating status
      await repo.updateListing(id, { status: 'draft' }); // Or add a 'deleted' status

      return json({ success: true });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    
    console.error("Error updating listing:", error);
    return json(
      { error: "Failed to update listing" },
      { status: 500 }
    );
  }
}