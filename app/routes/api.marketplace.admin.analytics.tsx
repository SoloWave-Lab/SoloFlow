import { json, type LoaderFunctionArgs } from "~/lib/router-utils";
import { requireUser } from "~/lib/auth.server";
import { marketplaceRepository } from "~/lib/marketplace/repository";

// Placeholder for admin check - implement proper RBAC
async function requireAdmin(request: Request) {
  const user = await requireUser(request);
  if ((user as any)?.email !== "youhaveme064@gmail.com") {
    throw new Response("Forbidden", { status: 403 });
  }
  return user;
}

/**
 * GET /api/marketplace/admin/analytics
 * 
 * Get platform-wide analytics for admins
 * Query params:
 * - period: 'day' | 'week' | 'month' | 'year' | 'all' (default: 'month')
 */
export async function loader({ request }: LoaderFunctionArgs) {
  await requireAdmin(request);
  
  const url = new URL(request.url);
  const period = url.searchParams.get("period") || "month";

  const repo = new marketplaceRepository();

  try {
    // Calculate date range based on period
    let startDate: Date | undefined;
    const endDate = new Date();

    switch (period) {
      case "day":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 1);
        break;
      case "week":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "month":
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "year":
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case "all":
        startDate = undefined;
        break;
      default:
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
    }

    // Get platform-wide statistics
    const stats = await repo.getPlatformAnalytics(startDate, endDate);

    // Get moderation queue stats
    const moderationStats = await repo.getModerationQueueStats();

    // Get top sellers
    const topSellers = await repo.getTopSellers(10, startDate, endDate);

    // Get top listings
    const topListings = await repo.getTopListings(10, startDate, endDate);

    // Get category breakdown
    const categoryStats = await repo.getCategoryStats(startDate, endDate);

    return json({
      period,
      dateRange: {
        start: startDate?.toISOString(),
        end: endDate.toISOString(),
      },
      stats,
      moderationStats,
      topSellers,
      topListings,
      categoryStats,
    });
  } catch (error) {
    console.error("Error fetching admin analytics:", error);
    return json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}