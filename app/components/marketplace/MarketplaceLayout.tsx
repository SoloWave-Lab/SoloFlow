import React from 'react';
import { Link, useLocation } from 'react-router';
import { cn } from '~/lib/utils';
import {
  Store,
  ShoppingCart,
  Heart,
  User,
  Bell,
  MessageSquare,
  LayoutDashboard,
  Package,
  Settings,
  Search,
} from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';

interface MarketplaceLayoutProps {
  children: React.ReactNode;
  user?: {
    id: string;
    name: string;
    email: string;
    isSeller?: boolean;
    isAdmin?: boolean;
  };
  unreadMessages?: number;
  cartItemCount?: number;
}

export function MarketplaceLayout({
  children,
  user,
  unreadMessages = 0,
  cartItemCount = 0,
}: MarketplaceLayoutProps) {
  const location = useLocation();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo */}
          <Link to="/marketplace" className="flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Marketplace</span>
          </Link>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search templates, effects, assets..."
                className="pl-10 w-full"
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* Messages */}
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="relative"
                >
                  <Link to="/marketplace/messages">
                    <MessageSquare className="h-5 w-5" />
                    {unreadMessages > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-white text-xs flex items-center justify-center">
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </span>
                    )}
                  </Link>
                </Button>

                {/* Notifications */}
                <Button variant="ghost" size="icon" asChild>
                  <Link to="/marketplace/notifications">
                    <Bell className="h-5 w-5" />
                  </Link>
                </Button>

                {/* Wishlist */}
                <Button variant="ghost" size="icon" asChild>
                  <Link to="/marketplace/wishlist">
                    <Heart className="h-5 w-5" />
                  </Link>
                </Button>

                {/* Cart */}
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="relative"
                >
                  <Link to="/marketplace/cart">
                    <ShoppingCart className="h-5 w-5" />
                    {cartItemCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                        {cartItemCount}
                      </span>
                    )}
                  </Link>
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col">
                        <span className="font-semibold">{user.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/marketplace/purchases">
                        <Package className="mr-2 h-4 w-4" />
                        My Purchases
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/marketplace/orders">
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        My Orders
                      </Link>
                    </DropdownMenuItem>
                    {user.isSeller && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/marketplace/seller/dashboard">
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            Seller Dashboard
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    {user.isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/marketplace/admin">
                            <Settings className="mr-2 h-4 w-4" />
                            Admin Panel
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/marketplace/settings">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}>Sign In</Link>
                </Button>
                <Button asChild>
                  <Link to={`/login?returnTo=${encodeURIComponent(location.pathname)}`}>Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-t">
          <div className="container mx-auto px-4">
            <nav className="flex gap-6 h-12 items-center text-sm">
              <Link
                to="/marketplace"
                className={cn(
                  'font-medium transition-colors hover:text-primary',
                  isActive('/marketplace') && !isActive('/marketplace/')
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                Browse
              </Link>
              <Link
                to="/marketplace/categories"
                className={cn(
                  'font-medium transition-colors hover:text-primary',
                  isActive('/marketplace/categories')
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                Categories
              </Link>
              <Link
                to="/marketplace/featured"
                className={cn(
                  'font-medium transition-colors hover:text-primary',
                  isActive('/marketplace/featured')
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                Featured
              </Link>
              <Link
                to="/marketplace/sellers"
                className={cn(
                  'font-medium transition-colors hover:text-primary',
                  isActive('/marketplace/sellers')
                    ? 'text-primary'
                    : 'text-muted-foreground'
                )}
              >
                Top Sellers
              </Link>
              {!user?.isSeller && (
                <Link
                  to="/marketplace/become-seller"
                  className={cn(
                    'font-medium transition-colors hover:text-primary',
                    isActive('/marketplace/become-seller')
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  )}
                >
                  Become a Seller
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">{children}</main>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-semibold mb-4">Marketplace</h3>
              <p className="text-sm text-muted-foreground">
                Buy and sell premium video templates, effects, and assets.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">For Buyers</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/marketplace/browse" className="hover:text-primary">
                    Browse Listings
                  </Link>
                </li>
                <li>
                  <Link to="/marketplace/how-it-works" className="hover:text-primary">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link to="/marketplace/licenses" className="hover:text-primary">
                    License Types
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">For Sellers</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/marketplace/become-seller" className="hover:text-primary">
                    Become a Seller
                  </Link>
                </li>
                <li>
                  <Link to="/marketplace/seller-guide" className="hover:text-primary">
                    Seller Guide
                  </Link>
                </li>
                <li>
                  <Link to="/marketplace/fees" className="hover:text-primary">
                    Fees & Pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link to="/marketplace/help" className="hover:text-primary">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link to="/marketplace/contact" className="hover:text-primary">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-primary">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            © 2024 Marketplace. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}