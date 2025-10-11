import { json, type LoaderFunctionArgs } from "~/lib/router-utils";
import { requireUser } from "~/lib/auth.server";
import { marketplaceRepository } from "~/lib/marketplace/repository";

/**
 * GET /api/marketplace/buyer/orders
 * 
 * Get buyer's order history
 * Query params:
 * - status: Filter by order status
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 20)
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);
  const repo = new marketplaceRepository();

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);

    // Get orders for this buyer
    const orders = await repo.getOrdersByBuyerId(user.userId, limit, status as any);

    // Get order details including listing and seller info
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const listing = await repo.getListingById(order.listing_id);
        const seller = listing ? await repo.getSellerById(listing.seller_id) : null;
        const licensePlan = order.license_plan_id
          ? await repo.getLicensePlanById(order.license_plan_id)
          : null;
        
        // Get purchase if order is completed
        let purchase = null;
        if (order.status === 'completed') {
          const purchases = await repo.getPurchasesByOrderId(order.id);
          purchase = purchases[0] || null;
        }

        // Get transactions
        const transactions = await repo.getTransactionsByOrderId(order.id);

        return {
          ...order,
          listing: listing ? {
            id: listing.id,
            title: listing.title,
            slug: listing.slug,
            thumbnail_url: listing.thumbnail_url,
          } : null,
          seller: seller ? {
            id: seller.id,
            display_name: seller.display_name,
            avatar_url: seller.avatar_url,
          } : null,
          licensePlan: licensePlan ? {
            id: licensePlan.id,
            name: licensePlan.name,
            price_cents: licensePlan.price_cents,
          } : null,
          purchase,
          transactions,
        };
      })
    );

    // Calculate summary stats
    const stats = {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      completed: orders.filter(o => o.status === 'completed').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      totalSpent: orders
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
    console.error("Error fetching buyer orders:", error);
    return json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}