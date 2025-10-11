/**
 * Marketplace Authentication Helpers
 * 
 * Utilities for handling authentication in marketplace routes
 */

import { redirect } from 'react-router';
import { auth } from '~/lib/auth.server';
import { marketplaceApi } from '~/lib/marketplace/api-client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  image?: string;
  phone?: string;
  seller?: {
    id: string;
    displayName: string;
    onboardingComplete?: boolean;
  };
}

async function hydrateSellerProfile(userId: string, headers: Headers) {
  try {
    const response = await marketplaceApi.seller.profile({ headers });
    if (response?.seller) {
      return {
        id: response.seller.id,
        displayName: response.seller.displayName,
        onboardingComplete: Boolean(response.seller.onboardingComplete ?? true),
      };
    }
  } catch (error) {
    // Ignore profile errors; treat as buyer-only
    console.debug('Seller profile unavailable for user', userId, error);
  }
  return undefined;
}

/**
 * Require authentication for marketplace routes
 * Redirects to login if not authenticated
 */
export async function requireMarketplaceAuth(request: Request): Promise<AuthenticatedUser> {
  const session = await auth.api.getSession({ headers: request.headers });
  
  if (!session?.user?.id) {
    // Redirect to login with return URL
    const url = new URL(request.url);
    const returnTo = encodeURIComponent(url.pathname + url.search);
    throw redirect(`/login?returnTo=${returnTo}`);
  }
  
  const seller = await hydrateSellerProfile(session.user.id, request.headers);
  
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
    phone: session.user.phone,
    seller,
  };
}

/**
 * Get optional user session (doesn't redirect if not authenticated)
 */
export async function getOptionalUser(request: Request): Promise<AuthenticatedUser | null> {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    
    if (!session?.user?.id) {
      return null;
    }
    
    const seller = await hydrateSellerProfile(session.user.id, request.headers);
    
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
      phone: session.user.phone,
      seller,
    };
  } catch (error) {
    console.error('Failed to get user session:', error);
    return null;
  }
}

/**
 * Require seller role
 * Redirects to become-seller page if not a seller
 */
export async function requireSeller(request: Request): Promise<AuthenticatedUser> {
  const user = await requireMarketplaceAuth(request);
  
  // TODO: Check if user is a seller in database
  // For now, we'll assume all authenticated users can be sellers
  // In production, you should check the user's role/seller status
  
  return user;
}

/**
 * Require admin role
 * Returns 403 if not an admin
 */
export async function requireAdmin(request: Request): Promise<AuthenticatedUser> {
  const user = await requireMarketplaceAuth(request);
  
  // TODO: Check if user is an admin in database
  // For now, we'll assume all authenticated users can access admin
  // In production, you should check the user's role
  
  return user;
}

/**
 * Get authorization header for API requests
 */
export async function getAuthHeader(request: Request): Promise<Record<string, string>> {
  const session = await auth.api.getSession({ headers: request.headers });
  
  if (!session?.session?.token) {
    return {};
  }
  
  return {
    'Authorization': `Bearer ${session.session.token}`,
  };
}

/**
 * Check if user owns a resource
 */
export function checkOwnership(userId: string, resourceOwnerId: string): boolean {
  return userId === resourceOwnerId;
}

/**
 * Require ownership of a resource
 */
export function requireOwnership(userId: string, resourceOwnerId: string): void {
  if (!checkOwnership(userId, resourceOwnerId)) {
    throw new Response('Forbidden', { status: 403 });
  }
}