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
  Users,
  Package,
  ShoppingCart,
  Star,
  Download,
  FileDown,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Percent,
} from 'lucide-react';
import { cn } from '~/lib/utils';
import { marketplaceApi } from '~/lib/marketplace/api-client';
import { DashboardStatsSkeleton, ChartSkeleton, TableSkeleton } from '~/components/marketplace/LoadingSkeletons';
import { ThumbnailImage } from '~/components/marketplace/OptimizedImage';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const period = url.searchParams.get('period') || '30d';

  // TODO: Check if user is admin
  
  try {
    const response = await marketplaceApi.admin.analytics();
    const analytics = response.analytics;
    
    // Calculate platform fees (10% of revenue)
    const platformFees = Math.floor((analytics.platform_revenue_cents || 0) * 0.1);
    
    // Calculate average order value
    const avgOrderValue = analytics.total_orders > 0 
      ? Math.floor(analytics.platform_revenue_cents / analytics.total_orders)
      : 0;
    
    return json({
      user: {
        id: 'user-1',
        name: 'Admin User',
        email: 'admin@example.com',
        isAdmin: true,
      },
      period,
      overview: {
        totalRevenue: analytics.platform_revenue_cents || 0,
        revenueChange: 0, // TODO: Calculate from time-series data
        platformFees,
        feesChange: 0,
        totalOrders: analytics.total_orders || 0,
        ordersChange: 0,
        newUsers: analytics.total_users || 0,
        usersChange: 0,
        newSellers: analytics.total_sellers || 0,
        sellersChange: 0,
        newListings: analytics.total_listings || 0,
        listingsChange: 0,
        averageOrderValue: avgOrderValue,
        aovChange: 0,
        conversionRate: 0, // TODO: Calculate conversion rate
        conversionChange: 0,
      },
      revenueChart: analytics.revenue_by_day || [],
      ordersChart: analytics.orders_by_day || [],
      userGrowthChart: analytics.users_by_day || [],
      topCategories: analytics.category_performance || [],
      topSellers: (analytics.top_sellers || []).map(seller => ({
        id: seller.seller_id,
        name: seller.seller_name,
        revenue: seller.revenue,
        sales: seller.sales,
        avatar: null,
      })),
      topListings: (analytics.top_listings || []).map(listing => ({
        id: listing.listing_id,
        title: listing.listing_title,
        sales: listing.sales,
        revenue: listing.revenue,
        thumbnail: null,
      })),
      categoryPerformance: analytics.category_performance || [],
    });
  } catch (error) {
    console.error('Failed to load admin analytics:', error);
    return json({
      user: {
        id: 'user-1',
        name: 'Admin User',
        email: 'admin@example.com',
        isAdmin: true,
      },
      period,
      overview: {
        totalRevenue: 0,
        revenueChange: 0,
        platformFees: 0,
        feesChange: 0,
        totalOrders: 0,
        ordersChange: 0,
        newUsers: 0,
        usersChange: 0,
        newSellers: 0,
        sellersChange: 0,
        newListings: 0,
        listingsChange: 0,
        averageOrderValue: 0,
        aovChange: 0,
        conversionRate: 0,
        conversionChange: 0,
      },
      revenueChart: [],
      ordersChart: [],
      userGrowthChart: [],
      topCategories: [],
      topSellers: [],
      topListings: [],
      categoryPerformance: [],
    });
  }
}

