import React, { Suspense } from 'react';
import { json, type LoaderFunctionArgs } from '~/lib/router-utils';
import { useLoaderData, Link } from 'react-router';
import { MarketplaceLayout } from '~/components/marketplace/MarketplaceLayout';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Package, ArrowRight, Layers } from 'lucide-react';
import { marketplaceApi } from '~/lib/marketplace/api-client';
import { getOptionalUser } from '~/lib/marketplace/auth-helpers';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const [user, categoriesResponse] = await Promise.all([
      getOptionalUser(request),
      marketplaceApi.categories.list(),
    ]);

    return json({
      user,
      categories: categoriesResponse.categories || [],
    });
  } catch (error) {
    console.error('Failed to load categories:', error);
    return json({
      user: null,
      categories: [],
    });
  }
}

function CategoriesPageContent() {
  const data = useLoaderData<typeof loader>();

  return (
    <MarketplaceLayout user={data.user}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <Layers className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">All Categories</h1>
            <p className="text-muted-foreground">
              Browse templates and assets by category
            </p>
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      {data.categories.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {data.categories.map((category: any) => (
            <Link
              key={category.id}
              to={`/marketplace/categories/${category.slug}`}
              className="group"
            >
              <Card className="h-full hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    {/* Icon */}
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 group-hover:from-primary/30 group-hover:to-primary/10 transition-colors">
                      <Package className="h-8 w-8 text-primary" />
                    </div>

                    {/* Category Name */}
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                      {category.name}
                    </h3>

                    {/* Description */}
                    {category.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {category.description}
                      </p>
                    )}

                    {/* Listing Count */}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary">
                        {category.listing_count || 0} items
                      </Badge>
                    </div>

                    {/* Arrow Icon */}
                    <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Layers className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No Categories Yet</h3>
            <p className="text-muted-foreground mb-6">
              Categories will appear here once they are created
            </p>
            <Button asChild>
              <Link to="/marketplace/browse">Browse All Listings</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <div className="mt-12 p-6 rounded-lg bg-muted/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold mb-1">Can't find what you're looking for?</h3>
            <p className="text-sm text-muted-foreground">
              Browse all listings or use the search feature
            </p>
          </div>
          <Button asChild>
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

export default function CategoriesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading categories...</p>
          </div>
        </div>
      }
    >
      <CategoriesPageContent />
    </Suspense>
  );
}