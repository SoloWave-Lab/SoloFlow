import { json, type LoaderFunctionArgs } from "~/lib/router-utils";
import { requireUser } from "~/lib/auth.server";
import { marketplaceRepository } from "~/lib/marketplace/repository";

/**
 * GET /api/marketplace/seller/orders
 * 
 * Get all orders for seller's listings
 * Query params:
 * - status: Filter by order status
 * - listingId: Filter by specific listing
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 20)
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

    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const listingId = url.searchParams.get("listingId");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);

    // Get orders with filters
    const orders = await repo.getOrdersBySellerId(
      seller.id,
      limit,
      status as any,
      listingId || undefined
    );

    // Get order details including buyer info and listing details
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const listing = await repo.getListingById(order.listing_id);
        const licensePlan = order.license_plan_id
          ? await repo.getLicensePlanById(order.license_plan_id)
          : null;
        
        // Get purchase if order is completed
        let purchase = null;
        if (order.status === 'completed') {
          const purchases = await repo.getPurchasesByOrderId(order.id);
          purchase = purchases[0] || null;
        }

        return {
          ...order,
          listing: {
            id: listing?.id,
            title: listing?.title,
            slug: listing?.slug,
          },
          licensePlan: licensePlan ? {
            id: licensePlan.id,
            name: licensePlan.name,
            price_cents: licensePlan.price_cents,
          } : null,
          purchase,
        };
      })
    );

    // Calculate summary stats
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      completed: orders.filter(o => o.status === 'completed').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      totalRevenue: orders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + o.total_amount_cents, 0),
    };

    return json({
      orders: ordersWithDetails,
      stats,
      pagination: {
        page,
        limit,
        hasMore: orders.length === limit,
      },
    });
  } catch (error) {
    console.error("Error fetching seller orders:", error);
    return json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}