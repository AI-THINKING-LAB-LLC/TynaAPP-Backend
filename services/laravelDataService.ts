/**
 * Laravel Data Service
 * Service unique pour communiquer avec le backend Laravel
 * Remplace hybridDataService pour utiliser uniquement Laravel
 */

import { Meeting, ChatMessage, UserProfile } from '../types';
import * as laravelApiService from './laravelApiService';

// Meetings
export const fetchMeetings = async (): Promise<Meeting[]> => {
  return await laravelApiService.fetchLaravelMeetings();
};

export const createMeeting = async (meetingData: Partial<Meeting>): Promise<Meeting> => {
  return await laravelApiService.createLaravelMeeting(meetingData);
};

export const updateMeeting = async (id: string, meetingData: Partial<Meeting>): Promise<Meeting> => {
  return await laravelApiService.updateLaravelMeeting(id, meetingData);
};

export const deleteMeeting = async (id: string): Promise<void> => {
  await laravelApiService.deleteLaravelMeeting(id);
};

// Chat Messages
export const fetchChatMessages = async (meetingId?: string): Promise<ChatMessage[]> => {
  return await laravelApiService.fetchLaravelChatMessages(meetingId);
};

export const createChatMessage = async (messageData: Partial<ChatMessage>): Promise<ChatMessage> => {
  return await laravelApiService.createLaravelChatMessage(messageData);
};

// Profiles
export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  // Utiliser laravelAuthService pour le profil
  const { getCurrentUserProfile } = await import('./laravelAuthService');
  return await getCurrentUserProfile();
};

export const updateUserProfile = async (profileData: Partial<UserProfile>): Promise<UserProfile> => {
  const profile = await getCurrentUserProfile();
  if (profile) {
    return await laravelApiService.updateLaravelProfile(profile.id, profileData) as UserProfile;
  }
  throw new Error('No user profile found');
};

// TODO: Implement these functions via Laravel API
export const updateMeetingNotes = async (meetingId: string, notes: string): Promise<boolean> => {
  try {
    // Update meeting summary with notes
    await laravelApiService.updateLaravelMeeting(meetingId, { userNotes: notes } as any);
    return true;
  } catch (error) {
    console.error('Error updating meeting notes:', error);
    return false;
  }
};

export const getMeetingStatistics = async (): Promise<any> => {
  // TODO: Implement statistics endpoint in Laravel
  return {
    totalMeetings: 0,
    totalTimeSeconds: 0,
    averageDurationSeconds: 0,
    meetingsByPeriod: { today: 0, thisWeek: 0, thisMonth: 0 },
    timeByPeriod: { today: 0, thisWeek: 0, thisMonth: 0 },
    topParticipants: [],
    topKeywords: [],
    meetingsByDay: []
  };
};

export const getStoredBehaviors = (): any[] | null => {
  // TODO: Implement behaviors storage via Laravel API
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('tyna_custom_behaviors');
  return stored ? JSON.parse(stored) : null;
};

export const saveStoredBehaviors = (behaviors: any[]): void => {
  // TODO: Implement behaviors storage via Laravel API
  localStorage.setItem('tyna_custom_behaviors', JSON.stringify(behaviors));
};

