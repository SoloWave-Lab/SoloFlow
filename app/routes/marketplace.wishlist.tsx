import { Suspense } from 'react';
import { json, type LoaderFunctionArgs } from '~/lib/router-utils';
import { useLoaderData, useFetcher } from 'react-router';
import { MarketplaceLayout } from '~/components/marketplace/MarketplaceLayout';
import { ListingCard } from '~/components/marketplace/ListingCard';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Heart, ShoppingCart, Loader2 } from 'lucide-react';
import { marketplaceApi } from '~/lib/marketplace/api-client';
import { requireMarketplaceAuth } from '~/lib/marketplace/auth-helpers';
import { MarketplaceErrorBoundary } from '~/components/marketplace/ErrorBoundary';

// Mock data retained for fallback usage when the API request fails
const MOCK_WISHLIST_ITEMS = [
  {
    id: '1',
    listing: {
      id: 'l1',
      title: 'Professional Video Transition Pack',
      description: 'A comprehensive collection of 50+ professional video transitions',
      priceCents: 2999,
      thumbnailUrl: '/placeholder-listing.jpg',
      seller: {
        id: 's1',
        displayName: 'Creative Studio',
        avatarUrl: '/placeholder-avatar.jpg',
        badges: [{ badgeType: 'verified' }],
      },
      category: {
        name: 'Transitions',
      },
      stats: {
        viewCount: 1234,
        salesCount: 45,
        averageRating: 4.8,
        reviewCount: 23,
      },
      tags: ['transitions', 'video', 'professional'],
      isFeatured: true,
    },
    addedAt: '2024-01-20T10:30:00Z',
    isPurchased: false,
  },
  {
    id: '2',
    listing: {
      id: 'l2',
      title: 'Cinematic Color Grading LUTs',
      description: 'Professional color grading presets for cinematic look',
      priceCents: 4999,
      thumbnailUrl: '/placeholder-listing.jpg',
      seller: {
        id: 's2',
        displayName: 'Color Master',
        avatarUrl: '/placeholder-avatar.jpg',
        badges: [{ badgeType: 'top_seller' }],
      },
      category: {
        name: 'Color Grading',
      },
      stats: {
        viewCount: 2341,
        salesCount: 89,
        averageRating: 4.9,
        reviewCount: 45,
      },
      tags: ['luts', 'color', 'cinematic'],
      isTrending: true,
    },
    addedAt: '2024-01-18T14:20:00Z',
    isPurchased: false,
  },
  {
    id: '3',
    listing: {
      id: 'l3',
      title: 'Motion Graphics Template Bundle',
      description: 'Complete bundle of motion graphics templates',
      priceCents: 7999,
      thumbnailUrl: '/placeholder-listing.jpg',
      seller: {
        id: 's3',
        displayName: 'Motion Pro',
        avatarUrl: '/placeholder-avatar.jpg',
        badges: [],
      },
      category: {
        name: 'Motion Graphics',
      },
      stats: {
        viewCount: 987,
        salesCount: 34,
        averageRating: 4.7,
        reviewCount: 18,
      },
      tags: ['motion', 'graphics', 'templates'],
    },
    addedAt: '2024-01-15T09:15:00Z',
    isPurchased: true,
  },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireMarketplaceAuth(request);

  try {
    // Fetch wishlist items from API
    const wishlistResponse = await marketplaceApi.wishlist.list();
    
    return json({
      wishlistItems: wishlistResponse.data || [],
      user,
    });
  } catch (error) {
    console.error('Failed to load wishlist:', error);
    throw new Response('Failed to load wishlist', { status: 500 });
  }

  // Fallback to mocks until the API stabilizes
  return json({
    wishlistItems: MOCK_WISHLIST_ITEMS,
    user,
  });
}

function WishlistContent() {
  const { wishlistItems } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const handleRemoveFromWishlist = (listingId: string) => {
    fetcher.submit(
      { intent: 'remove', listingId },
      { method: 'post', action: '/api/marketplace/wishlist' }
    );
  };

  const handleAddToCart = (listingId: string) => {
    fetcher.submit(
      { intent: 'add', listingId },
      { method: 'post', action: '/api/marketplace/cart' }
    );
  };

  return (
    <MarketplaceLayout>
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">My Wishlist</h1>
          </div>
          <p className="text-muted-foreground">
            {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} saved
          </p>
        </div>

        {/* Wishlist Items */}
        {wishlistItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Your wishlist is empty</h2>
              <p className="text-muted-foreground mb-6">
                Save items you're interested in to your wishlist
              </p>
              <Button asChild>
                <a href="/marketplace/browse">Browse Marketplace</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wishlistItems.map((item) => (
              <div key={item.id} className="relative">
                <ListingCard
                  listing={item.listing}
                  onAddToWishlist={() => handleRemoveFromWishlist(item.listing.id)}
                  onAddToCart={() => handleAddToCart(item.listing.id)}
                  isInWishlist={true}
                />

                {item.isPurchased && (
                  <div className="absolute top-4 right-4 z-10">
                    <div className="bg-green-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Purchased
                    </div>
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  {!item.isPurchased && (
                    <Button
                      className="flex-1"
                      onClick={() => handleAddToCart(item.listing.id)}
                      disabled={fetcher.state === 'submitting'}
                    >
                      {fetcher.state === 'submitting' ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Add to Cart
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className={item.isPurchased ? 'flex-1' : ''}
                    onClick={() => handleRemoveFromWishlist(item.listing.id)}
                    disabled={fetcher.state === 'submitting'}
                  >
                    {fetcher.state === 'submitting' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Removing...
                      </>
                    ) : (
                      'Remove'
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        {wishlistItems.length > 0 && (
          <div className="mt-8 flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => {
                wishlistItems
                  .filter((item) => !item.isPurchased)
                  .forEach((item) => handleAddToCart(item.listing.id));
              }}
              disabled={fetcher.state === 'submitting'}
            >
              {fetcher.state === 'submitting' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Add All to Cart
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </MarketplaceLayout>
  );
}

// Loading skeleton component
function WishlistSkeleton() {
  return (
    <MarketplaceLayout>
      <div className="container mx-auto py-8 px-4">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-8 w-8 bg-muted animate-pulse rounded" />
            <div className="h-8 bg-muted animate-pulse rounded w-48" />
          </div>
          <div className="h-4 bg-muted animate-pulse rounded w-32" />
        </div>

        {/* Wishlist Items Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="space-y-3">
              <Card>
                <CardContent className="p-0">
                  <div className="aspect-video bg-muted animate-pulse" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 bg-muted animate-pulse rounded w-3/4" />
                    <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                    <div className="h-6 bg-muted animate-pulse rounded w-20" />
                  </div>
                </CardContent>
              </Card>
              <div className="flex gap-2">
                <div className="h-10 bg-muted animate-pulse rounded flex-1" />
                <div className="h-10 bg-muted animate-pulse rounded w-24" />
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions Skeleton */}
        <div className="mt-8 flex justify-center gap-4">
          <div className="h-10 bg-muted animate-pulse rounded w-40" />
        </div>
      </div>
    </MarketplaceLayout>
  );
}

// Default export with Suspense wrapper
export default function Wishlist() {
  return (
    <Suspense fallback={<WishlistSkeleton />}>
      <WishlistContent />
    </Suspense>
  );
}

export const ErrorBoundary = MarketplaceErrorBoundary;