import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface CouponInputProps {
  onApply: (code: string) => Promise<{ valid: boolean; discount?: number; message?: string }>;
  onRemove?: () => void;
  appliedCode?: string;
  discount?: number;
  disabled?: boolean;
}

export function CouponInput({ 
  onApply, 
  onRemove, 
  appliedCode, 
  discount,
  disabled = false 
}: CouponInputProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleApply = async () => {
    if (!code.trim()) {
      setError("Please enter a coupon code");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await onApply(code.trim().toUpperCase());
      
      if (result.valid) {
        setSuccess(result.message || "Coupon applied successfully!");
        setCode("");
      } else {
        setError(result.message || "Invalid coupon code");
      }
    } catch (err) {
      setError("Failed to apply coupon. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setError(null);
    setSuccess(null);
    onRemove?.();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading && !disabled) {
      handleApply();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Enter coupon code"
          value={appliedCode || code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyPress={handleKeyPress}
          disabled={loading || disabled || !!appliedCode}
          className="flex-1 uppercase"
          maxLength={20}
        />
        {appliedCode ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleRemove}
            disabled={disabled}
          >
            Remove
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleApply}
            disabled={loading || disabled || !code.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Applying...
              </>
            ) : (
              "Apply"
            )}
          </Button>
        )}
      </div>

      {/* Success Message */}
      {success && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <span>{success}</span>
          {discount && discount > 0 && (
            <span className="font-semibold">
              ({discount}% off)
            </span>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <XCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Applied Coupon Info */}
      {appliedCode && !success && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <span>
            Coupon <strong>{appliedCode}</strong> applied
            {discount && discount > 0 && (
              <span className="ml-1">({discount}% off)</span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}