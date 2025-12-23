"use client";

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import Toast from './ui/Toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';

interface BillingPageProps {
  onBack: () => void;
}

// Stripe API response types
interface StripeSubscription {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  priceId: string;
  amount: number | null;
  currency: string;
  interval: string;
}

interface StripePaymentMethod {
  type: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
}

interface StripeInvoice {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: string | null;
  invoiceUrl: string | null;
}

interface BillingApiResponse {
  subscription: StripeSubscription | null;
  invoices: StripeInvoice[];
  paymentMethod: StripePaymentMethod | null;
}

interface Plan {
  id: string;
  name: string;
  price: string;
  priceId: string;
  features: string[];
}

// Plan configurations - move these to environment variables in production
const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$29',
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || '',
    features: ['Up to 25 associates', '500 messages/month', 'Basic support'],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '$49',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PROFESSIONAL_PRICE_ID || '',
    features: [
      'Up to 100 associates',
      '2,000 messages/month',
      'Priority support',
      'WhatsApp integration',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$99',
    priceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID || '',
    features: [
      'Unlimited associates',
      'Unlimited messages',
      '24/7 support',
      'Custom integrations',
      'Dedicated account manager',
    ],
  },
];

export function BillingPage({ onBack }: BillingPageProps) {
  const [isCancelSubscriptionOpen, setIsCancelSubscriptionOpen] = useState(false);
  const [showAllInvoices, setShowAllInvoices] = useState(false);

  // Subscription state
  const [subscription, setSubscription] = useState<StripeSubscription | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<StripePaymentMethod | null>(null);
  const [invoices, setInvoices] = useState<StripeInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Toast state
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'error' | 'success' | 'info'>('success');
  const [showToast, setShowToast] = useState(false);

  const showToastMessage = (message: string, type: 'error' | 'success' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  // Load billing data from Stripe
  useEffect(() => {
    loadBillingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBillingData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/billing/subscription');
      
      if (!response.ok) {
        throw new Error('Failed to load billing data');
      }

      const data: BillingApiResponse = await response.json();
      setSubscription(data.subscription);
      setPaymentMethod(data.paymentMethod);
      setInvoices(data.invoices);
    } catch (error) {
      console.error('Failed to load billing data:', error);
      showToastMessage('Failed to load billing information', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCard = async () => {
    try {
      setIsUpdating(true);
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create customer portal session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Failed to update payment method:', error);
      showToastMessage('Failed to open payment settings', 'error');
      setIsUpdating(false);
    }
  };

  const handleChangePlan = async (priceId: string) => {
    try {
      setIsUpdating(true);
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { sessionId } = await response.json();
      
      // Redirect to Stripe Checkout
      const stripe = await import('@/lib/stripe/client').then(m => m.stripePromise);
      const stripeInstance = await stripe;
      
      if (stripeInstance) {
        await stripeInstance.redirectToCheckout({ sessionId });
      }
    } catch (error) {
      console.error('Failed to change plan:', error);
      showToastMessage('Failed to change plan', 'error');
      setIsUpdating(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setIsUpdating(true);
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to create customer portal session');
      }

      const { url } = await response.json();
      showToastMessage('Redirecting to manage your subscription...', 'info');
      setTimeout(() => {
        window.location.href = url;
      }, 1000);
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      showToastMessage('Failed to cancel subscription', 'error');
      setIsUpdating(false);
    } finally {
      setIsCancelSubscriptionOpen(false);
    }
  };

  const handleDownloadInvoice = (invoiceUrl: string | null) => {
    if (invoiceUrl) {
      window.open(invoiceUrl, '_blank');
    } else {
      showToastMessage('Invoice not available', 'error');
    }
  };

  // Helper function to get current plan
  const getCurrentPlan = () => {
    if (!subscription) return null;
    return PLANS.find(p => p.priceId === subscription.priceId);
  };

  // Helper function to format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto bg-white">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-8">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  const currentPlan = getCurrentPlan();
  const displayedInvoices = showAllInvoices ? invoices : invoices.slice(0, 3);

  return (
    <div className="flex-1 overflow-auto bg-white">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        </div>

        {/* Billing Section */}
        <Card className="p-6 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] rounded-full flex items-center justify-center shrink-0">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Billing & Subscription</h2>
              <p className="text-gray-600 text-sm">
                Manage your subscription, payment methods, and billing history.
              </p>
            </div>
          </div>

          {/* Current Subscription */}
          {subscription && currentPlan ? (
            <>
              <div className="bg-gradient-to-r from-[#FFBB87]/10 to-[#FE6F00]/10 border border-orange-200 rounded-lg p-5 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{currentPlan.name} Plan</h3>
                      <Badge className={`text-xs ${
                        subscription.status === 'active' ? 'bg-green-100 text-green-700' :
                        subscription.status === 'past_due' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                      </Badge>
                      {subscription.cancelAtPeriodEnd && (
                        <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                          Canceling
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm">
                      {subscription.amount && formatCurrency(subscription.amount, subscription.currency)}/{subscription.interval}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span>Next billing: {formatDate(subscription.currentPeriodEnd)}</span>
                  </div>
                  {paymentMethod && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                        />
                      </svg>
                      <span>
                        {paymentMethod.type.charAt(0).toUpperCase() + paymentMethod.type.slice(1)} •••• {paymentMethod.last4}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Method */}
              {paymentMethod && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">Payment Method</h3>
                    <Button
                      onClick={handleUpdateCard}
                      variant="outline"
                      size="sm"
                      disabled={isUpdating}
                    >
                      {isUpdating ? 'Loading...' : 'Update Card'}
                    </Button>
                  </div>
                  <div className="bg-gray-50 border rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900">
                          {paymentMethod.type.charAt(0).toUpperCase() + paymentMethod.type.slice(1)} ending in{' '}
                          {paymentMethod.last4}
                        </p>
                        <p className="text-gray-500 text-sm">
                          Expires {paymentMethod.expiryMonth}/{paymentMethod.expiryYear}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Subscription</h3>
              <p className="text-gray-600 text-sm mb-4">
                Choose a plan below to get started with Staff Better.
              </p>
            </div>
          )}

          {/* Available Plans */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Available Plans</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANS.map((plan) => {
                const isCurrentPlan = subscription?.priceId === plan.priceId;
                return (
                  <div
                    key={plan.id}
                    className={`border rounded-lg p-4 transition-all ${
                      isCurrentPlan
                        ? 'border-[#FE6F00] bg-orange-50/50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="mb-3">
                      <h4 className="text-lg font-semibold text-gray-900 mb-1">{plan.name}</h4>
                      <p className="text-2xl font-bold text-gray-900">
                        {plan.price}
                        <span className="text-sm text-gray-500 font-normal">/mo</span>
                      </p>
                    </div>
                    <ul className="space-y-2 mb-4">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="text-sm text-gray-600 flex items-start gap-2">
                          <svg
                            className="w-4 h-4 text-green-600 shrink-0 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {!isCurrentPlan ? (
                      <Button
                        onClick={() => handleChangePlan(plan.priceId)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={isUpdating || !plan.priceId}
                      >
                        {subscription ? `Switch to ${plan.name}` : `Choose ${plan.name}`}
                      </Button>
                    ) : (
                      <Badge className="w-full justify-center bg-green-100 text-green-700">
                        Current Plan
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Billing History */}
          {invoices.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Billing History</h3>
              <div className="border rounded-lg overflow-hidden">
                {displayedInvoices.map((invoice, index) => (
                  <div
                    key={invoice.id}
                    className={`flex items-center justify-between p-4 ${
                      index !== displayedInvoices.length - 1 ? 'border-b' : ''
                    } hover:bg-gray-50 transition-colors`}
                  >
                    <div className="flex-1">
                      <p className="text-gray-900 font-medium">{formatDate(invoice.date)}</p>
                      <p className="text-gray-500 text-sm">
                        {formatCurrency(invoice.amount, invoice.currency)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`text-xs ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                        invoice.status === 'open' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {invoice.status?.charAt(0).toUpperCase() + (invoice.status?.slice(1) || '')}
                      </Badge>
                      {invoice.invoiceUrl && (
                        <Button
                          onClick={() => handleDownloadInvoice(invoice.invoiceUrl)}
                          variant="ghost"
                          size="sm"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                          </svg>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {invoices.length > 3 && (
                  <div className="text-center py-2">
                    <Button
                      onClick={() => setShowAllInvoices(!showAllInvoices)}
                      variant="ghost"
                      size="sm"
                    >
                      {showAllInvoices ? 'Show Less' : 'Show More'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cancel Subscription */}
          {subscription && subscription.status === 'active' && !subscription.cancelAtPeriodEnd && (
            <div className="border-t pt-4">
              <Button
                onClick={() => setIsCancelSubscriptionOpen(true)}
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                disabled={isUpdating}
              >
                Cancel Subscription
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Cancel Subscription Dialog */}
      <Dialog open={isCancelSubscriptionOpen} onOpenChange={setIsCancelSubscriptionOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your subscription? You&apos;ll lose access to all premium
              features.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-900 text-sm mb-2">
                <strong>What happens when you cancel:</strong>
              </p>
              <ul className="list-disc list-inside text-red-800 text-sm space-y-1">
                <li>
                  Your subscription will remain active until {subscription && formatDate(subscription.currentPeriodEnd)}
                </li>
                <li>You won&apos;t be charged again</li>
                <li>
                  After {subscription && formatDate(subscription.currentPeriodEnd)}, you&apos;ll lose access to premium features
                </li>
                <li>Your data will be preserved for 30 days in case you want to reactivate</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsCancelSubscriptionOpen(false)} variant="outline">
              Keep Subscription
            </Button>
            <Button
              onClick={handleCancelSubscription}
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={isUpdating}
            >
              {isUpdating ? 'Processing...' : 'Cancel Subscription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
}
