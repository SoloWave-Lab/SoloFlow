import React, { useState, useEffect, Suspense } from 'react';
import { type LoaderFunctionArgs } from '~/lib/router-utils';
import { Link, useLoaderData } from '~/lib/router-utils';
import { MarketplaceLayout } from '~/components/marketplace/MarketplaceLayout';
import { ListingCard } from '~/components/marketplace/ListingCard';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Separator } from '~/components/ui/separator';
import {
  TrendingUp,
  Star,
  Package,
  Users,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { marketplaceApi } from '~/lib/marketplace/api-client';
import { getOptionalUser } from '~/lib/marketplace/auth-helpers';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const [user, featuredResponse, trendingResponse, newResponse, categoriesResponse, analyticsResponse] = await Promise.all([
      getOptionalUser(request),
      marketplaceApi.search.search({ featured: true, limit: 8 }),
      marketplaceApi.search.search({ sortBy: 'popular', limit: 8 }),
      marketplaceApi.search.search({ sortBy: 'newest', limit: 8 }),
      marketplaceApi.categories.list(),
      marketplaceApi.admin.analytics().catch(() => ({ analytics: null })), // Admin analytics may fail for non-admins
    ]);

    const analytics = analyticsResponse.analytics;

    return Response.json({
      user,
      featuredListings: featuredResponse.listings || [],
      trendingListings: trendingResponse.listings || [],
      newListings: newResponse.listings || [],
      topCategories: (categoriesResponse.categories || []).slice(0, 6).map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        listingCount: cat.listing_count || 0,
      })),
      topSellers: [],
      stats: {
        totalListings: analytics?.total_listings || 0,
        totalSellers: analytics?.total_sellers || 0,
        totalSales: analytics?.total_orders || 0,
      },
    });
  } catch (error) {
    console.error('Failed to load marketplace home:', error);
    return Response.json({
      user: null,
      featuredListings: [],
      trendingListings: [],
      newListings: [],
      topCategories: [],
      topSellers: [],
      stats: {
        totalListings: 0,
        totalSellers: 0,
        totalSales: 0,
      },
    });
  }
}

