import React, { useState, Suspense } from 'react';
import { json, type LoaderFunctionArgs } from '~/lib/router-utils';
import { useLoaderData, Link, useFetcher } from '~/lib/router-utils';
import { MarketplaceLayout } from '~/components/marketplace/MarketplaceLayout';
import { ListingCard } from '~/components/marketplace/ListingCard';
import { ThumbnailImage } from '~/components/marketplace/OptimizedImage';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Separator } from '~/components/ui/separator';
import {
  Star,
  Heart,
  ShoppingCart,
  Download,
  Eye,
  MessageSquare,
  Share2,
  CheckCircle,
  AlertCircle,
  Tag,
  FileText,
  Shield,
  Loader2,
} from 'lucide-react';
import { cn } from '~/lib/utils';
import { marketplaceApi } from '~/lib/marketplace/api-client';
import { getOptionalUser } from '~/lib/marketplace/auth-helpers';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { id } = params;
  
  if (!id) {
    throw new Response('Listing ID is required', { status: 400 });
  }

  try {
    // Fetch user session, listing details, reviews, and related listings in parallel
    const [user, listing, reviewsResponse, relatedListings] = await Promise.all([
      getOptionalUser(request),
      marketplaceApi.listings.get(id),
      marketplaceApi.reviews.list({ listingId: id, page: 1, limit: 10 }),
      marketplaceApi.listings.list({ 
        categoryId: undefined, // Will be set after we get the listing
        page: 1, 
        limit: 4 
      }),
    ]);

    // Fetch seller details if listing has sellerId
    let seller = null;
    if (listing.sellerId) {
      seller = await marketplaceApi.sellers.get(listing.sellerId);
    }

    // Fetch license plans for this listing
    const licensePlansResponse = await marketplaceApi.licensePlans.list({
      listingId: id,
    });

    return json({
      user,
      listing,
      seller,
      licensePlans: licensePlansResponse.data || [],
      reviews: reviewsResponse.data || [],
      relatedListings: relatedListings.data || [],
      stats: {
        viewCount: listing.viewCount || 0,
        salesCount: listing.salesCount || 0,
        averageRating: listing.averageRating || 0,
        reviewCount: listing.reviewCount || 0,
      },
    });
  } catch (error) {
    console.error('Failed to load listing:', error);
    // Return null listing to show "not found" state
    return json({
      user: null,
      listing: null,
      seller: null,
      licensePlans: [],
      reviews: [],
      relatedListings: [],
      stats: {
        viewCount: 0,
        salesCount: 0,
        averageRating: 0,
        reviewCount: 0,
      },
    });
  }
}

