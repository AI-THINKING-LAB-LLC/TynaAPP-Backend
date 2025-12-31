
import { supabase } from './supabaseService';
import { GoogleCalendarEvent, GoogleCalendarToken } from '../types';

// Google Calendar OAuth configuration
// Note: We load CLIENT_ID dynamically from backend to avoid rebuild requirement
let GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
let GOOGLE_CLIENT_ID_LOADED = false;

// Get backend URL for redirect URI
const getBackendUrl = (): string => {
  // Priority 1: VITE_BACKEND_URL from env (most reliable, set at build time)
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  if (backendUrl) {
    console.log('[Backend URL] Using VITE_BACKEND_URL:', backendUrl);
    return backendUrl.replace(/\/$/, ''); // Remove trailing slash
  }
  
  // Priority 2: Use current origin in browser (production fallback)
  // This works because frontend and backend are served from the same origin in production
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    console.log('[Backend URL] VITE_BACKEND_URL not set, using window.location.origin:', origin);
    return origin;
  }
  
  // Priority 3: Default to localhost (development only, when window is undefined)
  console.warn('[Backend URL] Using default localhost (development mode)');
  return 'http://localhost:3001';
};

/**
 * Load Google Calendar CLIENT_ID from backend (avoids need for rebuild)
 */
const loadGoogleCalendarConfig = async (): Promise<void> => {
  if (GOOGLE_CLIENT_ID_LOADED) return; // Already loaded
  
  try {
    const backendUrl = getBackendUrl();
    const configUrl = `${backendUrl}/api/config/google-calendar`;
    console.log('[Google Calendar] Loading config from:', configUrl);
    
    const response = await fetch(configUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('[Google Calendar] Config response status:', response.status, response.statusText);
    
    if (response.ok) {
      const config = await response.json();
      console.log('[Google Calendar] Config response:', config);
      
      if (config.clientId) {
        GOOGLE_CLIENT_ID = config.clientId;
        GOOGLE_CLIENT_ID_LOADED = true;
        console.log('[Google Calendar] ✓ Loaded CLIENT_ID from backend');
      } else {
        console.warn('[Google Calendar] ✗ No clientId in config response');
      }
    } else {
      const errorText = await response.text();
      console.error('[Google Calendar] ✗ Failed to load config:', response.status, errorText);
    }
  } catch (error) {
    console.error('[Google Calendar] ✗ Error loading config from backend:', error);
  }
};

const GOOGLE_REDIRECT_URI = `${getBackendUrl()}/api/auth/callback/google`;

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

// Scopes required for Google Calendar
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly'
].join(' ');

/**
 * Check if Google Calendar is configured
 * Loads CLIENT_ID from backend if not already loaded (avoids rebuild requirement)
 */
