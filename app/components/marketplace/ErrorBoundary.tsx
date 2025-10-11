/**
 * Marketplace Error Boundary Components
 * 
 * Error boundaries for graceful error handling in marketplace pages
 */

import { useRouteError, isRouteErrorResponse, Link } from '~/lib/router-utils';
import { AlertTriangle, Home, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert';

/**
 * Main marketplace error boundary
 */
export function MarketplaceErrorBoundary() {
  const error = useRouteError();

  // Handle different error types
  if (isRouteErrorResponse(error)) {
    return <RouteErrorDisplay error={error} />;
  }

  if (error instanceof Error) {
    return <GenericErrorDisplay error={error} />;
  }

  return <UnknownErrorDisplay />;
}

/**
 * Display for route errors (404, 403, etc.)
 */
function RouteErrorDisplay({ error }: { error: any }) {
  const getErrorContent = () => {
    switch (error.status) {
      case 404:
        return {
          title: 'Page Not Found',
          description: 'The page you\'re looking for doesn\'t exist or has been moved.',
          icon: AlertTriangle,
        };
      case 403:
        return {
          title: 'Access Denied',
          description: 'You don\'t have permission to access this resource.',
          icon: AlertTriangle,
        };
      case 401:
        return {
          title: 'Authentication Required',
          description: 'Please log in to access this page.',
          icon: AlertTriangle,
        };
      case 500:
        return {
          title: 'Server Error',
          description: 'Something went wrong on our end. Please try again later.',
          icon: AlertTriangle,
        };
      default:
        return {
          title: `Error ${error.status}`,
          description: error.statusText || 'An unexpected error occurred.',
          icon: AlertTriangle,
        };
    }
  };

  const { title, description, icon: Icon } = getErrorContent();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <Icon className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error.status === 401 && (
            <Button asChild className="w-full">
              <Link to="/login">Log In</Link>
            </Button>
          )}
          <Button asChild variant="outline" className="w-full">
            <Link to="/marketplace">
              <Home className="w-4 h-4 mr-2" />
              Go to Marketplace
            </Link>
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Display for generic JavaScript errors
 */
function GenericErrorDisplay({ error }: { error: Error }) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Something Went Wrong</CardTitle>
          <CardDescription>
            An unexpected error occurred. Please try refreshing the page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDevelopment && (
            <Alert variant="destructive">
              <AlertTitle>Error Details (Development Only)</AlertTitle>
              <AlertDescription className="mt-2">
                <pre className="text-xs overflow-auto p-2 bg-black/5 rounded">
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </AlertDescription>
            </Alert>
          )}
          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Page
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link to="/marketplace">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Display for unknown errors
 */
function UnknownErrorDisplay() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Unknown Error</CardTitle>
          <CardDescription>
            An unexpected error occurred. Please try again.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            className="w-full"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Page
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/marketplace">
              <Home className="w-4 h-4 mr-2" />
              Go to Marketplace
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Inline error display for component-level errors
 */
export function InlineError({
  title = 'Error',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2">
        {message}
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={onRetry}
          >
            <RefreshCw className="w-3 h-3 mr-2" />
            Try Again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Empty state display
 */
export function EmptyState({
  icon: Icon = AlertTriangle,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-sm">{description}</p>
      {action && (
        <>
          {action.href ? (
            <Button asChild>
              <Link to={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button onClick={action.onClick}>{action.label}</Button>
          )}
        </>
      )}
    </div>
  );
}