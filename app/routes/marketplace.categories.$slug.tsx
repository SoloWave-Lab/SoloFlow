import React, { Suspense, useState } from 'react';
import { json, type LoaderFunctionArgs } from '~/lib/router-utils';
import { useLoaderData, useSearchParams, Link } from 'react-router';
import { MarketplaceLayout } from '~/components/marketplace/MarketplaceLayout';
import { ListingCard } from '~/components/marketplace/ListingCard';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
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
  ChevronRight,
  X,
  Package,
  Folder,
} from 'lucide-react';
import { cn } from '~/lib/utils';
import { marketplaceApi } from '~/lib/marketplace/api-client';
import { ListingGridSkeleton } from '~/components/marketplace/LoadingSkeletons';
import { getOptionalUser } from '~/lib/marketplace/auth-helpers';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const slug = params.slug;
  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const minPrice = url.searchParams.get('minPrice') || '';
  const maxPrice = url.searchParams.get('maxPrice') || '';
  const sortBy = url.searchParams.get('sortBy') || 'newest';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '24');

  try {
    // Fetch user session and categories in parallel
    const [user, { categories }] = await Promise.all([
      getOptionalUser(request),
      marketplaceApi.categories.list(),
    ]);
    
    const category = categories.find((c) => c.slug === slug);

    if (!category) {
      throw new Response('Category not found', { status: 404 });
    }

    // Search listings in this category
    const searchResults = await marketplaceApi.search.search({
      q: search,
      categoryId: category.id,
      minPrice: minPrice ? parseFloat(minPrice) * 100 : undefined, // Convert to cents
      maxPrice: maxPrice ? parseFloat(maxPrice) * 100 : undefined, // Convert to cents
      sortBy: sortBy as any,
      page,
      limit,
    });

    return json({
      user,
      category,
      listings: searchResults.data || [],
      filters: {
        search,
        minPrice,
        maxPrice,
        sortBy,
      },
      pagination: searchResults.pagination || {
        page,
        limit,
        total: 0,
        totalPages: 0,
      },
    });
  } catch (error) {
    console.error('Failed to load category:', error);
    return json({
      user: null,
      category: {
        id: 'cat-1',
        name: slug || 'Category',
        slug: slug,
        description: 'Category not found',
        icon: 'Package',
        listingCount: 0,
        subcategories: [],
      },
      listings: [],
      filters: {
        search,
        minPrice,
        maxPrice,
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

function CategoryPageContent() {
  const data = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(true);
  const [priceRange, setPriceRange] = useState([
    parseInt(data.filters.minPrice) || 0,
    parseInt(data.filters.maxPrice) || 10000,
  ]);

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
    data.filters.minPrice,
    data.filters.maxPrice,
  ].filter(Boolean).length;

  return (
    <MarketplaceLayout user={data.user}>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link to="/marketplace/browse" className="hover:text-foreground">
          Marketplace
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{data.category.name}</span>
      </nav>

      {/* Category Header */}
      <div className="mb-8">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Package className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">{data.category.name}</h1>
            <p className="text-muted-foreground mb-2">
              {data.category.description}
            </p>
            <p className="text-sm text-muted-foreground">
              {data.category.listingCount.toLocaleString()} listings available
            </p>
          </div>
        </div>

        {/* Subcategories */}
        {data.category.subcategories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.category.subcategories.map((subcategory: any) => (
              <Button
                key={subcategory.id}
                variant="outline"
                size="sm"
                asChild
              >
                <Link to={`/marketplace/categories/${subcategory.slug}`}>
                  <Folder className="mr-2 h-4 w-4" />
                  {subcategory.name}
                  <Badge variant="secondary" className="ml-2">
                    {subcategory.listingCount}
                  </Badge>
                </Link>
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search in ${data.category.name}...`}
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

                {/* Price Range Filter */}
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                    <Label>Price Range</Label>
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-4">
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

                {/* License Type Filter */}
                <Collapsible defaultOpen>
                  <CollapsibleTrigger className="flex items-center justify-between w-full">
                    <Label>License Type</Label>
                    <ChevronDown className="h-4 w-4" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-2">
                    {['Personal', 'Commercial', 'Extended'].map((license) => (
                      <Button
                        key={license}
                        variant="ghost"
                        className="w-full justify-start"
                        size="sm"
                        onClick={() => updateFilter('license', license.toLowerCase())}
                      >
                        {license}
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
                            variant={page === data.pagination.page ? 'default' : 'outline'}
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
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Package className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Listings Found</h3>
                <p className="text-muted-foreground text-center mb-6">
                  {activeFiltersCount > 0
                    ? 'Try adjusting your filters to see more results.'
                    : 'This category doesn\'t have any listings yet.'}
                </p>
                {activeFiltersCount > 0 && (
                  <Button onClick={clearFilters}>Clear Filters</Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </MarketplaceLayout>
  );
}

export default function CategoryPage() {
  return (
    <Suspense
      fallback={
        <MarketplaceLayout user={null}>
          <div className="space-y-6">
            {/* Breadcrumb Skeleton */}
            <div className="h-5 w-48 bg-muted animate-pulse rounded" />

            {/* Category Header Skeleton */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-muted animate-pulse rounded-lg" />
              <div className="flex-1 space-y-3">
                <div className="h-10 w-64 bg-muted animate-pulse rounded" />
                <div className="h-5 w-full max-w-2xl bg-muted animate-pulse rounded" />
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              </div>
            </div>

            {/* Search Bar Skeleton */}
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="flex-1 h-10 bg-muted animate-pulse rounded" />
                  <div className="w-24 h-10 bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>

            {/* Listings Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Filters Sidebar Skeleton */}
              <div className="lg:col-span-1">
                <Card>
                  <CardContent className="p-4 space-y-6">
                    <div className="h-6 w-24 bg-muted animate-pulse rounded" />
                    <div className="space-y-3">
                      <div className="h-4 w-full bg-muted animate-pulse rounded" />
                      <div className="h-4 w-full bg-muted animate-pulse rounded" />
                      <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Listings Skeleton */}
              <div className="lg:col-span-3">
                <ListingGridSkeleton count={9} />
              </div>
            </div>
          </div>
        </MarketplaceLayout>
      }
    >
      <CategoryPageContent />
    </Suspense>
  );
}