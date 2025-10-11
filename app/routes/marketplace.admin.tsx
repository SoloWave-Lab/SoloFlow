import React, { Suspense } from 'react';
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
import { Badge } from '~/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import {
  DollarSign,
  Users,
  Package,
  ShoppingCart,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Flag,
  Eye,
  ArrowRight,
  Activity,
  FileText,
} from 'lucide-react';
import { cn } from '~/lib/utils';
import { marketplaceApi } from '~/lib/marketplace/api-client';
import { DashboardStatsSkeleton, ChartSkeleton, TableSkeleton } from '~/components/marketplace/LoadingSkeletons';
import { AvatarImage as OptimizedAvatar } from '~/components/marketplace/OptimizedImage';

export async function loader({ request }: LoaderFunctionArgs) {
  // TODO: Check if user is admin
  // const user = await getUser(request);
  // if (!user.isAdmin) {
  //   return redirect('/marketplace');
  // }

  try {
    const [analyticsResponse, moderationResponse, disputesResponse] = await Promise.all([
      marketplaceApi.admin.analytics(),
      marketplaceApi.admin.moderation.list(),
      marketplaceApi.admin.disputes.list(),
    ]);

    const analytics = analyticsResponse.analytics;
    const pendingModeration = moderationResponse.listings || [];
    const disputes = disputesResponse.disputes || [];

    return json({
      user: {
        id: 'user-1',
        name: 'Admin User',
        email: 'admin@example.com',
        isAdmin: true,
      },
      stats: {
        totalRevenue: analytics.platform_revenue_cents || 0,
        platformFees: Math.floor((analytics.platform_revenue_cents || 0) * 0.1), // 10% platform fee
        totalUsers: analytics.total_users || 0,
        totalSellers: analytics.total_sellers || 0,
        totalListings: analytics.total_listings || 0,
        publishedListings: (analytics.total_listings || 0) - (analytics.pending_moderation || 0),
        pendingListings: analytics.pending_moderation || 0,
        totalOrders: analytics.total_orders || 0,
        pendingDisputes: analytics.open_disputes || 0,
      },
      recentActivity: [],
      pendingModeration: pendingModeration.slice(0, 5),
      recentDisputes: disputes.slice(0, 5),
      topSellers: analytics.top_sellers || [],
      alerts: analytics.pending_moderation > 10 ? [{
        id: 'moderation-alert',
        title: 'High Moderation Queue',
        message: `${analytics.pending_moderation} listings are awaiting moderation`,
        link: '/marketplace/admin/moderation',
      }] : [],
    });
  } catch (error) {
    console.error('Failed to load admin dashboard:', error);
    return json({
      user: {
        id: 'user-1',
        name: 'Admin User',
        email: 'admin@example.com',
        isAdmin: true,
      },
      stats: {
        totalRevenue: 0,
        platformFees: 0,
        totalUsers: 0,
        totalSellers: 0,
        totalListings: 0,
        publishedListings: 0,
        pendingListings: 0,
        totalOrders: 0,
        pendingDisputes: 0,
      },
      recentActivity: [],
      pendingModeration: [],
      recentDisputes: [],
      topSellers: [],
      alerts: [],
    });
  }
}

