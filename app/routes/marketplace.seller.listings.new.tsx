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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Separator } from '~/components/ui/separator';
import { ArrowLeft, ArrowRight, Upload, X, Save, Send, Loader2 } from 'lucide-react';
import { useState, Suspense } from 'react';
import { marketplaceApi } from '~/lib/marketplace/api-client';
import { ThumbnailImage } from '~/components/marketplace/OptimizedImage';

export async function loader({ request }: LoaderFunctionArgs) {
  // TODO: const user = await requireSeller(request);

  try {
    const response = await marketplaceApi.categories.list();
    const categories = response.categories || [];
    
    return json({ 
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return json({ categories: [] });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'save-draft') {
    try {
      const listingData = {
        categoryId: formData.get('categoryId') as string,
        slug: formData.get('slug') as string,
        title: formData.get('title') as string,
        summary: formData.get('summary') as string || undefined,
        description: formData.get('description') as string || undefined,
        priceCents: parseInt(formData.get('price') as string) * 100,
        tags: formData.get('tags') ? (formData.get('tags') as string).split(',') : [],
        status: 'draft' as const,
      };
      
      await marketplaceApi.listings.create(listingData);
      return json({ success: true, message: 'Draft saved successfully' });
    } catch (error) {
      console.error('Failed to save draft:', error);
      return json({ error: 'Failed to save draft' }, { status: 500 });
    }
  }

  if (intent === 'submit') {
    try {
      const listingData = {
        categoryId: formData.get('categoryId') as string,
        slug: formData.get('slug') as string,
        title: formData.get('title') as string,
        summary: formData.get('summary') as string || undefined,
        description: formData.get('description') as string || undefined,
        priceCents: parseInt(formData.get('price') as string) * 100,
        tags: formData.get('tags') ? (formData.get('tags') as string).split(',') : [],
        status: 'pending' as const, // Submit for moderation
      };
      
      await marketplaceApi.listings.create(listingData);
      return redirect('/marketplace/seller/listings');
    } catch (error) {
      console.error('Failed to create listing:', error);
      return json({ error: 'Failed to create listing' }, { status: 500 });
    }
  }

  return json({ error: 'Invalid intent' }, { status: 400 });
}

function NewListingContent() {
  const { categories } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const [currentStep, setCurrentStep] = useState(1);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [assetFiles, setAssetFiles] = useState<File[]>([]);

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
    setAssetFiles([...assetFiles, ...files]);
  };

  const handleRemoveAssetFile = (index: number) => {
    setAssetFiles(assetFiles.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const steps = [
    { number: 1, title: 'Basic Info', description: 'Title, description, and category' },
    { number: 2, title: 'Pricing & License', description: 'Set your price and license terms' },
    { number: 3, title: 'Assets Upload', description: 'Upload files and thumbnail' },
    { number: 4, title: 'Preview & Submit', description: 'Review and publish' },
  ];

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
          <h1 className="text-3xl font-bold">Create New Listing</h1>
          <p className="text-muted-foreground mt-1">
            Fill in the details to create your marketplace listing
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      currentStep >= step.number
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step.number}
                  </div>
                  <div className="text-center mt-2 hidden md:block">
                    <div className="text-sm font-medium">{step.title}</div>
                    <div className="text-xs text-muted-foreground">{step.description}</div>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 ${
                      currentStep > step.number ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <Form method="post" encType="multipart/form-data">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Provide the basic details about your listing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="e.g., Professional Video Transition Pack"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Choose a clear, descriptive title (max 100 characters)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe your product in detail..."
                    rows={8}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Provide a detailed description of what's included, features, and requirements
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select name="categoryId" required>
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
          )}

          {/* Step 2: Pricing & License */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Pricing & License</CardTitle>
                <CardDescription>
                  Set your pricing and license terms
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
                    placeholder="299.00"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Set your price in Indian Rupees
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="licenseType">License Type *</Label>
                  <Select name="licenseType" required>
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
                    placeholder="Describe the license terms and usage rights..."
                    rows={6}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Clearly state what buyers can and cannot do with your product
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="allowCommercialUse"
                    name="allowCommercialUse"
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
                    className="rounded"
                  />
                  <Label htmlFor="allowModification" className="font-normal">
                    Allow modification
                  </Label>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Assets Upload */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Upload Assets</CardTitle>
                <CardDescription>
                  Upload your product files and thumbnail
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="thumbnail">Thumbnail Image *</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center">
                    {thumbnailPreview ? (
                      <div className="space-y-4">
                        <img
                          src={thumbnailPreview}
                          alt="Thumbnail preview"
                          className="max-h-48 mx-auto rounded"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setThumbnailPreview(null)}
                        >
                          Change Image
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                        <div>
                          <Label
                            htmlFor="thumbnail"
                            className="cursor-pointer text-primary hover:underline"
                          >
                            Click to upload
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
                          required
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assets">Product Files *</Label>
                  <div className="border-2 border-dashed rounded-lg p-6">
                    <div className="text-center space-y-4">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                      <div>
                        <Label
                          htmlFor="assets"
                          className="cursor-pointer text-primary hover:underline"
                        >
                          Click to upload files
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Upload your product files (ZIP recommended for multiple files)
                        </p>
                      </div>
                      <Input
                        id="assets"
                        name="assets"
                        type="file"
                        multiple
                        onChange={handleAssetFilesChange}
                        className="hidden"
                        required
                      />
                    </div>

                    {assetFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm font-medium">Uploaded Files:</p>
                        {assetFiles.map((file, index) => (
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
          )}

          {/* Step 4: Preview & Submit */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Preview & Submit</CardTitle>
                <CardDescription>
                  Review your listing before submitting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted p-6 rounded-lg space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Listing Preview</h3>
                    <p className="text-sm text-muted-foreground">
                      This is how your listing will appear to buyers
                    </p>
                  </div>

                  {thumbnailPreview && (
                    <img
                      src={thumbnailPreview}
                      alt="Preview"
                      className="w-full rounded-lg"
                    />
                  )}

                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Review all information carefully before submitting
                    </p>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      <li>Your listing will be reviewed by our team</li>
                      <li>Review typically takes 24-48 hours</li>
                      <li>You'll be notified once approved or if changes are needed</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <input
                    type="checkbox"
                    id="agreeTerms"
                    name="agreeTerms"
                    required
                    className="mt-1 rounded"
                  />
                  <Label htmlFor="agreeTerms" className="font-normal text-sm">
                    I agree to the marketplace terms and conditions and confirm that I have
                    the rights to sell this content
                  </Label>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
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
                {isSubmitting ? 'Saving...' : 'Save Draft'}
              </Button>

              {currentStep < 4 ? (
                <Button
                  type="button"
                  onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
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
                  {isSubmitting ? 'Submitting...' : 'Submit for Review'}
                </Button>
              )}
            </div>
          </div>
        </Form>
      </div>
    </MarketplaceLayout>
  );
}

export default function NewListing() {
  return (
    <Suspense
      fallback={
        <MarketplaceLayout>
          <div className="container mx-auto py-8 px-4 max-w-4xl">
            {/* Header Skeleton */}
            <div className="mb-8">
              <div className="h-10 w-40 bg-muted rounded animate-pulse mb-4" />
              <div>
                <div className="h-9 w-56 bg-muted rounded animate-pulse" />
                <div className="h-5 w-80 bg-muted rounded animate-pulse mt-2" />
              </div>
            </div>

            {/* Progress Steps Skeleton */}
            <div className="mb-8">
              <div className="flex justify-between items-center">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                      <div className="h-4 w-24 bg-muted rounded animate-pulse mt-2" />
                    </div>
                    {step < 4 && (
                      <div className="h-0.5 w-16 bg-muted animate-pulse mx-2" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Form Card Skeleton */}
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

            {/* Navigation Buttons Skeleton */}
            <div className="flex justify-between mt-8">
              <div className="h-10 w-32 bg-muted rounded animate-pulse" />
              <div className="flex gap-2">
                <div className="h-10 w-32 bg-muted rounded animate-pulse" />
                <div className="h-10 w-24 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </div>
        </MarketplaceLayout>
      }
    >
      <NewListingContent />
    </Suspense>
  );
}