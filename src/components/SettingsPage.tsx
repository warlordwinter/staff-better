"use client";

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import Toast from './ui/Toast';

interface SettingsPageProps {
  onBack: () => void;
}

// Types for future API integration
interface WhatsAppConnection {
  isConnected: boolean;
  phoneNumber: string;
  connectedAt?: string;
}

interface AccountInfo {
  name: string;
  email: string;
  companyName: string;
}


export function SettingsPage({ onBack }: SettingsPageProps) {
  // WhatsApp connection state
  const [whatsappConnection, setWhatsappConnection] = useState<WhatsAppConnection>({
    isConnected: false,
    phoneNumber: '',
  });
  const [phoneNumberInput, setPhoneNumberInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Account information state
  const [accountInfo, setAccountInfo] = useState<AccountInfo>({
    name: '',
    email: '',
    companyName: '',
  });
  const [isSavingAccount, setIsSavingAccount] = useState(false);

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
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // TODO: Replace with real API call
  const loadSettings = async () => {
    try {
      // Simulate API call
      // const response = await fetch('/api/settings');
      // const data = await response.json();
      
      // Dummy data for now
      const dummyData = {
        whatsapp: {
          isConnected: false,
          phoneNumber: '',
        },
        account: {
          name: 'Manager',
          email: 'manager@staffbetter.com',
          companyName: 'Staff Better Inc.',
        },
      };

      setWhatsappConnection(dummyData.whatsapp);
      setAccountInfo(dummyData.account);
    } catch (error) {
      console.error('Failed to load settings:', error);
      showToastMessage('Failed to load settings', 'error');
    }
  };

  // TODO: Replace with real API call
  const handleConnectWhatsApp = async () => {
    if (!phoneNumberInput) {
      showToastMessage('Please enter a phone number', 'error');
      return;
    }

    setIsConnecting(true);
    try {
      // Simulate API call to connect WhatsApp
      // const response = await fetch('/api/whatsapp/connect', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ phoneNumber: phoneNumberInput }),
      // });
      // const data = await response.json();

      setTimeout(() => {
        setWhatsappConnection({
          isConnected: true,
          phoneNumber: phoneNumberInput,
          connectedAt: new Date().toISOString(),
        });
        setPhoneNumberInput('');
        setIsConnecting(false);
        showToastMessage('WhatsApp connected successfully!', 'success');
      }, 2000);
    } catch (error) {
      console.error('Failed to connect WhatsApp:', error);
      showToastMessage('Failed to connect WhatsApp', 'error');
      setIsConnecting(false);
    }
  };

  // TODO: Replace with real API call
  const handleDisconnectWhatsApp = async () => {
    try {
      // const response = await fetch('/api/whatsapp/disconnect', {
      //   method: 'POST',
      // });

      setWhatsappConnection({
        isConnected: false,
        phoneNumber: '',
      });
      showToastMessage('WhatsApp disconnected', 'success');
    } catch (error) {
      console.error('Failed to disconnect WhatsApp:', error);
      showToastMessage('Failed to disconnect WhatsApp', 'error');
    }
  };

  // TODO: Replace with real API call
  const handleSaveAccountInfo = async () => {
    setIsSavingAccount(true);
    try {
      // const response = await fetch('/api/account/update', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(accountInfo),
      // });

      setTimeout(() => {
        setIsSavingAccount(false);
        showToastMessage('Account information updated successfully!', 'success');
      }, 1000);
    } catch (error) {
      console.error('Failed to save account info:', error);
      showToastMessage('Failed to save account information', 'error');
      setIsSavingAccount(false);
    }
  };


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
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>

        {/* WhatsApp Integration Section */}
        <Card className="p-6 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center shrink-0">
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
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">WhatsApp Integration</h2>
              <p className="text-gray-600 text-sm">
                Connect your WhatsApp Business account to send messages directly to your associates.
              </p>
            </div>
          </div>

          {whatsappConnection.isConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <svg
                  className="w-5 h-5 text-green-600 shrink-0"
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
                <div className="flex-1">
                  <p className="font-medium text-green-900">WhatsApp Connected</p>
                  <p className="text-green-700 text-sm">{whatsappConnection.phoneNumber}</p>
                </div>
              </div>
              <Button
                onClick={handleDisconnectWhatsApp}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Disconnect WhatsApp
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <svg
                  className="w-5 h-5 text-orange-600 shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="font-medium text-orange-900">WhatsApp Not Connected</p>
                  <p className="text-orange-700 text-sm">
                    Connect your WhatsApp Business account to enable messaging functionality.
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp Business Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phoneNumberInput}
                  onChange={(e) => setPhoneNumberInput(e.target.value)}
                  className="max-w-md"
                />
                <p className="text-gray-500 text-sm">
                  Enter your WhatsApp Business phone number with country code
                </p>
              </div>

              <Button
                onClick={handleConnectWhatsApp}
                disabled={isConnecting}
                className="w-full sm:w-auto bg-[#25D366] hover:bg-[#20BA5A] text-white"
              >
                {isConnecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Connecting...
                  </>
                ) : (
                  'Connect WhatsApp'
                )}
              </Button>
            </div>
          )}
        </Card>

        {/* Account Section */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={accountInfo.name}
                onChange={(e) =>
                  setAccountInfo((prev) => ({ ...prev, name: e.target.value }))
                }
                className="max-w-md"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={accountInfo.email}
                onChange={(e) =>
                  setAccountInfo((prev) => ({ ...prev, email: e.target.value }))
                }
                className="max-w-md"
              />
            </div>
            <div>
              <Label htmlFor="company">Company Name</Label>
              <Input
                id="company"
                type="text"
                placeholder="Your company name"
                value={accountInfo.companyName}
                onChange={(e) =>
                  setAccountInfo((prev) => ({ ...prev, companyName: e.target.value }))
                }
                className="max-w-md"
              />
            </div>
            <Button
              onClick={handleSaveAccountInfo}
              disabled={isSavingAccount}
              variant="outline"
            >
              {isSavingAccount ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </Card>
      </div>

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
