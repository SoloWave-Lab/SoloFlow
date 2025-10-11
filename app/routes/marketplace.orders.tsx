import { json, type LoaderFunctionArgs } from '~/lib/router-utils';
import { useLoaderData, Link, useSearchParams } from 'react-router';
import { Suspense, useMemo } from 'react';
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
import { Search, FileText, Download, CreditCard, CheckCircle, XCircle, Clock } from 'lucide-react';
import { AvatarImage, ThumbnailImage } from '~/components/marketplace/OptimizedImage';
import { Skeleton } from '~/components/ui/skeleton';
import { marketplaceApi } from '~/lib/marketplace/api-client';
import { requireMarketplaceAuth } from '~/lib/marketplace/auth-helpers';
import { MarketplaceErrorBoundary } from '~/components/marketplace/ErrorBoundary';

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireMarketplaceAuth(request);

  const url = new URL(request.url);
  const search = url.searchParams.get('search') || '';
  const status = url.searchParams.get('status') || 'all';
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const limit = 20;

  try {
    // Fetch orders from API
    const ordersResponse = await marketplaceApi.orders.list({
      status: status === 'all' ? undefined : status,
      search: search || undefined,
      page,
      limit,
    });

    const orders = ordersResponse.data || [];

    const filteredOrders = search
      ? orders.filter((order) =>
          order.items?.some((item) =>
            item.listing?.title?.toLowerCase().includes(search.toLowerCase())
          )
        )
      : orders;

    const stats = {
      total: ordersResponse.summary?.total ?? filteredOrders.length,
      completed: ordersResponse.summary?.completed ?? filteredOrders.filter((order) => order.status === 'completed').length,
      pending: ordersResponse.summary?.pending ?? filteredOrders.filter((order) => order.status === 'pending').length,
      failed: ordersResponse.summary?.failed ?? filteredOrders.filter((order) => order.status === 'failed').length,
      totalSpent:
        ordersResponse.summary?.totalSpent ??
        filteredOrders.reduce((sum, order) => sum + (order.totalCents || 0), 0),
    };

    return json({
      orders,
      pagination: {
        page: ordersResponse.page || page,
        limit: ordersResponse.limit || limit,
        total: ordersResponse.total || filteredOrders.length,
        totalPages:
          ordersResponse.totalPages ||
          Math.max(1, Math.ceil((ordersResponse.total || filteredOrders.length) / limit)),
      },
      filters: {
        search,
        status,
      },
      stats,
      user,
    });
  } catch (error) {
    console.error('Failed to load orders:', error);
    throw new Response('Failed to load orders', { status: 500 });
  }
}

function OrdersContent() {
  const { orders, stats, filters, pagination } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentSearch = filters.search;
  const currentStatus = filters.status;
  const currentPage = pagination.page;
  const totalPages = pagination.totalPages;

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

  const formatPrice = (cents: number) => {
    return `₹${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusBadgeConfig = useMemo(
    () => ({
      completed: {
        variant: 'default' as const,
        label: 'Completed',
        icon: <CheckCircle className="h-3 w-3 mr-1" />,
      },
      pending: {
        variant: 'secondary' as const,
        label: 'Pending',
        icon: <Clock className="h-3 w-3 mr-1" />,
      },
      failed: {
        variant: 'destructive' as const,
        label: 'Failed',
        icon: <XCircle className="h-3 w-3 mr-1" />,
      },
    }),
    []
  );

  const paymentStatusBadgeConfig = useMemo(
    () => ({
      paid: { variant: 'default' as const, label: 'Paid' },
      pending: { variant: 'secondary' as const, label: 'Pending' },
      failed: { variant: 'destructive' as const, label: 'Failed' },
      refunded: { variant: 'outline' as const, label: 'Refunded' },
    }),
    []
  );

  const getStatusBadge = (status: string) => {
    const config = statusBadgeConfig[status] || statusBadgeConfig.pending;
    return (
      <Badge variant={config.variant} className="flex items-center w-fit">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const config = paymentStatusBadgeConfig[status] || paymentStatusBadgeConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <MarketplaceLayout>
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">My Orders</h1>
          <p className="text-muted-foreground mt-1">
            View your order history and payment details
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
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
                Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Spent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(stats.totalSpent)}</div>
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
                  placeholder="Search orders or listings..."
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
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="space-y-4">
          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">No orders found</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {currentSearch || currentStatus !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Start shopping to see your orders here'}
                </p>
                <Button asChild>
                  <Link to="/marketplace/browse">Browse Marketplace</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-6">
                  {/* Order Header */}
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 pb-4 border-b">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{order.orderNumber}</h3>
                        {getStatusBadge(order.status)}
                        {getPaymentStatusBadge(order.paymentStatus)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Placed on {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <AvatarImage
                        src={order.customer?.avatarUrl}
                        alt={order.customer?.name || 'Customer avatar'}
                        className="h-10 w-10"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {order.customer?.name || 'Marketplace Customer'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.customer?.email || 'Contact details unavailable'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-2xl font-bold">{formatPrice(order.totalCents)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-3 mb-4">
                    <p className="text-sm font-medium">Items:</p>
                    {order.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-4 py-3 px-3 bg-muted rounded"
                      >
                        <div className="flex items-center gap-3">
                          <ThumbnailImage
                            src={item.listing.thumbnailUrl}
                            alt={item.listing.title}
                            className="h-12 w-12 rounded"
                            aspectRatio="1/1"
                          />
                          <div>
                            <Link
                              to={`/marketplace/listings/${item.listing.id}`}
                              className="text-sm font-medium hover:text-primary"
                            >
                              {item.listing.title}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              License: {item.licensePlan?.name || 'Standard'}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-medium">
                          {formatPrice(item.priceCents)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Payment Details */}
                  {order.razorpayPaymentId && (
                    <div className="text-xs text-muted-foreground mb-4">
                      <p>Payment ID: {order.razorpayPaymentId}</p>
                      <p>Order ID: {order.razorpayOrderId}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/marketplace/orders/${order.id}`}>
                        <FileText className="mr-2 h-4 w-4" />
                        View Details
                      </Link>
                    </Button>

                    {order.status === 'completed' && (
                      <>
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/api/marketplace/orders/${order.id}/invoice`} download>
                            <Download className="mr-2 h-4 w-4" />
                            Download Invoice
                          </a>
                        </Button>
                        <Button size="sm" asChild>
                          <Link to="/marketplace/purchases">
                            View Purchases
                          </Link>
                        </Button>
                      </>
                    )}

                    {order.status === 'pending' && (
                      <Button size="sm" asChild>
                        <Link to={`/marketplace/checkout?orderId=${order.id}`}>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Complete Payment
                        </Link>
                      </Button>
                    )}

                    {order.status === 'failed' && (
                      <Button size="sm" asChild>
                        <Link to={`/marketplace/checkout?retry=${order.id}`}>
                          Retry Payment
                        </Link>
                      </Button>
                    )}
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

export const ErrorBoundary = MarketplaceErrorBoundary;