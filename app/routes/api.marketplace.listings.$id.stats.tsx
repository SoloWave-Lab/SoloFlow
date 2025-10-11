import { json, type LoaderFunctionArgs } from "~/lib/router-utils";
import { requireUser } from "~/lib/auth.server";
import { marketplaceRepository } from "~/lib/marketplace/repository";

/**
 * GET /api/marketplace/listings/:id/stats
 * Get detailed statistics for a specific listing
 * 
 * Query params:
 * - period: "7d" | "30d" | "90d" | "all" - Time period for stats (default: "30d")
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const listingId = params.id;

  if (!listingId) {
    return json({ error: "Listing ID is required" }, { status: 400 });
  }

  const url = new URL(request.url);
  const period = url.searchParams.get("period") || "30d";

  try {
    // Get listing
    const listing = await marketplaceRepository.getListingById(listingId);
    if (!listing) {
      return json({ error: "Listing not found" }, { status: 404 });
    }

    // Get seller to verify ownership
    const seller = await marketplaceRepository.getSellerByUserId(user.userId);
    if (!seller || seller.id !== listing.seller_id) {
      return json({ error: "Unauthorized - not the listing owner" }, { status: 403 });
    }

    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();
    switch (period) {
      case "7d":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(endDate.getDate() - 90);
        break;
      case "all":
        startDate = new Date(listing.created_at);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Get comprehensive stats
    const stats = await marketplaceRepository.getListingStats({
      listingId,
      startDate,
      endDate,
    });

    // Get views over time (daily breakdown)
    const viewsTimeseries = await marketplaceRepository.getListingViewsTimeseries({
      listingId,
      startDate,
      endDate,
    });

    // Get sales over time (daily breakdown)
    const salesTimeseries = await marketplaceRepository.getListingSalesTimeseries({
      listingId,
      startDate,
      endDate,
    });

    // Get top referrers
    const topReferrers = await marketplaceRepository.getListingTopReferrers({
      listingId,
      startDate,
      endDate,
      limit: 10,
    });

    // Get conversion funnel
    const conversionFunnel = await marketplaceRepository.getListingConversionFunnel({
      listingId,
      startDate,
      endDate,
    });

    return json({
      listing: {
        id: listing.id,
        title: listing.title,
        status: listing.status,
      },
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        label: period,
      },
      stats,
      timeseries: {
        views: viewsTimeseries,
        sales: salesTimeseries,
      },
      topReferrers,
      conversionFunnel,
    });
  } catch (error) {
    console.error("Failed to fetch listing stats:", error);
    return json({ error: "Failed to fetch listing statistics" }, { status: 500 });
  }
}