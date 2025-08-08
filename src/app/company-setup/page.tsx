'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSetupStatus } from '@/hooks/useSetupStatus';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Image from 'next/image';

interface CompanyFormData {
  companyName: string;
  nonTempEmployees: string;
  email: string;
  zipCode: string;
  systemReadiness: string;
  referralSource: string;
}

export default function CompanySetupPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { markSetupComplete } = useSetupStatus();
  const [formData, setFormData] = useState<CompanyFormData>({
    companyName: '',
    nonTempEmployees: '',
    email: user?.email || '',
    zipCode: '',
    systemReadiness: '',
    referralSource: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleInputChange = (field: keyof CompanyFormData, value: string) => {
    if (field === 'nonTempEmployees') {
      // Prevent negative numbers
      if (Number(value) < 0) {
        setFormError('Number of employees cannot be negative.');
        value = '';
      } else {
        setFormError(null);
      }
    }
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate nonTempEmployees is not negative
    if (Number(formData.nonTempEmployees) < 0) {
      setFormError('Number of employees cannot be negative.');
      return;
    }
    setIsSubmitting(true);

    try {
      // TODO: Save company information to database
      console.log('Company setup data:', formData);
      
      // Mark user as having completed company setup
      const setupSuccess = await markSetupComplete();
      
      if (!setupSuccess) {
        throw new Error('Failed to mark setup as complete');
      }

      // TODO: Add API call to save company data
      // await fetch('/api/company-setup', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // });
      
      router.push('/jobs');
    } catch (error) {
      console.error('Error saving company information:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <div className="flex justify-center">
              <Image height={80} width={80} alt="Logo" src="/icons/logo.svg" />
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Welcome to Staff Better
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Please provide some information about your company
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Company Name */}
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                  Company Name
                </label>
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Staff Better LLC"
                />
              </div>

              {/* Non-Temp Employees */}
              <div>
                <label htmlFor="nonTempEmployees" className="block text-sm font-medium text-gray-700">
                  How many non-temp employees are in the company
                </label>
                <input
                  id="nonTempEmployees"
                  name="nonTempEmployees"
                  type="number"
                  required
                  min="0"
                  value={formData.nonTempEmployees}
                  onChange={(e) => handleInputChange('nonTempEmployees', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder="10"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder="example@example.com"
                />
              </div>

              {/* ZIP Code */}
              <div>
                <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
                  ZIP Code (For Time zones)
                </label>
                <input
                  id="zipCode"
                  name="zipCode"
                  type="text"
                  required
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder="000000"
                />
              </div>

              {/* System Readiness */}
              <div>
                <label htmlFor="systemReadiness" className="block text-sm font-medium text-gray-700">
                  Are you ready to start using the system this week?
                </label>
                <select
                  id="systemReadiness"
                  name="systemReadiness"
                  required
                  value={formData.systemReadiness}
                  onChange={(e) => handleInputChange('systemReadiness', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Select an option</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="maybe">Maybe</option>
                </select>
              </div>

              {/* Referral Source */}
              <div>
                <label htmlFor="referralSource" className="block text-sm font-medium text-gray-700">
                  How did you hear about us?
                </label>
                <input
                  id="referralSource"
                  name="referralSource"
                  type="text"
                  required
                  value={formData.referralSource}
                  onChange={(e) => handleInputChange('referralSource', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Referral, LinkedIn, Google, Met the Team, etc."
                />
              </div>
            </div>

            {formError && (
              <div className="text-red-600 mb-4">{formError}</div>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#F59144' }}
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>

            <div className="text-left">
              <button
                type="button"
                onClick={() => router.back()}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Back
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
} 