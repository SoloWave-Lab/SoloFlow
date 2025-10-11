import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useRazorpay } from "~/hooks/useRazorpay";

interface PaymentButtonProps {
  amount: number; // in cents
  currency?: string;
  orderId: string;
  onSuccess: (paymentId: string, signature: string) => void;
  onFailure?: (error: any) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
}

export function PaymentButton({
  amount,
  currency = "INR",
  orderId,
  onSuccess,
  onFailure,
  disabled = false,
  children,
  variant = "default",
  size = "default",
  className,
  prefill,
  notes,
}: PaymentButtonProps) {
  const { openRazorpay, loading: razorpayLoading } = useRazorpay();
  const [processing, setProcessing] = useState(false);

  const handlePayment = async () => {
    setProcessing(true);

    try {
      const result = await openRazorpay({
        amount,
        currency,
        orderId,
        prefill,
        notes,
      });

      if (result.success && result.paymentId && result.signature) {
        onSuccess(result.paymentId, result.signature);
      } else {
        onFailure?.(result.error || new Error("Payment failed"));
      }
    } catch (error) {
      console.error("Payment error:", error);
      onFailure?.(error);
    } finally {
      setProcessing(false);
    }
  };

  const isLoading = razorpayLoading || processing;

  return (
    <Button
      onClick={handlePayment}
      disabled={disabled || isLoading}
      variant={variant}
      size={size}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          {children || (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Pay Now
            </>
          )}
        </>
      )}
    </Button>
  );
}

interface CheckoutButtonProps {
  items: Array<{
    id: string;
    title: string;
    price: number;
  }>;
  total: number;
  discount?: number;
  couponCode?: string;
  onCreateOrder: () => Promise<{ orderId: string; razorpayOrderId: string }>;
  onSuccess: (paymentId: string, signature: string) => void;
  onFailure?: (error: any) => void;
  disabled?: boolean;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
}

export function CheckoutButton({
  items,
  total,
  discount = 0,
  couponCode,
  onCreateOrder,
  onSuccess,
  onFailure,
  disabled = false,
  prefill,
}: CheckoutButtonProps) {
  const [creating, setCreating] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const handleCheckout = async () => {
    setCreating(true);

    try {
      // Create order first
      const { orderId: newOrderId, razorpayOrderId } = await onCreateOrder();
      setOrderId(razorpayOrderId);

      // Then trigger payment
      // The PaymentButton will handle the rest
    } catch (error) {
      console.error("Failed to create order:", error);
      onFailure?.(error);
      setCreating(false);
    }
  };

  const finalAmount = total - (total * discount) / 100;

  if (orderId) {
    return (
      <PaymentButton
        amount={Math.round(finalAmount)}
        orderId={orderId}
        onSuccess={onSuccess}
        onFailure={(error) => {
          setOrderId(null);
          setCreating(false);
          onFailure?.(error);
        }}
        prefill={prefill}
        notes={{
          items: items.map((item) => item.title).join(", "),
          coupon: couponCode || "",
        }}
        size="lg"
        className="w-full"
      >
        <CreditCard className="mr-2 h-5 w-5" />
        Complete Payment (₹{(finalAmount / 100).toFixed(2)})
      </PaymentButton>
    );
  }

  return (
    <Button
      onClick={handleCheckout}
      disabled={disabled || creating || items.length === 0}
      size="lg"
      className="w-full"
    >
      {creating ? (
        <>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Creating Order...
        </>
      ) : (
        <>
          <CreditCard className="mr-2 h-5 w-5" />
          Proceed to Payment (₹{(finalAmount / 100).toFixed(2)})
        </>
      )}
    </Button>
  );
}