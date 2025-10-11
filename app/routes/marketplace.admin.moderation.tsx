import React, { useState, Suspense } from 'react';
import { json, type LoaderFunctionArgs, type ActionFunctionArgs } from '~/lib/router-utils';
import { useLoaderData, useFetcher, Link } from 'react-router';
import { MarketplaceLayout } from '~/components/marketplace/MarketplaceLayout';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Textarea } from '~/components/ui/textarea';
import { Label } from '~/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog';
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  AlertTriangle,
  Package,
  User,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { marketplaceApi } from '~/lib/marketplace/api-client';
import { DashboardStatsSkeleton, TableSkeleton } from '~/components/marketplace/LoadingSkeletons';
import { ThumbnailImage } from '~/components/marketplace/OptimizedImage';

export async function loader({ request }: LoaderFunctionArgs) {
  // TODO: Check admin authorization
  
  try {
    const response = await marketplaceApi.admin.moderation.list();
    const listings = response.listings || [];
    
    // Filter listings by status
    const pendingListings = listings.filter(l => l.status === 'pending');
    const approvedCount = listings.filter(l => l.status === 'published').length;
    const rejectedCount = listings.filter(l => l.status === 'rejected').length;
    
    return json({
      user: {
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@example.com',
        isAdmin: true,
      },
      pendingTickets: pendingListings.map(listing => ({
        id: listing.id,
        listing: {
          id: listing.id,
          title: listing.title,
          description: listing.description,
          thumbnailUrl: listing.thumbnail_url,
          priceCents: listing.price_cents,
          category: listing.category,
        },
        seller: {
          id: listing.seller_id,
          displayName: listing.seller?.display_name || 'Unknown Seller',
        },
        status: listing.status,
        createdAt: listing.created_at,
      })),
      stats: {
        pending: pendingListings.length,
        approved: approvedCount,
        rejected: rejectedCount,
        flagged: 0, // TODO: Add flagged listings support
      },
    });
  } catch (error) {
    console.error('Failed to load moderation queue:', error);
    return json({
      user: {
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@example.com',
        isAdmin: true,
      },
      pendingTickets: [],
      stats: {
        pending: 0,
        approved: 0,
        rejected: 0,
        flagged: 0,
      },
    });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const actionType = formData.get('action') as string;
  const listingId = formData.get('ticketId') as string;
  const reviewNotes = formData.get('reviewNotes') as string;

  try {
    if (actionType === 'approve') {
      await marketplaceApi.admin.moderation.approve(listingId);
    } else if (actionType === 'reject') {
      await marketplaceApi.admin.moderation.reject(listingId, reviewNotes || 'No reason provided');
    }
    
    return json({ success: true });
  } catch (error) {
    console.error('Failed to moderate listing:', error);
    return json({ success: false, error: 'Failed to process moderation action' }, { status: 500 });
  }
}

function ModerationPanelContent() {
  const data = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const handleModerate = (ticketId: string, action: 'approve' | 'reject') => {
    fetcher.submit(
      {
        action,
        ticketId,
        reviewNotes,
      },
      { method: 'post' }
    );
    setSelectedTicket(null);
    setReviewNotes('');
  };

  return (
    <MarketplaceLayout user={data.user}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Moderation Panel</h1>
        <p className="text-muted-foreground">
          Review and moderate marketplace listings
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting moderation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.approved}</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.rejected}</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Flagged</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.flagged}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requires attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Moderation Queue */}
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            <Clock className="h-4 w-4 mr-2" />
            Pending ({data.stats.pending})
          </TabsTrigger>
          <TabsTrigger value="flagged">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Flagged ({data.stats.flagged})
          </TabsTrigger>
          <TabsTrigger value="history">
            <Package className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {data.pendingTickets.length > 0 ? (
            <div className="space-y-4">
              {data.pendingTickets.map((ticket: any) => (
                <Card key={ticket.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="mb-2">
                          {ticket.listing.title}
                        </CardTitle>
                        <CardDescription>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {ticket.seller.displayName}
                            </span>
                            <span>
                              Submitted:{' '}
                              {new Date(ticket.createdAt).toLocaleDateString()}
                            </span>
                            <Badge variant="secondary">{ticket.status}</Badge>
                          </div>
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedTicket(ticket)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <ThumbnailImage
                          src={ticket.listing.thumbnailUrl || ''}
                          alt={ticket.listing.title}
                          aspectRatio="16/9"
                          fallback={
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                              <Package className="h-12 w-12 text-muted-foreground" />
                            </div>
                          }
                        />
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Description</h4>
                        <p className="text-sm text-muted-foreground line-clamp-4">
                          {ticket.listing.description}
                        </p>
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Price:</span>
                            <span className="font-semibold">
                              ₹{(ticket.listing.priceCents / 100).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Category:</span>
                            <span>{ticket.listing.category?.name || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="default" className="flex-1">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Approve Listing</AlertDialogTitle>
                            <AlertDialogDescription>
                              This listing will be published and visible to all users.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="py-4">
                            <Label htmlFor="notes">Review Notes (Optional)</Label>
                            <Textarea
                              id="notes"
                              placeholder="Add any notes for the seller..."
                              value={reviewNotes}
                              onChange={(e) => setReviewNotes(e.target.value)}
                              className="mt-2"
                            />
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleModerate(ticket.id, 'approve')}
                              disabled={fetcher.state !== 'idle'}
                            >
                              {fetcher.state !== 'idle' ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Approving...
                                </>
                              ) : (
                                'Approve Listing'
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="flex-1">
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reject Listing</AlertDialogTitle>
                            <AlertDialogDescription>
                              This listing will be rejected and the seller will be
                              notified.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="py-4">
                            <Label htmlFor="reject-notes">
                              Rejection Reason (Required)
                            </Label>
                            <Textarea
                              id="reject-notes"
                              placeholder="Explain why this listing is being rejected..."
                              value={reviewNotes}
                              onChange={(e) => setReviewNotes(e.target.value)}
                              className="mt-2"
                              required
                            />
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleModerate(ticket.id, 'reject')}
                              disabled={!reviewNotes || fetcher.state !== 'idle'}
                            >
                              {fetcher.state !== 'idle' ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Rejecting...
                                </>
                              ) : (
                                'Reject Listing'
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <Button variant="outline" asChild>
                        <Link to={`/marketplace/listings/${ticket.listing.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Full
                        </Link>
                      </Button>

                      <Button variant="outline" asChild>
                        <Link
                          to={`/marketplace/messages?sellerId=${ticket.seller.id}`}
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Contact
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
                <p className="text-muted-foreground">
                  There are no pending listings to review at the moment.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="flagged" className="mt-6">
          <Card>
            <CardContent className="p-12 text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Flagged Items</h3>
              <p className="text-muted-foreground">
                Flagged listings will appear here for review.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Moderation History</CardTitle>
              <CardDescription>
                View past moderation decisions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link to="/marketplace/admin/moderation/history">
                  View Full History
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MarketplaceLayout>
  );
}

// Wrap with Suspense for loading states
export default function ModerationPanel() {
  return (
    <Suspense fallback={
      <MarketplaceLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Moderation Panel</h1>
            <p className="text-muted-foreground">
              Review and moderate marketplace listings
            </p>
          </div>
          <DashboardStatsSkeleton count={4} />
          <TableSkeleton rows={8} />
        </div>
      </MarketplaceLayout>
    }>
      <ModerationPanelContent />
    </Suspense>
  );
}