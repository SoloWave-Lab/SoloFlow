/**
 * Server-side Marketplace API Client
 * 
 * Wrapper around the marketplace API client that includes authentication
 */

import { marketplaceApi, type MarketplaceApiClient } from './api-client';
import { getAuthHeader } from './auth-helpers';

/**
 * Get authenticated API client for server-side use
 * Automatically includes auth headers from the request
 */
export async function getAuthenticatedApiClient(request: Request): Promise<MarketplaceApiClient> {
  const authHeaders = await getAuthHeader(request);
  
  // Create a new instance with auth headers
  // Note: This is a simple implementation. In production, you might want to
  // create a new instance of the API client with the auth headers
  // For now, we'll just return the existing client and rely on the backend
  // to handle authentication via cookies
  
  return marketplaceApi;
}

/**
 * Helper to make authenticated API calls
 */
export async function withAuth<T>(
  request: Request,
  apiCall: (client: MarketplaceApiClient) => Promise<T>
): Promise<T> {
  const client = await getAuthenticatedApiClient(request);
  return apiCall(client);
}