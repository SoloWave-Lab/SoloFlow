import { Link } from "react-router";
import { Star, Package, MessageCircle, Award } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import type { Seller } from "~/lib/marketplace/types";

interface SellerCardProps {
  seller: Seller;
  showContactButton?: boolean;
  showViewProfileButton?: boolean;
  onContact?: () => void;
  compact?: boolean;
}

export function SellerCard({
  seller,
  showContactButton = true,
  showViewProfileButton = true,
  onContact,
  compact = false,
}: SellerCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getBadgeVariant = (badge: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      verified: "default",
      top_seller: "default",
      featured: "secondary",
      new: "outline",
    };
    return variants[badge] || "outline";
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={seller.avatar} />
          <AvatarFallback>{getInitials(seller.businessName)}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <Link
            to={`/marketplace/sellers/${seller.id}`}
            className="font-medium hover:underline truncate block"
          >
            {seller.businessName}
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span>{seller.rating?.toFixed(1) || "N/A"}</span>
            </div>
            <span>•</span>
            <span>{seller.totalSales || 0} sales</span>
          </div>
        </div>
        {showContactButton && onContact && (
          <Button size="sm" variant="outline" onClick={onContact}>
            <MessageCircle className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={seller.avatar} />
          <AvatarFallback className="text-lg">
            {getInitials(seller.businessName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <Link
            to={`/marketplace/sellers/${seller.id}`}
            className="text-xl font-semibold hover:underline block truncate"
          >
            {seller.businessName}
          </Link>
          {seller.tagline && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {seller.tagline}
            </p>
          )}
        </div>
      </div>

      {/* Badges */}
      {seller.badges && seller.badges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {seller.badges.map((badge) => (
            <Badge key={badge} variant={getBadgeVariant(badge)}>
              <Award className="h-3 w-3 mr-1" />
              {badge.replace("_", " ")}
            </Badge>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 py-4 border-y">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-lg font-semibold">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            {seller.rating?.toFixed(1) || "N/A"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Rating</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-lg font-semibold">
            <Package className="h-4 w-4" />
            {seller.totalSales || 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Sales</p>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold">
            {seller.totalListings || 0}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Listings</p>
        </div>
      </div>

      {/* Description */}
      {seller.description && (
        <p className="text-sm text-muted-foreground line-clamp-3">
          {seller.description}
        </p>
      )}

      {/* Member Since */}
      {seller.createdAt && (
        <p className="text-xs text-muted-foreground">
          Member since {new Date(seller.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
          })}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {showViewProfileButton && (
          <Button asChild variant="outline" className="flex-1">
            <Link to={`/marketplace/sellers/${seller.id}`}>
              View Profile
            </Link>
          </Button>
        )}
        {showContactButton && onContact && (
          <Button onClick={onContact} className="flex-1">
            <MessageCircle className="h-4 w-4 mr-2" />
            Contact Seller
          </Button>
        )}
      </div>
    </div>
  );
}

interface SellerListProps {
  sellers: Seller[];
  compact?: boolean;
  emptyMessage?: string;
}

export function SellerList({ 
  sellers, 
  compact = false,
  emptyMessage = "No sellers found"
}: SellerListProps) {
  if (sellers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-3" : "grid gap-6 md:grid-cols-2 lg:grid-cols-3"}>
      {sellers.map((seller) => (
        <SellerCard key={seller.id} seller={seller} compact={compact} />
      ))}
    </div>
  );
}