import { json, type LoaderFunctionArgs } from '~/lib/router-utils';
import { useLoaderData, Link, useFetcher } from 'react-router';
import { MarketplaceLayout } from '~/components/marketplace/MarketplaceLayout';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';
import { Separator } from '~/components/ui/separator';
import { XCircle, RefreshCw, HelpCircle, ShoppingCart, Home, MessageCircle, Loader2 } from 'lucide-react';
import { marketplaceApi } from '~/lib/marketplace/api-client';
import { Suspense } from 'react';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const reason = url.searchParams.get('reason') || 'Payment failed';
  const orderId = url.searchParams.get('order_id');

  let order = null;
  
  if (orderId) {
    try {
      const response = await marketplaceApi.orders.get(orderId);
      const orderData = response.order;
      
      order = {
        id: orderData.id,
        orderNumber: orderData.order_number || `ORD-${orderData.id}`,
        totalCents: orderData.total_cents,
        items: orderData.items?.map(item => ({
          id: item.id,
          listing: {
            id: item.listing_id,
            title: item.listing?.title || 'Unknown Item',
            priceCents: item.price_cents,
          },
        })) || [],
      };
    } catch (error) {
      console.error('Failed to fetch order details:', error);
      // Order will remain null
    }
  }

  return json({ reason, order });
}

function PaymentFailureContent() {
  const { reason, order } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const formatPrice = (cents: number) => {
    return `₹${(cents / 100).toFixed(2)}`;
  };

  const handleRetryPayment = () => {
    if (order) {
      // TODO: Retry payment with the same order
      fetcher.submit(
        { intent: 'retry-payment', orderId: order.id },
        { method: 'post', action: '/api/marketplace/orders/retry' }
      );
    }
  };

  return (
    <MarketplaceLayout>
      <div className="container mx-auto py-12 px-4 max-w-4xl">
        {/* Failure Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
            <XCircle className="h-12 w-12 text-red-600" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Payment Failed</h1>
          <p className="text-xl text-muted-foreground">
            We couldn't process your payment. Please try again.
          </p>
        </div>

        {/* Error Alert */}
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Payment Error</AlertTitle>
          <AlertDescription>{reason}</AlertDescription>
        </Alert>

        {/* Order Details (if available) */}
        {order && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Order Number</p>
                  <p className="font-semibold">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Total Amount</p>
                  <p className="font-semibold text-lg">{formatPrice(order.totalCents)}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">Items in Order</h3>
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <span>{item.listing.title}</span>
                      <span className="font-semibold">{formatPrice(item.listing.priceCents)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Retry Payment Button */}
              <Button
                onClick={handleRetryPayment}
                className="w-full"
                size="lg"
                disabled={fetcher.state !== 'idle'}
              >
                {fetcher.state !== 'idle' ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-5 w-5" />
                )}
                {fetcher.state !== 'idle' ? 'Processing...' : 'Retry Payment'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Common Reasons */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Common Reasons for Payment Failure
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Insufficient Balance</p>
                  <p className="text-muted-foreground">
                    Your card or account doesn't have enough funds to complete the transaction.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Incorrect Card Details</p>
                  <p className="text-muted-foreground">
                    The card number, CVV, or expiry date entered was incorrect.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Bank Declined</p>
                  <p className="text-muted-foreground">
                    Your bank declined the transaction. Contact your bank for more details.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Network Issues</p>
                  <p className="text-muted-foreground">
                    There was a network error during the transaction. Please try again.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div>
                  <p className="font-medium">Card Limit Exceeded</p>
                  <p className="text-muted-foreground">
                    You've reached your daily or monthly transaction limit.
                  </p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Button asChild variant="default" size="lg">
            <Link to="/marketplace/cart">
              <ShoppingCart className="mr-2 h-5 w-5" />
              Back to Cart
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/support">
              <MessageCircle className="mr-2 h-5 w-5" />
              Contact Support
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/marketplace">
              <Home className="mr-2 h-5 w-5" />
              Go to Marketplace
            </Link>
          </Button>
        </div>

        {/* Help Section */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If you continue to experience issues with your payment, here are some steps you can take:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">1.</span>
                <span>Check your card details and ensure they are correct</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">2.</span>
                <span>Verify that you have sufficient balance in your account</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">3.</span>
                <span>Try using a different payment method</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">4.</span>
                <span>Contact your bank to ensure there are no restrictions on your card</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">5.</span>
                <span>
                  If the problem persists,{' '}
                  <Link to="/support" className="text-primary hover:underline font-medium">
                    contact our support team
                  </Link>
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Support Notice */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            Your cart items are still saved. You can try again anytime.
          </p>
        </div>
      </div>
    </MarketplaceLayout>
  );
}

export default function PaymentFailure() {
  return (
    <Suspense
      fallback={
        <MarketplaceLayout>
          <div className="container mx-auto py-12 px-4 max-w-4xl">
            {/* Failure Header Skeleton */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-muted rounded-full mb-4 animate-pulse" />
              <div className="h-10 bg-muted rounded w-80 mx-auto mb-2 animate-pulse" />
              <div className="h-6 bg-muted rounded w-96 mx-auto animate-pulse" />
            </div>

            {/* Error Alert Skeleton */}
            <div className="mb-6 p-4 border rounded-lg">
              <div className="h-5 bg-muted rounded w-32 mb-2 animate-pulse" />
              <div className="h-4 bg-muted rounded w-64 animate-pulse" />
            </div>

            {/* Order Details Card Skeleton */}
            <Card className="mb-6">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-32 animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[...Array(2)].map((_, i) => (
                    <div key={i}>
                      <div className="h-4 bg-muted rounded w-24 mb-2 animate-pulse" />
                      <div className="h-5 bg-muted rounded w-32 animate-pulse" />
                    </div>
                  ))}
                </div>
                <Separator />
                <div>
                  <div className="h-5 bg-muted rounded w-32 mb-3 animate-pulse" />
                  <div className="space-y-2">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="h-4 bg-muted rounded animate-pulse" />
                    ))}
                  </div>
                </div>
                <Separator />
                <div className="h-12 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>

            {/* Common Reasons Card Skeleton */}
            <Card className="mb-6">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-64 animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-2 h-2 bg-muted rounded-full mt-2 flex-shrink-0 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-40 animate-pulse" />
                        <div className="h-3 bg-muted rounded w-full animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>

            {/* Help Card Skeleton */}
            <Card>
              <CardHeader>
                <div className="h-6 bg-muted rounded w-32 animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-4 bg-muted rounded w-full animate-pulse" />
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-4 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </MarketplaceLayout>
      }
    >
      <PaymentFailureContent />
    </Suspense>
  );
}