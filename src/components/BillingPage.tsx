"use client";

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
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

// Types for future API integration
interface SubscriptionData {
  plan: string;
  status: string;
  price: string;
  billingCycle: 'monthly' | 'yearly';
  nextBillingDate: string;
  paymentMethod: {
    type: string;
    last4: string;
    expiryDate: string;
  };
}

interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: string;
  invoiceUrl: string;
}

interface Plan {
  id: string;
  name: string;
  price: string;
  features: string[];
}

export function BillingPage({ onBack }: BillingPageProps) {
  const [isUpdateCardOpen, setIsUpdateCardOpen] = useState(false);
  const [isCancelSubscriptionOpen, setIsCancelSubscriptionOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('professional');
  const [showAllInvoices, setShowAllInvoices] = useState(false);

  // Subscription state
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [billingHistory, setBillingHistory] = useState<Invoice[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Toast state
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'error' | 'success' | 'info'>('success');
  const [showToast, setShowToast] = useState(false);

  const showToastMessage = (message: string, type: 'error' | 'success' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  // Load initial data on component mount
  useEffect(() => {
    loadBillingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // TODO: Replace with real API call
  const loadBillingData = async () => {
    try {
      setIsLoading(true);
      // Simulate API call
      // const response = await fetch('/api/billing');
      // const data = await response.json();

      // Dummy data for now
      const dummySubscriptionData: SubscriptionData = {
        plan: 'Professional',
        status: 'Active',
        price: '$49',
        billingCycle: 'monthly',
        nextBillingDate: 'December 13, 2025',
        paymentMethod: {
          type: 'Visa',
          last4: '4242',
          expiryDate: '12/2026',
        },
      };

      const dummyBillingHistory: Invoice[] = [
        { id: '1', date: 'November 13, 2025', amount: '$49.00', status: 'Paid', invoiceUrl: '#' },
        { id: '2', date: 'October 13, 2025', amount: '$49.00', status: 'Paid', invoiceUrl: '#' },
        { id: '3', date: 'September 13, 2025', amount: '$49.00', status: 'Paid', invoiceUrl: '#' },
        { id: '4', date: 'August 13, 2025', amount: '$49.00', status: 'Paid', invoiceUrl: '#' },
        { id: '5', date: 'July 13, 2025', amount: '$49.00', status: 'Paid', invoiceUrl: '#' },
        { id: '6', date: 'June 13, 2025', amount: '$49.00', status: 'Paid', invoiceUrl: '#' },
        { id: '7', date: 'May 13, 2025', amount: '$49.00', status: 'Paid', invoiceUrl: '#' },
        { id: '8', date: 'April 13, 2025', amount: '$49.00', status: 'Paid', invoiceUrl: '#' },
      ];

      const dummyPlans: Plan[] = [
        {
          id: 'starter',
          name: 'Starter',
          price: '$29',
          features: ['Up to 25 associates', '500 messages/month', 'Basic support'],
        },
        {
          id: 'professional',
          name: 'Professional',
          price: '$49',
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
          features: [
            'Unlimited associates',
            'Unlimited messages',
            '24/7 support',
            'Custom integrations',
            'Dedicated account manager',
          ],
        },
      ];

      setSubscriptionData(dummySubscriptionData);
      setBillingHistory(dummyBillingHistory);
      setPlans(dummyPlans);
      setSelectedPlan('professional');
    } catch (error) {
      console.error('Failed to load billing data:', error);
      showToastMessage('Failed to load billing information', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // TODO: Replace with real API call
  const handleUpdateCard = async () => {
    try {
      // In a real implementation, this would open Stripe's payment method update flow
      // const response = await fetch('/api/billing/update-payment-method', {
      //   method: 'POST',
      // });

      showToastMessage('Payment method update initiated. (Stripe integration would open here)', 'success');
      setIsUpdateCardOpen(false);
    } catch (error) {
      console.error('Failed to update payment method:', error);
      showToastMessage('Failed to update payment method', 'error');
    }
  };

  // TODO: Replace with real API call
  const handleChangePlan = async (planId: string) => {
    try {
      // In a real implementation, this would call Stripe to update the subscription
      // const response = await fetch('/api/billing/change-plan', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ planId }),
      // });

      setSelectedPlan(planId);
      const plan = plans.find((p) => p.id === planId);
      showToastMessage(
        `Plan changed to ${plan?.name}. Changes will take effect on next billing cycle.`,
        'success'
      );
    } catch (error) {
      console.error('Failed to change plan:', error);
      showToastMessage('Failed to change plan', 'error');
    }
  };

  // TODO: Replace with real API call
  const handleCancelSubscription = async () => {
    try {
      // In a real implementation, this would call Stripe to cancel the subscription
      // const response = await fetch('/api/billing/cancel-subscription', {
      //   method: 'POST',
      // });

      if (subscriptionData) {
        showToastMessage(
          `Subscription cancelled. Access will continue until ${subscriptionData.nextBillingDate}.`,
          'success'
        );
      }
      setIsCancelSubscriptionOpen(false);
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      showToastMessage('Failed to cancel subscription', 'error');
    }
  };

  // TODO: Replace with real API call
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      // In a real implementation, this would download the invoice from Stripe
      // const response = await fetch(`/api/billing/invoices/${invoiceId}/download`);
      // const blob = await response.blob();
      // const url = window.URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `invoice-${invoiceId}.pdf`;
      // a.click();

      showToastMessage('Invoice download started', 'success');
    } catch (error) {
      console.error('Failed to download invoice:', error);
      showToastMessage('Failed to download invoice', 'error');
    }
  };

  if (isLoading || !subscriptionData) {
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

  const displayedInvoices = showAllInvoices ? billingHistory : billingHistory.slice(0, 3);

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
          <div className="bg-gradient-to-r from-[#FFBB87]/10 to-[#FE6F00]/10 border border-orange-200 rounded-lg p-5 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{subscriptionData.plan} Plan</h3>
                  <Badge className="bg-green-100 text-green-700 text-xs">
                    {subscriptionData.status}
                  </Badge>
                </div>
                <p className="text-gray-600 text-sm">
                  {subscriptionData.price}/{subscriptionData.billingCycle}
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
                <span>Next billing: {subscriptionData.nextBillingDate}</span>
              </div>
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
                  {subscriptionData.paymentMethod.type} •••• {subscriptionData.paymentMethod.last4}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Payment Method</h3>
              <Button
                onClick={() => setIsUpdateCardOpen(true)}
                variant="outline"
                size="sm"
              >
                Update Card
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
                    {subscriptionData.paymentMethod.type} ending in{' '}
                    {subscriptionData.paymentMethod.last4}
                  </p>
                  <p className="text-gray-500 text-sm">
                    Expires {subscriptionData.paymentMethod.expiryDate}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Available Plans */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Available Plans</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`border rounded-lg p-4 transition-all ${
                    plan.id === selectedPlan
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
                  {plan.id !== selectedPlan && (
                    <Button
                      onClick={() => handleChangePlan(plan.id)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      Switch to {plan.name}
                    </Button>
                  )}
                  {plan.id === selectedPlan && (
                    <Badge className="w-full justify-center bg-green-100 text-green-700">
                      Current Plan
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Billing History */}
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
                    <p className="text-gray-900 font-medium">{invoice.date}</p>
                    <p className="text-gray-500 text-sm">{invoice.amount}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-green-100 text-green-700 text-xs">{invoice.status}</Badge>
                    <Button
                      onClick={() => handleDownloadInvoice(invoice.id)}
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
                  </div>
                </div>
              ))}
              {billingHistory.length > 3 && (
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

          {/* Cancel Subscription */}
          <div className="border-t pt-4">
            <Button
              onClick={() => setIsCancelSubscriptionOpen(true)}
              variant="outline"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Cancel Subscription
            </Button>
          </div>
        </Card>
      </div>

      {/* Update Card Dialog */}
      <Dialog open={isUpdateCardOpen} onOpenChange={setIsUpdateCardOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Payment Method</DialogTitle>
            <DialogDescription>
              Update your payment method. This integration uses Stripe for secure payment
              processing.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-900 text-sm">
                <strong>Note:</strong> In a production environment, this would open Stripe&apos;s secure
                payment form. Your card details are never stored on our servers.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="card-number">Card Number</Label>
                <Input id="card-number" placeholder="1234 5678 9012 3456" disabled />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input id="expiry" placeholder="MM/YY" disabled />
                </div>
                <div>
                  <Label htmlFor="cvc">CVC</Label>
                  <Input id="cvc" placeholder="123" disabled />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsUpdateCardOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button
              onClick={handleUpdateCard}
              className="bg-gradient-to-r from-[#FFBB87] to-[#FE6F00] text-white hover:opacity-90"
            >
              Update Payment Method
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  Your subscription will remain active until {subscriptionData.nextBillingDate}
                </li>
                <li>You won&apos;t be charged again</li>
                <li>
                  After {subscriptionData.nextBillingDate}, you&apos;ll lose access to premium features
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
            >
              Cancel Subscription
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
