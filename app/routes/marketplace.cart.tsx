import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from '~/lib/router-utils';
import { Form, useFetcher, useLoaderData, useNavigation } from '~/lib/router-utils';
import { MarketplaceLayout } from '~/components/marketplace/MarketplaceLayout';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { ShoppingCart, X, Tag, AlertCircle, CreditCard, Loader2 } from 'lucide-react';
import { useState, Suspense } from 'react';
import { useRazorpay, toPaise } from '~/hooks/useRazorpay';
import { toast } from 'sonner';
import { marketplaceApi } from '~/lib/marketplace/api-client';
import { requireMarketplaceAuth } from '~/lib/marketplace/auth-helpers';
import { MarketplaceErrorBoundary } from '~/components/marketplace/ErrorBoundary';
import { OrderCardSkeleton } from '~/components/marketplace/LoadingSkeletons';
import { ThumbnailImage } from '~/components/marketplace/OptimizedImage';

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireMarketplaceAuth(request);

  try {
    // Fetch cart items from API
    const { items } = await marketplaceApi.cart.list();
    
    return json({ user, cartItems: items || [] });
  } catch (error) {
    console.error('Failed to load cart:', error);
    // Return empty cart on error
    return json({ user, cartItems: [] });
  }
}

export const ErrorBoundary = MarketplaceErrorBoundary;

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'validate-coupon') {
    const code = formData.get('code') as string;
    
    try {
      // Validate coupon with API
      const { coupon, discount } = await marketplaceApi.coupons.validate(code);
      
      return json({
        success: true,
        coupon: {
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          description: coupon.description || `${coupon.discountType === 'percentage' ? coupon.discountValue + '%' : '₹' + (coupon.discountValue / 100)} off`,
        },
        discount,
      });
    } catch (error) {
      console.error('Coupon validation failed:', error);
      return json({ success: false, error: 'Invalid coupon code' });
    }
  }

  if (intent === 'remove') {
    const listingId = formData.get('listingId') as string;
    
    try {
      await marketplaceApi.cart.remove(listingId);
      return json({ success: true });
    } catch (error) {
      console.error('Failed to remove from cart:', error);
      return json({ success: false, error: 'Failed to remove item' }, { status: 500 });
    }
  }

  if (intent === 'verify-payment') {
    const paymentId = formData.get('paymentId') as string;
    const orderId = formData.get('orderId') as string;
    const signature = formData.get('signature') as string;

    try {
      // Verify payment with backend
      const { success, order } = await marketplaceApi.payments.verify({
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
      });

      if (success) {
        // Clear cart after successful payment
        await marketplaceApi.cart.clear();
        return json({ success: true, order });
      }
      
      return json({ success: false, error: 'Payment verification failed' }, { status: 400 });
    } catch (error) {
      console.error('Payment verification failed:', error);
      return json({ success: false, error: 'Payment verification failed' }, { status: 500 });
    }
  }

  return json({ error: 'Invalid intent' }, { status: 400 });
}

