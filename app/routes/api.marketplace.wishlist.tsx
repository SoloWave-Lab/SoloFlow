import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "~/lib/router-utils";
import { z } from "zod";
import { requireUser } from "~/lib/auth.server";
import { db } from "~/lib/db.server";

/**
 * GET /api/marketplace/wishlist
 * 
 * Get user's wishlist/favorites
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);

  try {
    const { rows } = await db.query(
      `SELECT 
         l.*,
         s.display_name as seller_name,
         s.avatar_url as seller_avatar,
         w.created_at as added_at
       FROM marketplace_wishlist w
       JOIN marketplace_listings l ON l.id = w.listing_id
       JOIN marketplace_sellers s ON s.id = l.seller_id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC`,
      [user.userId]
    );

    return json({ wishlist: rows });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    return json(
      { error: "Failed to fetch wishlist" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/marketplace/wishlist
 * 
 * Add listing to wishlist
 */
const AddToWishlistSchema = z.object({
  listingId: z.string().uuid(),
});

/**
 * DELETE /api/marketplace/wishlist
 * 
 * Remove listing from wishlist
 */
const RemoveFromWishlistSchema = z.object({
  listingId: z.string().uuid(),
});

export async function action({ request }: ActionFunctionArgs) {
  const user = await requireUser(request);

  try {
    if (request.method === "POST") {
      const body = await request.json();
      const data = AddToWishlistSchema.parse(body);

      // Check if already in wishlist
      const { rows: existing } = await db.query(
        `SELECT id FROM marketplace_wishlist WHERE user_id = $1 AND listing_id = $2`,
        [user.userId, data.listingId]
      );

      if (existing.length > 0) {
        return json({ message: "Already in wishlist" });
      }

      // Add to wishlist
      await db.query(
        `INSERT INTO marketplace_wishlist (id, user_id, listing_id)
         VALUES ($1, $2, $3)`,
        [crypto.randomUUID(), user.userId, data.listingId]
      );

      return json({ success: true });
    }

    if (request.method === "DELETE") {
      const body = await request.json();
      const data = RemoveFromWishlistSchema.parse(body);

      // Remove from wishlist
      await db.query(
        `DELETE FROM marketplace_wishlist WHERE user_id = $1 AND listing_id = $2`,
        [user.userId, data.listingId]
      );

      return json({ success: true });
    }

    return json({ error: "Method not allowed" }, { status: 405 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    
    console.error("Error managing wishlist:", error);
    return json(
      { error: "Failed to manage wishlist" },
      { status: 500 }
    );
  }
}