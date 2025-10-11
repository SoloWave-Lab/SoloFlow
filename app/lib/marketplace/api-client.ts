/**
 * Marketplace API Client
 * 
 * Centralized client for all marketplace API endpoints.
 * Provides type-safe methods for interacting with the marketplace backend.
 */

import type {
  Listing,
  Category,
  Order,
  Purchase,
  Review,
  Seller,
  SellerAnalytics,
  Subscription,
  Message,
  Conversation,
  WishlistItem,
  AdminAnalytics,
  Dispute,
  Notification,
  LicensePlan,
  Coupon,
} from './types';

/**
 * Base API client configuration
 */
const API_BASE = '/api/marketplace';

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Marketplace API Client
 */
export const marketplaceApi = {
  // ==================== LISTINGS ====================
  
  listings: {
    /**
     * Get all published listings
     */
    list: async (params?: {
      q?: string;
      categoryId?: string;
      limit?: number;
      offset?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.q) searchParams.set('q', params.q);
      if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.offset) searchParams.set('offset', params.offset.toString());
      
      return apiFetch<{ listings: Listing[] }>(
        `/listings?${searchParams.toString()}`
      );
    },

    /**
     * Get a single listing by ID
     */
    get: async (id: string) => {
      return apiFetch<{ listing: Listing }>(`/listings/${id}`);
    },

    /**
     * Create a new listing
     */
    create: async (data: {
      categoryId: string;
      slug: string;
      title: string;
      summary?: string;
      description?: string;
      priceCents: number;
      currency?: string;
      metadata?: Record<string, any>;
    }) => {
      return apiFetch<{ listing: Listing }>('/listings', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Update a listing
     */
    update: async (id: string, data: Partial<Listing>) => {
      return apiFetch<{ listing: Listing }>(`/listings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    /**
     * Delete a listing
     */
    delete: async (id: string) => {
      return apiFetch<{ success: boolean }>(`/listings/${id}`, {
        method: 'DELETE',
      });
    },

    /**
     * Submit listing for moderation
     */
    submit: async (id: string) => {
      return apiFetch<{ listing: Listing }>(`/listings/${id}/submit`, {
        method: 'POST',
      });
    },

    /**
     * Get listing statistics
     */
    stats: async (id: string) => {
      return apiFetch<{
        views: number;
        favorites: number;
        sales: number;
        revenue: number;
      }>(`/listings/${id}/stats`);
    },
  },

  // ==================== CATEGORIES ====================
  
  categories: {
    /**
     * Get all categories (hierarchical)
     */
    list: async () => {
      return apiFetch<{ categories: Category[] }>('/categories');
    },
  },

  // ==================== ORDERS ====================
  
  orders: {
    /**
     * Create a new order from a single listing
     */
    create: async (data: {
      listingId: string;
      licensePlanId: string;
    }) => {
      return apiFetch<{
        order: Order;
        razorpay: {
          id: string;
          amount: number;
          currency: string;
        };
      }>('/orders/create', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Create order from cart
     */
    createFromCart: async (data: {
      items: Array<{ listingId: string; licensePlanId?: string }>;
      couponCode?: string;
    }) => {
      return apiFetch<{
        success: boolean;
        order: {
          id: string;
          amount: number;
          currency: string;
          razorpayOrderId: string;
        };
      }>('/orders/create-from-cart', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Get all orders for current user
     */
    list: async () => {
      return apiFetch<{ orders: Order[] }>('/buyer/orders');
    },
  },

  // ==================== PURCHASES ====================
  
  purchases: {
    /**
     * Get all purchases for current user
     */
    list: async () => {
      return apiFetch<{ purchases: Purchase[] }>('/purchases');
    },

    /**
     * Download a purchased item
     */
    download: async (purchaseId: string) => {
      return apiFetch<{ downloadUrl: string }>(`/downloads/${purchaseId}`);
    },
  },

  // ==================== CART ====================
  
  cart: {
    /**
     * Get user's cart
     */
    list: async () => {
      return apiFetch<{ 
        items: Array<{
          id: string;
          listing: Listing;
          licensePlan?: LicensePlan;
          addedAt: string;
        }>;
      }>('/cart');
    },

    /**
     * Add item to cart
     */
    add: async (listingId: string, licensePlanId?: string) => {
      return apiFetch<{ success: boolean }>('/cart', {
        method: 'POST',
        body: JSON.stringify({ listingId, licensePlanId }),
      });
    },

    /**
     * Remove item from cart
     */
    remove: async (listingId: string) => {
      return apiFetch<{ success: boolean }>('/cart', {
        method: 'DELETE',
        body: JSON.stringify({ listingId }),
      });
    },

    /**
     * Clear cart
     */
    clear: async () => {
      return apiFetch<{ success: boolean }>('/cart/clear', {
        method: 'POST',
      });
    },
  },

  // ==================== WISHLIST ====================
  
  wishlist: {
    /**
     * Get user's wishlist
     */
    list: async () => {
      return apiFetch<{ wishlist: WishlistItem[] }>('/wishlist');
    },

    /**
     * Add item to wishlist
     */
    add: async (listingId: string) => {
      return apiFetch<{ success: boolean }>('/wishlist', {
        method: 'POST',
        body: JSON.stringify({ listingId }),
      });
    },

    /**
     * Remove item from wishlist
     */
    remove: async (listingId: string) => {
      return apiFetch<{ success: boolean }>('/wishlist', {
        method: 'DELETE',
        body: JSON.stringify({ listingId }),
      });
    },
  },

  // ==================== REVIEWS ====================
  
  reviews: {
    /**
     * Get reviews for a listing
     */
    list: async (listingId: string) => {
      return apiFetch<{ reviews: Review[] }>(
        `/reviews?listingId=${listingId}`
      );
    },

    /**
     * Create a review
     */
    create: async (data: {
      listingId: string;
      rating: number;
      comment?: string;
    }) => {
      return apiFetch<{ review: Review }>('/reviews', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },

  // ==================== SELLERS ====================
  
  sellers: {
    /**
     * Get seller profile by ID
     */
    get: async (id: string) => {
      return apiFetch<{ seller: Seller }>(`/sellers/${id}`);
    },

    /**
     * Onboard as a seller
     */
    onboard: async (data: {
      displayName: string;
      bio?: string;
      bankAccountNumber: string;
      bankIfscCode: string;
      bankAccountName: string;
      panNumber: string;
      gstNumber?: string;
    }) => {
      return apiFetch<{ seller: Seller }>('/sellers/onboard', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Get current seller profile
     */
    profile: async () => {
      return apiFetch<{ seller: Seller }>('/seller/profile');
    },

    /**
     * Update seller profile
     */
    updateProfile: async (data: Partial<Seller>) => {
      return apiFetch<{ seller: Seller }>('/seller/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    /**
     * Get seller dashboard data
     */
    dashboard: async () => {
      return apiFetch<{
        stats: {
          totalRevenue: number;
          totalOrders: number;
          activeListings: number;
          avgRating: number;
        };
        recentOrders: Order[];
        topListings: Listing[];
      }>('/seller/dashboard');
    },

    /**
     * Get seller analytics
     */
    analytics: async (period?: 'week' | 'month' | 'year') => {
      const params = period ? `?period=${period}` : '';
      return apiFetch<{
        analytics: SellerAnalytics;
        recentOrders: Order[];
        seller: Seller;
      }>(`/seller/analytics${params}`);
    },

    /**
     * Get seller orders
     */
    orders: async () => {
      return apiFetch<{ orders: Order[] }>('/seller/orders');
    },

    /**
     * Get seller payouts
     */
    payouts: async () => {
      return apiFetch<{
        payouts: Array<{
          id: string;
          amount: number;
          status: string;
          createdAt: string;
        }>;
      }>('/seller/payouts');
    },
  },

  // ==================== SUBSCRIPTIONS ====================
  
  subscriptions: {
    /**
     * Get all subscriptions
     */
    list: async () => {
      return apiFetch<{ subscriptions: Subscription[] }>('/subscriptions');
    },

    /**
     * Subscribe to a plan
     */
    subscribe: async (planId: string) => {
      return apiFetch<{ subscription: Subscription }>('/subscriptions', {
        method: 'POST',
        body: JSON.stringify({ planId }),
      });
    },

    /**
     * Cancel a subscription
     */
    cancel: async (subscriptionId: string) => {
      return apiFetch<{ success: boolean }>('/subscriptions', {
        method: 'DELETE',
        body: JSON.stringify({ subscriptionId }),
      });
    },
  },

  // ==================== MESSAGES ====================
  
  messages: {
    /**
     * Get all conversations
     */
    conversations: async () => {
      return apiFetch<{ conversations: Conversation[] }>('/messages');
    },

    /**
     * Get messages in a conversation
     */
    list: async (conversationId: string) => {
      return apiFetch<{ messages: Message[] }>(
        `/messages?conversationId=${conversationId}`
      );
    },

    /**
     * Send a message
     */
    send: async (data: {
      recipientId?: string;
      conversationId?: string;
      content: string;
    }) => {
      return apiFetch<{ message: Message }>('/messages', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    /**
     * Mark messages as read
     */
    markRead: async (conversationId: string) => {
      return apiFetch<{ success: boolean }>('/messages', {
        method: 'PATCH',
        body: JSON.stringify({ conversationId, read: true }),
      });
    },
  },

  // ==================== SEARCH ====================
  
  search: {
    /**
     * Search listings
     */
    listings: async (query: string, filters?: {
      categoryId?: string;
      minPrice?: number;
      maxPrice?: number;
      rating?: number;
    }) => {
      const params = new URLSearchParams({ q: query });
      if (filters?.categoryId) params.set('categoryId', filters.categoryId);
      if (filters?.minPrice) params.set('minPrice', filters.minPrice.toString());
      if (filters?.maxPrice) params.set('maxPrice', filters.maxPrice.toString());
      if (filters?.rating) params.set('rating', filters.rating.toString());
      
      return apiFetch<{ results: Listing[] }>(`/search?${params.toString()}`);
    },
  },

  // ==================== PAYMENTS ====================
  
  payments: {
    /**
     * Verify payment
     */
    verify: async (data: {
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    }) => {
      return apiFetch<{ success: boolean; order: Order }>('/payments/verify', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  },

  // ==================== COUPONS ====================
  
  coupons: {
    /**
     * Validate a coupon
     */
    validate: async (code: string, listingId?: string) => {
      const params = new URLSearchParams({ code });
      if (listingId) params.set('listingId', listingId);
      
      return apiFetch<{ coupon: Coupon; discount: number }>(
        `/coupons?${params.toString()}`
      );
    },
  },

  // ==================== LICENSE PLANS ====================
  
  licensePlans: {
    /**
     * Get license plans for a listing
     */
    list: async (listingId: string) => {
      return apiFetch<{ plans: LicensePlan[] }>(
        `/license-plans?listingId=${listingId}`
      );
    },
  },

  // ==================== ADMIN ====================
  
  admin: {
    /**
     * Get admin analytics
     */
    analytics: async () => {
      return apiFetch<{ analytics: AdminAnalytics }>('/admin/analytics');
    },

    /**
     * Get moderation queue
     */
    moderation: {
      list: async () => {
        return apiFetch<{ listings: Listing[] }>('/admin/moderation');
      },

      approve: async (listingId: string) => {
        return apiFetch<{ listing: Listing }>('/admin/moderation', {
          method: 'POST',
          body: JSON.stringify({ listingId, action: 'approve' }),
        });
      },

      reject: async (listingId: string, reason: string) => {
        return apiFetch<{ listing: Listing }>('/admin/moderation', {
          method: 'POST',
          body: JSON.stringify({ listingId, action: 'reject', reason }),
        });
      },
    },

    /**
     * Disputes management
     */
    disputes: {
      list: async () => {
        return apiFetch<{ disputes: Dispute[] }>('/admin/disputes');
      },

      resolve: async (disputeId: string, resolution: string) => {
        return apiFetch<{ dispute: Dispute }>('/admin/disputes', {
          method: 'POST',
          body: JSON.stringify({ disputeId, resolution }),
        });
      },
    },

    /**
     * Bulk actions
     */
    bulkActions: async (action: string, ids: string[]) => {
      return apiFetch<{ success: boolean }>('/admin/bulk-actions', {
        method: 'POST',
        body: JSON.stringify({ action, ids }),
      });
    },
  },

  // ==================== NOTIFICATIONS ====================
  
  notifications: {
    /**
     * Get all notifications
     */
    list: async () => {
      return apiFetch<{ notifications: Notification[] }>('/notifications');
    },

    /**
     * Mark notification as read
     */
    markRead: async (notificationId: string) => {
      return apiFetch<{ success: boolean }>('/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ notificationId, read: true }),
      });
    },

    /**
     * Mark all notifications as read
     */
    markAllRead: async () => {
      return apiFetch<{ success: boolean }>('/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ all: true, read: true }),
      });
    },
  },

  // ==================== UPLOADS ====================
  
  uploads: {
    /**
     * Upload a file
     */
    upload: async (file: File, type: 'thumbnail' | 'asset' | 'avatar') => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await fetch(`${API_BASE}/uploads`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      return response.json() as Promise<{ url: string; fileId: string }>;
    },
  },

  // ==================== FEATURED ====================
  
  featured: {
    /**
     * Get featured listings
     */
    list: async () => {
      return apiFetch<{ listings: Listing[] }>('/featured');
    },
  },

  // ==================== ACTIVITY ====================
  
  activity: {
    /**
     * Get recent activity
     */
    list: async (limit?: number) => {
      const params = limit ? `?limit=${limit}` : '';
      return apiFetch<{
        activities: Array<{
          id: string;
          type: string;
          description: string;
          createdAt: string;
          metadata?: Record<string, any>;
        }>;
      }>(`/activity${params}`);
    },
  },
};

/**
 * Export type-safe API client
 */
export default marketplaceApi;