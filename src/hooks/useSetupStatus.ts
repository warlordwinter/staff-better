'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export const useSetupStatus = () => {
  const { user, loading } = useAuth();
  const [hasCompletedSetup, setHasCompletedSetup] = useState<boolean | null>(null);
  const [checkingSetup, setCheckingSetup] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      checkSetupStatus();
    } else if (!user) {
      setHasCompletedSetup(null);
    }
  }, [user, loading]);

  const checkSetupStatus = async () => {
    if (!user) return;
    
    setCheckingSetup(true);
    try {
      const response = await fetch('/api/user-setup');
      if (response.ok) {
        const { hasCompletedSetup } = await response.json();
        setHasCompletedSetup(hasCompletedSetup);
      } else {
        setHasCompletedSetup(false);
      }
    } catch (error) {
      console.error('Error checking setup status:', error);
      setHasCompletedSetup(false);
    } finally {
      setCheckingSetup(false);
    }
  };

  const markSetupComplete = async () => {
    try {
      const response = await fetch('/api/user-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        setHasCompletedSetup(true);
        return true;
      } else {
        throw new Error('Failed to mark setup as complete');
      }
    } catch (error) {
      console.error('Error marking setup as complete:', error);
      return false;
    }
  };

  return {
    hasCompletedSetup,
    checkingSetup,
    checkSetupStatus,
    markSetupComplete,
  };
}; 