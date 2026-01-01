/**
 * Laravel API Service
 * Service pour communiquer avec le backend Laravel
 */

import { Meeting, ChatMessage, Transcript, MeetingSummary, UserProfile } from '../types';

// Types
export interface Plan {
  id: number;
  name: string;
  stripe_product_id: string;
  stripe_price_id: string;
  interval: 'day' | 'week' | 'month' | 'year';
  amount: number; // in cents
  amount_formatted: string;
  currency: string;
  trial_days?: number;
  allow_promotion_codes: boolean;
  description?: string;
  active: boolean;
}

// Configuration
const getLaravelBackendUrl = (): string => {
  // Priorité 1: VITE_LARAVEL_BACKEND_URL
  const backendUrl = import.meta.env.VITE_LARAVEL_BACKEND_URL;
  if (backendUrl) {
    return backendUrl.replace(/\/$/, '');
  }
  
  // Priorité 2: VITE_BACKEND_URL (mais seulement si ce n'est pas localhost/3001)
  const fallbackUrl = import.meta.env.VITE_BACKEND_URL;
  if (fallbackUrl && !fallbackUrl.includes('3001') && !fallbackUrl.includes('localhost')) {
    return fallbackUrl.replace(/\/$/, '');
  }
  
  // Détection si on est en production
  const isProduction = typeof window !== 'undefined' && 
    !window.location.hostname.includes('localhost') && 
    !window.location.hostname.includes('127.0.0.1');
  
  // En production, utiliser l'URL du backend Laravel connue
  if (isProduction) {
    const productionBackendUrl = 'https://enthusiastic-success-production-2c5c.up.railway.app';
    console.warn('[Laravel API] ⚠️ VITE_LARAVEL_BACKEND_URL not set, using hardcoded production URL:', productionBackendUrl);
    console.warn('[Laravel API] 💡 For better reliability, set VITE_LARAVEL_BACKEND_URL=https://enthusiastic-success-production-2c5c.up.railway.app in Railway variables');
    return productionBackendUrl;
  }
  
  // En développement: Fallback to localhost
  if (typeof window !== 'undefined' && import.meta.env.DEV) {
    return window.location.origin.replace(':5173', ':8001').replace(':3000', ':8001');
  }
  
  return 'http://localhost:8001';
};

const API_BASE_URL = getLaravelBackendUrl();
const API_URL = `${API_BASE_URL}/api`;

// Get authentication token (from localStorage or session)
const getAuthToken = async (): Promise<string | null> => {
  // Try localStorage for Laravel Sanctum token (primary method for Laravel)
  const token = localStorage.getItem('laravel_sanctum_token');
  if (token) {
    return token;
  }

  // Try to get token from Supabase session (for compatibility/fallback)
  // Only if Supabase is available (not required for Laravel-only mode)
  try {
    const supabaseModule = await import('./supabaseClient');
    // Check if the module exports supabase directly or createClient
    if (supabaseModule) {
      let supabase;
      if (supabaseModule.supabase) {
        // Direct export (supabaseClient.ts exports supabase directly)
        supabase = supabaseModule.supabase;
      } else if (typeof supabaseModule.createClient === 'function') {
        // Factory function
        supabase = supabaseModule.createClient();
      }
      
      if (supabase && supabase.auth) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          return session.access_token;
        }
      }
    }
  } catch (e) {
    // Supabase not available or not needed - this is OK for Laravel-only mode
    // Silently ignore import errors
    if (e instanceof TypeError && e.message.includes('is not a function')) {
      // Expected error - Supabase not configured for Laravel-only mode
    } else {
      console.warn('[Laravel API] Could not get Supabase token:', e);
    }
  }

  return null;
};

// Make authenticated API request
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = await getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}/${endpoint}`;
  
  console.log(`[Laravel API] ${options.method || 'GET'} ${url}`);

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Important for Sanctum cookies
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
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

// Authentication
export const laravelLogin = async (email: string, password: string): Promise<{ token: string; user: any }> => {
  const response = await apiRequest('tokens', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();
  
  // Store token
  if (data.token) {
    localStorage.setItem('laravel_sanctum_token', data.token);
  }

  return data;
};

export const laravelLogout = async (): Promise<void> => {
  const token = await getAuthToken();
  if (token) {
    try {
      await apiRequest('tokens', {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('[Laravel API] Logout error:', e);
    }
  }
  localStorage.removeItem('laravel_sanctum_token');
};

// Users
export const fetchLaravelUsers = async (): Promise<any[]> => {
  const response = await apiRequest('users');
  return response.json();
};

export const getLaravelUser = async (id: string): Promise<any> => {
  const response = await apiRequest(`users/${id}`);
  return response.json();
};

// Profiles
export const fetchLaravelProfiles = async (): Promise<any[]> => {
  const response = await apiRequest('profiles');
  return response.json();
};

export const getLaravelProfile = async (id: string): Promise<any> => {
  const response = await apiRequest(`profiles/${id}`);
  return response.json();
};

export const createLaravelProfile = async (profileData: Partial<UserProfile>): Promise<any> => {
  const response = await apiRequest('profiles', {
    method: 'POST',
    body: JSON.stringify(profileData),
  });
  return response.json();
};

export const updateLaravelProfile = async (id: string, profileData: Partial<UserProfile>): Promise<any> => {
  const response = await apiRequest(`profiles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
  return response.json();
};

