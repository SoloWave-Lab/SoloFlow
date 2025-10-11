import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from '~/lib/router-utils';
import { Form, useActionData, useLoaderData, useNavigation } from 'react-router';
import { MarketplaceLayout } from '~/components/marketplace/MarketplaceLayout';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { Badge } from '~/components/ui/badge';
import { Alert, AlertDescription } from '~/components/ui/alert';
import { Separator } from '~/components/ui/separator';
import { ArrowLeft, Upload, X, Save, Send, AlertCircle, Loader2 } from 'lucide-react';
import { useState, Suspense } from 'react';
import { marketplaceApi } from '~/lib/marketplace/api-client';
import { ThumbnailImage } from '~/components/marketplace/OptimizedImage';

export async function loader({ request, params }: LoaderFunctionArgs) {
  // TODO: const user = await requireSeller(request);
  const listingId = params.id;

  if (!listingId) {
    throw new Response('Not Found', { status: 404 });
  }

  try {
    const [listingResponse, categoriesResponse] = await Promise.all([
      marketplaceApi.listings.get(listingId),
      marketplaceApi.categories.list(),
    ]);

    const listing = listingResponse.listing;
    const categories = categoriesResponse.categories || [];

    return json({ 
      listing: {
        id: listing.id,
        title: listing.title,
        description: listing.description,
        categoryId: listing.category_id,
        priceCents: listing.price_cents,
        licenseType: listing.license_type,
        licenseTerms: listing.license_terms,
        allowCommercialUse: listing.allow_commercial_use,
        allowModification: listing.allow_modification,
        thumbnailUrl: listing.thumbnail_url,
        tags: listing.tags || [],
        status: listing.status,
        rejectionReason: listing.rejection_reason,
      },
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch listing:', error);
    throw new Response('Not Found', { status: 404 });
  }
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');
  const listingId = params.id;

  if (!listingId) {
    return json({ error: 'Listing ID required' }, { status: 400 });
  }

  if (intent === 'save-draft') {
    try {
      const updateData = {
        title: formData.get('title') as string,
        description: formData.get('description') as string || undefined,
        categoryId: formData.get('categoryId') as string,
        priceCents: parseInt(formData.get('price') as string) * 100,
        tags: formData.get('tags') ? (formData.get('tags') as string).split(',') : [],
        status: 'draft' as const,
      };
      
      await marketplaceApi.listings.update(listingId, updateData);
      return json({ success: true, message: 'Changes saved successfully' });
    } catch (error) {
      console.error('Failed to update listing:', error);
      return json({ error: 'Failed to save changes' }, { status: 500 });
    }
  }

  if (intent === 'submit') {
    try {
      const updateData = {
        title: formData.get('title') as string,
        description: formData.get('description') as string || undefined,
        categoryId: formData.get('categoryId') as string,
        priceCents: parseInt(formData.get('price') as string) * 100,
        tags: formData.get('tags') ? (formData.get('tags') as string).split(',') : [],
        status: 'pending' as const, // Resubmit for moderation
      };
      
      await marketplaceApi.listings.update(listingId, updateData);
      return redirect('/marketplace/seller/listings');
    } catch (error) {
      console.error('Failed to update listing:', error);
      return json({ error: 'Failed to update listing' }, { status: 500 });
    }
  }

  return json({ error: 'Invalid intent' }, { status: 400 });
}

function EditListingContent() {
  const { listing, categories } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const [tags, setTags] = useState<string[]>(listing.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(listing.thumbnailUrl);
  const [newAssetFiles, setNewAssetFiles] = useState<File[]>([]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAssetFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setNewAssetFiles([...newAssetFiles, ...files]);
  };

  const handleRemoveAssetFile = (index: number) => {
    setNewAssetFiles(newAssetFiles.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const needsReview = listing.status === 'rejected' || listing.status === 'pending';

  return (
    <MarketplaceLayout>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <a href="/marketplace/seller/listings">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Listings
            </a>
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Edit Listing</h1>
              <p className="text-muted-foreground mt-1">
                Update your marketplace listing
              </p>
            </div>
            <Badge
              variant={
                listing.status === 'published'
                  ? 'default'
                  : listing.status === 'rejected'
                  ? 'destructive'
                  : 'secondary'
              }
            >
              {listing.status}
            </Badge>
          </div>
        </div>

        {/* Rejection Notice */}
        {listing.status === 'rejected' && listing.rejectionReason && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Rejection Reason:</strong> {listing.rejectionReason}
              <br />
              <span className="text-sm">
                Please address the issues and resubmit for review.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Pending Notice */}
        {listing.status === 'pending' && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This listing is currently under review. Changes will require resubmission for
              moderation.
            </AlertDescription>
          </Alert>
        )}

        <Form method="post" encType="multipart/form-data" className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Update the basic details about your listing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  name="title"
                  defaultValue={listing.title}
                  placeholder="e.g., Professional Video Transition Pack"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={listing.description}
                  placeholder="Describe your product in detail..."
                  rows={8}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select name="categoryId" defaultValue={listing.categoryId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Add tags (press Enter)"
                  />
                  <Button type="button" onClick={handleAddTag}>
                    Add
                  </Button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <input type="hidden" name="tags" value={JSON.stringify(tags)} />
              </div>
            </CardContent>
          </Card>

          {/* Pricing & License */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing & License</CardTitle>
              <CardDescription>
                Update your pricing and license terms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="price">Price (₹) *</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={(listing.priceCents / 100).toFixed(2)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="licenseType">License Type *</Label>
                <Select name="licenseType" defaultValue={listing.licenseType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select license type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal Use</SelectItem>
                    <SelectItem value="commercial">Commercial Use</SelectItem>
                    <SelectItem value="extended">Extended License</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="licenseTerms">License Terms *</Label>
                <Textarea
                  id="licenseTerms"
                  name="licenseTerms"
                  defaultValue={listing.licenseTerms}
                  rows={6}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allowCommercialUse"
                  name="allowCommercialUse"
                  defaultChecked={listing.allowCommercialUse}
                  className="rounded"
                />
                <Label htmlFor="allowCommercialUse" className="font-normal">
                  Allow commercial use
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="allowModification"
                  name="allowModification"
                  defaultChecked={listing.allowModification}
                  className="rounded"
                />
                <Label htmlFor="allowModification" className="font-normal">
                  Allow modification
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Assets Update */}
          <Card>
            <CardHeader>
              <CardTitle>Update Assets</CardTitle>
              <CardDescription>
                Replace thumbnail or add new product files
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="thumbnail">Thumbnail Image</Label>
                <div className="border-2 border-dashed rounded-lg p-6">
                  <div className="space-y-4">
                    {thumbnailPreview && (
                      <div className="max-w-xs mx-auto">
                        <ThumbnailImage
                          src={thumbnailPreview}
                          alt="Current thumbnail"
                          aspectRatio="16:9"
                        />
                      </div>
                    )}
                    <div className="text-center">
                      <Label
                        htmlFor="thumbnail"
                        className="cursor-pointer text-primary hover:underline"
                      >
                        {thumbnailPreview ? 'Change Image' : 'Upload Image'}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG up to 5MB (1280x720 recommended)
                      </p>
                    </div>
                    <Input
                      id="thumbnail"
                      name="thumbnail"
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailChange}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newAssets">Add New Product Files (Optional)</Label>
                <div className="border-2 border-dashed rounded-lg p-6">
                  <div className="text-center space-y-4">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                    <div>
                      <Label
                        htmlFor="newAssets"
                        className="cursor-pointer text-primary hover:underline"
                      >
                        Click to upload additional files
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        These will be added to existing files
                      </p>
                    </div>
                    <Input
                      id="newAssets"
                      name="newAssets"
                      type="file"
                      multiple
                      onChange={handleAssetFilesChange}
                      className="hidden"
                    />
                  </div>

                  {newAssetFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium">New Files:</p>
                      {newAssetFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-muted rounded"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveAssetFile(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button type="button" variant="outline" asChild>
              <a href="/marketplace/seller/listings">Cancel</a>
            </Button>

            <div className="flex gap-2">
              <Button
                type="submit"
                name="intent"
                value="save-draft"
                variant="outline"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>

              {needsReview && (
                <Button
                  type="submit"
                  name="intent"
                  value="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  {isSubmitting ? 'Submitting...' : 'Resubmit for Review'}
                </Button>
              )}
            </div>
          </div>
        </Form>
      </div>
    </MarketplaceLayout>
  );
}

export default function EditListing() {
  return (
    <Suspense
      fallback={
        <MarketplaceLayout>
          <div className="container mx-auto py-8 px-4 max-w-4xl">
            {/* Header Skeleton */}
            <div className="mb-8">
              <div className="h-10 w-40 bg-muted rounded animate-pulse mb-4" />
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-9 w-48 bg-muted rounded animate-pulse" />
                  <div className="h-5 w-64 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-6 w-24 bg-muted rounded-full animate-pulse" />
              </div>
            </div>

            {/* Status Alert Skeleton */}
            <div className="h-16 bg-muted rounded-lg animate-pulse mb-6" />

            {/* Form Skeleton */}
            <div className="space-y-6">
              {/* Basic Info Card */}
              <Card>
                <CardHeader>
                  <div className="h-6 w-48 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-72 bg-muted rounded animate-pulse mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                    <div className="h-10 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                    <div className="h-24 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                    <div className="h-10 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                    <div className="flex gap-2">
                      <div className="h-10 flex-1 bg-muted rounded animate-pulse" />
                      <div className="h-10 w-20 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing Card */}
              <Card>
                <CardHeader>
                  <div className="h-6 w-40 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-64 bg-muted rounded animate-pulse mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                    <div className="h-10 bg-muted rounded animate-pulse" />
                  </div>
                </CardContent>
              </Card>

              {/* License Card */}
              <Card>
                <CardHeader>
                  <div className="h-6 w-56 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-80 bg-muted rounded animate-pulse mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 bg-muted rounded animate-pulse" />
                    <div className="h-4 w-56 bg-muted rounded animate-pulse" />
                  </div>
                </CardContent>
              </Card>

              {/* Assets Card */}
              <Card>
                <CardHeader>
                  <div className="h-6 w-40 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-72 bg-muted rounded animate-pulse mt-2" />
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                    <div className="h-48 bg-muted rounded-lg animate-pulse" />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                    <div className="h-32 bg-muted rounded-lg animate-pulse" />
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons Skeleton */}
              <div className="flex justify-between">
                <div className="h-10 w-24 bg-muted rounded animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-10 w-36 bg-muted rounded animate-pulse" />
                  <div className="h-10 w-48 bg-muted rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </MarketplaceLayout>
      }
    >
      <EditListingContent />
    </Suspense>
  );
}