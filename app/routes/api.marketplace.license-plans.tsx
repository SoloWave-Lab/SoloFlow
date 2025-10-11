import { json, type ActionFunctionArgs } from "~/lib/router-utils";
import { z } from "zod";
import { requireUser } from "~/lib/auth.server";
import { marketplaceRepository } from "~/lib/marketplace/repository";

/**
 * POST /api/marketplace/license-plans
 * 
 * Create a new license plan for a listing
 */
const CreateLicensePlanSchema = z.object({
  listingId: z.string().uuid(),
  name: z.string().min(3).max(100),
  priceCents: z.number().int().min(0),
  licenseTerms: z.string().min(10),
  features: z.array(z.string()).optional(),
  maxDownloads: z.number().int().min(1).optional(),
  expiryDays: z.number().int().min(1).optional(),
});

/**
 * PATCH /api/marketplace/license-plans
 * 
 * Update an existing license plan
 */
const UpdateLicensePlanSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3).max(100).optional(),
  priceCents: z.number().int().min(0).optional(),
  licenseTerms: z.string().min(10).optional(),
  features: z.array(z.string()).optional(),
  maxDownloads: z.number().int().min(1).optional(),
  expiryDays: z.number().int().min(1).optional(),
});

/**
 * DELETE /api/marketplace/license-plans
 * 
 * Delete a license plan
 */
const DeleteLicensePlanSchema = z.object({
  id: z.string().uuid(),
});

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const repo = new marketplaceRepository();

  try {
    if (request.method === "POST") {
      // Create license plan
      const body = await request.json();
      const data = CreateLicensePlanSchema.parse(body);

      // Verify listing exists and user owns it
      const listing = await repo.getListingById(data.listingId);
      
      if (!listing) {
        return json({ error: "Listing not found" }, { status: 404 });
      }

      const seller = await repo.getSellerByUserId(user.userId);
      
      if (!seller || seller.id !== listing.seller_id) {
        return json({ error: "Unauthorized" }, { status: 403 });
      }

      // Can only add plans to draft or rejected listings
      if (listing.status !== 'draft' && listing.status !== 'rejected') {
        return json(
          { error: "Can only add plans to draft or rejected listings" },
          { status: 400 }
        );
      }

      // Create license plan
      const plan = await repo.createLicensePlan({
        listing_id: data.listingId,
        name: data.name,
        price_cents: data.priceCents,
        license_terms: data.licenseTerms,
        features: data.features || [],
        max_downloads: data.maxDownloads,
        expiry_days: data.expiryDays,
      });

      return json({ plan });
    }

    if (request.method === "PATCH") {
      // Update license plan
      const body = await request.json();
      const data = UpdateLicensePlanSchema.parse(body);

      // Get plan and verify ownership
      const plan = await repo.getLicensePlanById(data.id);
      
      if (!plan) {
        return json({ error: "License plan not found" }, { status: 404 });
      }

      const listing = await repo.getListingById(plan.listing_id);
      const seller = await repo.getSellerByUserId(user.userId);
      
      if (!seller || !listing || seller.id !== listing.seller_id) {
        return json({ error: "Unauthorized" }, { status: 403 });
      }

      // Can only update plans for draft or rejected listings
      if (listing.status !== 'draft' && listing.status !== 'rejected') {
        return json(
          { error: "Can only update plans for draft or rejected listings" },
          { status: 400 }
        );
      }

      // Update plan
      const updated = await repo.updateLicensePlan(data.id, {
        name: data.name,
        price_cents: data.priceCents,
        license_terms: data.licenseTerms,
        features: data.features,
        max_downloads: data.maxDownloads,
        expiry_days: data.expiryDays,
      });

      return json({ plan: updated });
    }

    if (request.method === "DELETE") {
      // Delete license plan
      const body = await request.json();
      const data = DeleteLicensePlanSchema.parse(body);

      // Get plan and verify ownership
      const plan = await repo.getLicensePlanById(data.id);
      
      if (!plan) {
        return json({ error: "License plan not found" }, { status: 404 });
      }

      const listing = await repo.getListingById(plan.listing_id);
      const seller = await repo.getSellerByUserId(user.userId);
      
      if (!seller || !listing || seller.id !== listing.seller_id) {
        return json({ error: "Unauthorized" }, { status: 403 });
      }

      // Can only delete plans for draft or rejected listings
      if (listing.status !== 'draft' && listing.status !== 'rejected') {
        return json(
          { error: "Can only delete plans for draft or rejected listings" },
          { status: 400 }
        );
      }

      // Check if plan has been purchased
      const purchases = await repo.getPurchasesByLicensePlanId(data.id);
      
      if (purchases.length > 0) {
        return json(
          { error: "Cannot delete plan that has been purchased" },
          { status: 400 }
        );
      }

      // Delete plan
      await repo.deleteLicensePlan(data.id);

      return json({ success: true });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    
    console.error("Error managing license plan:", error);
    return json(
      { error: "Failed to manage license plan" },
      { status: 500 }
    );
  }
}