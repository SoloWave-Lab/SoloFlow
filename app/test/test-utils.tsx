/**
 * Test Utilities
 * 
 * Helper functions and utilities for testing
 */

import { render, type RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import type { ReactElement } from 'react';

/**
 * Custom render function that includes common providers
 */
export function renderWithRouter(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <BrowserRouter>{children}</BrowserRouter>;
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

/**
 * Mock marketplace API responses
 */
export const mockApiResponses = {
  listing: {
    id: '1',
    title: 'Test Listing',
    description: 'Test description',
    priceCents: 1000,
    thumbnailUrl: 'https://example.com/image.jpg',
    sellerId: 'seller-1',
    categoryId: 'cat-1',
    status: 'published' as const,
    downloads: 100,
    rating: 4.5,
    reviewCount: 10,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  seller: {
    id: 'seller-1',
    userId: 'user-1',
    businessName: 'Test Seller',
    tagline: 'Test tagline',
    description: 'Test description',
    isVerified: true,
    rating: 4.8,
    totalSales: 500,
    totalListings: 25,
    createdAt: new Date().toISOString(),
  },
  order: {
    id: 'order-1',
    userId: 'user-1',
    totalCents: 1000,
    status: 'completed' as const,
    items: [],
    createdAt: new Date().toISOString(),
  },
  review: {
    id: 'review-1',
    listingId: '1',
    userId: 'user-1',
    rating: 5,
    comment: 'Great product!',
    buyerName: 'Test User',
    isVerifiedPurchase: true,
    helpfulCount: 5,
    createdAt: new Date().toISOString(),
  },
};

/**
 * Mock user session
 */
export const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  image: 'https://example.com/avatar.jpg',
};

/**
 * Create mock fetch response
 */
export function createMockResponse<T>(data: T, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers(),
  } as Response);
}

/**
 * Wait for async operations
 */
export const waitFor = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Mock localStorage
 */
export const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

// Replace global localStorage with mock
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

/**
 * Mock Razorpay
 */
export const mockRazorpay = {
  open: vi.fn(),
  on: vi.fn(),
};

// @ts-ignore
global.Razorpay = vi.fn(() => mockRazorpay);

/**
 * Create mock file
 */
export function createMockFile(
  name: string,
  size: number,
  type: string
): File {
  const blob = new Blob(['a'.repeat(size)], { type });
  return new File([blob], name, { type });
}

/**
 * Create mock image file
 */
export function createMockImageFile(
  name = 'test.jpg',
  size = 1024
): File {
  return createMockFile(name, size, 'image/jpeg');
}

// Re-export everything from testing library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';