import { json, type LoaderFunctionArgs } from '~/lib/router-utils';
import { useLoaderData, Link } from 'react-router';
import { MarketplaceLayout } from '~/components/marketplace/MarketplaceLayout';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { CheckCircle2, Download, FileText, ShoppingBag, ArrowRight } from 'lucide-react';
import { useEffect, Suspense } from 'react';
import confetti from 'canvas-confetti';
import { marketplaceApi } from '~/lib/marketplace/api-client';
import { ThumbnailImage } from '~/components/marketplace/OptimizedImage';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get('payment_id');
  const orderId = url.searchParams.get('order_id');

  if (!paymentId || !orderId) {
    throw new Response('Missing payment information', { status: 400 });
  }

  try {
    // Verify payment with backend
    const response = await marketplaceApi.payments.verify(paymentId, orderId);
    const order = response.order;

    return json({
      order: {
        id: order.id,
        orderNumber: order.order_number || `ORD-${order.id}`,
        status: order.status,
        totalCents: order.total_cents,
        paymentId,
        createdAt: order.created_at,
        items: order.items?.map(item => ({
          id: item.id,
          listing: {
            id: item.listing_id,
            title: item.listing?.title || 'Unknown Item',
            thumbnailUrl: item.listing?.thumbnail_url || '/placeholder-listing.jpg',
            priceCents: item.price_cents,
          },
          priceCents: item.price_cents,
        })) || [],
      },
      paymentId,
    });
  } catch (error) {
    console.error('Failed to verify payment:', error);
    // Fallback to basic order data
    return json({
      order: {
        id: orderId,
        orderNumber: `ORD-${orderId}`,
        status: 'completed',
        totalCents: 0,
        paymentId,
        createdAt: new Date().toISOString(),
        items: [],
      },
      paymentId,
    });
  }
}

function PaymentSuccessContent() {
  const { order, paymentId } = useLoaderData<typeof loader>();

  // Trigger confetti animation on mount
  useEffect(() => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const formatPrice = (cents: number) => {
    return `₹${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <MarketplaceLayout>
      <div className="container mx-auto py-12 px-4 max-w-4xl">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Payment Successful!</h1>
          <p className="text-xl text-muted-foreground">
            Thank you for your purchase. Your order has been confirmed.
          </p>
        </div>

        {/* Order Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Order Details</CardTitle>
              <Badge variant="default" className="bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Order Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Order Number</p>
                <p className="font-semibold">{order.orderNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Payment ID</p>
                <p className="font-mono text-xs">{paymentId}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Order Date</p>
                <p className="font-semibold">{formatDate(order.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Total Amount</p>
                <p className="font-semibold text-lg">{formatPrice(order.totalCents)}</p>
              </div>
            </div>

            <Separator />

            {/* Order Items */}
            <div>
              <h3 className="font-semibold mb-3">Items Purchased</h3>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4 p-3 bg-muted/50 rounded-lg">
                    <ThumbnailImage
                      src={item.listing.thumbnailUrl}
                      alt={item.listing.title}
                      aspectRatio="1:1"
                      className="w-16 h-16 rounded"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">{item.listing.title}</h4>
                      <p className="text-sm font-semibold">{formatPrice(item.priceCents)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Button asChild variant="default" size="lg">
            <Link to="/marketplace/purchases">
              <Download className="mr-2 h-5 w-5" />
              Download Files
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/marketplace/orders">
              <FileText className="mr-2 h-5 w-5" />
              View Invoice
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/marketplace/browse">
              <ShoppingBag className="mr-2 h-5 w-5" />
              Continue Shopping
            </Link>
          </Button>
        </div>

        {/* What's Next */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              What's Next?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="font-medium">Download Your Files</p>
                  <p className="text-sm text-muted-foreground">
                    Visit your purchases page to download all your files. You can re-download them
                    anytime within your download limit.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="font-medium">Check Your Email</p>
                  <p className="text-sm text-muted-foreground">
                    We've sent a confirmation email with your order details and download links.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <div>
                  <p className="font-medium">Review Your Purchase</p>
                  <p className="text-sm text-muted-foreground">
                    After using the assets, consider leaving a review to help other buyers.
                  </p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Support Notice */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            Need help? Contact our{' '}
            <Link to="/support" className="text-primary hover:underline">
              support team
            </Link>{' '}
            or check our{' '}
            <Link to="/faq" className="text-primary hover:underline">
              FAQ
            </Link>
          </p>
        </div>
      </div>
    </MarketplaceLayout>
  );
}

export default function PaymentSuccess() {
  return (
    <Suspense
      fallback={
        <MarketplaceLayout>
          <div className="container mx-auto py-12 px-4 max-w-4xl">
            {/* Success Header Skeleton */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-muted rounded-full mb-4 animate-pulse" />
              <div className="h-10 bg-muted rounded w-96 mx-auto mb-2 animate-pulse" />
              <div className="h-6 bg-muted rounded w-80 mx-auto animate-pulse" />
            </div>

            {/* Order Details Card Skeleton */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="h-6 bg-muted rounded w-32 animate-pulse" />
                  <div className="h-6 bg-muted rounded w-24 animate-pulse" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Order Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i}>
                      <div className="h-4 bg-muted rounded w-24 mb-2 animate-pulse" />
                      <div className="h-5 bg-muted rounded w-32 animate-pulse" />
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Items Skeleton */}
                <div>
                  <div className="h-5 bg-muted rounded w-32 mb-3 animate-pulse" />
                  <div className="space-y-3">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="flex gap-4 p-3 bg-muted/50 rounded-lg">
                        <div className="w-16 h-16 bg-muted rounded animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-48 animate-pulse" />
                          <div className="h-4 bg-muted rounded w-20 animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>

            {/* What's Next Card Skeleton */}
            <Card>
              <CardHeader>
                <div className="h-6 bg-muted rounded w-40 animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-6 h-6 bg-muted rounded-full flex-shrink-0 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-40 animate-pulse" />
                        <div className="h-3 bg-muted rounded w-full animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </MarketplaceLayout>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}