/**
 * ListingGrid Component
 * 
 * Reusable grid component for displaying listings with loading states and empty states
 */

import { Link } from 'react-router';
import type { Listing } from '~/lib/marketplace/types';
import { useMarketplace } from '~/hooks/useMarketplace';
import { Heart, Star } from 'lucide-react';
import { useWishlist } from '~/hooks/useWishlist';

interface ListingGridProps {
  listings: Listing[];
  isLoading?: boolean;
  emptyMessage?: string;
  columns?: 2 | 3 | 4;
}

/**
 * Loading skeleton for listing cards
 */
function ListingCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden animate-pulse">
      <div className="aspect-video bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="flex items-center justify-between">
          <div className="h-5 bg-gray-200 rounded w-20" />
          <div className="h-4 bg-gray-200 rounded w-16" />
        </div>
      </div>
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyState({ message }: { message: string }) {
  return (
    <div className="col-span-full py-16 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">No listings found</h3>
      <p className="text-gray-500">{message}</p>
    </div>
  );
}

/**
 * Listing card component
 */
function ListingCard({ listing }: { listing: Listing }) {
  const { formatPrice } = useMarketplace();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const inWishlist = isInWishlist(listing.id);

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleWishlist(listing.id);
  };

  return (
    <Link
      to={`/marketplace/listings/${listing.slug}`}
      className="group bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-100 overflow-hidden">
        {listing.thumbnail_url ? (
          <img
            src={listing.thumbnail_url}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        
        {/* Wishlist button */}
        <button
          onClick={handleWishlistClick}
          className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
        >
          <Heart
            className={`w-4 h-4 ${
              inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-600'
            }`}
          />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {listing.title}
        </h3>

        {/* Seller */}
        <p className="text-sm text-gray-500 mb-3">{listing.seller_name || 'Unknown Seller'}</p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          {/* Price */}
          <span className="text-lg font-bold text-gray-900">
            {formatPrice(listing.price_cents, listing.currency)}
          </span>

          {/* Rating */}
          {listing.avg_rating && (
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span>{listing.avg_rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Stats */}
        {(listing.sales_count > 0 || listing.favorites_count > 0) && (
          <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
            {listing.sales_count > 0 && (
              <span>{listing.sales_count} sales</span>
            )}
            {listing.favorites_count > 0 && (
              <span>{listing.favorites_count} favorites</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

/**
 * Main ListingGrid component
 */
export function ListingGrid({
  listings,
  isLoading = false,
  emptyMessage = 'Try adjusting your filters or search query.',
  columns = 3,
}: ListingGridProps) {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-6`}>
      {isLoading ? (
        // Loading skeletons
        Array.from({ length: columns * 2 }).map((_, i) => (
          <ListingCardSkeleton key={i} />
        ))
      ) : listings.length === 0 ? (
        // Empty state
        <EmptyState message={emptyMessage} />
      ) : (
        // Listing cards
        listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))
      )}
    </div>
  );
}