function MarketplacePageContent() {
  const data = useLoaderData<typeof loader>();
  const [activeTab, setActiveTab] = useState('featured');

  return (
    <MarketplaceLayout user={data.user}>
      {/* Hero Section */}
      <section className="relative rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-background p-12 mb-12 overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">
              Premium Marketplace
            </span>
          </div>
          <h1 className="text-5xl font-bold mb-4 max-w-2xl">
            Discover Premium Video Templates & Assets
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-xl">
            Browse thousands of high-quality templates, effects, and assets
            created by professional designers.
          </p>
          <div className="flex gap-4">
            <Button size="lg" asChild>
              <Link to="/marketplace/browse">
                Browse Marketplace
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/marketplace/become-seller">Become a Seller</Link>
            </Button>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-1/3 h-full opacity-10">
          <div className="absolute top-10 right-10 w-32 h-32 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-10 right-20 w-40 h-40 rounded-full bg-primary blur-3xl" />
        </div>
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Total Listings
                </p>
                <p className="text-3xl font-bold">
                  {data.stats.totalListings.toLocaleString()}
                </p>
              </div>
              <Package className="h-12 w-12 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Active Sellers
                </p>
                <p className="text-3xl font-bold">
                  {data.stats.totalSellers.toLocaleString()}
                </p>
              </div>
              <Users className="h-12 w-12 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Total Sales
                </p>
                <p className="text-3xl font-bold">
                  {data.stats.totalSales.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-12 w-12 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Categories Section */}
      {data.topCategories.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold">Browse by Category</h2>
            <Button variant="ghost" asChild>
              <Link to="/marketplace/categories">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {data.topCategories.map((category: any) => (
              <Link
                key={category.id}
                to={`/marketplace/categories/${category.slug}`}
                className="group"
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-1">{category.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {category.listingCount} items
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Listings Tabs */}
      <section className="mb-12">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-6">
            <TabsList>
              <TabsTrigger value="featured">
                <Star className="h-4 w-4 mr-2" />
                Featured
              </TabsTrigger>
              <TabsTrigger value="trending">
                <TrendingUp className="h-4 w-4 mr-2" />
                Trending
              </TabsTrigger>
              <TabsTrigger value="new">
                <Sparkles className="h-4 w-4 mr-2" />
                New Arrivals
              </TabsTrigger>
            </TabsList>

            <Button variant="ghost" asChild>
              <Link to="/marketplace/browse">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <TabsContent value="featured">
            {data.featuredListings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {data.featuredListings.map((listing: any) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    variant="featured"
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No featured listings yet
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Check back soon for curated premium content
                  </p>
                  <Button asChild>
                    <Link to="/marketplace/browse">Browse All Listings</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="trending">
            {data.trendingListings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {data.trendingListings.map((listing: any) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No trending listings yet
                  </h3>
                  <p className="text-muted-foreground">
                    Popular items will appear here
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="new">
            {data.newListings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {data.newListings.map((listing: any) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No new listings yet
                  </h3>
                  <p className="text-muted-foreground">
                    New arrivals will appear here
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </section>

      {/* Top Sellers Section */}
      {data.topSellers.length > 0 && (
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold">Top Sellers</h2>
            <Button variant="ghost" asChild>
              <Link to="/marketplace/sellers">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {data.topSellers.map((seller: any) => (
              <Link
                key={seller.id}
                to={`/marketplace/sellers/${seller.id}`}
                className="group"
              >
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6 text-center">
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                      {seller.displayName.charAt(0).toUpperCase()}
                    </div>
                    <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                      {seller.displayName}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {seller.listingCount} listings
                    </p>
                    {seller.badges && seller.badges.length > 0 && (
                      <div className="flex justify-center gap-1">
                        {seller.badges.map((badge: any) => (
                          <Badge key={badge.badgeType} variant="secondary">
                            {badge.badgeType}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="rounded-2xl bg-primary text-primary-foreground p-12 text-center">
        <h2 className="text-4xl font-bold mb-4">Ready to Start Selling?</h2>
        <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
          Join thousands of creators earning from their video templates and
          assets. Start your seller journey today.
        </p>
        <Button size="lg" variant="secondary" asChild>
          <Link to="/marketplace/become-seller">
            Become a Seller
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </section>
    </MarketplaceLayout>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense
      fallback={
        <MarketplaceLayout>
          {/* Hero Section Skeleton */}
          <section className="relative rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-background p-12 mb-12">
            <div className="space-y-4">
              <div className="h-6 bg-muted rounded w-48 animate-pulse" />
              <div className="h-12 bg-muted rounded w-2/3 animate-pulse" />
              <div className="h-6 bg-muted rounded w-1/2 animate-pulse" />
              <div className="flex gap-4">
                <div className="h-12 bg-muted rounded w-48 animate-pulse" />
                <div className="h-12 bg-muted rounded w-48 animate-pulse" />
              </div>
            </div>
          </section>

          {/* Stats Section Skeleton */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-24 animate-pulse" />
                      <div className="h-8 bg-muted rounded w-20 animate-pulse" />
                    </div>
                    <div className="h-12 w-12 bg-muted rounded-full animate-pulse" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          {/* Categories Section Skeleton */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="h-8 bg-muted rounded w-64 animate-pulse" />
              <div className="h-10 bg-muted rounded w-32 animate-pulse" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-3 animate-pulse" />
                    <div className="h-5 bg-muted rounded w-20 mx-auto mb-2 animate-pulse" />
                    <div className="h-4 bg-muted rounded w-16 mx-auto animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Listings Tabs Skeleton */}
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="h-10 bg-muted rounded w-96 animate-pulse" />
              <div className="h-10 bg-muted rounded w-32 animate-pulse" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i}>
                  <div className="aspect-video bg-muted animate-pulse" />
                  <CardContent className="p-4 space-y-2">
                    <div className="h-5 bg-muted rounded animate-pulse" />
                    <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
                    <div className="h-6 bg-muted rounded w-24 animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* CTA Section Skeleton */}
          <section className="rounded-2xl bg-muted p-12 text-center">
            <div className="h-10 bg-background/20 rounded w-96 mx-auto mb-4 animate-pulse" />
            <div className="h-6 bg-background/20 rounded w-2/3 mx-auto mb-8 animate-pulse" />
            <div className="h-12 bg-background/20 rounded w-48 mx-auto animate-pulse" />
          </section>
        </MarketplaceLayout>
      }
    >
      <MarketplacePageContent />
    </Suspense>
  );
}
