/**
 * useMarketplace Hook
 * 
 * General marketplace utilities and common operations
 */

import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { marketplaceApi } from '~/lib/marketplace/api-client';
import type { Listing, Seller } from '~/lib/marketplace/types';

export function useMarketplace() {
  const navigate = useNavigate();

  /**
   * Navigate to listing detail page
   */
  const goToListing = useCallback(
    (listing: Listing | string) => {
      const slug = typeof listing === 'string' ? listing : listing.slug;
      navigate(`/marketplace/listings/${slug}`);
    },
    [navigate]
  );

  /**
   * Navigate to seller profile page
   */
  const goToSeller = useCallback(
    (seller: Seller | string) => {
      const id = typeof seller === 'string' ? seller : seller.id;
      navigate(`/marketplace/sellers/${id}`);
    },
    [navigate]
  );

  /**
   * Navigate to category page
   */
  const goToCategory = useCallback(
    (categorySlug: string) => {
      navigate(`/marketplace/categories/${categorySlug}`);
    },
    [navigate]
  );

  /**
   * Format price in rupees
   */
  const formatPrice = useCallback((cents: number, currency: string = 'INR') => {
    const amount = cents / 100;
    
    if (currency === 'INR') {
      return `₹${amount.toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })}`;
    }
    
    return `${currency} ${amount.toFixed(2)}`;
  }, []);

  /**
   * Format number with K/M suffix
   */
  const formatNumber = useCallback((num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  }, []);

  /**
   * Format date relative to now
   */
  const formatRelativeDate = useCallback((date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  }, []);

  /**
   * Format date as readable string
   */
  const formatDate = useCallback((date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, []);

  /**
   * Get status badge color
   */
  const getStatusColor = useCallback((status: string) => {
    const colors: Record<string, string> = {
      // Listing statuses
      draft: 'gray',
      pending: 'yellow',
      published: 'green',
      rejected: 'red',
      archived: 'gray',
      
      // Order statuses
      payment_required: 'yellow',
      paid: 'green',
      failed: 'red',
      refunded: 'orange',
      disputed: 'red',
      
      // Seller statuses
      active: 'green',
      suspended: 'orange',
      banned: 'red',
      
      // Subscription statuses
      cancelled: 'gray',
      expired: 'red',
      
      // Dispute statuses
      open: 'yellow',
      investigating: 'blue',
      resolved: 'green',
      closed: 'gray',
    };
    
    return colors[status] || 'gray';
  }, []);

  /**
   * Share listing
   */
  const shareListing = useCallback(async (listing: Listing) => {
    const url = `${window.location.origin}/marketplace/listings/${listing.slug}`;
    const text = `Check out "${listing.title}" on the marketplace!`;

    if (navigator.share) {
      try {
        await navigator.share({ title: listing.title, text, url });
        return { success: true };
      } catch (error) {
        // User cancelled or error occurred
        return { success: false };
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(url);
        return { success: true, message: 'Link copied to clipboard!' };
      } catch (error) {
        return { success: false, error: 'Failed to copy link' };
      }
    }
  }, []);

  /**
   * Download purchase
   */
  const downloadPurchase = useCallback(async (purchaseId: string) => {
    try {
      const { downloadUrl } = await marketplaceApi.purchases.download(purchaseId);
      
      // Open download in new tab
      window.open(downloadUrl, '_blank');
      
      return { success: true };
    } catch (error) {
      console.error('Failed to download:', error);
      return { success: false, error: 'Failed to download file' };
    }
  }, []);

  /**
   * Contact seller
   */
  const contactSeller = useCallback(
    (sellerId: string) => {
      navigate(`/marketplace/messages?seller=${sellerId}`);
    },
    [navigate]
  );

  /**
   * Report listing
   */
  const reportListing = useCallback(async (listingId: string, reason: string) => {
    try {
      // TODO: Implement report API
      console.log('Report listing:', listingId, reason);
      return { success: true };
    } catch (error) {
      console.error('Failed to report listing:', error);
      return { success: false, error: 'Failed to report listing' };
    }
  }, []);

  return {
    // Navigation
    goToListing,
    goToSeller,
    goToCategory,
    contactSeller,
    
    // Formatting
    formatPrice,
    formatNumber,
    formatDate,
    formatRelativeDate,
    getStatusColor,
    
    // Actions
    shareListing,
    downloadPurchase,
    reportListing,
  };
}