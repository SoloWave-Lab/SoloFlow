import { Star, ThumbsUp } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import type { Review } from "~/lib/marketplace/types";

interface ReviewCardProps {
  review: Review;
  onHelpful?: (reviewId: string) => void;
  showListing?: boolean;
}

export function ReviewCard({ review, onHelpful, showListing = false }: ReviewCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={review.buyer?.avatar} />
            <AvatarFallback>
              {getInitials(review.buyer?.name || "Anonymous")}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{review.buyer?.name || "Anonymous"}</p>
            <p className="text-sm text-muted-foreground">
              {formatDate(review.createdAt)}
            </p>
          </div>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${
                i < review.rating
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          ))}
          <span className="ml-1 text-sm font-medium">{review.rating}.0</span>
        </div>
      </div>

      {/* Listing Info (if shown) */}
      {showListing && review.listing && (
        <div className="text-sm text-muted-foreground">
          Review for: <span className="font-medium">{review.listing.title}</span>
        </div>
      )}

      {/* Review Content */}
      <div className="space-y-2">
        {review.title && (
          <h4 className="font-semibold">{review.title}</h4>
        )}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {review.comment}
        </p>
      </div>

      {/* Seller Response */}
      {review.sellerResponse && (
        <div className="bg-muted/50 rounded-lg p-3 space-y-2">
          <p className="text-sm font-medium">Seller Response:</p>
          <p className="text-sm text-muted-foreground">
            {review.sellerResponse}
          </p>
          {review.sellerResponseAt && (
            <p className="text-xs text-muted-foreground">
              {formatDate(review.sellerResponseAt)}
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {review.verified && (
            <span className="flex items-center gap-1 text-green-600">
              <svg
                className="h-4 w-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Verified Purchase
            </span>
          )}
        </div>

        {/* Helpful Button */}
        {onHelpful && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onHelpful(review.id)}
            className="gap-2"
          >
            <ThumbsUp className="h-4 w-4" />
            Helpful {review.helpfulCount > 0 && `(${review.helpfulCount})`}
          </Button>
        )}
      </div>
    </div>
  );
}

interface ReviewListProps {
  reviews: Review[];
  onHelpful?: (reviewId: string) => void;
  showListing?: boolean;
  emptyMessage?: string;
}

export function ReviewList({ 
  reviews, 
  onHelpful, 
  showListing = false,
  emptyMessage = "No reviews yet"
}: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          onHelpful={onHelpful}
          showListing={showListing}
        />
      ))}
    </div>
  );
}