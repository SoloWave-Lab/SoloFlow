import React, { Suspense, useState } from 'react';
import { json, type LoaderFunctionArgs } from '~/lib/router-utils';
import { useLoaderData, Link, useParams } from 'react-router';
import { MarketplaceLayout } from '~/components/marketplace/MarketplaceLayout';
import { ListingCard } from '~/components/marketplace/ListingCard';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Badge } from '~/components/ui/badge';

import {
  Star,
  MapPin,
  Calendar,
  Package,
  ShoppingCart,
  MessageCircle,
  Award,
  TrendingUp,
  Users,
  CheckCircle,
  Shield,
  Zap,
} from 'lucide-react';
import { cn } from '~/lib/utils';
import { marketplaceApi } from '~/lib/marketplace/api-client';
import { AvatarImage as OptimizedAvatar } from '~/components/marketplace/OptimizedImage';
import { DashboardStatsSkeleton, ListingGridSkeleton } from '~/components/marketplace/LoadingSkeletons';
import { getOptionalUser } from '~/lib/marketplace/auth-helpers';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const sellerId = params.id;
  
  if (!sellerId) {
    throw new Response('Seller ID is required', { status: 400 });
  }

  try {
    // Fetch user session, seller profile and their listings in parallel
    const [user, sellerData, listingsData] = await Promise.all([
      getOptionalUser(request),
      marketplaceApi.sellers.get(sellerId),
      marketplaceApi.search.search({ sellerId, limit: 12 }),
    ]);

    return json({
      user,
      seller: sellerData.seller,
      listings: listingsData.data || [],
      reviews: [], // TODO: Fetch seller reviews when endpoint is available
      subscriptionPlans: [], // TODO: Fetch subscription plans when endpoint is available
    });
  } catch (error) {
    console.error('Failed to load seller profile:', error);
    throw new Response('Seller not found', { status: 404 });
  }
}

function SellerProfilePageContent() {
  const data = useLoaderData<typeof loader>();
  const { seller, listings, reviews, subscriptionPlans } = data;
  const [activeTab, setActiveTab] = useState('listings');

  const formatCurrency = (cents: number) => {
    return `₹${(cents / 100).toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
    });
  };

  const getBadgeIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      CheckCircle,
      Award,
      Zap,
      Shield,
    };
    return icons[iconName] || CheckCircle;
  };

  const getBadgeColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-700 border-blue-200',
      yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      green: 'bg-green-100 text-green-700 border-green-200',
      purple: 'bg-purple-100 text-purple-700 border-purple-200',
    };
    return colors[color] || colors.blue;
  };

  return (
    <MarketplaceLayout user={data.user}>
      {/* Seller Header */}
      <Card className="mb-8">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <OptimizedAvatar
              src={seller.avatar || undefined}
              alt={seller.name}
              name={seller.name}
              size={128}
              className="text-3xl"
            />

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-1">{seller.name}</h1>
                  <p className="text-muted-foreground">@{seller.username}</p>
                </div>
                <Button asChild>
                  <Link to={`/marketplace/messages?seller=${seller.id}`}>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Contact Seller
                  </Link>
                </Button>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {seller.badges.map((badge: any) => {
                  const Icon = getBadgeIcon(badge.icon);
                  return (
                    <Badge
                      key={badge.id}
                      variant="outline"
                      className={cn('px-3 py-1', getBadgeColor(badge.color))}
                    >
                      <Icon className="mr-1 h-3 w-3" />
                      {badge.name}
                    </Badge>
                  );
                })}
              </div>

              {/* Bio */}
              <p className="text-muted-foreground mb-4">{seller.bio}</p>

              {/* Meta Info */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {seller.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {seller.location}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Joined {formatDate(seller.joinedAt)}
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {seller.averageRating.toFixed(1)} ({seller.reviewCount} reviews)
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{seller.totalSales.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{seller.totalListings}</div>
            <p className="text-xs text-muted-foreground mt-1">Published</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{seller.responseTime}</div>
            <p className="text-xs text-muted-foreground mt-1">Average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Repeat Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{seller.stats.repeatCustomers}%</div>
            <p className="text-xs text-muted-foreground mt-1">Customer retention</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="listings">
            Listings ({seller.totalListings})
          </TabsTrigger>
          <TabsTrigger value="reviews">
            Reviews ({seller.reviewCount})
          </TabsTrigger>
          {subscriptionPlans.length > 0 && (
            <TabsTrigger value="subscriptions">
              Subscription Plans ({subscriptionPlans.length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* Listings Tab */}
        <TabsContent value="listings" className="space-y-6">
          {listings.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing: any) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Listings Yet</h3>
                <p className="text-muted-foreground text-center">
                  This seller hasn't published any listings yet.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-4">
          {reviews.length > 0 ? (
            reviews.map((review: any) => (
              <Card key={review.id}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <OptimizedAvatar
                      src={review.user.avatar}
                      alt={review.user.name}
                      name={review.user.name}
                      size={40}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold">{review.user.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                'h-4 w-4',
                                i < review.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              )}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-muted-foreground mb-2">{review.comment}</p>
                      {review.listing && (
                        <Link
                          to={`/marketplace/listings/${review.listing.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {review.listing.title}
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Star className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Reviews Yet</h3>
                <p className="text-muted-foreground text-center">
                  This seller hasn't received any reviews yet.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Subscriptions Tab */}
        {subscriptionPlans.length > 0 && (
          <TabsContent value="subscriptions" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subscriptionPlans.map((plan: any) => (
                <Card key={plan.id}>
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <span className="text-3xl font-bold">
                        {formatCurrency(plan.price)}
                      </span>
                      <span className="text-muted-foreground">/{plan.interval}</span>
                    </div>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature: string, index: number) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button className="w-full" asChild>
                      <Link to={`/marketplace/subscriptions/${plan.id}/subscribe`}>
                        Subscribe Now
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </MarketplaceLayout>
  );
}

export default function SellerProfilePage() {
  return (
    <Suspense
      fallback={
        <MarketplaceLayout user={null}>
          <div className="space-y-8">
            {/* Seller Header Skeleton */}
            <Card>
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Avatar Skeleton */}
                  <div className="w-32 h-32 bg-muted animate-pulse rounded-full" />
                  
                  {/* Info Skeleton */}
                  <div className="flex-1 space-y-4">
                    <div className="space-y-2">
                      <div className="h-8 w-48 bg-muted animate-pulse rounded" />
                      <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-6 w-24 bg-muted animate-pulse rounded-full" />
                      <div className="h-6 w-24 bg-muted animate-pulse rounded-full" />
                    </div>
                    <div className="h-16 w-full bg-muted animate-pulse rounded" />
                    <div className="flex gap-4">
                      <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                      <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                      <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Skeleton */}
            <DashboardStatsSkeleton count={4} />

            {/* Tabs Skeleton */}
            <div className="space-y-6">
              <div className="flex gap-2">
                <div className="h-10 w-32 bg-muted animate-pulse rounded" />
                <div className="h-10 w-32 bg-muted animate-pulse rounded" />
              </div>
              
              {/* Listings Grid Skeleton */}
              <ListingGridSkeleton count={6} />
            </div>
          </div>
        </MarketplaceLayout>
      }
    >
      <SellerProfilePageContent />
    </Suspense>
  );
}