function ListingDetailContent() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [selectedLicense, setSelectedLicense] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [couponValidation, setCouponValidation] = useState<any>(null);

  const formatCurrency = (cents: number) => {
    return `₹${(cents / 100).toLocaleString('en-IN')}`;
  };

  const validateCoupon = async () => {
    if (!couponCode || !data.listing) return;
    
    const response = await fetch(
      `/api/marketplace/coupons?action=validate&code=${couponCode}&listingId=${data.listing.id}&amountCents=${data.listing.priceCents}`
    );
    const result = await response.json();
    setCouponValidation(result);
  };

  const handleAddToCart = () => {
    // TODO: Implement add to cart
    console.log('Add to cart', { listingId: data.listing?.id, selectedLicense });
  };

  const handleBuyNow = () => {
    // TODO: Implement buy now (redirect to checkout)
    console.log('Buy now', { listingId: data.listing?.id, selectedLicense });
  };

  if (!data.listing) {
    return (
      <MarketplaceLayout user={data.user}>
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Listing Not Found</h2>
            <p className="text-muted-foreground mb-6">
              The listing you're looking for doesn't exist or has been removed.
            </p>
            <Button asChild>
              <Link to="/marketplace">Browse Marketplace</Link>
            </Button>
          </CardContent>
        </Card>
      </MarketplaceLayout>
    );
  }

  const listing = data.listing;

  return (
    <MarketplaceLayout user={data.user}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Preview */}
          <Card>
            <CardContent className="p-0">
              {listing.thumbnailUrl ? (
                <ThumbnailImage
                  src={listing.thumbnailUrl}
                  alt={listing.title}
                  aspectRatio="16:9"
                />
              ) : (
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <Download className="h-24 w-24 text-muted-foreground" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Title and Stats */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2">{listing.title}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {data.stats.viewCount.toLocaleString()} views
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="h-4 w-4" />
                    {data.stats.salesCount.toLocaleString()} sales
                  </span>
                  {data.stats.averageRating > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {data.stats.averageRating.toFixed(1)} ({data.stats.reviewCount})
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="icon">
                  <Heart className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Seller Info */}
            {data.seller && (
              <Link
                to={`/marketplace/sellers/${data.seller.id}`}
                className="flex items-center gap-3 p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-semibold">
                  {data.seller.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{data.seller.displayName}</p>
                  <p className="text-sm text-muted-foreground">
                    {data.seller.listingCount} listings
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contact
                </Button>
              </Link>
            )}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="description">
            <TabsList className="w-full">
              <TabsTrigger value="description" className="flex-1">
                <FileText className="h-4 w-4 mr-2" />
                Description
              </TabsTrigger>
              <TabsTrigger value="reviews" className="flex-1">
                <Star className="h-4 w-4 mr-2" />
                Reviews ({data.stats.reviewCount})
              </TabsTrigger>
              <TabsTrigger value="license" className="flex-1">
                <Shield className="h-4 w-4 mr-2" />
                License
              </TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>About This Listing</CardTitle>
                </CardHeader>
                <CardContent className="prose dark:prose-invert max-w-none">
                  <p>{listing.description || 'No description provided.'}</p>
                </CardContent>
              </Card>

              {listing.tags && listing.tags.length > 0 && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {listing.tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Reviews</CardTitle>
                  {data.stats.averageRating > 0 && (
                    <div className="flex items-center gap-4 mt-4">
                      <div className="text-5xl font-bold">
                        {data.stats.averageRating.toFixed(1)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                'h-5 w-5',
                                star <= Math.round(data.stats.averageRating)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              )}
                            />
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Based on {data.stats.reviewCount} reviews
                        </p>
                      </div>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {data.reviews.length > 0 ? (
                    <div className="space-y-6">
                      {data.reviews.map((review: any) => (
                        <div key={review.id} className="border-b pb-6 last:border-0">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={cn(
                                    'h-4 w-4',
                                    star <= review.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  )}
                                />
                              ))}
                            </div>
                            <span className="font-semibold">{review.userName}</span>
                            <span className="text-sm text-muted-foreground">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-muted-foreground">{review.comment}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        No reviews yet. Be the first to review!
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="license" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>License Information</CardTitle>
                  <CardDescription>
                    Choose the license that fits your needs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.licensePlans.length > 0 ? (
                    <div className="space-y-4">
                      {data.licensePlans.map((plan: any) => (
                        <div
                          key={plan.id}
                          className="border rounded-lg p-4 hover:border-primary transition-colors"
                        >
                          <h4 className="font-semibold mb-2">{plan.name}</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            {plan.description}
                          </p>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-sm">
                              {plan.allowCommercialUse
                                ? 'Commercial use allowed'
                                : 'Personal use only'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      Standard license applies
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar - Purchase Card */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="text-3xl">
                {formatCurrency(listing.priceCents)}
              </CardTitle>
              <CardDescription>One-time purchase</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* License Selection */}
              {data.licensePlans.length > 0 && (
                <div>
                  <Label>Select License</Label>
                  <select
                    className="w-full mt-2 p-2 border rounded-md"
                    value={selectedLicense || ''}
                    onChange={(e) => setSelectedLicense(e.target.value)}
                  >
                    <option value="">Choose a license...</option>
                    {data.licensePlans.map((plan: any) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Coupon Code */}
              <div>
                <Label>Have a coupon code?</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Enter code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  />
                  <Button
                    variant="outline"
                    onClick={validateCoupon}
                    disabled={!couponCode}
                  >
                    Apply
                  </Button>
                </div>
                {couponValidation && (
                  <div className="mt-2">
                    {couponValidation.valid ? (
                      <div className="flex items-center gap-2 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>
                          Discount: {formatCurrency(couponValidation.discountCents)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span>{couponValidation.reason}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Total */}
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total:</span>
                <span>
                  {couponValidation?.valid
                    ? formatCurrency(couponValidation.finalAmountCents)
                    : formatCurrency(listing.priceCents)}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={handleBuyNow}
                  disabled={fetcher.state === 'submitting'}
                >
                  {fetcher.state === 'submitting' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Buy Now
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={fetcher.state === 'submitting'}
                >
                  {fetcher.state === 'submitting' ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add to Cart'
                  )}
                </Button>
              </div>

              {/* Features */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Instant download</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Lifetime access</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Free updates</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Secure payment</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Related Listings */}
      {data.relatedListings.length > 0 && (
        <div className="mt-12">
          <h2 className="text-3xl font-bold mb-6">You May Also Like</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {data.relatedListings.map((relatedListing: any) => (
              <ListingCard
                key={relatedListing.id}
                listing={relatedListing}
                variant="compact"
              />
            ))}
          </div>
        </div>
      )}
    </MarketplaceLayout>
  );
}

// Loading skeleton component
function ListingDetailSkeleton() {
  return (
    <MarketplaceLayout user={null}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Preview Skeleton */}
          <Card>
            <CardContent className="p-0">
              <div className="aspect-video bg-muted animate-pulse" />
            </CardContent>
          </Card>

          {/* Title and Stats Skeleton */}
          <div>
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 space-y-3">
                <div className="h-10 bg-muted animate-pulse rounded w-3/4" />
                <div className="flex items-center gap-4">
                  <div className="h-4 bg-muted animate-pulse rounded w-24" />
                  <div className="h-4 bg-muted animate-pulse rounded w-24" />
                  <div className="h-4 bg-muted animate-pulse rounded w-24" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-10 w-10 bg-muted animate-pulse rounded" />
                <div className="h-10 w-10 bg-muted animate-pulse rounded" />
              </div>
            </div>

            {/* Seller Info Skeleton */}
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted animate-pulse rounded w-32" />
                <div className="h-3 bg-muted animate-pulse rounded w-24" />
              </div>
              <div className="h-9 w-24 bg-muted animate-pulse rounded" />
            </div>
          </div>

          {/* Tabs Skeleton */}
          <div className="space-y-6">
            <div className="flex gap-2 border-b">
              <div className="h-10 bg-muted animate-pulse rounded w-32" />
              <div className="h-10 bg-muted animate-pulse rounded w-32" />
              <div className="h-10 bg-muted animate-pulse rounded w-32" />
            </div>
            <Card>
              <CardHeader>
                <div className="h-6 bg-muted animate-pulse rounded w-48" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 bg-muted animate-pulse rounded w-full" />
                <div className="h-4 bg-muted animate-pulse rounded w-full" />
                <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="h-8 bg-muted animate-pulse rounded w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-4 bg-muted animate-pulse rounded w-full" />
              <Separator />
              <div className="space-y-3">
                <div className="h-4 bg-muted animate-pulse rounded w-24" />
                <div className="h-10 bg-muted animate-pulse rounded w-full" />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="h-6 bg-muted animate-pulse rounded w-16" />
                <div className="h-6 bg-muted animate-pulse rounded w-24" />
              </div>
              <div className="space-y-2">
                <div className="h-12 bg-muted animate-pulse rounded w-full" />
                <div className="h-12 bg-muted animate-pulse rounded w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Related Listings Skeleton */}
      <div className="mt-12">
        <div className="h-8 bg-muted animate-pulse rounded w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-0">
                <div className="aspect-video bg-muted animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                  <div className="h-5 bg-muted animate-pulse rounded w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MarketplaceLayout>
  );
}

// Default export with Suspense wrapper
export default function ListingDetailPage() {
  return (
    <Suspense fallback={<ListingDetailSkeleton />}>
      <ListingDetailContent />
    </Suspense>
  );
}