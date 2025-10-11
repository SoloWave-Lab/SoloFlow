import React, { Suspense, useState } from 'react';
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
  CardFooter,
} from '~/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Badge } from '~/components/ui/badge';
import { Progress } from '~/components/ui/progress';
import {
  AlertDialog as Dialog,
  AlertDialogContent as DialogContent,
  AlertDialogDescription as DialogDescription,
  AlertDialogFooter as DialogFooter,
  AlertDialogHeader as DialogHeader,
  AlertDialogTitle as DialogTitle,
  AlertDialogTrigger as DialogTrigger,
  AlertDialogCancel,
  AlertDialogAction,
} from '~/components/ui/alert-dialog';
import {
  CheckCircle,
  X,
  Download,
  Calendar,
  CreditCard,
  AlertCircle,
  TrendingUp,
  Package,
  Zap,
  Crown,
  Star,
} from 'lucide-react';
import { cn } from '~/lib/utils';
import { marketplaceApi } from '~/lib/marketplace/api-client';
import { TableSkeleton } from '~/components/marketplace/LoadingSkeletons';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const response = await marketplaceApi.subscriptions.list();
    const subscriptions = response.subscriptions || [];
    
    // Separate active and inactive subscriptions
    const activeSubscriptions = subscriptions.filter(
      sub => sub.status === 'active' || sub.status === 'trialing'
    );
    const subscriptionHistory = subscriptions.filter(
      sub => sub.status === 'canceled' || sub.status === 'expired'
    );
    
    // TODO: Fetch available plans from sellers
    const availablePlans: any[] = [];
    
    return json({
      user: null, // TODO: Get from session
      activeSubscriptions,
      availablePlans,
      subscriptionHistory,
    });
  } catch (error) {
    console.error('Failed to fetch subscriptions:', error);
    return json({
      user: null,
      activeSubscriptions: [],
      availablePlans: [],
      subscriptionHistory: [],
    });
  }
}