// Meetings
export const fetchLaravelMeetings = async (): Promise<Meeting[]> => {
  try {
    console.log('[Laravel API] Fetching meetings...');
    const response = await apiRequest('meetings');
    const data = await response.json();
    
    console.log('[Laravel API] Raw meetings response:', data);
    console.log('[Laravel API] Response structure:', {
      hasData: !!data.data,
      isArray: Array.isArray(data),
      dataType: Array.isArray(data.data) ? 'array' : typeof data.data,
      total: data.total || data.meta?.total || 'unknown',
    });
    
    // Laravel pagination returns { data: [...], links: {...}, meta: {...} }
    // Check for paginated response first
    let meetingsArray: any[] = [];
    
    if (data.data && Array.isArray(data.data)) {
      // Paginated response
      meetingsArray = data.data;
      console.log('[Laravel API] Using paginated data:', meetingsArray.length, 'meetings');
    } else if (Array.isArray(data)) {
      // Direct array response
      meetingsArray = data;
      console.log('[Laravel API] Using direct array:', meetingsArray.length, 'meetings');
    } else {
      console.warn('[Laravel API] Unexpected response format:', data);
    }
    
    // Transform Laravel format to frontend format
    const meetings = meetingsArray.map(mapLaravelMeeting);
    
    console.log('[Laravel API] Mapped meetings:', meetings.length, 'meetings');
    console.log('[Laravel API] Meeting IDs:', meetings.map(m => m.id));
    return meetings;
  } catch (error) {
    console.error('[Laravel API] Error fetching meetings:', error);
    return [];
  }
};

export const getLaravelMeeting = async (id: string): Promise<Meeting> => {
  const response = await apiRequest(`meetings/${id}`);
  const data = await response.json();
  return mapLaravelMeeting(data.data || data);
};

export const createLaravelMeeting = async (meetingData: Partial<Meeting>): Promise<Meeting> => {
  try {
    console.log('[Laravel API] Creating meeting:', meetingData);
    const transformed = transformMeetingToLaravel(meetingData);
    console.log('[Laravel API] Transformed data:', transformed);
    
    const response = await apiRequest('meetings', {
      method: 'POST',
      body: JSON.stringify(transformed),
    });
    
    const data = await response.json();
    console.log('[Laravel API] Meeting created response:', data);
    
    const meeting = mapLaravelMeeting(data.data || data);
    console.log('[Laravel API] Mapped meeting:', meeting);
    return meeting;
  } catch (error) {
    console.error('[Laravel API] Error creating meeting:', error);
    throw error;
  }
};

