import React, { Suspense } from 'react';
import { json, type LoaderFunctionArgs } from '~/lib/router-utils';
import { useLoaderData, Link } from 'react-router';
import { MarketplaceLayout } from '~/components/marketplace/MarketplaceLayout';
import { Button } from '~/components/ui/button';
import { Card, CardContent } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { 
  Users, 
  Star, 
  Package, 
  TrendingUp, 
  Award,
  ArrowRight,
  MapPin,
  Calendar
} from 'lucide-react';
import { marketplaceApi } from '~/lib/marketplace/api-client';
import { getOptionalUser } from '~/lib/marketplace/auth-helpers';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const [user, sellersResponse] = await Promise.all([
      getOptionalUser(request),
      marketplaceApi.sellers.list({ limit: 50 }),
    ]);

    return json({
      user,
      sellers: sellersResponse.sellers || [],
    });
  } catch (error) {
    console.error('Failed to load sellers:', error);
    return json({
      user: null,
      sellers: [],
    });
  }
}

function SellersPageContent() {
  const data = useLoaderData<typeof loader>();

  return (
    <MarketplaceLayout user={data.user}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">All Sellers</h1>
            <p className="text-muted-foreground">
              Discover talented creators and their work
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sellers</p>
                <p className="text-2xl font-bold">{data.sellers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <Award className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Verified Sellers</p>
                <p className="text-2xl font-bold">
                  {data.sellers.filter((s: any) => s.is_verified).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Package className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Listings</p>
                <p className="text-2xl font-bold">
                  {data.sellers.reduce((acc: number, s: any) => acc + (s.listing_count || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sellers Grid */}
      {data.sellers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {data.sellers.map((seller: any) => (
            <Link
              key={seller.id}
              to={`/marketplace/sellers/${seller.id}`}
              className="group"
            >
              <Card className="h-full hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    {/* Avatar */}
                    <Avatar className="h-20 w-20 mb-4 ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all">
                      <AvatarImage src={seller.avatar_url} alt={seller.display_name} />
                      <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary/20 to-primary/5">
                        {seller.display_name?.charAt(0).toUpperCase() || 'S'}
                      </AvatarFallback>
                    </Avatar>

                    {/* Seller Name */}
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                        {seller.display_name || 'Unknown Seller'}
                      </h3>
                      {seller.is_verified && (
                        <Award className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      )}
                    </div>

                    {/* Business Name */}
                    {seller.business_name && seller.business_name !== seller.display_name && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {seller.business_name}
                      </p>
                    )}

                    {/* Bio */}
                    {seller.bio && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {seller.bio}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center gap-4 mb-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>{seller.listing_count || 0}</span>
                      </div>
                      {seller.average_rating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-current" />
                          <span>{seller.average_rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    {/* Badges */}
                    {seller.badges && seller.badges.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1 mb-3">
                        {seller.badges.slice(0, 3).map((badge: any) => (
                          <Badge key={badge.badge_type} variant="secondary" className="text-xs">
                            {badge.badge_type}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Location & Join Date */}
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {seller.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{seller.location}</span>
                        </div>
                      )}
                      {seller.created_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Joined {new Date(seller.created_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Arrow Icon */}
                    <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ArrowRight className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">No Sellers Yet</h3>
            <p className="text-muted-foreground mb-6">
              Be the first to join our marketplace as a seller
            </p>
            <Button asChild>
              <Link to="/marketplace/become-seller">Become a Seller</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Call to Action */}
      <div className="mt-12 p-8 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-background border border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold mb-2">Want to become a seller?</h3>
            <p className="text-muted-foreground">
              Join our marketplace and start selling your templates and assets today
            </p>
          </div>
          <Button size="lg" asChild>
            <Link to="/marketplace/become-seller">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </MarketplaceLayout>
  );
}

export default function SellersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading sellers...</p>
          </div>
        </div>
      }
    >
      <SellersPageContent />
    </Suspense>
  );
}