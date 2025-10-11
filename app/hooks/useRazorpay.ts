import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';

// Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayOptions {
  key: string;
  amount: number; // Amount in paise (smallest currency unit)
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, any>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface UseRazorpayOptions {
  onSuccess?: (response: RazorpayResponse) => void;
  onFailure?: (error: any) => void;
  onDismiss?: () => void;
}

export function useRazorpay(options?: UseRazorpayOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const openRazorpay = useCallback(
    async (paymentOptions: Omit<RazorpayOptions, 'handler' | 'modal'>) => {
      setIsLoading(true);
      setError(null);

      try {
        // Check if Razorpay is loaded
        if (typeof window === 'undefined' || !window.Razorpay) {
          throw new Error('Razorpay SDK not loaded');
        }

        const razorpayOptions: RazorpayOptions = {
          ...paymentOptions,
          handler: async (response: RazorpayResponse) => {
            console.log('✅ Payment successful, verifying...', response);
            setIsLoading(true);
            
            try {
              // Verify payment with backend
              const verifyResponse = await fetch('/api/marketplace/payments/verify', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  orderId: paymentOptions.notes?.orderId || paymentOptions.order_id,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              });

              const verifyData = await verifyResponse.json();

              if (verifyData.success) {
                console.log('✅ Payment verified successfully');
                setIsLoading(false);
                
                if (options?.onSuccess) {
                  options.onSuccess(response);
                } else {
                  // Default: navigate to success page
                  navigate(
                    `/marketplace/payment/success?payment_id=${response.razorpay_payment_id}&order_id=${response.razorpay_order_id}`
                  );
                }
              } else {
                throw new Error(verifyData.error || 'Payment verification failed');
              }
            } catch (error) {
              console.error('❌ Payment verification error:', error);
              setIsLoading(false);
              setError(error instanceof Error ? error.message : 'Payment verification failed');
              
              if (options?.onFailure) {
                options.onFailure(error);
              } else {
                navigate(
                  `/marketplace/payment/failure?reason=${encodeURIComponent('Payment verification failed')}&order_id=${paymentOptions.order_id}`
                );
              }
            }
          },
          modal: {
            ondismiss: () => {
              setIsLoading(false);
              if (options?.onDismiss) {
                options.onDismiss();
              }
            },
          },
        };

        const razorpay = new window.Razorpay(razorpayOptions);

        razorpay.on('payment.failed', (response: any) => {
          setIsLoading(false);
          const errorMessage = response.error?.description || 'Payment failed';
          setError(errorMessage);
          
          if (options?.onFailure) {
            options.onFailure(response.error);
          } else {
            // Default: navigate to failure page
            navigate(
              `/marketplace/payment/failure?reason=${encodeURIComponent(errorMessage)}&order_id=${paymentOptions.order_id}`
            );
          }
        });

        razorpay.open();
      } catch (err: any) {
        setIsLoading(false);
        const errorMessage = err.message || 'Failed to initialize payment';
        setError(errorMessage);
        
        if (options?.onFailure) {
          options.onFailure(err);
        }
      }
    },
    [navigate, options]
  );

  return {
    openRazorpay,
    isLoading,
    error,
  };
}

// Helper function to format amount to paise
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

// Helper function to format paise to rupees
export function toRupees(paise: number): number {
  return paise / 100;
}

// Helper function to format currency
export function formatCurrency(paise: number, currency: string = 'INR'): string {
  const rupees = toRupees(paise);
  
  if (currency === 'INR') {
    return `₹${rupees.toFixed(2)}`;
  }
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format(rupees);
}