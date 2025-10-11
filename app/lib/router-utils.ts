/**
 * Router utilities - Re-exports from React Router packages
 * This module provides a centralized location for importing router utilities
 * 
 * Note: In React Router v7, you can return plain objects from loaders/actions.
 * The json() helper is provided for compatibility with existing code.
 */

// Re-export redirect from react-router
export { redirect, redirectDocument } from 'react-router';

// JSON helper function for compatibility
// In React Router v7, you can just return plain objects from loaders/actions
// but this helper is provided for existing code that uses it
export function json<T = unknown>(data: T, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
}

// Client and shared utilities from react-router
export {
  useNavigate,
  useLocation,
  useParams,
  useSearchParams,
  useLoaderData,
  useActionData,
  useRouteError,
  isRouteErrorResponse,
  useNavigation,
  useSubmit,
  useRevalidator,
  useFetcher,
  useFetchers,
  useMatches,
  useRouteLoaderData,
  Link,
  NavLink,
  Form,
  Await,
  Navigate,
  Outlet,
  useBlocker,
} from 'react-router';

// Type exports
export type {
  LoaderFunctionArgs,
  ActionFunctionArgs,
  MetaFunction,
  LinksFunction,
  HeadersFunction,
  SerializeFrom,
  TypedResponse,
} from 'react-router';