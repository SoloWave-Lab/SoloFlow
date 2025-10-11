import { json, type LoaderFunctionArgs } from "~/lib/router-utils";
import { db } from "~/lib/db.server";

/**
 * GET /api/marketplace/search
 * 
 * Advanced search with filters:
 * - q: Search query (title, description, tags)
 * - category: Category slug
 * - minPrice: Minimum price in cents
 * - maxPrice: Maximum price in cents
 * - rating: Minimum rating (1-5)
 * - sortBy: 'newest' | 'price_low' | 'price_high' | 'popular' | 'rating'
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 20, max: 100)
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  
  const query = url.searchParams.get("q") || "";
  const category = url.searchParams.get("category");
  const minPrice = url.searchParams.get("minPrice");
  const maxPrice = url.searchParams.get("maxPrice");
  const rating = url.searchParams.get("rating");
  const sortBy = url.searchParams.get("sortBy") || "newest";
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
  const offset = (page - 1) * limit;

  try {
    // Build WHERE clause
    const conditions: string[] = ["l.status = 'published'"];
    const params: any[] = [];
    let paramIndex = 1;

    // Search query
    if (query) {
      conditions.push(
        `(
          l.title ILIKE $${paramIndex} OR
          l.description ILIKE $${paramIndex} OR
          l.summary ILIKE $${paramIndex} OR
          EXISTS (
            SELECT 1 FROM unnest(l.tags) tag
            WHERE tag ILIKE $${paramIndex}
          )
        )`
      );
      params.push(`%${query}%`);
      paramIndex++;
    }

    // Category filter
    if (category) {
      conditions.push(`c.slug = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    // Price range
    if (minPrice) {
      conditions.push(`l.price_cents >= $${paramIndex}`);
      params.push(parseInt(minPrice));
      paramIndex++;
    }

    if (maxPrice) {
      conditions.push(`l.price_cents <= $${paramIndex}`);
      params.push(parseInt(maxPrice));
      paramIndex++;
    }

    // Rating filter
    if (rating) {
      conditions.push(`l.avg_rating >= $${paramIndex}`);
      params.push(parseFloat(rating));
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Build ORDER BY clause
    let orderBy = "l.created_at DESC";
    switch (sortBy) {
      case "price_low":
        orderBy = "l.price_cents ASC";
        break;
      case "price_high":
        orderBy = "l.price_cents DESC";
        break;
      case "popular":
        orderBy = "l.total_sales DESC, l.created_at DESC";
        break;
      case "rating":
        orderBy = "l.avg_rating DESC NULLS LAST, l.review_count DESC, l.created_at DESC";
        break;
      case "newest":
      default:
        orderBy = "l.created_at DESC";
    }

    // Get total count
    const { rows: countRows } = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM marketplace_listings l
       JOIN marketplace_categories c ON c.id = l.category_id
       ${whereClause}`,
      params
    );
    const totalCount = parseInt(countRows[0].count);

    // Get listings
    const { rows: listings } = await db.query(
      `SELECT 
         l.*,
         c.name as category_name,
         c.slug as category_slug,
         s.display_name as seller_name,
         s.avatar_url as seller_avatar,
         s.avg_rating as seller_rating,
         (
           SELECT json_agg(json_build_object(
             'id', lp.id,
             'name', lp.name,
             'price_cents', lp.price_cents
           ))
           FROM marketplace_license_plans lp
           WHERE lp.listing_id = l.id
         ) as license_plans,
         (
           SELECT json_agg(json_build_object(
             'id', a.id,
             'asset_type', a.asset_type,
             'file_url', a.file_url,
             'thumbnail_url', a.thumbnail_url
           ))
           FROM marketplace_assets a
           WHERE a.listing_id = l.id AND a.asset_type = 'preview'
         ) as preview_assets
       FROM marketplace_listings l
       JOIN marketplace_categories c ON c.id = l.category_id
       JOIN marketplace_sellers s ON s.id = l.seller_id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    // Build pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return json({
      listings,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      filters: {
        query,
        category,
        minPrice: minPrice ? parseInt(minPrice) : null,
        maxPrice: maxPrice ? parseInt(maxPrice) : null,
        rating: rating ? parseFloat(rating) : null,
        sortBy,
      },
    });
  } catch (error) {
    console.error("Error searching marketplace:", error);
    return json(
      { error: "Failed to search marketplace" },
      { status: 500 }
    );
  }
}