export const updateLaravelMeeting = async (id: string, meetingData: Partial<Meeting>): Promise<Meeting> => {
  const response = await apiRequest(`meetings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(transformMeetingToLaravel(meetingData)),
  });
  const data = await response.json();
  return mapLaravelMeeting(data.data || data);
};

export const deleteLaravelMeeting = async (id: string): Promise<void> => {
  await apiRequest(`meetings/${id}`, {
    method: 'DELETE',
  });
};

// Chat Messages
export const fetchLaravelChatMessages = async (meetingId?: string): Promise<ChatMessage[]> => {
  const endpoint = meetingId ? `chat-messages?meeting_id=${meetingId}` : 'chat-messages';
  const response = await apiRequest(endpoint);
  const data = await response.json();
  
  const messages = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
  return messages.map(mapLaravelChatMessage);
};

export const createLaravelChatMessage = async (messageData: Partial<ChatMessage>): Promise<ChatMessage> => {
  const response = await apiRequest('chat-messages', {
    method: 'POST',
    body: JSON.stringify(transformChatMessageToLaravel(messageData)),
  });
  const data = await response.json();
  return mapLaravelChatMessage(data.data || data);
};

// Transcripts
export const fetchLaravelTranscripts = async (meetingId?: string): Promise<Transcript[]> => {
  const endpoint = meetingId ? `transcripts?meeting_id=${meetingId}` : 'transcripts';
  const response = await apiRequest(endpoint);
  const data = await response.json();
  
  const transcripts = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
  return transcripts.map(mapLaravelTranscript);
};

export const createLaravelTranscript = async (transcriptData: Partial<Transcript>): Promise<Transcript> => {
  const response = await apiRequest('transcripts', {
    method: 'POST',
    body: JSON.stringify(transformTranscriptToLaravel(transcriptData)),
  });
  const data = await response.json();
  return mapLaravelTranscript(data.data || data);
};

// Meeting Summaries
export const fetchLaravelMeetingSummaries = async (meetingId?: string): Promise<MeetingSummary[]> => {
  const endpoint = meetingId ? `meeting-summaries?meeting_id=${meetingId}` : 'meeting-summaries';
  const response = await apiRequest(endpoint);
  const data = await response.json();
  
  const summaries = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
  return summaries.map(mapLaravelMeetingSummary);
};

export const createLaravelMeetingSummary = async (summaryData: Partial<MeetingSummary>): Promise<MeetingSummary> => {
  const response = await apiRequest('meeting-summaries', {
    method: 'POST',
    body: JSON.stringify(transformMeetingSummaryToLaravel(summaryData)),
  });
  const data = await response.json();
  return mapLaravelMeetingSummary(data.data || data);
};

// Data transformation functions
const mapLaravelMeeting = (laravelMeeting: any): Meeting => {
  return {
    id: laravelMeeting.id,
    title: laravelMeeting.title || 'Untitled Meeting',
    date: laravelMeeting.started_at ? new Date(laravelMeeting.started_at).toLocaleDateString() : 'Today',
    time: laravelMeeting.started_at ? new Date(laravelMeeting.started_at).toLocaleTimeString() : '',
    duration: laravelMeeting.duration_seconds || 0,
    participants: [], // TODO: Extract from Laravel if available
    status: laravelMeeting.status || 'ended',
    transcript: laravelMeeting.transcripts ? laravelMeeting.transcripts.map(mapLaravelTranscript) : [],
    summary: laravelMeeting.meeting_summaries?.[0] ? mapLaravelMeetingSummary(laravelMeeting.meeting_summaries[0]).summary : null,
    actionItems: laravelMeeting.meeting_summaries?.[0]?.action_items || [],
    userNotes: laravelMeeting.meeting_summaries?.[0]?.user_notes || laravelMeeting.user_notes || '',
    chatMessages: laravelMeeting.chat_messages ? laravelMeeting.chat_messages.map(mapLaravelChatMessage) : [],
    userNotes: laravelMeeting.user_notes || '',
    startedAt: laravelMeeting.started_at ? new Date(laravelMeeting.started_at) : new Date(),
    endedAt: laravelMeeting.ended_at ? new Date(laravelMeeting.ended_at) : null,
  };
};

const mapLaravelChatMessage = (laravelMessage: any): ChatMessage => {
  return {
    id: laravelMessage.id,
    role: laravelMessage.role === 'assistant' ? 'model' : 'user',
    text: laravelMessage.content || '',
    timestamp: laravelMessage.created_at ? new Date(laravelMessage.created_at) : new Date(),
  };
};

const mapLaravelTranscript = (laravelTranscript: any): any => {
  return {
    id: laravelTranscript.id,
    speaker: laravelTranscript.speaker || 'Unknown',
    text: laravelTranscript.text || '',
    timestamp: laravelTranscript.timestamp || '',
    language_code: laravelTranscript.language_code,
    confidence: laravelTranscript.confidence,
  };
};

const mapLaravelMeetingSummary = (laravelSummary: any): MeetingSummary => {
  return {
    id: laravelSummary.id,
    summary: laravelSummary.summary_text || laravelSummary.summary || '', // Support both old and new schema
    actionItems: Array.isArray(laravelSummary.action_items) ? laravelSummary.action_items : [],
    userNotes: laravelSummary.user_notes || '', // Add user_notes support
    createdAt: laravelSummary.created_at ? new Date(laravelSummary.created_at) : new Date(),
  };
};

// Transform frontend format to Laravel format
const transformMeetingToLaravel = (meeting: Partial<Meeting>): any => {
  const now = new Date();
  const startedAt = meeting.startedAt || now;
  const endedAt = meeting.endedAt || (meeting.status === 'recorded' ? now : null);
  
  return {
    title: meeting.title || 'Untitled Session',
    status: meeting.status || 'ended',
    started_at: startedAt.toISOString(),
    ended_at: endedAt ? endedAt.toISOString() : null,
    duration_seconds: meeting.duration || 0,
    user_notes: meeting.userNotes || '',
  };
};

const transformChatMessageToLaravel = (message: Partial<ChatMessage>): any => {
  return {
    meeting_id: (message as any).meetingId,
    role: message.role === 'model' ? 'assistant' : 'user',
    content: message.text,
  };
};

const transformTranscriptToLaravel = (transcript: Partial<Transcript>): any => {
  return {
    meeting_id: (transcript as any).meetingId,
    speaker: transcript.speaker,
    text: transcript.text,
    timestamp: transcript.timestamp,
    language_code: transcript.language_code,
    confidence: transcript.confidence,
  };
};

const transformMeetingSummaryToLaravel = (summary: Partial<MeetingSummary>): any => {
  return {
    meeting_id: (summary as any).meetingId,
    summary_text: summary.summary, // Use summary_text to match Supabase schema
    action_items: summary.actionItems || [],
    user_notes: (summary as any).userNotes || '', // Add user_notes support
  };
};

// Sync functions - Synchronize data between Supabase and Laravel
export const syncMeetingsToLaravel = async (supabaseMeetings: Meeting[]): Promise<Meeting[]> => {
  const syncedMeetings: Meeting[] = [];
  
  for (const meeting of supabaseMeetings) {
    try {
      // Check if meeting exists in Laravel
      let laravelMeeting: Meeting;
      try {
        laravelMeeting = await getLaravelMeeting(meeting.id);
        // Update if exists
        laravelMeeting = await updateLaravelMeeting(meeting.id, meeting);
      } catch {
        // Create if doesn't exist
        laravelMeeting = await createLaravelMeeting(meeting);
      }
      syncedMeetings.push(laravelMeeting);
    } catch (error) {
      console.error(`[Sync] Failed to sync meeting ${meeting.id}:`, error);
    }
  }
  
  return syncedMeetings;
};

export const syncChatMessagesToLaravel = async (meetingId: string, messages: ChatMessage[]): Promise<ChatMessage[]> => {
  const syncedMessages: ChatMessage[] = [];
  
  for (const message of messages) {
    try {
      const laravelMessage = await createLaravelChatMessage({
        ...message,
        meetingId,
      } as any);
      syncedMessages.push(laravelMessage);
    } catch (error) {
      console.error(`[Sync] Failed to sync message ${message.id}:`, error);
    }
  }
  
  return syncedMessages;
};

export const syncTranscriptsToLaravel = async (meetingId: string, transcripts: Transcript[]): Promise<Transcript[]> => {
  const syncedTranscripts: Transcript[] = [];
  
  for (const transcript of transcripts) {
    try {
      const laravelTranscript = await createLaravelTranscript({
        ...transcript,
        meetingId,
      } as any);
      syncedTranscripts.push(laravelTranscript);
    } catch (error) {
      console.error(`[Sync] Failed to sync transcript ${transcript.id}:`, error);
    }
  }
  
  return syncedTranscripts;
};

// Plans
export const fetchLaravelPlans = async (interval?: 'month' | 'year'): Promise<Plan[]> => {
  const endpoint = interval ? `plans?interval=${interval}` : 'plans';
  const response = await apiRequest(endpoint);
  const data = await response.json();
  
  if (data.success && Array.isArray(data.data)) {
    return data.data;
  }
  
  return Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
};

export const getLaravelPlan = async (id: number): Promise<Plan> => {
  const response = await apiRequest(`plans/${id}`);
  const data = await response.json();
  
  if (data.success && data.data) {
    return data.data;
  }
  
  return data.data || data;
};

// Subscriptions
export const createLaravelSubscription = async (planId: number, successUrl: string, cancelUrl: string): Promise<{ checkout_url: string }> => {
  try {
    console.log('[Laravel API] Creating subscription for plan:', planId);
    const response = await apiRequest('subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        plan_id: planId,
        success_url: successUrl,
        cancel_url: cancelUrl,
      }),
    });
    
    console.log('[Laravel API] Subscription response status:', response.status);
    const data = await response.json();
    console.log('[Laravel API] Subscription response data:', data);
    
    if (!response.ok) {
      const errorMessage = data.message || data.error || `HTTP ${response.status}: ${response.statusText}`;
      console.error('[Laravel API] Subscription error:', errorMessage, data);
      throw new Error(errorMessage);
    }
    
    const checkoutUrl = data.url || data.checkout_url || data.checkoutUrl;
    if (!checkoutUrl) {
      console.error('[Laravel API] No checkout URL in response:', data);
      throw new Error('No checkout URL returned from server. Please check that the plan has a valid Stripe Price ID configured.');
    }
    
    return {
      checkout_url: checkoutUrl,
    };
  } catch (error) {
    console.error('[Laravel API] Error creating subscription:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to create subscription. Please check your plan configuration.');
  }
};

// Export Plan type
export type { Plan };