function AdminAnalyticsContent() {
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
          <h1 className="text-4xl font-bold mb-2">Platform Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive marketplace insights and metrics
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
            <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.overview.platformFees)}
            </div>
            <div className={cn('flex items-center text-sm mt-1', getChangeColor(data.overview.feesChange))}>
              {React.createElement(getChangeIcon(data.overview.feesChange), { className: 'h-4 w-4 mr-1' })}
              <span>{Math.abs(data.overview.feesChange)}% from last period</span>
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
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.overview.averageOrderValue)}
            </div>
            <div className={cn('flex items-center text-sm mt-1', getChangeColor(data.overview.aovChange))}>
              {React.createElement(getChangeIcon(data.overview.aovChange), { className: 'h-4 w-4 mr-1' })}
              <span>{Math.abs(data.overview.aovChange)}% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">New Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.overview.newUsers.toLocaleString()}
            </div>
            <div className={cn('flex items-center text-sm mt-1', getChangeColor(data.overview.usersChange))}>
              {React.createElement(getChangeIcon(data.overview.usersChange), { className: 'h-4 w-4 mr-1' })}
              <span>{Math.abs(data.overview.usersChange)}% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">New Sellers</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.overview.newSellers.toLocaleString()}
            </div>
            <div className={cn('flex items-center text-sm mt-1', getChangeColor(data.overview.sellersChange))}>
              {React.createElement(getChangeIcon(data.overview.sellersChange), { className: 'h-4 w-4 mr-1' })}
              <span>{Math.abs(data.overview.sellersChange)}% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">New Listings</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.overview.newListings.toLocaleString()}
            </div>
            <div className={cn('flex items-center text-sm mt-1', getChangeColor(data.overview.listingsChange))}>
              {React.createElement(getChangeIcon(data.overview.listingsChange), { className: 'h-4 w-4 mr-1' })}
              <span>{Math.abs(data.overview.listingsChange)}% from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
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
          <TabsTrigger value="users">User Growth</TabsTrigger>
          <TabsTrigger value="sellers">Top Sellers</TabsTrigger>
          <TabsTrigger value="listings">Top Listings</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Over Time</CardTitle>
                <CardDescription>
                  Platform revenue trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.revenueChart.length > 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    {/* TODO: Add chart component */}
                    <p>Revenue chart will be displayed here</p>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-center">
                      <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No revenue data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Orders Over Time</CardTitle>
                <CardDescription>
                  Order volume trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.ordersChart.length > 0 ? (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    {/* TODO: Add chart component */}
                    <p>Orders chart will be displayed here</p>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center">
                    <div className="text-center">
                      <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No orders data available</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* User Growth Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Growth</CardTitle>
              <CardDescription>
                New users and sellers over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.userGrowthChart.length > 0 ? (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  {/* TODO: Add chart component */}
                  <p>User growth chart will be displayed here</p>
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center">
                  <div className="text-center">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No user growth data available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Sellers Tab */}
        <TabsContent value="sellers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Sellers</CardTitle>
              <CardDescription>
                Sellers with highest revenue
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.topSellers.length > 0 ? (
                <div className="space-y-4">
                  {data.topSellers.map((seller: any, index: number) => (
                    <div key={seller.id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold">
                        {index + 1}
                      </div>
                      <div className="w-12 h-12 bg-muted rounded-full" />
                      <div className="flex-1">
                        <p className="font-medium">{seller.name}</p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ShoppingCart className="h-4 w-4" />
                            {seller.totalSales} sales
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            {seller.totalListings} listings
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            {seller.rating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(seller.revenue)}</p>
                        <p className="text-sm text-muted-foreground">Revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No seller data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Listings Tab */}
        <TabsContent value="listings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Listings</CardTitle>
              <CardDescription>
                Best-selling products on the platform
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
                        <p className="text-sm text-muted-foreground">
                          by {listing.seller.name}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ShoppingCart className="h-4 w-4" />
                            {listing.sales} sales
                          </span>
                          <span className="flex items-center gap-1">
                            <Download className="h-4 w-4" />
                            {listing.downloads} downloads
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
                  <p className="text-muted-foreground">No listing data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Category Performance</CardTitle>
              <CardDescription>
                Revenue and listings by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.categoryPerformance.length > 0 ? (
                <div className="space-y-4">
                  {data.categoryPerformance.map((category: any) => (
                    <div key={category.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Package className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{category.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {category.listingCount} listings
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(category.revenue)}</p>
                          <p className="text-sm text-muted-foreground">
                            {category.sales} sales
                          </p>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${category.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No category data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MarketplaceLayout>
  );
}

// Wrap with Suspense for loading states
export default function AdminAnalyticsPage() {
  return (
    <Suspense fallback={
      <MarketplaceLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Platform Analytics</h1>
              <p className="text-muted-foreground">
                Comprehensive marketplace insights and metrics
              </p>
            </div>
          </div>
          <DashboardStatsSkeleton count={6} />
          <ChartSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TableSkeleton rows={5} />
            <TableSkeleton rows={5} />
          </div>
        </div>
      </MarketplaceLayout>
    }>
      <AdminAnalyticsContent />
    </Suspense>
  );
}