export const isGoogleCalendarConfigured = async (): Promise<boolean> => {
  // Try to load from backend if not already loaded
  if (!GOOGLE_CLIENT_ID_LOADED) {
    await loadGoogleCalendarConfig();
  }
  
  // Also check VITE_ variable as fallback
  if (!GOOGLE_CLIENT_ID) {
    GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
    if (GOOGLE_CLIENT_ID) {
      GOOGLE_CLIENT_ID_LOADED = true;
      console.log('[Google Calendar] Using VITE_GOOGLE_CLIENT_ID from build');
    }
  }
  
  const isConfigured = !!GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.length > 0;
  
  // Always log for debugging (helps identify configuration issues)
  console.log('[Google Calendar] Config Check:', {
    hasClientId: !!GOOGLE_CLIENT_ID,
    clientIdLength: GOOGLE_CLIENT_ID.length,
    clientIdPreview: GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.substring(0, 20)}...` : 'empty',
    isConfigured,
    loadedFromBackend: GOOGLE_CLIENT_ID_LOADED,
    envMode: import.meta.env.MODE
  });
  
  return isConfigured;
};

/**
 * Initiate Google Calendar OAuth flow
 */
export const initiateGoogleCalendarAuth = async (): Promise<void> => {
  // Ensure config is loaded
  if (!GOOGLE_CLIENT_ID_LOADED) {
    await loadGoogleCalendarConfig();
  }
  
  if (!GOOGLE_CLIENT_ID) {
    alert(`Google Calendar integration is not configured.

To enable Google Calendar integration, you need to:
1. Create a project in Google Cloud Console (https://console.cloud.google.com/)
2. Enable Google Calendar API
3. Create OAuth 2.0 credentials
4. Set the following environment variables:
   - VITE_GOOGLE_CLIENT_ID (frontend)
   - GOOGLE_CLIENT_ID (backend)
   - GOOGLE_CLIENT_SECRET (backend)
   - GOOGLE_REDIRECT_URI (backend)

For more details, check the documentation.`);
    return;
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: SCOPES,
    access_type: 'offline',
    prompt: 'consent'
  });

  window.location.href = `${GOOGLE_AUTH_URL}?${params.toString()}`;
};

/**
 * Handle OAuth callback and exchange code for tokens
 */
export const handleGoogleCalendarCallback = async (code: string): Promise<boolean> => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) {
      throw new Error('No user session');
    }

    const session = sessionData.session;

    // Exchange code for tokens via backend
    const backendUrl = getBackendUrl();
    console.log('[Google Calendar] Exchanging code for tokens, backend:', backendUrl);
    
    const response = await fetch(`${backendUrl}/api/google-calendar/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code,
        redirectUri: GOOGLE_REDIRECT_URI
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Google Calendar] Token exchange failed:', response.status, errorText);
      throw new Error(`Failed to exchange code for tokens: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('[Google Calendar] Token exchange successful');

    if (!data.access_token) {
      throw new Error('No access token received from backend');
    }

    // Ensure user profile exists before saving tokens
    console.log('[Google Calendar] Ensuring user profile exists...');
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', session.user.id)
      .single();
    
    if (!existingProfile) {
      console.log('[Google Calendar] Creating user profile...');
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: session.user.id,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User'
          // created_at and updated_at have DEFAULT values in the schema, don't include them
        });
      
      if (profileError) {
        console.error('[Google Calendar] Profile creation error:', profileError);
        // Don't throw - profile might already exist from concurrent request
        if (profileError.code !== '23505') { // Not a duplicate key error
          throw new Error(`Profile creation error: ${profileError.message}`);
        }
      } else {
        console.log('[Google Calendar] ✓ Profile created');
      }
    }

    // Save tokens to database
    console.log('[Google Calendar] Saving tokens to database for user:', session.user.id);
    console.log('[Google Calendar] Token data:', {
      hasAccessToken: !!data.access_token,
      hasRefreshToken: !!data.refresh_token,
      expiresIn: data.expires_in,
      email: session.user.email
    });
    
    // First try to get existing token
    const { data: existingToken } = await supabase
      .from('google_calendar_tokens')
      .select('id')
      .eq('user_id', session.user.id)
      .single();
    
    if (existingToken) {
      // Update existing token
      console.log('[Google Calendar] Updating existing token');
      const { error } = await supabase
        .from('google_calendar_tokens')
        .update({
          access_token: data.access_token,
          refresh_token: data.refresh_token || null,
          token_expires_at: data.expires_in 
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : null,
          email: session.user.email || ''
        })
        .eq('user_id', session.user.id);
      
      if (error) {
        console.error('[Google Calendar] Update error:', error);
        throw new Error(`Database update error: ${error.message} (code: ${error.code})`);
      }
    } else {
      // Insert new token
      console.log('[Google Calendar] Inserting new token');
      const { error } = await supabase
        .from('google_calendar_tokens')
        .insert({
          user_id: session.user.id,
          access_token: data.access_token,
          refresh_token: data.refresh_token || null,
          token_expires_at: data.expires_in 
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : null,
          email: session.user.email || ''
        });
      
      if (error) {
        console.error('[Google Calendar] Insert error:', error);
        throw new Error(`Database insert error: ${error.message} (code: ${error.code})`);
      }
    }

    console.log('[Google Calendar] ✓ Tokens saved successfully');
    
    // Wait a bit for database to be ready, then verify connection
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verify the connection was saved
    const verified = await isGoogleCalendarConnected();
    console.log('[Google Calendar] Connection verified after save:', verified);
    
    return true;
  } catch (error) {
    console.error('[Google Calendar] ✗ Error handling callback:', error);
    if (error instanceof Error) {
      console.error('[Google Calendar] Error details:', error.message, error.stack);
    }
    return false;
  }
};

/**
 * Get stored Google Calendar token for current user
 */
export const getGoogleCalendarToken = async (): Promise<GoogleCalendarToken | null> => {
  try {
    // Try getUser() first to force session refresh, fallback to getSession()
    let user = null;
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!userError && userData?.user) {
        user = userData.user;
        console.log('[Google Calendar] getGoogleCalendarToken: Got user via getUser():', user.id);
      }
    } catch (e) {
      console.warn('[Google Calendar] getGoogleCalendarToken: getUser() failed, trying getSession()...');
    }
    
    // Fallback to getSession() if getUser() didn't work
    if (!user) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        user = sessionData.session.user;
        console.log('[Google Calendar] getGoogleCalendarToken: Got user via getSession():', user.id);
      }
    }
    
    if (!user) {
      console.log('[Google Calendar] getGoogleCalendarToken: No user found');
      return null;
    }

    console.log('[Google Calendar] getGoogleCalendarToken: Fetching token for user:', user.id);

    const { data, error } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[Google Calendar] getGoogleCalendarToken: Error fetching token:', error);
      
      // Try fallback queries for 406 errors
      if (error.code === 'PGRST204' || error.code === '406' || error.message?.includes('406')) {
        console.warn('[Google Calendar] getGoogleCalendarToken: Schema cache issue, trying fallback...');
        
        // Try without maybeSingle
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('google_calendar_tokens')
          .select('*')
          .eq('user_id', user.id)
          .limit(1);
        
        if (!fallbackError && fallbackData && fallbackData.length > 0) {
          const tokenData = fallbackData[0];
          console.log('[Google Calendar] getGoogleCalendarToken: ✓ Token found via fallback query');
          return {
            id: tokenData.id,
            userId: tokenData.user_id,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            tokenExpiresAt: tokenData.token_expires_at,
            email: tokenData.email,
            createdAt: tokenData.created_at,
            updatedAt: tokenData.updated_at
          };
        }
      }
      
      return null;
    }
    
    if (!data) {
      console.log('[Google Calendar] getGoogleCalendarToken: No token found in database');
      return null;
    }

    console.log('[Google Calendar] getGoogleCalendarToken: ✓ Token found');
    return {
      id: data.id,
      userId: data.user_id,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiresAt: data.token_expires_at,
      email: data.email,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('[Google Calendar] getGoogleCalendarToken: Exception:', error);
    return null;
  }
};

/**
 * Check if user has connected Google Calendar
 */
export const isGoogleCalendarConnected = async (): Promise<boolean> => {
  try {
    // Try getUser() first to force session refresh, fallback to getSession()
    let user = null;
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!userError && userData?.user) {
        user = userData.user;
        console.log('[Google Calendar] Got user via getUser():', user.id);
      }
    } catch (e) {
      console.warn('[Google Calendar] getUser() failed, trying getSession()...');
    }
    
    // Fallback to getSession() if getUser() didn't work
    if (!user) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        user = sessionData.session.user;
        console.log('[Google Calendar] Got user via getSession():', user.id);
      }
    }
    
    if (!user) {
      console.log('[Google Calendar] No user found (tried getUser and getSession)');
      return false;
    }

    console.log('[Google Calendar] Checking connection for user:', user.id);

    // Try to get token - handle 406 errors gracefully
    const { data, error } = await supabase
      .from('google_calendar_tokens')
      .select('id, access_token, refresh_token')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      // 406 errors are schema cache issues, but if we have data, we're connected
      if (error.code === 'PGRST204' || error.message?.includes('406')) {
        console.warn('[Google Calendar] Schema cache issue, trying fallback query...');
        // Try a simpler count query as fallback
        const { count, error: countError } = await supabase
          .from('google_calendar_tokens')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        if (countError) {
          console.error('[Google Calendar] Fallback query also failed:', countError);
          return false;
        }
        return (count || 0) > 0;
      }
      console.error('[Google Calendar] Error checking connection:', error);
      return false;
    }

    const isConnected = !!data && (!!data.access_token || !!data.refresh_token);
    console.log('[Google Calendar] Connection check result:', isConnected, data ? 'token found' : 'no token');
    return isConnected;
  } catch (error) {
    console.error('[Google Calendar] Error checking connection:', error);
    return false;
  }
};

/**
 * Disconnect Google Calendar
 */
export const disconnectGoogleCalendar = async (): Promise<boolean> => {
  try {
    const { session } = await supabase.auth.getSession();
    if (!session?.user) {
      return false;
    }

    const { error } = await supabase
      .from('google_calendar_tokens')
      .delete()
      .eq('user_id', session.user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    return false;
  }
};

/**
 * Fetch events from Google Calendar
 */
export const fetchGoogleCalendarEvents = async (
  timeMin?: string,
  timeMax?: string
): Promise<GoogleCalendarEvent[]> => {
  try {
    let token = await getGoogleCalendarToken();
    if (!token) {
      throw new Error('Google Calendar not connected');
    }

    // Check if token is expired or about to expire (within 5 minutes)
    const now = new Date();
    const expiresAt = token.tokenExpiresAt ? new Date(token.tokenExpiresAt) : null;
    const isExpired = expiresAt && expiresAt <= now;
    const isExpiringSoon = expiresAt && (expiresAt.getTime() - now.getTime()) < 5 * 60 * 1000; // 5 minutes

    // Refresh token if expired or expiring soon
    if ((isExpired || isExpiringSoon) && token.refreshToken) {
      console.log('[Google Calendar] Token expired or expiring soon, refreshing...');
      const refreshed = await refreshGoogleCalendarToken(token);
      if (refreshed) {
        // Get the updated token
        token = await getGoogleCalendarToken();
        if (!token) {
          throw new Error('Failed to get refreshed token');
        }
      } else {
        console.warn('[Google Calendar] Token refresh failed, trying with existing token');
      }
    }

    // Use backend to fetch events (more secure)
    const backendUrl = getBackendUrl();
    const params = new URLSearchParams({
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });

    console.log('[Google Calendar] Fetching events from:', `${backendUrl}/api/google-calendar/events`);
    const response = await fetch(`${backendUrl}/api/google-calendar/events?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Google Calendar] Events fetch failed:', response.status, errorText);
      
      if (response.status === 401) {
        // Token expired, try to refresh one more time
        console.log('[Google Calendar] 401 Unauthorized, attempting token refresh...');
        const refreshed = await refreshGoogleCalendarToken(token);
        if (refreshed) {
          // Get the updated token and retry
          const newToken = await getGoogleCalendarToken();
          if (newToken) {
            console.log('[Google Calendar] Retrying with refreshed token...');
            const retryResponse = await fetch(`${backendUrl}/api/google-calendar/events?${params.toString()}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${newToken.accessToken}`
              }
            });
            
            if (!retryResponse.ok) {
              const retryErrorText = await retryResponse.text();
              console.error('[Google Calendar] Retry also failed:', retryResponse.status, retryErrorText);
              throw new Error(`Failed to fetch calendar events: ${retryResponse.status}`);
            }
            
            const retryData = await retryResponse.json();
            return retryData.events || [];
          }
        }
        throw new Error('Token expired and refresh failed. Please reconnect Google Calendar.');
      }
      throw new Error(`Failed to fetch calendar events: ${response.status}`);
    }

    const data = await response.json();
    // Backend returns { events: [...], calendars: [...] }
    console.log('[Google Calendar] Successfully fetched', data.events?.length || 0, 'events');
    return data.events || [];
  } catch (error) {
    console.error('[Google Calendar] Error fetching events:', error);
    throw error; // Re-throw to allow caller to handle
  }
};