function CartContent() {
  const { cartItems, user } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const navigation = useNavigation();
  const isCheckingOut = navigation.state === 'submitting';
  const isRemoving = fetcher.state === 'submitting' && fetcher.formData?.get('intent') === 'remove';

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');

  const { openRazorpay, isLoading: isPaymentLoading } = useRazorpay({
    onSuccess: async (response) => {
      // Verify payment with backend
      fetcher.submit(
        {
          intent: 'verify-payment',
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id,
          signature: response.razorpay_signature,
        },
        { method: 'post' }
      );
      toast.success('Payment successful! Redirecting...');
    },
    onFailure: (error) => {
      toast.error('Payment failed. Please try again.');
      console.error('Payment error:', error);
    },
  });

  const handleRemoveFromCart = (listingId: string) => {
    fetcher.submit(
      { intent: 'remove', listingId },
      { method: 'post' }
    );
  };

  const handleValidateCoupon = () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    fetcher.submit(
      { intent: 'validate-coupon', code: couponCode },
      { method: 'post' }
    );
  };

  const handleCheckout = async () => {
    try {
      // Prepare order items
      const items = cartItems.map((item) => ({
        listingId: item.listing.id,
        licensePlanId: item.licensePlan?.id,
      }));

      // Create order from cart using API
      const data = await marketplaceApi.orders.createFromCart({
        items,
        couponCode: appliedCoupon?.code,
      });

      if (!data.success) {
        toast.error('Failed to create order. Please try again.');
        return;
      }

      // Get Razorpay key from environment
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_live_R5GepMnnMQikm8';

      // Open Razorpay checkout
      openRazorpay({
        key: razorpayKey,
        amount: data.order.amount,
        currency: data.order.currency,
        name: 'FlyingDarkDev',
        description: `Purchase ${items.length} item${items.length > 1 ? 's' : ''} from marketplace`,
        image: '/favicon.png',
        order_id: data.order.razorpayOrderId,
        prefill: {
          name: user?.name ?? 'Marketplace Buyer',
          email: user?.email ?? 'buyer@example.com',
          contact: user?.phone ?? '0000000000',
        },
        notes: {
          orderId: data.order.id,
          itemsCount: items.length.toString(),
        },
        theme: {
          color: '#3b82f6',
        },
      });
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to initiate checkout. Please try again.');
    }
  };

  // Handle coupon validation response
  if (fetcher.data && fetcher.state === 'idle') {
    if (fetcher.data.success && !appliedCoupon) {
      setAppliedCoupon(fetcher.data.coupon);
      setCouponError('');
      setCouponCode('');
    } else if (!fetcher.data.success && fetcher.data.error) {
      setCouponError(fetcher.data.error);
      setAppliedCoupon(null);
    }
  }

  const formatPrice = (cents: number) => {
    return `₹${(cents / 100).toFixed(2)}`;
  };

  // Calculate totals
  const subtotal = cartItems.reduce((sum, item) => sum + item.listing.priceCents, 0);
  
  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      discount = Math.floor((subtotal * appliedCoupon.discountValue) / 100);
    } else {
      discount = appliedCoupon.discountValue * 100; // Convert to cents
    }
  }

  const total = subtotal - discount;

  return (
    <MarketplaceLayout>
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShoppingCart className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Shopping Cart</h1>
          </div>
          <p className="text-muted-foreground">
            {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>

        {cartItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
              <p className="text-muted-foreground mb-6">
                Add items to your cart to get started
              </p>
              <Button asChild>
                <a href="/marketplace/browse">Browse Marketplace</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <ThumbnailImage
                        src={item.listing.thumbnailUrl}
                        alt={item.listing.title}
                        className="w-24 h-24 rounded"
                        aspectRatio="1/1"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{item.listing.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          by {item.listing.seller.displayName}
                        </p>
                        <p className="text-lg font-bold">
                          {formatPrice(item.listing.priceCents)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFromCart(item.listing.id)}
                        disabled={isRemoving}
                      >
                        {isRemoving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Coupon Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Have a coupon?</label>
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-green-600" />
                          <div>
                            <p className="text-sm font-medium text-green-900">
                              {appliedCoupon.code}
                            </p>
                            <p className="text-xs text-green-700">
                              {appliedCoupon.description}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setAppliedCoupon(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter coupon code"
                            value={couponCode}
                            onChange={(e) => {
                              setCouponCode(e.target.value);
                              setCouponError('');
                            }}
                          />
                          <Button
                            variant="outline"
                            onClick={handleValidateCoupon}
                            disabled={fetcher.state === 'submitting'}
                          >
                            Apply
                          </Button>
                        </div>
                        {couponError && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{couponError}</AlertDescription>
                          </Alert>
                        )}
                      </>
                    )}
                  </div>

                  <Separator />

                  {/* Price Breakdown */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>

                    {appliedCoupon && discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount ({appliedCoupon.code})</span>
                        <span>-{formatPrice(discount)}</span>
                      </div>
                    )}

                    <Separator />

                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Checkout Button */}
                  <Button
                    onClick={handleCheckout}
                    className="w-full"
                    size="lg"
                    disabled={isCheckingOut || isPaymentLoading}
                  >
                    {isCheckingOut || isPaymentLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-5 w-5" />
                        Proceed to Checkout
                      </>
                    )}
                  </Button>

                  {/* Security Notice */}
                  <div className="text-xs text-muted-foreground text-center">
                    <p>🔒 Secure checkout powered by Razorpay</p>
                  </div>

                  {/* Terms */}
                  <div className="text-xs text-muted-foreground">
                    <p>
                      By completing your purchase, you agree to our{' '}
                      <a href="/terms" className="text-primary hover:underline">
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a href="/privacy" className="text-primary hover:underline">
                        Privacy Policy
                      </a>
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Continue Shopping */}
              <Button variant="outline" className="w-full mt-4" asChild>
                <a href="/marketplace/browse">Continue Shopping</a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </MarketplaceLayout>
  );
}

export default function Cart() {
  return (
    <Suspense fallback={
      <MarketplaceLayout>
        <div className="container mx-auto py-8 px-4">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-8 w-8 bg-muted rounded animate-pulse" />
              <div className="h-8 bg-muted rounded w-48 animate-pulse" />
            </div>
            <div className="h-5 bg-muted rounded w-32 animate-pulse" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items Skeleton */}
            <div className="lg:col-span-2 space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-24 bg-muted rounded animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-muted rounded w-3/4 animate-pulse" />
                        <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
                        <div className="h-6 bg-muted rounded w-24 animate-pulse" />
                      </div>
                      <div className="h-10 w-10 bg-muted rounded animate-pulse" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary Skeleton */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-32 animate-pulse" />
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Coupon Input Skeleton */}
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-32 animate-pulse" />
                    <div className="flex gap-2">
                      <div className="flex-1 h-10 bg-muted rounded animate-pulse" />
                      <div className="h-10 w-20 bg-muted rounded animate-pulse" />
                    </div>
                  </div>

                  <Separator />

                  {/* Price Breakdown Skeleton */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <div className="h-4 bg-muted rounded w-20 animate-pulse" />
                      <div className="h-4 bg-muted rounded w-16 animate-pulse" />
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <div className="h-6 bg-muted rounded w-16 animate-pulse" />
                      <div className="h-6 bg-muted rounded w-20 animate-pulse" />
                    </div>
                  </div>

                  <Separator />

                  {/* Checkout Button Skeleton */}
                  <div className="h-12 bg-muted rounded animate-pulse" />

                  {/* Security Notice Skeleton */}
                  <div className="h-4 bg-muted rounded w-48 mx-auto animate-pulse" />

                  {/* Terms Skeleton */}
                  <div className="space-y-1">
                    <div className="h-3 bg-muted rounded animate-pulse" />
                    <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
                  </div>
                </CardContent>
              </Card>

              {/* Continue Shopping Button Skeleton */}
              <div className="h-10 bg-muted rounded w-full mt-4 animate-pulse" />
            </div>
          </div>
        </div>
      </MarketplaceLayout>
    }>
      <CartContent />
    </Suspense>
  );
}