function SubscriptionsPageContent() {
  const data = useLoaderData<typeof loader>();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);

  const formatCurrency = (cents: number) => {
    return `₹${(cents / 100).toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPlanIcon = (tier: string) => {
    switch (tier) {
      case 'premium':
        return Crown;
      case 'pro':
        return Star;
      default:
        return Package;
    }
  };

  const getPlanColor = (tier: string) => {
    switch (tier) {
      case 'premium':
        return 'bg-gradient-to-br from-yellow-400 to-orange-500';
      case 'pro':
        return 'bg-gradient-to-br from-blue-400 to-purple-500';
      default:
        return 'bg-gradient-to-br from-gray-400 to-gray-600';
    }
  };

  return (
    <MarketplaceLayout user={data.user}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Subscriptions</h1>
        <p className="text-muted-foreground">
          Manage your subscription plans and download credits
        </p>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active">
            Active Subscriptions ({data.activeSubscriptions.length})
          </TabsTrigger>
          <TabsTrigger value="available">
            Available Plans ({data.availablePlans.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            History ({data.subscriptionHistory.length})
          </TabsTrigger>
        </TabsList>

        {/* Active Subscriptions */}
        <TabsContent value="active" className="space-y-6">
          {data.activeSubscriptions.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {data.activeSubscriptions.map((subscription: any) => {
                const Icon = getPlanIcon(subscription.plan.tier);
                const usagePercent = (subscription.downloadsUsed / subscription.plan.downloadsPerMonth) * 100;

                return (
                  <Card key={subscription.id} className="relative overflow-hidden">
                    <div className={cn('absolute top-0 left-0 right-0 h-2', getPlanColor(subscription.plan.tier))} />
                    
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={cn('p-2 rounded-lg text-white', getPlanColor(subscription.plan.tier))}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div>
                            <CardTitle>{subscription.plan.name}</CardTitle>
                            <CardDescription>
                              {subscription.seller.name}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                          {subscription.status}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Download Usage */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Downloads Used</span>
                          <span className="font-medium">
                            {subscription.downloadsUsed} / {subscription.plan.downloadsPerMonth}
                          </span>
                        </div>
                        <Progress value={usagePercent} className="h-2" />
                        {usagePercent >= 80 && (
                          <p className="text-sm text-orange-600 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            Running low on downloads
                          </p>
                        )}
                      </div>

                      {/* Billing Info */}
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Next Billing</p>
                          <p className="font-medium flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(subscription.nextBillingDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Amount</p>
                          <p className="font-medium flex items-center gap-1">
                            <CreditCard className="h-4 w-4" />
                            {formatCurrency(subscription.plan.price)}
                          </p>
                        </div>
                      </div>

                      {/* Features */}
                      <div className="pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Included Features:</p>
                        <ul className="space-y-1">
                          {subscription.plan.features.slice(0, 3).map((feature: string, index: number) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>

                    <CardFooter className="flex gap-2">
                      <Button variant="outline" className="flex-1" asChild>
                        <Link to={`/marketplace/sellers/${subscription.seller.id}`}>
                          View Seller
                        </Link>
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => {
                          setSelectedSubscription(subscription);
                          setCancelDialogOpen(true);
                        }}
                      >
                        Cancel
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Package className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Active Subscriptions</h3>
                <p className="text-muted-foreground text-center mb-6">
                  Subscribe to a plan to get unlimited downloads and exclusive content
                </p>
                <Button asChild>
                  <Link to="#available">Browse Available Plans</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Available Plans */}
        <TabsContent value="available" className="space-y-6">
          {data.availablePlans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.availablePlans.map((plan: any) => {
                const Icon = getPlanIcon(plan.tier);
                const isPopular = plan.tier === 'pro';

                return (
                  <Card key={plan.id} className={cn('relative', isPopular && 'border-primary shadow-lg')}>
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary">Most Popular</Badge>
                      </div>
                    )}

                    <CardHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={cn('p-2 rounded-lg text-white', getPlanColor(plan.tier))}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <CardTitle>{plan.name}</CardTitle>
                          <CardDescription>{plan.seller.name}</CardDescription>
                        </div>
                      </div>
                      <div className="pt-4">
                        <span className="text-4xl font-bold">{formatCurrency(plan.price)}</span>
                        <span className="text-muted-foreground">/{plan.interval}</span>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Download className="h-4 w-4 text-primary" />
                        <span className="font-medium">
                          {plan.downloadsPerMonth === -1
                            ? 'Unlimited'
                            : plan.downloadsPerMonth}{' '}
                          downloads per {plan.interval}
                        </span>
                      </div>

                      <ul className="space-y-2">
                        {plan.features.map((feature: string, index: number) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>

                    <CardFooter>
                      <Button className="w-full" asChild>
                        <Link to={`/marketplace/subscriptions/${plan.id}/subscribe`}>
                          Subscribe Now
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Package className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Plans Available</h3>
                <p className="text-muted-foreground text-center">
                  Check back later for subscription plans
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Subscription History */}
        <TabsContent value="history" className="space-y-4">
          {data.subscriptionHistory.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {data.subscriptionHistory.map((item: any) => (
                    <div key={item.id} className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn('p-2 rounded-lg text-white', getPlanColor(item.plan.tier))}>
                          {React.createElement(getPlanIcon(item.plan.tier), { className: 'h-5 w-5' })}
                        </div>
                        <div>
                          <p className="font-medium">{item.plan.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.seller.name}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(item.amount)}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(item.date)}
                        </p>
                      </div>

                      <Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No History</h3>
                <p className="text-muted-foreground text-center">
                  Your subscription history will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Cancel Subscription Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your subscription to{' '}
              <strong>{selectedSubscription?.plan.name}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Your subscription will remain active until{' '}
                <strong>{selectedSubscription && formatDate(selectedSubscription.nextBillingDate)}</strong>.
                After that, you'll lose access to:
              </p>
              <ul className="mt-2 space-y-1">
                {selectedSubscription?.plan.features.slice(0, 3).map((feature: string, index: number) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <X className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                // TODO: Cancel subscription
                setCancelDialogOpen(false);
              }}
            >
              Cancel Subscription
            </AlertDialogAction>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MarketplaceLayout>
  );
}

export default function SubscriptionsPage() {
  return (
    <Suspense
      fallback={
        <MarketplaceLayout user={null}>
          <div className="space-y-8">
            {/* Header Skeleton */}
            <div className="space-y-2">
              <div className="h-10 w-64 bg-muted animate-pulse rounded" />
              <div className="h-5 w-96 bg-muted animate-pulse rounded" />
            </div>

            {/* Tabs Skeleton */}
            <div className="space-y-6">
              <div className="flex gap-2">
                <div className="h-10 w-32 bg-muted animate-pulse rounded" />
                <div className="h-10 w-32 bg-muted animate-pulse rounded" />
                <div className="h-10 w-32 bg-muted animate-pulse rounded" />
              </div>

              {/* Subscription Cards Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <div className="space-y-2">
                        <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                        <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="h-20 w-full bg-muted animate-pulse rounded" />
                      <div className="h-10 w-full bg-muted animate-pulse rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </MarketplaceLayout>
      }
    >
      <SubscriptionsPageContent />
    </Suspense>
  );
}