/**
 * Refresh Google Calendar access token
 */
const refreshGoogleCalendarToken = async (token: GoogleCalendarToken): Promise<boolean> => {
  try {
    if (!token.refreshToken) {
      console.error('[Google Calendar] No refresh token available');
      return false;
    }

    const backendUrl = getBackendUrl();
    console.log('[Google Calendar] Refreshing token, backend:', backendUrl);
    
    const response = await fetch(`${backendUrl}/api/google-calendar/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        refreshToken: token.refreshToken
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Google Calendar] Token refresh failed:', response.status, errorText);
      return false;
    }

    const data = await response.json();
    console.log('[Google Calendar] Token refresh successful');

    if (!data.access_token) {
      console.error('[Google Calendar] No access token in refresh response');
      return false;
    }

    // Get user session (use getUser for reliability)
    let user = null;
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!userError && userData?.user) {
        user = userData.user;
      }
    } catch (e) {
      console.warn('[Google Calendar] getUser() failed in refresh, trying getSession()...');
    }
    
    if (!user) {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        user = sessionData.session.user;
      }
    }
    
    if (!user) {
      console.error('[Google Calendar] No user session for token update');
      return false;
    }

    // Update token in database
    const { error: updateError } = await supabase
      .from('google_calendar_tokens')
      .update({
        access_token: data.access_token,
        token_expires_at: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000).toISOString()
          : null
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[Google Calendar] Failed to update token in database:', updateError);
      return false;
    }

    console.log('[Google Calendar] ✓ Token refreshed and saved');
    return true;
  } catch (error) {
    console.error('[Google Calendar] Error refreshing token:', error);
    return false;
  }
};




