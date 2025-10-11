import React from 'react';
import { json, type LoaderFunctionArgs } from '~/lib/router-utils';
import { useLoaderData, Link } from 'react-router';
import { MarketplaceLayout } from '~/components/marketplace/MarketplaceLayout';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import {
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  Plus,
  Eye,
  Download,
  Star,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Progress } from '~/components/ui/progress';
import { marketplaceApi } from '~/lib/marketplace/api-client';
import { requireSeller } from '~/lib/marketplace/auth-helpers';
import { MarketplaceErrorBoundary } from '~/components/marketplace/ErrorBoundary';

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireSeller(request);
  
  try {
    // Fetch seller dashboard data and recent orders in parallel
    const [dashboardData, ordersResponse] = await Promise.all([
      marketplaceApi.seller.getDashboard(),
      marketplaceApi.seller.getOrders({ page: 1, limit: 5 }),
    ]);

    return json({
      user,
      dashboard: dashboardData,
      recentOrders: ordersResponse.data || [],
      topListings: dashboardData.topListings || [],
      revenueChart: dashboardData.revenueChart || [],
    });
  } catch (error) {
    console.error('Failed to load seller dashboard:', error);
    throw new Response('Failed to load seller dashboard', { status: 500 });
  }
}

export default function SellerDashboard() {
  const data = useLoaderData<typeof loader>();
  const { dashboard } = data;

  const formatCurrency = (cents: number) => {
    return `₹${(cents / 100).toLocaleString('en-IN')}`;
  };

  return (
    <MarketplaceLayout user={data.user}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Seller Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your listings and track your sales
          </p>
        </div>
        <Button size="lg" asChild>
          <Link to="/marketplace/seller/listings/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Listing
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboard.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Lifetime earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Available for Payout
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboard.availableForPayout)}
            </div>
            <Button variant="link" className="p-0 h-auto text-xs mt-1" asChild>
              <Link to="/marketplace/seller/payouts">Request Payout →</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">All time sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Active Listings
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard.publishedListings}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dashboard.draftListings} drafts, {dashboard.pendingListings}{' '}
              pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Eye className="h-8 w-8 text-primary" />
              <div>
                <div className="text-3xl font-bold">
                  {dashboard.totalViews.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all listings
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Total Downloads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Download className="h-8 w-8 text-primary" />
              <div>
                <div className="text-3xl font-bold">
                  {dashboard.totalDownloads.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Successful purchases
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Star className="h-8 w-8 text-yellow-400 fill-yellow-400" />
              <div>
                <div className="text-3xl font-bold">
                  {dashboard.averageRating > 0
                    ? dashboard.averageRating.toFixed(1)
                    : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dashboard.reviewCount} reviews
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Recent Orders</TabsTrigger>
          <TabsTrigger value="listings">Top Listings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common tasks to manage your marketplace presence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Button variant="outline" className="h-auto py-4" asChild>
                  <Link to="/marketplace/seller/listings/new">
                    <div className="flex flex-col items-center gap-2">
                      <Plus className="h-6 w-6" />
                      <span>Create Listing</span>
                    </div>
                  </Link>
                </Button>

                <Button variant="outline" className="h-auto py-4" asChild>
                  <Link to="/marketplace/seller/listings">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="h-6 w-6" />
                      <span>Manage Listings</span>
                    </div>
                  </Link>
                </Button>

                <Button variant="outline" className="h-auto py-4" asChild>
                  <Link to="/marketplace/seller/orders">
                    <div className="flex flex-col items-center gap-2">
                      <ShoppingCart className="h-6 w-6" />
                      <span>View Orders</span>
                    </div>
                  </Link>
                </Button>

                <Button variant="outline" className="h-auto py-4" asChild>
                  <Link to="/marketplace/seller/analytics">
                    <div className="flex flex-col items-center gap-2">
                      <TrendingUp className="h-6 w-6" />
                      <span>View Analytics</span>
                    </div>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pending Actions */}
          {dashboard.pendingListings > 0 && (
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  Pending Moderation
                </CardTitle>
                <CardDescription>
                  You have {dashboard.pendingListings} listing(s) awaiting
                  approval
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild>
                  <Link to="/marketplace/seller/listings?status=pending">
                    View Pending Listings
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Revenue Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Overview</CardTitle>
              <CardDescription>Your earnings over the last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    Revenue chart will appear here
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>
                Latest purchases of your listings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentOrders.length > 0 ? (
                <div className="space-y-4">
                  {data.recentOrders.map((order: any) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold">{order.listing.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          Order #{order.id.slice(0, 8)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">
                          {formatCurrency(order.totalCents)}
                        </p>
                        <Badge variant="secondary">{order.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Orders will appear here once customers purchase your listings
                  </p>
                  <Button asChild>
                    <Link to="/marketplace/seller/listings/new">
                      Create Your First Listing
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="listings">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Listings</CardTitle>
              <CardDescription>
                Your best-selling products this month
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.topListings.length > 0 ? (
                <div className="space-y-4">
                  {data.topListings.map((listing: any, index: number) => (
                    <div
                      key={listing.id}
                      className="flex items-center gap-4 p-4 border rounded-lg"
                    >
                      <div className="text-2xl font-bold text-muted-foreground">
                        #{index + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{listing.title}</h4>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {listing.views}
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="h-3 w-3" />
                            {listing.sales}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">
                          {formatCurrency(listing.revenue)}
                        </p>
                        <p className="text-sm text-muted-foreground">Revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No listings yet
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first listing to start selling
                  </p>
                  <Button asChild>
                    <Link to="/marketplace/seller/listings/new">
                      Create Listing
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Analytics</CardTitle>
                <CardDescription>
                  Comprehensive insights into your marketplace performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link to="/marketplace/seller/analytics">
                    View Full Analytics Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </MarketplaceLayout>
  );
}

export const ErrorBoundary = MarketplaceErrorBoundary;