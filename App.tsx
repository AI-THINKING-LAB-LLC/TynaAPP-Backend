
import React, { useState, useEffect, useRef } from 'react';
import { Dashboard } from './components/Dashboard';
import { LivePanel } from './components/LivePanel';
import { MeetingSummary } from './components/MeetingSummary';
import { Settings } from './components/Settings';
import { LandingPage } from './components/LandingPage';
import { AuthScreen } from './components/AuthScreen';
import { Analytics } from './components/Analytics';
import { AppMode, Meeting, TranscriptEntry, UserProfile } from './types';
import { format } from 'date-fns';
import { getSafeSession, signOutUser } from './services/laravelAuthService';
import { fetchMeetings, createMeeting, updateMeeting, deleteMeeting, getCurrentUserProfile } from './services/laravelDataService';
import { generateMeetingTitle } from './services/openaiService';
import { Bell, X } from 'lucide-react';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>(AppMode.LANDING);
  const [loading, setLoading] = useState(true);
  const [currentTranscript, setCurrentTranscript] = useState<TranscriptEntry[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [pastMeetings, setPastMeetings] = useState<Meeting[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // Reminder State
  const [reminder, setReminder] = useState<{ title: string; minutes: number } | null>(null);

  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const reminderIntervalRef = useRef<number | null>(null);

  // Handle Google Calendar OAuth callback (only once)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const isGoogleCallback = urlParams.get('google_calendar_callback') === 'true';
    const error = urlParams.get('google_calendar_error');
    
    // Clean URL immediately to prevent re-processing
    if (code && isGoogleCallback) {
      // Remove callback params immediately
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (error) {
      // Handle OAuth error - clean URL after reading
      window.history.replaceState({}, document.title, `/settings?google_calendar_error=${error}`);
      setMode(AppMode.SETTINGS);
      return;
    }
    
    if (code && isGoogleCallback) {
      // Process callback only once
      const handleCallback = async () => {
        try {
          console.log('[App] Processing Google Calendar OAuth callback...');
          const { handleGoogleCalendarCallback } = await import('./services/googleCalendarService');
          const success = await handleGoogleCalendarCallback(code);
          // Redirect to settings after connection attempt
          setMode(AppMode.SETTINGS);
          // Add success parameter to URL for Settings component to detect
          if (success) {
            console.log('[App] Google Calendar connection successful');
            window.history.replaceState({}, document.title, '/settings?google_calendar_connected=true');
          } else {
            console.error('[App] Google Calendar connection failed');
            window.history.replaceState({}, document.title, '/settings?google_calendar_error=connection_failed');
          }
        } catch (error) {
          console.error('[App] Error in Google Calendar callback handler:', error);
          setMode(AppMode.SETTINGS);
          const errorMessage = error instanceof Error ? error.message : 'connection_failed';
          window.history.replaceState({}, document.title, `/settings?google_calendar_error=${encodeURIComponent(errorMessage)}`);
        }
      };
      handleCallback();
    }
  }, []); // Empty deps - only run once on mount

  // Initialize: Check Session
  useEffect(() => {
    const init = async () => {
      try {
        // Check for existing session using safe method
        const { session } = await getSafeSession();
        
        if (session) {
          // User already logged in, go to Dashboard
          const profile = await getCurrentUserProfile();
          setUserProfile(profile);
          
          const meetings = await fetchMeetings();
          setPastMeetings(meetings);
          setMode(AppMode.DASHBOARD);
        } else {
          // No user, stay on Landing
          setMode(AppMode.LANDING);
        }
      } catch (e) {
        console.error("App init error:", e);
        setMode(AppMode.LANDING);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Handle "Get Started" from Landing Page -> Go to Auth
  const handleGetStarted = () => {
    setMode(AppMode.AUTH);
  };

  // Handle Successful Login/Signup from AuthScreen -> Go to Dashboard
  const handleAuthSuccess = async () => {
    setLoading(true);
    try {
      const profile = await getCurrentUserProfile();
      setUserProfile(profile);
      
      const meetings = await fetchMeetings();
      setPastMeetings(meetings);
      setMode(AppMode.DASHBOARD);
    } catch (e) {
      console.error("Auth success handler error:", e);
    } finally {
      setLoading(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    setLoading(true);
    await signOutUser();
    setUserProfile(null);
    setPastMeetings([]);
    setMode(AppMode.LANDING);
    setLoading(false);
  };

  // Live Meeting Timer
  useEffect(() => {
    if (mode === AppMode.LIVE) {
      startTimeRef.current = new Date();
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
      setReminder(null); // Clear reminders when live
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode]);

  // Reminder Check Logic
  useEffect(() => {
    if (mode === AppMode.DASHBOARD) {
        const checkReminders = () => {
            const now = new Date();
            const upcoming = pastMeetings.find(m => {
                if (m.status === 'scheduled' && m.scheduledAt) {
                    const diff = new Date(m.scheduledAt).getTime() - now.getTime();
                    // Show reminder if meeting is between 0 and 15 mins away
                    return diff > 0 && diff <= 15 * 60 * 1000;
                }
                return false;
            });

            if (upcoming && upcoming.scheduledAt) {
                const mins = Math.ceil((new Date(upcoming.scheduledAt).getTime() - now.getTime()) / 60000);
                setReminder({ title: upcoming.title, minutes: mins });
            } else {
                setReminder(null);
            }
        };

        // Check immediately then every minute
        checkReminders();
        reminderIntervalRef.current = window.setInterval(checkReminders, 60000);
    } else {
        if (reminderIntervalRef.current) clearInterval(reminderIntervalRef.current);
        setReminder(null);
    }

    return () => {
        if (reminderIntervalRef.current) clearInterval(reminderIntervalRef.current);
    };
  }, [mode, pastMeetings]);

  const handleStartMeeting = () => {
    setCurrentTranscript([]);
    setElapsedSeconds(0);
    setMode(AppMode.LIVE);
  };

  const handleTranscriptUpdate = (entry: TranscriptEntry) => {
    setCurrentTranscript(prev => [...prev, entry]);
  };

  const handleStopMeeting = async () => {
    console.log('🛑 handleStopMeeting called');
    const durationStr = format(new Date(elapsedSeconds * 1000), 'mm:ss');
    const now = new Date();
    
    // Générer un titre intelligent basé sur le transcript
    let title = 'Untitled Session';
    if (currentTranscript.length > 0) {
      try {
        console.log('📝 Generating meeting title from transcript...');
        title = await generateMeetingTitle(currentTranscript);
        console.log('✅ Generated meeting title:', title);
      } catch (error) {
        console.error('❌ Error generating title:', error);
        // Utiliser un titre par défaut si la génération échoue
        title = 'Untitled Session';
      }
    }
    
    // Save to Laravel
    try {
      console.log('💾 Saving meeting to Laravel...', {
        title,
        startedAt: startTimeRef.current || now,
        duration: elapsedSeconds,
        transcriptLength: currentTranscript.length,
        status: 'ended'  // Laravel accepte 'live', 'ended', 'scheduled' - pas 'recorded'
      });
      
      const savedMeeting = await createMeeting({
          title,
          startedAt: startTimeRef.current || now,
          duration: elapsedSeconds,
          transcript: currentTranscript,
          status: 'ended'  // Laravel accepte 'live', 'ended', 'scheduled' - pas 'recorded'
      });

      console.log('✅ Meeting saved:', savedMeeting);

      if (savedMeeting && savedMeeting.id) {
          // Re-fetch meetings from server to ensure consistency
          console.log('🔄 Re-fetching meetings from server...');
          const refreshedMeetings = await fetchMeetings();
          console.log('📋 Refreshed meetings:', refreshedMeetings.length, 'meetings');
          setPastMeetings(refreshedMeetings);
          
          // Find the newly saved meeting
          const foundMeeting = refreshedMeetings.find(m => m.id === savedMeeting.id);
          if (foundMeeting) {
            setSelectedMeeting(foundMeeting);
            console.log('✅ Meeting found in refreshed list:', foundMeeting.id);
          } else {
            setSelectedMeeting(savedMeeting);
            console.log('⚠️ Meeting not found in refreshed list, using saved meeting');
          }
          console.log('✅ Meeting added to history');
      } else {
          console.warn('⚠️ Meeting save returned null, using fallback');
          // Fallback for offline/error
          const localMeeting: Meeting = {
              id: Date.now().toString(),
              title,
              date: 'Today',
              time: format(now, 'h:mma'),
              duration: durationStr,
              participantCount: 1,
              transcript: currentTranscript,
              summary: '',
              actionItems: [],
              status: 'ended'  // Laravel accepte 'live', 'ended', 'scheduled' - pas 'recorded'
          };
          setPastMeetings(prev => [localMeeting, ...prev]);
          setSelectedMeeting(localMeeting);
      }
    } catch (error) {
      console.error('❌ Error saving meeting:', error);
      // Fallback for offline/error
      const localMeeting: Meeting = {
          id: Date.now().toString(),
          title,
          date: 'Today',
          time: format(now, 'h:mma'),
          duration: durationStr,
          participantCount: 1,
          transcript: currentTranscript,
          summary: '',
          actionItems: [],
          status: 'ended'  // Laravel accepte 'live', 'ended', 'scheduled' - pas 'recorded'
      };
      setPastMeetings(prev => [localMeeting, ...prev]);
      setSelectedMeeting(localMeeting);
      console.log('✅ Using local fallback meeting');
    }
    
    console.log('🔄 Switching to REVIEW mode');
    setMode(AppMode.REVIEW);
  };

  const handleCloseReview = () => {
    setMode(AppMode.DASHBOARD);
  };

  const handleStartFromReview = () => {
    handleStartMeeting();
  };

  const handleViewSummary = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setMode(AppMode.SUMMARY);
  };

  const handleDeleteMeeting = async (id: string) => {
    await deleteMeeting(id);
    setPastMeetings(prev => prev.filter(m => m.id !== id));
  };

  const handleUpdateMeeting = async (id: string, updates: Partial<Meeting>) => {
      try {
        const updated = await updateMeeting(id, updates);
        setPastMeetings(prev => prev.map(m => m.id === id ? updated : m));
        if (selectedMeeting?.id === id) {
            setSelectedMeeting(updated);
        }
      } catch (error) {
        console.error('Failed to update meeting:', error);
        // Fallback to local update
        setPastMeetings(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
        if (selectedMeeting?.id === id) {
            setSelectedMeeting(prev => prev ? { ...prev, ...updates } : null);
        }
      }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F7F8FA]">
        <div className="flex flex-col items-center gap-4">
           <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-gray-500 font-medium text-sm">Loading Tyna...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Reminder Notification */}
      {reminder && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
             <div className="bg-white/90 backdrop-blur-md shadow-xl border border-blue-100 rounded-full px-5 py-2.5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Bell size={14} className="animate-pulse" />
                </div>
                <div className="flex flex-col">
                    <span className="text-[13px] font-semibold text-gray-900 leading-tight">{reminder.minutes} min until meeting</span>
                    <span className="text-[11px] text-gray-500 leading-tight max-w-[200px] truncate">{reminder.title}</span>
                </div>
                <button onClick={() => setReminder(null)} className="ml-2 text-gray-400 hover:text-gray-600">
                    <X size={14} />
                </button>
             </div>
          </div>
      )}

      {/* Landing Page */}
      {mode === AppMode.LANDING && (
        <LandingPage onGetStarted={handleGetStarted} />
      )}

      {/* Auth Screen */}
      {mode === AppMode.AUTH && (
        <AuthScreen 
          onSuccess={handleAuthSuccess}
          onBack={() => setMode(AppMode.LANDING)}
        />
      )}

      {/* Background Dashboard (Blurred or Active) */}
      {(mode === AppMode.DASHBOARD || mode === AppMode.LIVE || mode === AppMode.REVIEW || mode === AppMode.SETTINGS || mode === AppMode.SUMMARY || mode === AppMode.ANALYTICS) && (
        <div className={`transition-all duration-500 ${mode === AppMode.DASHBOARD ? '' : (mode === AppMode.SETTINGS || mode === AppMode.SUMMARY || mode === AppMode.ANALYTICS ? 'hidden' : 'filter blur-[2px] opacity-90 pointer-events-none')}`}>
          <Dashboard 
            onStartMeeting={handleStartMeeting} 
            onViewSummary={handleViewSummary}
            onOpenSettings={() => setMode(AppMode.SETTINGS)}
            onOpenAnalytics={() => setMode(AppMode.ANALYTICS)}
            onDeleteMeeting={handleDeleteMeeting}
            pastMeetings={pastMeetings}
            userProfile={userProfile}
            onRefreshMeetings={async () => {
              const meetings = await fetchMeetings();
              setPastMeetings(meetings);
            }}
          />
        </div>
      )}
      
      {/* Live/Review Widget */}
      {(mode === AppMode.LIVE || mode === AppMode.REVIEW) && (
        <LivePanel 
          status={mode === AppMode.LIVE ? 'live' : 'ended'}
          onStop={handleStopMeeting}
          onStart={handleStartFromReview}
          onClose={handleCloseReview}
          transcript={currentTranscript}
          elapsedSeconds={elapsedSeconds}
          onTranscriptUpdate={handleTranscriptUpdate}
        />
      )}

      {/* Full Summary Page */}
      {mode === AppMode.SUMMARY && selectedMeeting && (
        <MeetingSummary 
          meeting={selectedMeeting} 
          onBack={() => setMode(AppMode.DASHBOARD)} 
          onStartMeeting={handleStartMeeting}
          onOpenSettings={() => setMode(AppMode.SETTINGS)}
          onUpdateMeeting={handleUpdateMeeting}
        />
      )}

      {/* Settings Page */}
      {mode === AppMode.SETTINGS && (
        <Settings 
          onBack={() => setMode(AppMode.DASHBOARD)}
          userProfile={userProfile}
          onLogout={handleLogout}
        />
      )}

      {/* Analytics Page */}
      {mode === AppMode.ANALYTICS && (
        <Analytics 
          onClose={() => setMode(AppMode.DASHBOARD)}
        />
      )}
    </>
  );
};

export default App;