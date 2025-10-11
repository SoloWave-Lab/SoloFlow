import React from 'react';
import { Link } from 'react-router';
import { Heart, ShoppingCart, Download, Star, Eye, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardFooter } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { cn } from '~/lib/utils';

interface ListingCardProps {
  listing: {
    id: string;
    title: string;
    description?: string;
    priceCents: number;
    thumbnailUrl?: string;
    seller: {
      id: string;
      displayName: string;
      avatarUrl?: string;
      badges?: Array<{
        badgeType: string;
      }>;
    };
    category?: {
      name: string;
    };
    stats?: {
      viewCount?: number;
      salesCount?: number;
      averageRating?: number;
      reviewCount?: number;
    };
    tags?: string[];
    isFeatured?: boolean;
    isTrending?: boolean;
  };
  onAddToWishlist?: (listingId: string) => void;
  onAddToCart?: (listingId: string) => void;
  isInWishlist?: boolean;
  variant?: 'default' | 'compact' | 'featured';
}

export function ListingCard({
  listing,
  onAddToWishlist,
  onAddToCart,
  isInWishlist = false,
  variant = 'default',
}: ListingCardProps) {
  const formatPrice = (cents: number) => {
    return `₹${(cents / 100).toLocaleString('en-IN')}`;
  };

  const getBadgeIcon = (badgeType: string) => {
    switch (badgeType) {
      case 'verified':
        return '✓';
      case 'top_seller':
        return '⭐';
      case 'fast_responder':
        return '⚡';
      default:
        return null;
    }
  };

  if (variant === 'compact') {
    return (
      <Link to={`/marketplace/listings/${listing.id}`}>
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex gap-4 p-4">
            <div className="w-24 h-24 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
              {listing.thumbnailUrl ? (
                <img
                  src={listing.thumbnailUrl}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{listing.title}</h3>
              <p className="text-sm text-muted-foreground truncate">
                by {listing.seller.displayName}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="font-bold text-primary">
                  {formatPrice(listing.priceCents)}
                </span>
                {listing.stats?.averageRating && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>{listing.stats.averageRating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Card
      className={cn(
        'group hover:shadow-lg transition-all overflow-hidden',
        variant === 'featured' && 'border-primary'
      )}
    >
      <Link to={`/marketplace/listings/${listing.id}`}>
        <div className="relative aspect-video bg-muted overflow-hidden">
          {listing.thumbnailUrl ? (
            <img
              src={listing.thumbnailUrl}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Download className="h-12 w-12 text-muted-foreground" />
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-2">
            {listing.isFeatured && (
              <Badge className="bg-primary text-white">Featured</Badge>
            )}
            {listing.isTrending && (
              <Badge className="bg-orange-500 text-white">
                <TrendingUp className="h-3 w-3 mr-1" />
                Trending
              </Badge>
            )}
          </div>

          {/* Wishlist Button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'absolute top-2 right-2 bg-background/80 backdrop-blur-sm hover:bg-background',
              isInWishlist && 'text-red-500'
            )}
            onClick={(e) => {
              e.preventDefault();
              onAddToWishlist?.(listing.id);
            }}
          >
            <Heart
              className={cn('h-4 w-4', isInWishlist && 'fill-current')}
            />
          </Button>

          {/* Stats Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-4 text-white text-sm">
              {listing.stats?.viewCount !== undefined && (
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{listing.stats.viewCount.toLocaleString()}</span>
                </div>
              )}
              {listing.stats?.salesCount !== undefined && (
                <div className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  <span>{listing.stats.salesCount.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>

      <CardContent className="p-4">
        <Link to={`/marketplace/listings/${listing.id}`}>
          <h3 className="font-semibold text-lg mb-1 line-clamp-2 hover:text-primary transition-colors">
            {listing.title}
          </h3>
        </Link>

        {listing.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {listing.description}
          </p>
        )}

        {/* Seller Info */}
        <Link
          to={`/marketplace/sellers/${listing.seller.id}`}
          className="flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
            {listing.seller.displayName.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm text-muted-foreground">
            {listing.seller.displayName}
          </span>
          {listing.seller.badges?.map((badge) => (
            <span key={badge.badgeType} className="text-xs">
              {getBadgeIcon(badge.badgeType)}
            </span>
          ))}
        </Link>

        {/* Tags */}
        {listing.tags && listing.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {listing.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {listing.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{listing.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Rating */}
        {listing.stats?.averageRating && (
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn(
                    'h-4 w-4',
                    star <= Math.round(listing.stats!.averageRating!)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  )}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {listing.stats.averageRating.toFixed(1)}
              {listing.stats.reviewCount && ` (${listing.stats.reviewCount})`}
            </span>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-2xl font-bold text-primary">
            {formatPrice(listing.priceCents)}
          </span>
          {listing.category && (
            <span className="text-xs text-muted-foreground">
              {listing.category.name}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onAddToCart?.(listing.id)}
          >
            <ShoppingCart className="h-4 w-4" />
          </Button>
          <Button asChild>
            <Link to={`/marketplace/listings/${listing.id}`}>View Details</Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}