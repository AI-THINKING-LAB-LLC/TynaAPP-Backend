
export interface TranscriptEntry {
  id: string;
  speaker: string;
  text: string;
  timestamp: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  participantCount: number;
  transcript: TranscriptEntry[];
  summary?: string;
  actionItems?: string[];
  userNotes?: string;
  status?: 'recorded' | 'scheduled';
  scheduledAt?: string; // ISO string for precise reminder logic
}

export enum AppMode {
  LANDING = 'LANDING',
  AUTH = 'AUTH',
  DASHBOARD = 'DASHBOARD',
  LIVE = 'LIVE',
  REVIEW = 'REVIEW',
  SUMMARY = 'SUMMARY',
  SETTINGS = 'SETTINGS',
  ANALYTICS = 'ANALYTICS'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

// Analytics Types
export interface MeetingStatistics {
  totalMeetings: number;
  totalTimeSeconds: number;
  averageDurationSeconds: number;
  meetingsByPeriod: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  timeByPeriod: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  topParticipants: Array<{
    name: string;
    count: number;
  }>;
  topKeywords: Array<{
    word: string;
    count: number;
  }>;
  meetingsByDay: Array<{
    date: string;
    count: number;
    totalDuration: number;
  }>;
}

// Google Calendar Types
export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  location?: string;
  hangoutLink?: string;
}

export interface GoogleCalendarToken {
  id: string;
  userId: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}