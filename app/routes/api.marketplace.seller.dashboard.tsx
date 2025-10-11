import { json, type LoaderFunctionArgs } from "~/lib/router-utils";
import { requireUser } from "~/lib/auth.server";
import { marketplaceRepository } from "~/lib/marketplace/repository";

/**
 * GET /api/marketplace/seller/dashboard
 * 
 * Get seller's dashboard overview including:
 * - Seller profile
 * - All listings (draft, pending, published, rejected)
 * - Recent orders
 * - Quick stats
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const repo = new marketplaceRepository();

  try {
    // Get seller profile
    const seller = await repo.getSellerByUserId(user.userId);
    
    if (!seller) {
      return json({ error: "Seller profile not found" }, { status: 404 });
    }

    // Get all listings for this seller
    const listings = await repo.getListingsBySellerId(seller.id);

    // Get recent orders (last 10)
    const recentOrders = await repo.getOrdersBySellerId(seller.id, 10);

    // Calculate quick stats
    const stats = {
      totalListings: listings.length,
      draftListings: listings.filter(l => l.status === 'draft').length,
      pendingListings: listings.filter(l => l.status === 'pending_review').length,
      publishedListings: listings.filter(l => l.status === 'published').length,
      rejectedListings: listings.filter(l => l.status === 'rejected').length,
      totalOrders: recentOrders.length,
      totalRevenue: recentOrders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + o.total_amount_cents, 0),
    };

    return json({
      seller,
      listings,
      recentOrders,
      stats,
    });
  } catch (error) {
    console.error("Error fetching seller dashboard:", error);
    return json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}