import React, { useState, Suspense } from 'react';
import { json, type LoaderFunctionArgs } from '~/lib/router-utils';
import { useLoaderData } from 'react-router';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Badge } from '~/components/ui/badge';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  ShoppingCart,
  Download,
  Star,
  Users,
  Package,
  Calendar,
  FileDown,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react';
import { cn } from '~/lib/utils';
import { marketplaceApi } from '~/lib/marketplace/api-client';
import { DashboardStatsSkeleton, ChartSkeleton, TableSkeleton } from '~/components/marketplace/LoadingSkeletons';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const period = url.searchParams.get('period') || '30d';

  try {
    // Map period to API format
    const apiPeriod = period === '7d' ? 'week' : period === '30d' ? 'month' : 'year';
    
    const response = await marketplaceApi.seller.analytics(apiPeriod as 'week' | 'month' | 'year');
    
    const analytics = response.analytics;
    const recentOrders = response.recentOrders || [];
    
    // Calculate overview metrics with change percentages
    const overview = {
      totalRevenue: analytics.total_sales_cents || 0,
      revenueChange: 0, // TODO: Calculate from previous period
      totalOrders: analytics.total_orders || 0,
      ordersChange: 0,
      totalViews: analytics.total_views || 0,
      viewsChange: 0,
      conversionRate: analytics.conversion_rate || 0,
      conversionChange: 0,
    };
    
    return json({
      user: null, // TODO: Get from session
      period,
      overview,
      revenueChart: [], // TODO: Add time-series data from backend
      trafficChart: [],
      topListings: [], // TODO: Add from backend
      recentOrders,
      geographicData: [],
      conversionFunnel: {
        views: analytics.total_views || 0,
        addedToCart: Math.floor((analytics.total_views || 0) * 0.15), // Estimate
        purchases: analytics.total_orders || 0,
      },
    });
  } catch (error) {
    console.error('Failed to fetch seller analytics:', error);
    return json({
      user: null,
      period,
      overview: {
        totalRevenue: 0,
        revenueChange: 0,
        totalOrders: 0,
        ordersChange: 0,
        totalViews: 0,
        viewsChange: 0,
        conversionRate: 0,
        conversionChange: 0,
      },
      revenueChart: [],
      trafficChart: [],
      topListings: [],
      recentOrders: [],
      geographicData: [],
      conversionFunnel: {
        views: 0,
        addedToCart: 0,
        purchases: 0,
      },
    });
  }
}