function AdminDashboardContent() {
  const data = useLoaderData<typeof loader>();
  const { stats } = data;

  const formatCurrency = (cents: number) => {
    return `₹${(cents / 100).toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, any> = {
      order: ShoppingCart,
      listing: Package,
      user: Users,
      dispute: Flag,
      payout: DollarSign,
    };
    return icons[type] || Activity;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      approved: 'bg-green-100 text-green-700 border-green-200',
      rejected: 'bg-red-100 text-red-700 border-red-200',
      completed: 'bg-blue-100 text-blue-700 border-blue-200',
    };
    return colors[status] || colors.pending;
  };

  return (
    <MarketplaceLayout user={data.user}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Platform overview and management
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/marketplace/admin/analytics">
              <TrendingUp className="mr-2 h-4 w-4" />
              Analytics
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/marketplace/admin/moderation">
              <FileText className="mr-2 h-4 w-4" />
              Moderation
            </Link>
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="mb-8 space-y-4">
          {data.alerts.map((alert: any) => (
            <Card key={alert.id} className="border-orange-200 bg-orange-50">
              <CardContent className="p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-orange-900">{alert.title}</p>
                  <p className="text-sm text-orange-700">{alert.message}</p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link to={alert.link}>View</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Platform fees: {formatCurrency(stats.platformFees)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalUsers.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalSellers} sellers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Listings</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalListings.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.publishedListings} published, {stats.pendingListings} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalOrders.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All time
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Pending Moderation */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pending Moderation</CardTitle>
                <CardDescription>
                  Listings awaiting review
                </CardDescription>
              </div>
              {stats.pendingListings > 0 && (
                <Badge variant="secondary">{stats.pendingListings}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {data.pendingModeration.length > 0 ? (
              <div className="space-y-4">
                {data.pendingModeration.slice(0, 5).map((listing: any) => (
                  <div key={listing.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="w-12 h-12 bg-muted rounded-lg" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{listing.title}</p>
                      <p className="text-sm text-muted-foreground">
                        by {listing.seller.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Clock className="inline h-3 w-3 mr-1" />
                        {formatDate(listing.submittedAt)}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/marketplace/admin/moderation?listing=${listing.id}`}>
                        Review
                      </Link>
                    </Button>
                  </div>
                ))}
                {stats.pendingListings > 5 && (
                  <Button variant="ghost" className="w-full" asChild>
                    <Link to="/marketplace/admin/moderation">
                      View all {stats.pendingListings} pending
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">All caught up!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Disputes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Disputes</CardTitle>
                <CardDescription>
                  Issues requiring attention
                </CardDescription>
              </div>
              {stats.pendingDisputes > 0 && (
                <Badge variant="destructive">{stats.pendingDisputes}</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {data.recentDisputes.length > 0 ? (
              <div className="space-y-4">
                {data.recentDisputes.slice(0, 5).map((dispute: any) => (
                  <div key={dispute.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <Flag className="h-5 w-5 text-orange-600 mt-1" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{dispute.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        Order #{dispute.orderId}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(dispute.createdAt)}
                      </p>
                    </div>
                    <Badge variant="outline" className={getStatusColor(dispute.status)}>
                      {dispute.status}
                    </Badge>
                  </div>
                ))}
                <Button variant="ghost" className="w-full" asChild>
                  <Link to="/marketplace/admin/disputes">
                    View all disputes
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">No active disputes</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest platform events
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {data.recentActivity.map((activity: any) => {
                  const Icon = getActivityIcon(activity.type);
                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="p-2 bg-muted rounded-lg">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{activity.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Sellers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Sellers</CardTitle>
            <CardDescription>
              Best performing sellers this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.topSellers.length > 0 ? (
              <div className="space-y-4">
                {data.topSellers.map((seller: any, index: number) => (
                  <div key={seller.id} className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-bold">
                      {index + 1}
                    </div>
                    <OptimizedAvatar
                      src={seller.avatar}
                      alt={seller.name}
                      name={seller.name}
                      size={40}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{seller.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {seller.sales} sales
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(seller.revenue)}</p>
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
      </div>
    </MarketplaceLayout>
  );
}

// Wrap with Suspense for loading states
export default function AdminDashboard() {
  return (
    <Suspense fallback={
      <MarketplaceLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Platform overview and management
            </p>
          </div>
          <DashboardStatsSkeleton count={4} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TableSkeleton rows={5} />
            <TableSkeleton rows={5} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TableSkeleton rows={5} />
            <TableSkeleton rows={5} />
          </div>
        </div>
      </MarketplaceLayout>
    }>
      <AdminDashboardContent />
    </Suspense>
  );
}