/**
 * ListingFilters Component
 * 
 * Reusable filter component for listings with category, price, rating, and license type filters
 */

import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { Slider } from '~/components/ui/slider';
import { X, SlidersHorizontal } from 'lucide-react';
import type { ListingFilters as Filters } from '~/lib/marketplace/types';

interface ListingFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  categories?: Array<{ id: string; name: string }>;
  showCategoryFilter?: boolean;
  showPriceFilter?: boolean;
  showRatingFilter?: boolean;
  showLicenseFilter?: boolean;
}

export function ListingFilters({
  filters,
  onFiltersChange,
  categories = [],
  showCategoryFilter = true,
  showPriceFilter = true,
  showRatingFilter = true,
  showLicenseFilter = true,
}: ListingFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<Filters>(filters);

  const hasActiveFilters =
    filters.categoryId ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.rating ||
    filters.licenseType;

  const updateFilter = (key: keyof Filters, value: any) => {
    setLocalFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const clearFilters = () => {
    const emptyFilters: Filters = {};
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  return (
    <div className="relative">
      {/* Filter Toggle Button */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <SlidersHorizontal className="w-4 h-4" />
        Filters
        {hasActiveFilters && (
          <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
            {Object.values(filters).filter(Boolean).length}
          </span>
        )}
      </Button>

      {/* Filter Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg border border-gray-200 shadow-lg z-50 p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Filters</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category Filter */}
            {showCategoryFilter && categories.length > 0 && (
              <div className="space-y-2">
                <Label>Category</Label>
                <select
                  value={localFilters.categoryId || ''}
                  onChange={(e) => updateFilter('categoryId', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Price Range Filter */}
            {showPriceFilter && (
              <div className="space-y-3">
                <Label>Price Range</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="number"
                      placeholder="Min"
                      value={localFilters.minPrice || ''}
                      onChange={(e) =>
                        updateFilter('minPrice', e.target.value ? Number(e.target.value) : undefined)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Max"
                      value={localFilters.maxPrice || ''}
                      onChange={(e) =>
                        updateFilter('maxPrice', e.target.value ? Number(e.target.value) : undefined)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Rating Filter */}
            {showRatingFilter && (
              <div className="space-y-3">
                <Label>Minimum Rating</Label>
                <div className="space-y-2">
                  {[4, 3, 2, 1].map((rating) => (
                    <label key={rating} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="rating"
                        checked={localFilters.rating === rating}
                        onChange={() => updateFilter('rating', rating)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg
                            key={i}
                            className={`w-4 h-4 ${
                              i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                            }`}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                        <span className="text-sm text-gray-600 ml-1">& up</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* License Type Filter */}
            {showLicenseFilter && (
              <div className="space-y-2">
                <Label>License Type</Label>
                <select
                  value={localFilters.licenseType || ''}
                  onChange={(e) => updateFilter('licenseType', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Licenses</option>
                  <option value="personal">Personal</option>
                  <option value="commercial">Commercial</option>
                  <option value="extended">Extended</option>
                </select>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="flex-1"
                disabled={!hasActiveFilters}
              >
                Clear All
              </Button>
              <Button onClick={applyFilters} className="flex-1">
                Apply Filters
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}