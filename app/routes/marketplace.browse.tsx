import React, { useState, Suspense } from 'react';
import { json, type LoaderFunctionArgs } from '~/lib/router-utils';
import { useLoaderData, useSearchParams, Link } from 'react-router';
import { MarketplaceLayout } from '~/components/marketplace/MarketplaceLayout';
import { ListingCard } from '~/components/marketplace/ListingCard';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Slider } from '~/components/ui/slider';
import { Badge } from '~/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '~/components/ui/collapsible';
import {
  Search,
  SlidersHorizontal,
  Grid3x3,
  List,
  ChevronDown,
  X,
  Package,
} from 'lucide-react';
import { cn } from '~/lib/utils';
import { marketplaceApi } from '~/lib/marketplace/api-client';
import { getOptionalUser } from '~/lib/marketplace/auth-helpers';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const categoryId = url.searchParams.get('categoryId') || '';
  const minPrice = url.searchParams.get('minPrice') || '';
  const maxPrice = url.searchParams.get('maxPrice') || '';
  const minRating = url.searchParams.get('minRating') || '';
  const sortBy = url.searchParams.get('sortBy') || 'newest';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '24');

  try {
    // Fetch user session and listings/categories in parallel
    const [user, listingsResponse, categoriesResponse] = await Promise.all([
      getOptionalUser(request),
      marketplaceApi.search.search({
        query: search,
        categoryId: categoryId || undefined,
        minPriceCents: minPrice ? parseInt(minPrice) * 100 : undefined,
        maxPriceCents: maxPrice ? parseInt(maxPrice) * 100 : undefined,
        minRating: minRating ? parseFloat(minRating) : undefined,
        sortBy: sortBy as any,
        page,
        limit,
      }),
      marketplaceApi.categories.list(),
    ]);

    return json({
      user,
      listings: listingsResponse.data || [],
      categories: categoriesResponse.data || [],
      filters: {
        search,
        categoryId,
        minPrice,
        maxPrice,
        minRating,
        sortBy,
      },
      pagination: {
        page: listingsResponse.page || page,
        limit: listingsResponse.limit || limit,
        total: listingsResponse.total || 0,
        totalPages: listingsResponse.totalPages || 0,
      },
    });
  } catch (error) {
    console.error('Failed to load browse page:', error);
    // Return empty state on error
    return json({
      user: null,
      listings: [],
      categories: [],
      filters: {
        search,
        categoryId,
        minPrice,
        maxPrice,
        minRating,
        sortBy,
      },
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    });
  }
}

