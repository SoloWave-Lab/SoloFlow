import { json, type LoaderFunctionArgs } from '~/lib/router-utils';
import { useLoaderData, Link, useFetcher, useSearchParams } from 'react-router';
import { MarketplaceLayout } from '~/components/marketplace/MarketplaceLayout';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';
import { Plus, Search, MoreVertical, Edit, Trash2, Eye, Copy } from 'lucide-react';
import { useState } from 'react';
import { marketplaceApi } from '~/lib/marketplace/api-client';

const FALLBACK_LISTINGS = [
  {
    id: '1',
    title: 'Professional Video Transition Pack',
    status: 'published',
    priceCents: 2999,
    salesCount: 45,
    viewCount: 1234,
    createdAt: '2024-01-15',
    thumbnailUrl: '/placeholder-listing.jpg',
  },
  {
    id: '2',
    title: 'Cinematic Color Grading LUTs',
    status: 'pending',
    priceCents: 4999,
    salesCount: 0,
    viewCount: 89,
    createdAt: '2024-01-20',
    thumbnailUrl: '/placeholder-listing.jpg',
  },
  {
    id: '3',
    title: 'Motion Graphics Template Bundle',
    status: 'draft',
    priceCents: 7999,
    salesCount: 0,
    viewCount: 12,
    createdAt: '2024-01-22',
    thumbnailUrl: '/placeholder-listing.jpg',
  },
  {
    id: '4',
    title: 'Sound Effects Library - 500+ Sounds',
    status: 'rejected',
    priceCents: 3999,
    salesCount: 0,
    viewCount: 45,
    createdAt: '2024-01-18',
    thumbnailUrl: '/placeholder-listing.jpg',
    rejectionReason: 'Audio quality does not meet marketplace standards',
  },
];

const FALLBACK_STATS = {
  total: FALLBACK_LISTINGS.length,
  published: FALLBACK_LISTINGS.filter((item) => item.status === 'published').length,
  pending: FALLBACK_LISTINGS.filter((item) => item.status === 'pending').length,
  draft: FALLBACK_LISTINGS.filter((item) => item.status === 'draft').length,
  rejected: FALLBACK_LISTINGS.filter((item) => item.status === 'rejected').length,
};

export async function loader({ request }: LoaderFunctionArgs) {
  // TODO: Get user from session and verify they are a seller
  // const user = await requireSeller(request);

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || '';
  const search = url.searchParams.get('search') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = 20;

  try {
    const listingsResponse = await marketplaceApi.seller.getListings({
      status: status || undefined,
      page,
      limit,
    });

    const listings = listingsResponse.data ?? [];
    const stats = listingsResponse.stats ?? {
      total: listings.length,
      published: listings.filter((listing: any) => listing.status === 'published').length,
      pending: listings.filter((listing: any) => listing.status === 'pending').length,
      draft: listings.filter((listing: any) => listing.status === 'draft').length,
      rejected: listings.filter((listing: any) => listing.status === 'rejected').length,
    };

    return json({
      listings,
      stats,
      filters: {
        status,
        search,
      },
      pagination: {
        page: listingsResponse.page ?? page,
        limit: listingsResponse.limit ?? limit,
        total: listingsResponse.total ?? listings.length,
        totalPages: listingsResponse.totalPages ?? Math.max(1, Math.ceil(listings.length / limit)),
      },
      user: {
        id: 'user-1', // TODO: Get from session
        name: 'John Doe',
        isSeller: true,
      },
    });
  } catch (error) {
    console.error('Failed to load seller listings:', error);
    return json({
      listings: FALLBACK_LISTINGS,
      stats: FALLBACK_STATS,
      filters: {
        status,
        search,
      },
      pagination: {
        page,
        limit,
        total: FALLBACK_LISTINGS.length,
        totalPages: 1,
      },
      user: {
        id: 'user-1',
        name: 'John Doe',
        isSeller: true,
      },
    });
  }
}

export default function SellerListings() {
  const { listings, stats, currentStatus, currentSearch, currentPage, totalPages } =
    useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const fetcher = useFetcher();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams);
    if (status === 'all') {
      params.delete('status');
    } else {
      params.set('status', status);
    }
    params.delete('page');
    setSearchParams(params);
  };

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

  const handleDelete = (id: string) => {
    fetcher.submit(
      { intent: 'delete', listingId: id },
      { method: 'post' }
    );
    setDeleteId(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      published: { variant: 'default', label: 'Published' },
      pending: { variant: 'secondary', label: 'Pending Review' },
      draft: { variant: 'outline', label: 'Draft' },
      rejected: { variant: 'destructive', label: 'Rejected' },
    };

    const config = variants[status] || variants.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatPrice = (cents: number) => {
    return `₹${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <MarketplaceLayout>
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Listings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your marketplace listings
            </p>
          </div>
          <Button asChild>
            <Link to="/marketplace/seller/listings/new">
              <Plus className="mr-2 h-4 w-4" />
              Create New Listing
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Published
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.published}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Draft
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rejected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search listings..."
                  defaultValue={currentSearch}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={currentStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Listings Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="text-muted-foreground">
                        <p className="text-lg font-medium mb-2">No listings found</p>
                        <p className="text-sm">
                          {currentSearch || currentStatus !== 'all'
                            ? 'Try adjusting your filters'
                            : 'Create your first listing to get started'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  listings.map((listing) => (
                    <TableRow key={listing.id}>
                      <TableCell>
                        <img
                          src={listing.thumbnailUrl}
                          alt={listing.title}
                          className="w-12 h-12 object-cover rounded"
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{listing.title}</div>
                          {listing.status === 'rejected' && listing.rejectionReason && (
                            <div className="text-xs text-red-600 mt-1">
                              {listing.rejectionReason}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(listing.status)}</TableCell>
                      <TableCell>{formatPrice(listing.priceCents)}</TableCell>
                      <TableCell className="text-right">{listing.viewCount}</TableCell>
                      <TableCell className="text-right">{listing.salesCount}</TableCell>
                      <TableCell>{formatDate(listing.createdAt)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/marketplace/listings/${listing.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/marketplace/seller/listings/${listing.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/marketplace/seller/listings/${listing.id}/duplicate`}>
                                <Copy className="mr-2 h-4 w-4" />
                                Duplicate
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeleteId(listing.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Listing</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this listing? This action cannot be undone.
                All associated data including sales history will be preserved.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId && handleDelete(deleteId)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MarketplaceLayout>
  );
}