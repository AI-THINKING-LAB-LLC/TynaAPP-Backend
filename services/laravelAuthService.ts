/**
 * Laravel Authentication Service
 * Service d'authentification utilisant Laravel Sanctum
 */

import { UserProfile } from '../types';

const getLaravelBackendUrl = (): string => {
  // Priorité 1: Variable d'environnement explicite
  const backendUrl = import.meta.env.VITE_LARAVEL_BACKEND_URL;
  if (backendUrl) {
    const url = backendUrl.replace(/\/$/, '');
    console.log('[Laravel Auth] Using backend URL from VITE_LARAVEL_BACKEND_URL:', url);
    return url;
  }
  
  // Priorité 2: VITE_BACKEND_URL (mais attention, c'est pour le WebSocket)
  const fallbackUrl = import.meta.env.VITE_BACKEND_URL;
  if (fallbackUrl && !fallbackUrl.includes('3001') && !fallbackUrl.includes('localhost')) {
    const url = fallbackUrl.replace(/\/$/, '');
    console.log('[Laravel Auth] Using backend URL from VITE_BACKEND_URL:', url);
    return url;
  }
  
  // Détection si on est en production (pas localhost)
  const isProduction = typeof window !== 'undefined' && 
    !window.location.hostname.includes('localhost') && 
    !window.location.hostname.includes('127.0.0.1');
  
  // En production, NE JAMAIS utiliser window.location.origin car frontend et backend sont séparés
  if (isProduction) {
    const errorMsg = 'VITE_LARAVEL_BACKEND_URL is not set in production. Please configure it in Railway variables.';
    console.error('[Laravel Auth] ❌', errorMsg);
    console.error('[Laravel Auth] 💡 Solution: Add VITE_LARAVEL_BACKEND_URL=https://enthusiastic-success-production-2c5c.up.railway.app in Railway variables and redeploy');
    throw new Error(errorMsg);
  }
  
  // En développement: Détection automatique depuis window (seulement pour localhost)
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    const url = window.location.origin.replace(':5173', ':8001').replace(':3000', ':8001').replace(':5174', ':8001');
    console.log('[Laravel Auth] Using backend URL from window (dev):', url);
    return url;
  }
  
  // Par défaut: localhost:8001 (port du backend Laravel)
  const defaultUrl = 'http://localhost:8001';
  console.log('[Laravel Auth] Using default backend URL:', defaultUrl);
  console.warn('[Laravel Auth] ⚠️ VITE_LARAVEL_BACKEND_URL not set! Using default:', defaultUrl);
  return defaultUrl;
};

const API_URL = `${getLaravelBackendUrl()}/api`;

// Get authentication token
const getAuthToken = (): string | null => {
  return localStorage.getItem('laravel_sanctum_token');
};

// Set authentication token
const setAuthToken = (token: string): void => {
  localStorage.setItem('laravel_sanctum_token', token);
};

// Remove authentication token
const removeAuthToken = (): void => {
  localStorage.removeItem('laravel_sanctum_token');
};

// Make authenticated API request
const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}/${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token expired, clear it
      removeAuthToken();
      throw new Error('Authentication required');
    }
    
    const errorText = await response.text();
    let errorMessage = `API Error: ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  return response;
};

// Authentication methods
export const signUpUser = async (
  email: string, 
  password: string, 
  fullName: string
): Promise<{ data: { user: any }, error: null } | { data: { user: null }, error: Error }> => {
  try {
    const registerUrl = `${API_URL}/register`;
    console.log('[Laravel Auth] Registering user at:', registerUrl);
    
    // 1. Créer l'utilisateur dans Laravel
    const registerResponse = await fetch(registerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        name: fullName,
        email,
        password,
        password_confirmation: password,
      }),
    }).catch((fetchError) => {
      console.error('[Laravel Auth] Fetch error:', fetchError);
      throw new Error(`Cannot connect to backend at ${registerUrl}. Make sure Laravel is running on ${getLaravelBackendUrl()}`);
    });

    if (!registerResponse.ok) {
      let errorMessage = 'Registration failed';
      try {
        const errorData = await registerResponse.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        if (errorData.errors) {
          // Laravel validation errors
          const firstError = Object.values(errorData.errors)[0];
          errorMessage = Array.isArray(firstError) ? firstError[0] : String(firstError);
        }
      } catch (e) {
        errorMessage = `Server error: ${registerResponse.status} ${registerResponse.statusText}`;
      }
      console.error('[Laravel Auth] Registration failed:', errorMessage);
      return { 
        data: { user: null }, 
        error: new Error(errorMessage) 
      };
    }

    const registerData = await registerResponse.json();
    console.log('[Laravel Auth] Registration successful');

    // 2. Se connecter automatiquement après inscription
    const loginResult = await signInUser(email, password);
    return loginResult;
  } catch (error) {
    console.error('[Laravel Auth] Registration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Registration failed';
    return { 
      data: { user: null }, 
      error: new Error(errorMessage) 
    };
  }
};

export const signInUser = async (
  email: string, 
  password: string
): Promise<{ data: { user: any }, error: null } | { data: { user: null }, error: Error }> => {
  try {
    const response = await apiRequest('tokens', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    
    if (data.token) {
      setAuthToken(data.token);
      return { 
        data: { user: data.user }, 
        error: null 
      };
    }

    return { data: { user: null }, error: new Error('No token received') };
  } catch (error) {
    return { 
      data: { user: null }, 
      error: error instanceof Error ? error : new Error('Login failed') 
    };
  }
};

export const signOutUser = async (): Promise<void> => {
  const token = getAuthToken();
  if (token) {
    try {
      await apiRequest('tokens', {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('[Laravel Auth] Logout error:', e);
    }
  }
  removeAuthToken();
};

export const getSafeSession = async (): Promise<{ session: any | null, error: null }> => {
  const token = getAuthToken();
  if (!token) {
    return { session: null, error: null };
  }

  try {
    // Vérifier si le token est valide en faisant une requête
    const response = await apiRequest('user', {
      method: 'GET',
    });

    const user = await response.json();
    return { 
      session: { user }, 
      error: null 
    };
  } catch (error) {
    // Token invalide, le supprimer
    removeAuthToken();
    return { session: null, error: null };
  }
};

export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const { session } = await getSafeSession();
    if (!session?.user) return null;

    // Récupérer le profil depuis Laravel
    const response = await apiRequest(`profiles/${session.user.id}`);
    const profile = await response.json();
    
    return {
      id: profile.id || session.user.id,
      email: session.user.email || '',
      fullName: profile.full_name || session.user.name || '',
      avatarUrl: profile.avatar_url || '',
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

export const updateUserProfile = async (
  updates: Partial<UserProfile>
): Promise<boolean> => {
  try {
    const { session } = await getSafeSession();
    if (!session?.user) return false;

    await apiRequest(`profiles/${session.user.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        full_name: updates.fullName,
        avatar_url: updates.avatarUrl,
      }),
    });

    return true;
  } catch (error) {
    console.error('Error updating profile:', error);
    return false;
  }
};

export const resetPasswordForEmail = async (email: string): Promise<{ data: {}, error: null }> => {
  try {
    await fetch(`${API_URL}/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    return { data: {}, error: null };
  } catch (error) {
    return { data: {}, error: null }; // Ne pas exposer l'erreur pour la sécurité
  }
};