function BrowsePageContent() {
  const data = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(true);
  const [priceRange, setPriceRange] = useState([0, 10000]);

  const updateFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.set('page', '1'); // Reset to first page
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams({});
    setPriceRange([0, 10000]);
  };

  const activeFiltersCount = [
    data.filters.search,
    data.filters.categoryId,
    data.filters.minPrice,
    data.filters.maxPrice,
  ].filter(Boolean).length;

  return (
    <MarketplaceLayout user={data.user}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Browse Marketplace</h1>
        <p className="text-muted-foreground">
          Discover thousands of premium templates and assets
        </p>
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates, effects, assets..."
                className="pl-10"
                defaultValue={data.filters.search}
                onChange={(e) => {
                  const value = e.target.value;
                  const timeoutId = setTimeout(() => {
                    updateFilter('search', value);
                  }, 500);
                  return () => clearTimeout(timeoutId);
                }}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        {showFilters && (
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Filters</h3>
                  {activeFiltersCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>

                {/* Category Filter */}
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                    <Label>Category</Label>
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-2">
                    <Button
                      variant={!data.filters.categoryId ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                      size="sm"
                      onClick={() => updateFilter('categoryId', '')}
                    >
                      All Categories
                    </Button>
                    {data.categories.map((category: any) => (
                      <Button
                        key={category.id}
                        variant={
                          data.filters.categoryId === category.id
                            ? 'secondary'
                            : 'ghost'
                        }
                        className="w-full justify-start"
                        size="sm"
                        onClick={() => updateFilter('categoryId', category.id)}
                      >
                        {category.name}
                      </Button>
                    ))}
                  </CollapsibleContent>
                </Collapsible>

                {/* Price Range Filter */}
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                    <Label>Price Range</Label>
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-4">
                    <Slider
                      value={priceRange}
                      onValueChange={setPriceRange}
                      max={10000}
                      step={100}
                      className="w-full"
                    />
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={priceRange[0]}
                        onChange={(e) =>
                          setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])
                        }
                        className="w-full"
                      />
                      <span>-</span>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={priceRange[1]}
                        onChange={(e) =>
                          setPriceRange([priceRange[0], parseInt(e.target.value) || 10000])
                        }
                        className="w-full"
                      />
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        updateFilter('minPrice', priceRange[0].toString());
                        updateFilter('maxPrice', priceRange[1].toString());
                      }}
                    >
                      Apply Price Filter
                    </Button>
                  </CollapsibleContent>
                </Collapsible>

                {/* Rating Filter */}
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                    <Label>Minimum Rating</Label>
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-2">
                    {[4, 3, 2, 1].map((rating) => (
                      <Button
                        key={rating}
                        variant="ghost"
                        className="w-full justify-start"
                        size="sm"
                        onClick={() => updateFilter('minRating', rating.toString())}
                      >
                        {rating}+ Stars
                      </Button>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Listings Grid */}
        <div className={cn('space-y-6', showFilters ? 'lg:col-span-3' : 'lg:col-span-4')}>
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {data.pagination.total > 0
                ? `Showing ${(data.pagination.page - 1) * data.pagination.limit + 1}-${Math.min(
                    data.pagination.page * data.pagination.limit,
                    data.pagination.total
                  )} of ${data.pagination.total} results`
                : 'No results found'}
            </p>

            <div className="flex items-center gap-2">
              {/* Sort */}
              <Select
                value={data.filters.sortBy}
                onValueChange={(value) => updateFilter('sortBy', value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="price-low">Price: Low to High</SelectItem>
                  <SelectItem value="price-high">Price: High to Low</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                </SelectContent>
              </Select>

              {/* View Mode */}
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Listings */}
          {data.listings.length > 0 ? (
            <>
              <div
                className={cn(
                  'grid gap-6',
                  viewMode === 'grid'
                    ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                    : 'grid-cols-1'
                )}
              >
                {data.listings.map((listing: any) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    variant={viewMode === 'list' ? 'compact' : 'default'}
                  />
                ))}
              </div>

              {/* Pagination */}
              {data.pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    disabled={data.pagination.page === 1}
                    onClick={() =>
                      updateFilter('page', (data.pagination.page - 1).toString())
                    }
                  >
                    Previous
                  </Button>

                  {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      const current = data.pagination.page;
                      return (
                        page === 1 ||
                        page === data.pagination.totalPages ||
                        (page >= current - 2 && page <= current + 2)
                      );
                    })
                    .map((page, index, array) => {
                      const prevPage = array[index - 1];
                      const showEllipsis = prevPage && page - prevPage > 1;

                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && <span className="px-2">...</span>}
                          <Button
                            variant={
                              page === data.pagination.page ? 'default' : 'outline'
                            }
                            onClick={() => updateFilter('page', page.toString())}
                          >
                            {page}
                          </Button>
                        </React.Fragment>
                      );
                    })}

                  <Button
                    variant="outline"
                    disabled={data.pagination.page === data.pagination.totalPages}
                    onClick={() =>
                      updateFilter('page', (data.pagination.page + 1).toString())
                    }
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No listings found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters or search terms
                </p>
                <Button onClick={clearFilters}>Clear Filters</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MarketplaceLayout>
  );
}

export default function BrowsePage() {
  return (
    <Suspense
      fallback={
        <MarketplaceLayout>
          <div className="container mx-auto py-8 px-4">
            {/* Header Skeleton */}
            <div className="mb-8">
              <div className="h-10 w-64 bg-muted rounded animate-pulse mb-4" />
              <div className="h-5 w-96 bg-muted rounded animate-pulse" />
            </div>

            {/* Search Bar Skeleton */}
            <div className="mb-6">
              <div className="h-12 bg-muted rounded-lg animate-pulse" />
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Filters Sidebar Skeleton */}
              <div className="space-y-4">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="h-6 w-32 bg-muted rounded animate-pulse" />
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Listings Grid Skeleton */}
              <div className="lg:col-span-3 space-y-6">
                {/* Toolbar Skeleton */}
                <div className="flex items-center justify-between">
                  <div className="h-5 w-48 bg-muted rounded animate-pulse" />
                  <div className="flex gap-2">
                    <div className="h-10 w-40 bg-muted rounded animate-pulse" />
                    <div className="h-10 w-20 bg-muted rounded animate-pulse" />
                  </div>
                </div>

                {/* Listing Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-0">
                        <div className="aspect-video bg-muted animate-pulse rounded-t-lg" />
                        <div className="p-4 space-y-2">
                          <div className="h-5 bg-muted rounded animate-pulse" />
                          <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                          <div className="h-6 w-20 bg-muted rounded animate-pulse" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </MarketplaceLayout>
      }
    >
      <BrowsePageContent />
    </Suspense>
  );
}