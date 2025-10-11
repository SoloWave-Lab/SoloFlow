import { json, type LoaderFunctionArgs } from '~/lib/router-utils';
import { requireUser } from "~/lib/auth.server";
import { marketplaceRepository } from "../lib/marketplace/repository";
import { db } from "../lib/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request);

  const seller = await marketplaceRepository.getSellerByUserId(user.userId);
  if (!seller) {
    return json({ error: "Seller profile not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const periodParam = url.searchParams.get("period") ?? "month";

  // Calculate period dates
  const now = new Date();
  let periodStart: Date;
  let periodEnd: Date;

  switch (periodParam) {
    case "week":
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      periodEnd = now;
      break;
    case "year":
      periodStart = new Date(now.getFullYear(), 0, 1);
      periodEnd = now;
      break;
    case "month":
    default:
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = now;
      break;
  }

  // Get or compute analytics
  let analytics = await marketplaceRepository.getSellerAnalytics({
    sellerId: seller.id,
    periodStart,
    periodEnd,
  });

  if (!analytics) {
    // Compute analytics from orders
    const { rows } = await db.query<{
      total_sales_cents: string;
      total_orders: string;
    }>(
      `select
         COALESCE(SUM(total_cents), 0) as total_sales_cents,
         COUNT(*) as total_orders
       from marketplace_orders o
       join marketplace_listings l on l.id = o.listing_id
       where l.seller_id = $1
         and o.status = 'paid'
         and o.created_at >= $2
         and o.created_at <= $3`,
      [seller.id, periodStart.toISOString(), periodEnd.toISOString()]
    );

    const stats = rows[0];

    analytics = await marketplaceRepository.upsertSellerAnalytics({
      sellerId: seller.id,
      periodStart,
      periodEnd,
      totalSalesCents: parseInt(stats?.total_sales_cents ?? "0", 10),
      totalOrders: parseInt(stats?.total_orders ?? "0", 10),
      avgRating: seller.avg_rating,
    });
  }

  // Get recent orders
  const { rows: recentOrders } = await db.query(
    `select o.*, l.title as listing_title
     from marketplace_orders o
     join marketplace_listings l on l.id = o.listing_id
     where l.seller_id = $1
     order by o.created_at desc
     limit 10`,
    [seller.id]
  );

  return json({
    analytics,
    recentOrders,
    seller,
  });
}