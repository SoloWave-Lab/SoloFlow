/**
 * useWishlist Hook
 * 
 * Manages wishlist/favorites state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { marketplaceApi } from '~/lib/marketplace/api-client';

export function useWishlist() {
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Load wishlist on mount
   */
  useEffect(() => {
    loadWishlist();
  }, []);

  /**
   * Load wishlist from API
   */
  const loadWishlist = async () => {
    try {
      const { wishlist } = await marketplaceApi.wishlist.list();
      const ids = new Set(wishlist.map((item) => item.listing_id || item.id));
      setWishlistIds(ids);
    } catch (error) {
      console.error('Failed to load wishlist:', error);
    }
  };

  /**
   * Add item to wishlist
   */
  const addToWishlist = useCallback(async (listingId: string) => {
    setIsLoading(true);
    
    try {
      await marketplaceApi.wishlist.add(listingId);
      setWishlistIds((prev) => new Set([...prev, listingId]));
      return { success: true };
    } catch (error) {
      console.error('Failed to add to wishlist:', error);
      return { success: false, error: 'Failed to add to wishlist' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Remove item from wishlist
   */
  const removeFromWishlist = useCallback(async (listingId: string) => {
    setIsLoading(true);
    
    try {
      await marketplaceApi.wishlist.remove(listingId);
      setWishlistIds((prev) => {
        const next = new Set(prev);
        next.delete(listingId);
        return next;
      });
      return { success: true };
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
      return { success: false, error: 'Failed to remove from wishlist' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Toggle item in wishlist
   */
  const toggleWishlist = useCallback(
    async (listingId: string) => {
      if (wishlistIds.has(listingId)) {
        return removeFromWishlist(listingId);
      } else {
        return addToWishlist(listingId);
      }
    },
    [wishlistIds, addToWishlist, removeFromWishlist]
  );

  /**
   * Check if item is in wishlist
   */
  const isInWishlist = useCallback(
    (listingId: string) => {
      return wishlistIds.has(listingId);
    },
    [wishlistIds]
  );

  return {
    // State
    wishlistIds,
    wishlistCount: wishlistIds.size,
    isLoading,
    
    // Actions
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    isInWishlist,
    refresh: loadWishlist,
  };
}