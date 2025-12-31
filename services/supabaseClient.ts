import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: string;
  user_id: string;
  title: string;
  status: 'live' | 'ended';
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  created_at: string;
}

export interface Transcript {
  id: string;
  meeting_id: string;
  speaker: string;
  text: string;
  timestamp: string;
  language_code?: string;
  confidence?: number;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  meeting_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface MeetingSummary {
  id: string;
  meeting_id: string;
  summary: string;
  action_items: string[];
  created_at: string;
}

// Database service functions
export const db = {
  // Meetings
  async createMeeting(userId: string, title: string): Promise<Meeting | null> {
    const { data, error } = await supabase
      .from('meetings')
      .insert({ user_id: userId, title, status: 'live' })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating meeting:', error);
      return null;
    }
    return data;
  },

  async getMeetings(userId: string): Promise<Meeting[]> {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching meetings:', error);
      return [];
    }
    return data || [];
  },

  async updateMeeting(meetingId: string, updates: Partial<Meeting>): Promise<boolean> {
    const { error } = await supabase
      .from('meetings')
      .update(updates)
      .eq('id', meetingId);
    
    if (error) {
      console.error('Error updating meeting:', error);
      return false;
    }
    return true;
  },

  async endMeeting(meetingId: string, durationSeconds: number): Promise<boolean> {
    const { error } = await supabase
      .from('meetings')
      .update({ 
        status: 'ended', 
        ended_at: new Date().toISOString(),
        duration_seconds: durationSeconds
      })
      .eq('id', meetingId);
    
    if (error) {
      console.error('Error ending meeting:', error);
      return false;
    }
    return true;
  },

  // Transcripts
  async addTranscript(transcript: Omit<Transcript, 'id' | 'created_at'>): Promise<boolean> {
    const { error } = await supabase
      .from('transcripts')
      .insert(transcript);
    
    if (error) {
      console.error('Error adding transcript:', error);
      return false;
    }
    return true;
  },

  async getTranscripts(meetingId: string): Promise<Transcript[]> {
    const { data, error } = await supabase
      .from('transcripts')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching transcripts:', error);
      return [];
    }
    return data || [];
  },

  // Chat messages
  async addChatMessage(message: Omit<ChatMessage, 'id' | 'created_at'>): Promise<boolean> {
    const { error } = await supabase
      .from('chat_messages')
      .insert(message);
    
    if (error) {
      console.error('Error adding chat message:', error);
      return false;
    }
    return true;
  },

  async getChatMessages(meetingId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching chat messages:', error);
      return [];
    }
    return data || [];
  },

  // Meeting summaries
  async saveSummary(summary: Omit<MeetingSummary, 'id' | 'created_at'>): Promise<boolean> {
    const { error } = await supabase
      .from('meeting_summaries')
      .upsert(summary, { onConflict: 'meeting_id' });
    
    if (error) {
      console.error('Error saving summary:', error);
      return false;
    }
    return true;
  },

  async getSummary(meetingId: string): Promise<MeetingSummary | null> {
    const { data, error } = await supabase
      .from('meeting_summaries')
      .select('*')
      .eq('meeting_id', meetingId)
      .single();
    
    if (error) {
      console.error('Error fetching summary:', error);
      return null;
    }
    return data;
  },

  // Profile
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  },

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<boolean> {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);
    
    if (error) {
      console.error('Error updating profile:', error);
      return false;
    }
    return true;
  }
};
