import React, { useState, Suspense } from 'react';
import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from '~/lib/router-utils';
import { useLoaderData, useActionData, Form, useNavigation } from 'react-router';
import { MarketplaceLayout } from '~/components/marketplace/MarketplaceLayout';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { Checkbox } from '~/components/ui/checkbox';
import { Badge } from '~/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import {
  CheckCircle,
  Store,
  DollarSign,
  FileText,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Shield,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { cn } from '~/lib/utils';
import { marketplaceApi } from '~/lib/marketplace/api-client';
import { getOptionalUser } from '~/lib/marketplace/auth-helpers';

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await getOptionalUser(request);
  
  // Check if user is already a seller
  if (user?.seller?.id) {
    return redirect('/marketplace/seller/dashboard');
  }
  
  return json({
    user,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();

  try {
    const onboardingData = {
      businessName: formData.get('businessName') as string,
      businessDescription: formData.get('businessDescription') as string || undefined,
      bankAccountNumber: formData.get('bankAccountNumber') as string,
      bankIfscCode: formData.get('bankIfscCode') as string,
      bankAccountName: formData.get('bankAccountName') as string,
      panNumber: formData.get('panNumber') as string,
      gstNumber: formData.get('gstNumber') as string || undefined,
    };

    await marketplaceApi.sellers.onboard(onboardingData);
    return redirect('/marketplace/seller/dashboard');
  } catch (error) {
    console.error('Failed to onboard seller:', error);
    return json({ 
      error: 'Failed to complete seller onboarding. Please try again.' 
    }, { status: 500 });
  }
}

const STEPS = [
  { id: 1, name: 'Seller Info', icon: Store },
  { id: 2, name: 'Bank Details', icon: DollarSign },
  { id: 3, name: 'Agreement', icon: FileText },
];

function BecomeSellerPageContent() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Seller Info
    businessName: '',
    displayName: '',
    bio: '',
    location: '',
    phone: '',
    website: '',
    
    // Step 2: Bank Details
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
    bankName: '',
    branchName: '',
    panNumber: '',
    gstNumber: '',
    
    // Step 3: Agreement
    agreeToTerms: false,
    agreeToCommission: false,
  });

  const isSubmitting = navigation.state === 'submitting';

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return (
          formData.businessName &&
          formData.displayName &&
          formData.bio &&
          formData.location &&
          formData.phone
        );
      case 2:
        return (
          formData.accountHolderName &&
          formData.accountNumber &&
          formData.ifscCode &&
          formData.bankName &&
          formData.panNumber
        );
      case 3:
        return formData.agreeToTerms && formData.agreeToCommission;
      default:
        return false;
    }
  };

  return (
    <MarketplaceLayout user={data.user}>
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">Become a Seller</h1>
        <p className="text-muted-foreground">
          Start selling your templates and assets on our marketplace
        </p>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Earn Money</h3>
            <p className="text-sm text-muted-foreground">
              Keep 80% of every sale
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Large Audience</h3>
            <p className="text-sm text-muted-foreground">
              Reach thousands of buyers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Secure Payments</h3>
            <p className="text-sm text-muted-foreground">
              Fast & reliable payouts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">Easy Setup</h3>
            <p className="text-sm text-muted-foreground">
              Start selling in minutes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-center">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'flex items-center justify-center w-12 h-12 rounded-full border-2 mb-2',
                      isActive && 'border-primary bg-primary text-primary-foreground',
                      isCompleted && 'border-green-500 bg-green-500 text-white',
                      !isActive && !isCompleted && 'border-muted bg-background'
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                  </div>
                  <p
                    className={cn(
                      'text-sm font-medium',
                      isActive && 'text-foreground',
                      !isActive && 'text-muted-foreground'
                    )}
                  >
                    {step.name}
                  </p>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'w-24 h-0.5 mx-4 mt-6',
                      isCompleted ? 'bg-green-500' : 'bg-muted'
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Form */}
      <Form method="post" className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{STEPS[currentStep - 1].name}</CardTitle>
            <CardDescription>
              {currentStep === 1 && 'Tell us about your business'}
              {currentStep === 2 && 'Add your bank account details for payouts'}
              {currentStep === 3 && 'Review and accept our seller agreement'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Seller Info */}
            {currentStep === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="businessName">
                    Business Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="businessName"
                    name="businessName"
                    value={formData.businessName}
                    onChange={(e) => updateFormData('businessName', e.target.value)}
                    placeholder="Your Company Name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">
                    Display Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    value={formData.displayName}
                    onChange={(e) => updateFormData('displayName', e.target.value)}
                    placeholder="How you want to appear on the marketplace"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">
                    Bio <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={(e) => updateFormData('bio', e.target.value)}
                    placeholder="Tell buyers about yourself and your work..."
                    rows={4}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    {formData.bio.length}/500 characters
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">
                      Location <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={(e) => updateFormData('location', e.target.value)}
                      placeholder="City, Country"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      Phone <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateFormData('phone', e.target.value)}
                      placeholder="+91 1234567890"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website (Optional)</Label>
                  <Input
                    id="website"
                    name="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => updateFormData('website', e.target.value)}
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </>
            )}

            {/* Step 2: Bank Details */}
            {currentStep === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="accountHolderName">
                    Account Holder Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="accountHolderName"
                    name="accountHolderName"
                    value={formData.accountHolderName}
                    onChange={(e) => updateFormData('accountHolderName', e.target.value)}
                    placeholder="As per bank records"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">
                      Account Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="accountNumber"
                      name="accountNumber"
                      value={formData.accountNumber}
                      onChange={(e) => updateFormData('accountNumber', e.target.value)}
                      placeholder="1234567890"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ifscCode">
                      IFSC Code <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="ifscCode"
                      name="ifscCode"
                      value={formData.ifscCode}
                      onChange={(e) => updateFormData('ifscCode', e.target.value.toUpperCase())}
                      placeholder="ABCD0123456"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">
                      Bank Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="bankName"
                      name="bankName"
                      value={formData.bankName}
                      onChange={(e) => updateFormData('bankName', e.target.value)}
                      placeholder="State Bank of India"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="branchName">Branch Name</Label>
                    <Input
                      id="branchName"
                      name="branchName"
                      value={formData.branchName}
                      onChange={(e) => updateFormData('branchName', e.target.value)}
                      placeholder="Main Branch"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="panNumber">
                      PAN Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="panNumber"
                      name="panNumber"
                      value={formData.panNumber}
                      onChange={(e) => updateFormData('panNumber', e.target.value.toUpperCase())}
                      placeholder="ABCDE1234F"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gstNumber">GST Number (Optional)</Label>
                    <Input
                      id="gstNumber"
                      name="gstNumber"
                      value={formData.gstNumber}
                      onChange={(e) => updateFormData('gstNumber', e.target.value.toUpperCase())}
                      placeholder="22AAAAA0000A1Z5"
                    />
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <Shield className="inline h-4 w-4 mr-1" />
                    Your bank details are encrypted and stored securely. We use this
                    information only for processing payouts.
                  </p>
                </div>
              </>
            )}

            {/* Step 3: Agreement */}
            {currentStep === 3 && (
              <>
                <div className="space-y-4">
                  <div className="bg-muted p-6 rounded-lg space-y-4">
                    <h3 className="font-semibold text-lg">Seller Agreement</h3>
                    
                    <div className="space-y-2 text-sm">
                      <h4 className="font-semibold">Commission Structure</h4>
                      <p className="text-muted-foreground">
                        We charge a 20% commission on each sale. You keep 80% of the
                        listing price.
                      </p>
                    </div>

                    <div className="space-y-2 text-sm">
                      <h4 className="font-semibold">Payout Schedule</h4>
                      <p className="text-muted-foreground">
                        Payouts are processed weekly, every Monday. Minimum payout
                        threshold is ₹1,000.
                      </p>
                    </div>

                    <div className="space-y-2 text-sm">
                      <h4 className="font-semibold">Content Guidelines</h4>
                      <p className="text-muted-foreground">
                        All listings must be original work or properly licensed. We
                        reserve the right to remove content that violates our policies.
                      </p>
                    </div>

                    <div className="space-y-2 text-sm">
                      <h4 className="font-semibold">Support & Refunds</h4>
                      <p className="text-muted-foreground">
                        You're responsible for providing support to your customers.
                        Refunds may be issued at our discretion.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="agreeToTerms"
                        checked={formData.agreeToTerms}
                        onCheckedChange={(checked) =>
                          updateFormData('agreeToTerms', checked)
                        }
                      />
                      <Label htmlFor="agreeToTerms" className="cursor-pointer">
                        I agree to the{' '}
                        <a href="/terms" className="text-primary hover:underline">
                          Terms of Service
                        </a>{' '}
                        and{' '}
                        <a href="/privacy" className="text-primary hover:underline">
                          Privacy Policy
                        </a>
                      </Label>
                    </div>

                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="agreeToCommission"
                        checked={formData.agreeToCommission}
                        onCheckedChange={(checked) =>
                          updateFormData('agreeToCommission', checked)
                        }
                      />
                      <Label htmlFor="agreeToCommission" className="cursor-pointer">
                        I understand and agree to the 20% commission structure
                      </Label>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                disabled={currentStep === 1 || isSubmitting}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>

              {currentStep < STEPS.length ? (
                <Button
                  type="button"
                  onClick={() => setCurrentStep((prev) => prev + 1)}
                  disabled={!canProceed() || isSubmitting}
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={!canProceed() || isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Complete Setup
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Hidden inputs for all form data */}
        {Object.entries(formData).map(([key, value]) => (
          <input
            key={key}
            type="hidden"
            name={key}
            value={typeof value === 'boolean' ? (value ? 'true' : 'false') : value}
          />
        ))}
      </Form>
    </MarketplaceLayout>
  );
}

export default function BecomeSellerPage() {
  return (
    <Suspense
      fallback={
        <MarketplaceLayout>
          {/* Header Skeleton */}
          <div className="mb-8 text-center">
            <div className="h-10 bg-muted rounded w-96 mx-auto mb-2 animate-pulse" />
            <div className="h-5 bg-muted rounded w-80 mx-auto animate-pulse" />
          </div>

          {/* Benefits Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4 animate-pulse" />
                  <div className="h-5 bg-muted rounded w-24 mx-auto mb-2 animate-pulse" />
                  <div className="h-4 bg-muted rounded w-32 mx-auto animate-pulse" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Progress Steps Skeleton */}
          <div className="mb-8">
            <div className="flex items-center justify-center">
              {[...Array(3)].map((_, index) => (
                <React.Fragment key={index}>
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-muted mb-2 animate-pulse" />
                    <div className="h-4 bg-muted rounded w-20 animate-pulse" />
                  </div>
                  {index < 2 && (
                    <div className="w-24 h-0.5 mx-4 mt-6 bg-muted animate-pulse" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Form Skeleton */}
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <div className="h-6 bg-muted rounded w-40 mb-2 animate-pulse" />
                <div className="h-4 bg-muted rounded w-64 animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Form Fields Skeleton */}
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-muted rounded w-32 animate-pulse" />
                    <div className="h-10 bg-muted rounded animate-pulse" />
                  </div>
                ))}

                {/* Buttons Skeleton */}
                <div className="flex justify-between pt-4">
                  <div className="h-10 bg-muted rounded w-32 animate-pulse" />
                  <div className="h-10 bg-muted rounded w-32 animate-pulse" />
                </div>
              </CardContent>
            </Card>
          </div>
        </MarketplaceLayout>
      }
    >
      <BecomeSellerPageContent />
    </Suspense>
  );
}