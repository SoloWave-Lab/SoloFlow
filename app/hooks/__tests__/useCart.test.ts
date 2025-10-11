/**
 * Tests for useCart hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCart } from '../useCart';
import { mockApiResponses, mockLocalStorage } from '~/test/test-utils';

// Mock the API client
vi.mock('~/lib/marketplace/api-client', () => ({
  marketplaceApi: {
    cart: {
      list: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    },
    coupons: {
      validate: vi.fn(),
    },
  },
}));

import { marketplaceApi } from '~/lib/marketplace/api-client';

describe('useCart', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with empty cart', () => {
    const { result } = renderHook(() => useCart());

    expect(result.current.items).toEqual([]);
    expect(result.current.itemCount).toBe(0);
    expect(result.current.subtotal).toBe(0);
    expect(result.current.total).toBe(0);
  });

  it('should add item to cart', async () => {
    const mockListing = mockApiResponses.listing;
    vi.mocked(marketplaceApi.cart.add).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useCart());

    await act(async () => {
      await result.current.addItem(mockListing.id);
    });

    await waitFor(() => {
      expect(marketplaceApi.cart.add).toHaveBeenCalledWith(mockListing.id, undefined);
    });
  });

  it('should remove item from cart', async () => {
    const mockListing = mockApiResponses.listing;
    vi.mocked(marketplaceApi.cart.remove).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useCart());

    await act(async () => {
      await result.current.removeItem(mockListing.id);
    });

    await waitFor(() => {
      expect(marketplaceApi.cart.remove).toHaveBeenCalledWith(mockListing.id);
    });
  });

  it('should clear cart', async () => {
    vi.mocked(marketplaceApi.cart.clear).mockResolvedValue({ success: true });

    const { result } = renderHook(() => useCart());

    await act(async () => {
      await result.current.clearCart();
    });

    await waitFor(() => {
      expect(marketplaceApi.cart.clear).toHaveBeenCalled();
      expect(result.current.items).toEqual([]);
    });
  });

  it('should validate coupon', async () => {
    const mockCoupon = {
      code: 'TEST10',
      discountType: 'percentage' as const,
      discountValue: 10,
      description: '10% off',
    };

    vi.mocked(marketplaceApi.coupons.validate).mockResolvedValue({
      coupon: mockCoupon,
      discount: 100,
    });

    const { result } = renderHook(() => useCart());

    await act(async () => {
      await result.current.applyCoupon('TEST10');
    });

    await waitFor(() => {
      expect(marketplaceApi.coupons.validate).toHaveBeenCalledWith('TEST10');
      expect(result.current.coupon).toEqual(mockCoupon);
      expect(result.current.discount).toBe(100);
    });
  });

  it('should calculate totals correctly', () => {
    const { result } = renderHook(() => useCart());

    // Mock cart items
    act(() => {
      // @ts-ignore - accessing internal state for testing
      result.current.items = [
        { ...mockApiResponses.listing, priceCents: 1000 },
        { ...mockApiResponses.listing, id: '2', priceCents: 2000 },
      ];
    });

    expect(result.current.subtotal).toBe(3000);
    expect(result.current.total).toBe(3000);
  });

  it('should apply discount to total', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      // @ts-ignore
      result.current.items = [
        { ...mockApiResponses.listing, priceCents: 1000 },
      ];
      // @ts-ignore
      result.current.discount = 100;
    });

    expect(result.current.subtotal).toBe(1000);
    expect(result.current.total).toBe(900);
  });

  it('should persist cart to localStorage', async () => {
    const { result } = renderHook(() => useCart());

    await act(async () => {
      // @ts-ignore
      result.current.items = [mockApiResponses.listing];
    });

    // Check if localStorage was updated
    const stored = mockLocalStorage.getItem('marketplace_cart');
    expect(stored).toBeTruthy();
  });
});