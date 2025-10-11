/**
 * useCart Hook
 * 
 * Manages shopping cart state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import type { CartItem, Cart } from '~/lib/marketplace/types';

const CART_STORAGE_KEY = 'marketplace_cart';

/**
 * Load cart from localStorage
 */
function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load cart:', error);
    return [];
  }
}

/**
 * Save cart to localStorage
 */
function saveCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Failed to save cart:', error);
  }
}

/**
 * Calculate cart totals
 */
function calculateTotals(items: CartItem[], discount: number = 0): Cart {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const total = Math.max(0, subtotal - discount);
  const currency = items[0]?.currency || 'INR';
  
  return {
    items,
    subtotal,
    discount,
    total,
    currency,
  };
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  // Load cart on mount
  useEffect(() => {
    setItems(loadCart());
  }, []);

  // Save cart whenever items change
  useEffect(() => {
    saveCart(items);
  }, [items]);

  /**
   * Add item to cart
   */
  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      // Check if item already exists
      const exists = prev.some(
        (i) => i.listingId === item.listingId && i.licensePlanId === item.licensePlanId
      );
      
      if (exists) {
        return prev; // Don't add duplicates
      }
      
      return [...prev, item];
    });
  }, []);

  /**
   * Remove item from cart
   */
  const removeItem = useCallback((listingId: string, licensePlanId: string) => {
    setItems((prev) =>
      prev.filter(
        (item) =>
          !(item.listingId === listingId && item.licensePlanId === licensePlanId)
      )
    );
  }, []);

  /**
   * Clear entire cart
   */
  const clearCart = useCallback(() => {
    setItems([]);
    setDiscount(0);
    setCouponCode(undefined);
  }, []);

  /**
   * Check if item is in cart
   */
  const hasItem = useCallback(
    (listingId: string, licensePlanId: string) => {
      return items.some(
        (item) => item.listingId === listingId && item.licensePlanId === licensePlanId
      );
    },
    [items]
  );

  /**
   * Apply coupon code
   */
  const applyCoupon = useCallback(async (code: string) => {
    setIsLoading(true);
    
    try {
      // TODO: Call API to validate coupon
      // const { coupon, discount } = await marketplaceApi.coupons.validate(code);
      
      // Mock implementation
      const mockDiscount = 100; // ₹1.00
      
      setDiscount(mockDiscount);
      setCouponCode(code);
      
      return { success: true, discount: mockDiscount };
    } catch (error) {
      console.error('Failed to apply coupon:', error);
      return { success: false, error: 'Invalid coupon code' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Remove coupon
   */
  const removeCoupon = useCallback(() => {
    setDiscount(0);
    setCouponCode(undefined);
  }, []);

  /**
   * Get cart totals
   */
  const cart = calculateTotals(items, discount);
  if (couponCode) {
    cart.couponCode = couponCode;
  }

  return {
    // State
    items,
    cart,
    itemCount: items.length,
    isLoading,
    
    // Actions
    addItem,
    removeItem,
    clearCart,
    hasItem,
    applyCoupon,
    removeCoupon,
  };
}