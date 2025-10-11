import { json, type LoaderFunctionArgs } from '~/lib/router-utils';
import { useLoaderData, Link, useSearchParams } from 'react-router';
import { MarketplaceLayout } from '~/components/marketplace/MarketplaceLayout';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Download, Search, FileText, Calendar, Package } from 'lucide-react';
import { marketplaceApi } from '~/lib/marketplace/api-client';
import { requireMarketplaceAuth } from '~/lib/marketplace/auth-helpers';
import { MarketplaceErrorBoundary } from '~/components/marketplace/ErrorBoundary';

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireMarketplaceAuth(request);
  
  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const filter = url.searchParams.get('filter') || 'all';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = 20;

  try {
    // Fetch purchases from API
    const purchasesResponse = await marketplaceApi.purchases.list({
      page,
      limit,
    });

    return json({
      purchases: purchasesResponse.data || [],
      pagination: {
        page: purchasesResponse.page || page,
        limit: purchasesResponse.limit || limit,
        total: purchasesResponse.total || 0,
        totalPages: purchasesResponse.totalPages || 0,
      },
      filters: {
        search,
        filter,
      },
      user,
    });
  } catch (error) {
    console.error('Failed to load purchases:', error);
    throw new Response('Failed to load purchases', { status: 500 });
  }
}

export const ErrorBoundary = MarketplaceErrorBoundary;

export default function Purchases() {
  const { purchases, pagination, filters } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const handleSearch = (search: string) => {
    const params = new URLSearchParams(searchParams);
    if (search) {
      params.set('search', search);
    } else {
      params.delete('search');
    }
    params.delete('page');
    setSearchParams(params);
  };

  const handleFilterChange = (filter: string) => {
    const params = new URLSearchParams(searchParams);
    if (filter === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', filter);
    }
    params.delete('page');
    setSearchParams(params);
  };

  const formatPrice = (cents: number) => `₹${(cents / 100).toFixed(2)}`;

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const getLicenseBadge = (licenseType: string) => {
    const variants: Record<string, { variant: 'secondary' | 'default'; label: string }> = {
      personal: { variant: 'secondary', label: 'Personal' },
      commercial: { variant: 'default', label: 'Commercial' },
      extended: { variant: 'default', label: 'Extended' },
    };

    const config = variants[licenseType] || variants.personal;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const { page: currentPage, totalPages } = pagination;
  const { search: currentSearch, filter: currentFilter } = filters;

  return (
    <MarketplaceLayout>
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Purchases</h1>
          <p className="text-muted-foreground mt-1">View and download your purchased items</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search purchases..."
                  defaultValue={currentSearch}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={currentFilter} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Purchases List */}
        <div className="space-y-4">
          {purchases.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No purchases found</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {currentSearch || currentFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Start exploring the marketplace to find great content'}
                </p>
                <Button asChild>
                  <Link to="/marketplace/browse">Browse Marketplace</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            purchases.map((purchase) => (
              <Card key={purchase.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Thumbnail */}
                    <Link to={`/marketplace/listings/${purchase.listing.id}`} className="flex-shrink-0">
                      <img
                        src={purchase.listing.thumbnailUrl}
                        alt={purchase.listing.title}
                        className="w-full md:w-48 h-32 object-cover rounded-lg hover:opacity-80 transition-opacity"
                      />
                    </Link>

                    {/* Details */}
                    <div className="flex-1 space-y-3">
                      <div>
                        <Link
                          to={`/marketplace/listings/${purchase.listing.id}`}
                          className="text-xl font-semibold hover:text-primary"
                        >
                          {purchase.listing.title}
                        </Link>
                        <p className="text-sm text-muted-foreground mt-1">
                          by {purchase.listing.seller.displayName}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Purchased:</span>{' '}
                          <span className="font-medium">{formatDate(purchase.purchaseDate)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Price:</span>{' '}
                          <span className="font-medium">{formatPrice(purchase.priceCents)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">License:</span>{' '}
                          {getLicenseBadge(purchase.licenseType)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Downloads:</span>
                        <span className="font-medium">
                          {purchase.downloadCount} / {purchase.maxDownloads}
                        </span>
                        {purchase.downloadCount >= purchase.maxDownloads && (
                          <Badge variant="destructive" className="text-xs">
                            Limit Reached
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 md:items-end justify-between">
                      <Button asChild disabled={purchase.downloadCount >= purchase.maxDownloads}>
                        <a
                          href={purchase.downloadUrl}
                          download
                          className={
                            purchase.downloadCount >= purchase.maxDownloads ? 'pointer-events-none' : ''
                          }
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </a>
                      </Button>

                      <Button variant="outline" asChild>
                        <Link to={`/marketplace/purchases/${purchase.id}/license`}>
                          <FileText className="mr-2 h-4 w-4" />
                          View License
                        </Link>
                      </Button>

                      <Button variant="ghost" asChild>
                        <Link to={`/marketplace/listings/${purchase.listing.id}`}>
                          View Details
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.set('page', String(currentPage - 1));
                setSearchParams(params);
              }}
            >
              Previous
            </Button>
            <div className="flex items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === currentPage ? 'default' : 'outline'}
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.set('page', String(page));
                    setSearchParams(params);
                  }}
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => {
                const params = new URLSearchParams(searchParams);
                params.set('page', String(currentPage + 1));
                setSearchParams(params);
              }}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </MarketplaceLayout>
  );
}