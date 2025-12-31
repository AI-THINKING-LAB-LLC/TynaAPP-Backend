/**
 * Plan Service
 * Service pour gérer les plans d'abonnement depuis le backend Laravel
 */

import { Plan } from './laravelApiService';
import * as laravelApiService from './laravelApiService';
import { apiRequest } from './laravelApiService';

const USE_LARAVEL_API = import.meta.env.VITE_USE_LARAVEL_API === 'true' || import.meta.env.VITE_LARAVEL_BACKEND_URL;

// Helper to check if Laravel API is available
const isLaravelAvailable = async (): Promise<boolean> => {
  if (!USE_LARAVEL_API) {
    console.log('[Plan Service] USE_LARAVEL_API is false');
    return false;
  }
  
  try {
    const backendUrl = import.meta.env.VITE_LARAVEL_BACKEND_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
    console.log('[Plan Service] Checking Laravel availability at:', backendUrl);
    const response = await fetch(`${backendUrl}/api/plans`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    const isAvailable = response.status !== 404;
    console.log('[Plan Service] Laravel availability check:', isAvailable ? 'available' : 'not available', `(status: ${response.status})`);
    return isAvailable;
  } catch (error) {
    console.warn('[Plan Service] Laravel availability check failed:', error);
    return false;
  }
};

/**
 * Fetch all active plans from backend
 */
export const fetchPlans = async (interval?: 'month' | 'year'): Promise<Plan[]> => {
  if (USE_LARAVEL_API && await isLaravelAvailable()) {
    try {
      console.log('[Plan Service] Fetching plans from Laravel API');
      return await laravelApiService.fetchLaravelPlans(interval);
    } catch (error) {
      console.warn('[Plan Service] Laravel API failed, using fallback:', error);
    }
  }
  
  // Fallback: Return default plans if Laravel is not available
  console.log('[Plan Service] Using default plans (Laravel not available)');
  return getDefaultPlans(interval);
};

/**
 * Get a single plan by ID
 */
export const getPlan = async (id: number): Promise<Plan | null> => {
  if (USE_LARAVEL_API && await isLaravelAvailable()) {
    try {
      return await laravelApiService.getLaravelPlan(id);
    } catch (error) {
      console.warn('[Plan Service] Failed to get plan from Laravel:', error);
    }
  }
  
  return null;
};

/**
 * Create a subscription checkout session
 */
export const createSubscription = async (
  planId: number,
  successUrl: string,
  cancelUrl: string
): Promise<{ checkout_url: string }> => {
  // Always try to use Laravel API if VITE_LARAVEL_BACKEND_URL is set
  // Don't rely on isLaravelAvailable() for subscriptions as it may fail due to auth or CORS
  const backendUrl = import.meta.env.VITE_LARAVEL_BACKEND_URL || import.meta.env.VITE_BACKEND_URL;
  
  console.log('[Plan Service] createSubscription called', {
    planId,
    USE_LARAVEL_API,
    VITE_LARAVEL_BACKEND_URL: import.meta.env.VITE_LARAVEL_BACKEND_URL,
    VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
    backendUrl,
  });
  
  if (!backendUrl && !USE_LARAVEL_API) {
    console.error('[Plan Service] No Laravel backend URL configured');
    throw new Error('Laravel API not available for subscriptions. Please configure VITE_LARAVEL_BACKEND_URL in your environment variables.');
  }
  
  try {
    console.log('[Plan Service] Creating subscription with Laravel API, backend URL:', backendUrl || 'default');
    return await laravelApiService.createLaravelSubscription(planId, successUrl, cancelUrl);
  } catch (error) {
    console.error('[Plan Service] Failed to create subscription:', error);
    throw error;
  }
};

/**
 * Current subscription interface
 */
export interface CurrentSubscription {
  id: string;
  status: string;
  stripe_status: string;
  stripe_price: string;
  stripe_product: string;
  trial_ends_at?: string;
  ends_at?: string;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  plan?: {
    id: number;
    name: string;
    amount: number;
    amount_formatted: string;
    interval: string;
    description: string;
  };
}

/**
 * Get current user subscription
 */
export const getCurrentSubscription = async (): Promise<CurrentSubscription | null> => {
  if (USE_LARAVEL_API && await isLaravelAvailable()) {
    try {
      console.log('[Plan Service] Fetching current subscription from Laravel API');
      const response = await apiRequest('subscriptions/current');
      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      }
      
      return null;
    } catch (error) {
      console.error('[Plan Service] Failed to get current subscription:', error);
      return null;
    }
  }
  
  return null;
};

/**
 * Cancel current subscription
 */
export const cancelSubscription = async (): Promise<boolean> => {
  if (USE_LARAVEL_API && await isLaravelAvailable()) {
    try {
      const response = await apiRequest('subscriptions/cancel', {
        method: 'POST',
      });
      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('[Plan Service] Failed to cancel subscription:', error);
      throw error;
    }
  }
  
  throw new Error('Laravel API not available');
};

/**
 * Resume cancelled subscription
 */
export const resumeSubscription = async (): Promise<boolean> => {
  if (USE_LARAVEL_API && await isLaravelAvailable()) {
    try {
      const response = await apiRequest('subscriptions/resume', {
        method: 'POST',
      });
      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error('[Plan Service] Failed to resume subscription:', error);
      throw error;
    }
  }
  
  throw new Error('Laravel API not available');
};

/**
 * Default plans (fallback if Laravel is not available)
 */
const getDefaultPlans = (interval?: 'month' | 'year'): Plan[] => {
  const isYearly = interval === 'year';
  
  return [
    {
      id: 1,
      name: 'Starter',
      stripe_product_id: 'prod_starter',
      stripe_price_id: isYearly ? 'price_starter_yearly' : 'price_starter_monthly',
      interval: interval || 'month',
      amount: 0,
      amount_formatted: '$0',
      currency: 'usd',
      trial_days: 0,
      allow_promotion_codes: false,
      description: 'Perfect for trying Tyna and basic meeting needs.',
      active: true,
    },
    {
      id: 2,
      name: 'Plus',
      stripe_product_id: 'prod_plus',
      stripe_price_id: isYearly ? 'price_plus_yearly' : 'price_plus_monthly',
      interval: interval || 'month',
      amount: isYearly ? 800 : 1500, // $8/year or $15/month
      amount_formatted: isYearly ? '$8' : '$15',
      currency: 'usd',
      trial_days: 7,
      allow_promotion_codes: true,
      description: 'For professionals who have frequent meetings.',
      active: true,
    },
    {
      id: 3,
      name: 'Pro',
      stripe_product_id: 'prod_pro',
      stripe_price_id: isYearly ? 'price_pro_yearly' : 'price_pro_monthly',
      interval: interval || 'month',
      amount: isYearly ? 1500 : 3000, // $15/year or $30/month
      amount_formatted: isYearly ? '$15' : '$30',
      currency: 'usd',
      trial_days: 7,
      allow_promotion_codes: true,
      description: 'Complete invisibility and enterprise features.',
      active: true,
    },
  ];
};

// Export Plan type for use in components
export type { Plan };


