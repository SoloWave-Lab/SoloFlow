import { json, type LoaderFunctionArgs } from "~/lib/router-utils";
import { marketplaceRepository } from "~/lib/marketplace/repository";

/**
 * GET /api/marketplace/featured
 * Get featured and trending listings
 * 
 * Query params:
 * - section: "featured" | "trending" | "new" | "top_rated" - Section to fetch
 * - limit: number - Max items to return (default: 10)
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const section = url.searchParams.get("section") || "featured";
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 50);

  try {
    let listings;

    switch (section) {
      case "featured":
        // Get manually featured listings
        listings = await marketplaceRepository.getFeaturedListings(limit);
        break;

      case "trending":
        // Get listings with most sales in last 7 days
        listings = await marketplaceRepository.getTrendingListings({
          limit,
          days: 7,
        });
        break;

      case "new":
        // Get recently published listings
        listings = await marketplaceRepository.getNewListings(limit);
        break;

      case "top_rated":
        // Get highest rated listings
        listings = await marketplaceRepository.getTopRatedListings({
          limit,
          minReviews: 5, // Require at least 5 reviews
        });
        break;

      default:
        return json({ error: "Invalid section" }, { status: 400 });
    }

    return json({
      section,
      listings,
      count: listings.length,
    });
  } catch (error) {
    console.error("Failed to fetch featured listings:", error);
    return json({ error: "Failed to fetch listings" }, { status: 500 });
  }
}