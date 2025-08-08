'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function AuthCodeErrorPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <Image height={80} width={80} alt="Logo" src="/icons/logo.svg" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Authentication Error
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            There was an issue with the authentication process.
          </p>
        </div>
        
        <div className="mt-8 space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Authentication Failed
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    Please try signing in again. If the problem persists, contact your administrator.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={() => router.push('/')}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Go Home
            </button>
            <button
              onClick={() => router.push('/login')}
                              className="flex-1 text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{ backgroundColor: '#F59144' }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 