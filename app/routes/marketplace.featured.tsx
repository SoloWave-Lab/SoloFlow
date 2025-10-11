import React, { Suspense } from 'react';
import { json, type LoaderFunctionArgs } from '~/lib/router-utils';
import { useLoaderData, Link } from 'react-router';
import { MarketplaceLayout } from '~/components/marketplace/MarketplaceLayout';
import { ListingCard } from '~/components/marketplace/ListingCard';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Star, Sparkles, TrendingUp, ArrowRight } from 'lucide-react';
import { marketplaceApi } from '~/lib/marketplace/api-client';
import { getOptionalUser } from '~/lib/marketplace/auth-helpers';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const [user, featuredResponse] = await Promise.all([
      getOptionalUser(request),
      marketplaceApi.search.search({ featured: true, limit: 50 }),
    ]);

    return json({
      user,
      listings: featuredResponse.listings || [],
    });
  } catch (error) {
    console.error('Failed to load featured listings:', error);
    return json({
      user: null,
      listings: [],
    });
  }
}

function FeaturedPageContent() {
  const data = useLoaderData<typeof loader>();

  return (
    <MarketplaceLayout user={data.user}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20">
            <Star className="h-8 w-8 text-yellow-600 dark:text-yellow-400 fill-current" />
          </div>
          <div>
            <h1 className="text-4xl font-bold flex items-center gap-2">
              Featured Listings
              <Sparkles className="h-8 w-8 text-primary" />
            </h1>
            <p className="text-muted-foreground">
              Hand-picked premium templates and assets
            </p>
          </div>
        </div>
      </div>

      {/* Featured Badge Info */}
      <Card className="mb-8 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">What makes a listing featured?</h3>
              <p className="text-sm text-muted-foreground">
                Featured listings are carefully selected by our team based on quality, 
                popularity, and user reviews. These represent the best content available 
                on our marketplace.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Listings Grid */}
      {data.listings.length > 0 ? (
        <>
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">
              Showing {data.listings.length} featured {data.listings.length === 1 ? 'listing' : 'listings'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {data.listings.map((listing: any) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                variant="featured"
              />
            ))}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Star className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No Featured Listings Yet</h3>
            <p className="text-muted-foreground mb-6">
              Check back soon for curated premium content
            </p>
            <Button asChild>
              <Link to="/marketplace/browse">Browse All Listings</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Call to Action */}
      <div className="mt-12 p-8 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-background border border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold mb-2">Want to see more?</h3>
            <p className="text-muted-foreground">
              Explore our full marketplace with thousands of templates and assets
            </p>
          </div>
          <Button size="lg" asChild>
            <Link to="/marketplace/browse">
              Browse All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </MarketplaceLayout>
  );
}

export default function FeaturedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading featured listings...</p>
          </div>
        </div>
      }
    >
      <FeaturedPageContent />
    </Suspense>
  );
}