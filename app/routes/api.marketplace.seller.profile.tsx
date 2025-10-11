import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "~/lib/router-utils";
import { z } from "zod";
import { requireUser } from "~/lib/auth.server";
import { marketplaceRepository } from "~/lib/marketplace/repository";

/**
 * GET /api/marketplace/seller/profile
 * 
 * Get current user's seller profile
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const repo = new marketplaceRepository();

  try {
    const seller = await repo.getSellerByUserId(user.userId);
    
    if (!seller) {
      return json({ error: "Seller profile not found" }, { status: 404 });
    }

    return json({ seller });
  } catch (error) {
    console.error("Error fetching seller profile:", error);
    return json(
      { error: "Failed to fetch seller profile" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/marketplace/seller/profile
 * 
 * Update seller profile
 */
const UpdateSellerSchema = z.object({
  displayName: z.string().min(2).max(100).optional(),
  biography: z.string().max(2000).optional(),
  avatarUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  socialLinks: z.record(z.string().url()).optional(),
  payoutEmail: z.string().email().optional(),
  payoutDetails: z.record(z.any()).optional(),
});

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);
  const repo = new marketplaceRepository();

  try {
    if (request.method === "PATCH") {
      const body = await request.json();
      const data = UpdateSellerSchema.parse(body);

      // Get current seller profile
      const seller = await repo.getSellerByUserId(user.userId);
      
      if (!seller) {
        return json({ error: "Seller profile not found" }, { status: 404 });
      }

      // Update seller profile
      const updated = await repo.updateSeller(seller.id, {
        display_name: data.displayName,
        biography: data.biography,
        avatar_url: data.avatarUrl,
        website_url: data.websiteUrl,
        social_links: data.socialLinks,
        payout_email: data.payoutEmail,
        payout_details: data.payoutDetails,
      });

      return json({ seller: updated });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    
    console.error("Error updating seller profile:", error);
    return json(
      { error: "Failed to update seller profile" },
      { status: 500 }
    );
  }
}