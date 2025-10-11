import { json, type LoaderFunctionArgs } from "~/lib/router-utils";
import { marketplaceRepository } from "~/lib/marketplace/repository";

/**
 * GET /api/marketplace/sellers/:id
 * 
 * Get public seller profile with their listings
 */
export async function loader({ params }: LoaderFunctionArgs) {
  const { id } = params;
  
  if (!id) {
    return json({ error: "Seller ID is required" }, { status: 400 });
  }

  const repo = new marketplaceRepository();

  try {
    // Get seller profile
    const seller = await repo.getSellerById(id);
    
    if (!seller) {
      return json({ error: "Seller not found" }, { status: 404 });
    }

    // Only show active sellers publicly
    if (seller.status !== 'active') {
      return json({ error: "Seller not found" }, { status: 404 });
    }

    // Get seller's published listings
    const listings = await repo.getListingsBySellerId(id);
    const publishedListings = listings.filter(l => l.status === 'published');

    // Get seller analytics (public stats)
    const stats = {
      totalListings: publishedListings.length,
      avgRating: seller.avg_rating || 0,
      totalSales: seller.total_sales || 0,
      memberSince: seller.created_at,
    };

    // Remove sensitive information
    const publicSeller = {
      id: seller.id,
      display_name: seller.display_name,
      biography: seller.biography,
      avatar_url: seller.avatar_url,
      website_url: seller.website_url,
      social_links: seller.social_links,
      avg_rating: seller.avg_rating,
      total_sales: seller.total_sales,
      created_at: seller.created_at,
    };

    return json({
      seller: publicSeller,
      listings: publishedListings,
      stats,
    });
  } catch (error) {
    console.error("Error fetching seller profile:", error);
    return json(
      { error: "Failed to fetch seller profile" },
      { status: 500 }
    );
  }
}