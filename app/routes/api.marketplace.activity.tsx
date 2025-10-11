import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from "~/lib/router-utils";
import { z } from "zod";
import { requireUser } from "~/lib/auth.server";
import { marketplaceRepository } from "~/lib/marketplace/repository";

/**
 * GET /api/marketplace/activity
 * Get user's marketplace activity history
 * 
 * Query params:
 * - type: "view" | "purchase" | "review" | "wishlist" - Filter by activity type
 * - limit: number - Max items to return (default: 50)
 * - offset: number - Pagination offset (default: 0)
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const url = new URL(request.url);

  const type = url.searchParams.get("type") || undefined;
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0");

  try {
    const activities = await marketplaceRepository.getUserActivity({
      userId: user.userId,
      type,
      limit,
      offset,
    });

    const totalCount = await marketplaceRepository.getUserActivityCount({
      userId: user.userId,
      type,
    });

    return json({
      activities,
      pagination: {
        limit,
        offset,
        totalCount,
        hasMore: offset + activities.length < totalCount,
      },
    });
  } catch (error) {
    console.error("Failed to fetch user activity:", error);
    return json({ error: "Failed to fetch activity" }, { status: 500 });
  }
}

const TrackActivitySchema = z.object({
  type: z.enum(["view", "click", "add_to_cart", "wishlist_add", "wishlist_remove"]),
  listingId: z.string().uuid(),
  metadata: z.record(z.any()).optional(),
});

/**
 * POST /api/marketplace/activity
 * Track user activity (views, clicks, etc.)
 * 
 * Body:
 * - type: string - Activity type
 * - listingId: string - Listing ID
 * - metadata: object - Additional tracking data (referrer, source, etc.)
 */
export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  // Activity tracking can work for both authenticated and anonymous users
  let userId: string | null = null;
  try {
    const user = await requireUser(request);
    userId = user.userId;
  } catch {
    // Anonymous user - we can still track with session ID or skip
    // For now, we'll only track authenticated users
    return json({ success: true, message: "Activity tracking requires authentication" });
  }

  try {
    const body = await request.json();
    const { type, listingId, metadata } = TrackActivitySchema.parse(body);

    // Verify listing exists
    const listing = await marketplaceRepository.getListingById(listingId);
    if (!listing) {
      return json({ error: "Listing not found" }, { status: 404 });
    }

    // Track the activity
    await marketplaceRepository.trackActivity({
      userId,
      listingId,
      type,
      metadata: {
        ...metadata,
        userAgent: request.headers.get("user-agent"),
        referer: request.headers.get("referer"),
        timestamp: new Date().toISOString(),
      },
    });

    return json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Invalid request data", details: error.errors }, { status: 400 });
    }
    console.error("Failed to track activity:", error);
    // Don't fail the request if tracking fails
    return json({ success: true, warning: "Activity tracking failed" });
  }
}