function SellerAnalyticsContent() {
  const data = useLoaderData<typeof loader>();
  const [period, setPeriod] = useState(data.period);

  const formatCurrency = (cents: number) => {
    return `₹${(cents / 100).toLocaleString('en-IN')}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const getChangeIcon = (change: number) => {
    return change >= 0 ? ArrowUpRight : ArrowDownRight;
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const exportReport = () => {
    // TODO: Implement export functionality
    console.log('Exporting report...');
  };

  return (
    <MarketplaceLayout user={data.user}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Analytics</h1>
          <p className="text-muted-foreground">
            Track your performance and insights
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportReport}>
            <FileDown className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.overview.totalRevenue)}
            </div>
            <div className={cn('flex items-center text-sm mt-1', getChangeColor(data.overview.revenueChange))}>
              {React.createElement(getChangeIcon(data.overview.revenueChange), { className: 'h-4 w-4 mr-1' })}
              <span>{Math.abs(data.overview.revenueChange)}% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.overview.totalOrders.toLocaleString()}
            </div>
            <div className={cn('flex items-center text-sm mt-1', getChangeColor(data.overview.ordersChange))}>
              {React.createElement(getChangeIcon(data.overview.ordersChange), { className: 'h-4 w-4 mr-1' })}
              <span>{Math.abs(data.overview.ordersChange)}% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(data.overview.totalViews)}
            </div>
            <div className={cn('flex items-center text-sm mt-1', getChangeColor(data.overview.viewsChange))}>
              {React.createElement(getChangeIcon(data.overview.viewsChange), { className: 'h-4 w-4 mr-1' })}
              <span>{Math.abs(data.overview.viewsChange)}% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.overview.conversionRate.toFixed(2)}%
            </div>
            <div className={cn('flex items-center text-sm mt-1', getChangeColor(data.overview.conversionChange))}>
              {React.createElement(getChangeIcon(data.overview.conversionChange), { className: 'h-4 w-4 mr-1' })}
              <span>{Math.abs(data.overview.conversionChange)}% from last period</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="revenue" className="space-y-6">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          <TabsTrigger value="listings">Top Listings</TabsTrigger>
          <TabsTrigger value="geography">Geography</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Over Time</CardTitle>
              <CardDescription>
                Your earnings for the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.revenueChart.length > 0 ? (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  {/* TODO: Add chart component (e.g., Recharts) */}
                  <p>Revenue chart will be displayed here</p>
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center">
                  <div className="text-center">
                    <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No revenue data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest purchases from your listings</CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentOrders.length > 0 ? (
                <div className="space-y-4">
                  {data.recentOrders.map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-muted rounded-lg" />
                        <div>
                          <p className="font-medium">{order.listing.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.buyer.name}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(order.amount)}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No orders yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Traffic Tab */}
        <TabsContent value="traffic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Traffic Overview</CardTitle>
              <CardDescription>
                Views and engagement metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.trafficChart.length > 0 ? (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  {/* TODO: Add chart component */}
                  <p>Traffic chart will be displayed here</p>
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center">
                  <div className="text-center">
                    <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No traffic data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Conversion Funnel */}
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
              <CardDescription>
                How visitors convert to customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Views</span>
                    <span className="text-sm text-muted-foreground">
                      {data.conversionFunnel.views.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '100%' }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Added to Cart</span>
                    <span className="text-sm text-muted-foreground">
                      {data.conversionFunnel.addedToCart.toLocaleString()} (
                      {data.conversionFunnel.views > 0
                        ? ((data.conversionFunnel.addedToCart / data.conversionFunnel.views) * 100).toFixed(1)
                        : 0}
                      %)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: data.conversionFunnel.views > 0
                          ? `${(data.conversionFunnel.addedToCart / data.conversionFunnel.views) * 100}%`
                          : '0%',
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Purchases</span>
                    <span className="text-sm text-muted-foreground">
                      {data.conversionFunnel.purchases.toLocaleString()} (
                      {data.conversionFunnel.views > 0
                        ? ((data.conversionFunnel.purchases / data.conversionFunnel.views) * 100).toFixed(1)
                        : 0}
                      %)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: data.conversionFunnel.views > 0
                          ? `${(data.conversionFunnel.purchases / data.conversionFunnel.views) * 100}%`
                          : '0%',
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Listings Tab */}
        <TabsContent value="listings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Listings</CardTitle>
              <CardDescription>
                Your best-selling products
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.topListings.length > 0 ? (
                <div className="space-y-4">
                  {data.topListings.map((listing: any, index: number) => (
                    <div key={listing.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div className="w-16 h-16 bg-muted rounded-lg" />
                      <div className="flex-1">
                        <p className="font-medium">{listing.title}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Eye className="h-4 w-4" />
                            {formatNumber(listing.views)} views
                          </span>
                          <span className="flex items-center gap-1">
                            <ShoppingCart className="h-4 w-4" />
                            {listing.sales} sales
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            {listing.rating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(listing.revenue)}</p>
                        <p className="text-sm text-muted-foreground">Revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No listings data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Geography Tab */}
        <TabsContent value="geography" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Geographic Distribution</CardTitle>
              <CardDescription>
                Where your customers are from
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.geographicData.length > 0 ? (
                <div className="space-y-4">
                  {data.geographicData.map((location: any) => (
                    <div key={location.country} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{location.country}</p>
                          <p className="text-sm text-muted-foreground">
                            {location.orders} orders
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(location.revenue)}</p>
                        <p className="text-sm text-muted-foreground">
                          {location.percentage}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No geographic data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MarketplaceLayout>
  );
}

export default function SellerAnalyticsPage() {
  return (
    <Suspense fallback={
      <MarketplaceLayout>
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Analytics</h1>
          <p className="text-muted-foreground">Track your performance and insights</p>
        </div>
        <DashboardStatsSkeleton count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <div className="mt-6">
          <ChartSkeleton height={400} />
        </div>
      </MarketplaceLayout>
    }>
      <SellerAnalyticsContent />
    </Suspense>
  );
}