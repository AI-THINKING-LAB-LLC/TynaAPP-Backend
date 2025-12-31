
import React, { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, Camera, Bell, Shield, Sparkles, ChevronRight, 
  Lock, LogOut, Plus, FileText, Trash2, Check, Smartphone, 
  Download, AlertTriangle, Calendar, RefreshCw, X
} from 'lucide-react';
import { UserProfile } from '../types';
import { getStoredBehaviors, saveStoredBehaviors } from '../services/laravelDataService';
import { 
  initiateGoogleCalendarAuth, 
  isGoogleCalendarConnected, 
  disconnectGoogleCalendar,
  fetchGoogleCalendarEvents,
  isGoogleCalendarConfigured
} from '../services/googleCalendarService';
import { 
  getCurrentSubscription, 
  fetchPlans, 
  createSubscription, 
  cancelSubscription, 
  resumeSubscription,
  CurrentSubscription,
  Plan
} from '../services/planService';
// Google Calendar sync will be implemented via Laravel API
// import { syncGoogleCalendarEvents } from '../services/supabaseService';

// Types
interface Behavior {
  id: string;
  name: string;
  prompt: string;
  isActive: boolean;
  isSystem: boolean;
  files: string[];
}

interface Session {
  id: string;
  device: string;
  location: string;
  active: boolean;
  lastActive: string;
}

const DEFAULT_BEHAVIORS: Behavior[] = [
  {
    id: 'b1',
    name: 'Default Tyna',
    prompt: 'You are Tyna, a helpful and efficient AI meeting assistant. Your goal is to provide accurate summaries, extract action items, and answer questions based solely on the meeting transcript. Be concise and professional.',
    isActive: true,
    isSystem: true,
    files: []
  },
  {
    id: 'b2',
    name: 'Sales Assistant',
    prompt: 'You are an aggressive and sharp Sales Assistant. Focus on identifying customer pain points, budget mentions, decision-making criteria, and potential objections. Highlight any buying signals immediately.',
    isActive: false,
    isSystem: false,
    files: ['sales_playbook_v2.pdf']
  },
  {
    id: 'b3',
    name: 'Technical Assistant',
    prompt: 'You are a Technical Assistant. Ignore fluff and focus on architectural decisions, tech stack discussions, API specifications, and blockers. Extract JIRA tickets and technical debt items.',
    isActive: false,
    isSystem: false,
    files: []
  }
];

const MOCK_SESSIONS: Session[] = [
  { id: 's1', device: 'MacBook Pro 16"', location: 'Stockholm, SE', active: true, lastActive: 'Now' },
  { id: 's2', device: 'iPhone 15 Pro', location: 'Stockholm, SE', active: false, lastActive: '2 hours ago' }
];

interface SettingsProps {
  onBack: () => void;
  userProfile: UserProfile | null;
  onLogout: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onBack, userProfile, onLogout }) => {
  const [view, setView] = useState<'main' | 'customize' | 'privacy'>('main');
  
  // Profile State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [profileImage, setProfileImage] = useState('https://api.dicebear.com/7.x/avataaars/svg?seed=User');
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userProfile) {
        const names = userProfile.fullName.split(' ');
        setFirstName(names[0] || '');
        setLastName(names.slice(1).join(' ') || '');
        setEmail(userProfile.email || '');
        if (userProfile.avatarUrl) {
            setProfileImage(userProfile.avatarUrl);
        } else {
             setProfileImage(`https://api.dicebear.com/7.x/avataaars/svg?seed=${names[0] || 'User'}`);
        }
    }
  }, [userProfile]);

  // Behavior State
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [selectedBehaviorId, setSelectedBehaviorId] = useState<string>('b1');

  // Load behaviors on mount
  useEffect(() => {
    const stored = getStoredBehaviors();
    if (stored) {
        setBehaviors(stored);
    } else {
        setBehaviors(DEFAULT_BEHAVIORS);
    }
  }, []);

  // Privacy State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Google Calendar State
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isCalendarConfigured, setIsCalendarConfigured] = useState(false);

  // Subscription State
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);

  // Check if Google Calendar is configured (loads from backend dynamically)
  useEffect(() => {
    const checkConfig = async () => {
      console.log('[Settings] Checking Google Calendar configuration...');
      try {
        const configured = await isGoogleCalendarConfigured();
        console.log('[Settings] Google Calendar configured:', configured);
        setIsCalendarConfigured(configured);
      } catch (error) {
        console.error('[Settings] Error checking Google Calendar config:', error);
        setIsCalendarConfigured(false);
      }
    };
    checkConfig();
  }, []);

  // Check Google Calendar connection status
  useEffect(() => {
    const checkConnection = async () => {
      const connected = await isGoogleCalendarConnected();
      setIsCalendarConnected(connected);
    };
    checkConnection();
  }, []);

  // Charger l'abonnement actuel et les plans disponibles
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingSubscription(true);
        const subscription = await getCurrentSubscription();
        console.log('[Settings] Subscription loaded:', subscription);
        setCurrentSubscription(subscription);
        
        // Charger les plans disponibles pour le menu déroulant
        const plans = await fetchPlans('month');
        setAvailablePlans(plans);
      } catch (error) {
        console.error('Error loading subscription:', error);
      } finally {
        setLoadingSubscription(false);
      }
    };
    loadData();
  }, []);

  // Charger les plans disponibles et recharger la subscription quand on ouvre le sélecteur
  useEffect(() => {
    if (showPlanSelector) {
      const loadData = async () => {
        try {
          // Recharger la subscription actuelle
          const subscription = await getCurrentSubscription();
          setCurrentSubscription(subscription);
          console.log('[Settings] Current subscription reloaded:', subscription);
          
          // Charger les plans
          const plans = await fetchPlans('month');
          setAvailablePlans(plans);
        } catch (error) {
          console.error('Error loading plans:', error);
        }
      };
      loadData();
    }
  }, [showPlanSelector]);

  // Handle Google Calendar OAuth callback (handled in App.tsx, but check status here)
  useEffect(() => {
    const checkConnection = async () => {
      const connected = await isGoogleCalendarConnected();
      console.log('[Settings] Google Calendar connected:', connected);
      setIsCalendarConnected(connected);
    };
    
    // Check URL for callback success/error
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('google_calendar_connected') === 'true') {
      // Force check connection after successful callback with multiple retries
      const retryCheck = async (attempts = 0) => {
        if (attempts >= 5) return; // Max 5 attempts
        
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempts + 1)));
        const connected = await isGoogleCalendarConnected();
        console.log(`[Settings] Connection check attempt ${attempts + 1}:`, connected);
        
        if (connected) {
          setIsCalendarConnected(true);
          setSyncStatus('Successfully connected to Google Calendar!');
          setTimeout(() => setSyncStatus(null), 5000);
        } else if (attempts < 4) {
          // Retry if not connected yet
          retryCheck(attempts + 1);
        }
      };
      retryCheck();
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('google_calendar_error')) {
      const error = urlParams.get('google_calendar_error');
      let errorMessage = 'Failed to connect to Google Calendar.';
      if (error === 'access_denied') {
        errorMessage = 'Google Calendar connection was cancelled.';
      } else if (error === 'no_code') {
        errorMessage = 'No authorization code received from Google.';
      } else if (error === 'connection_failed') {
        errorMessage = 'Failed to save Google Calendar connection. Please try again.';
      }
      setSyncStatus(errorMessage);
      setTimeout(() => setSyncStatus(null), 5000);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      // Regular check on mount
      checkConnection();
    }
  }, []);

  const handleConnectGoogleCalendar = async () => {
    await initiateGoogleCalendarAuth();
  };

  const handleDisconnectGoogleCalendar = async () => {
    const confirmed = window.confirm('Are you sure you want to disconnect Google Calendar?');
    if (!confirmed) return;

    const success = await disconnectGoogleCalendar();
    if (success) {
      setIsCalendarConnected(false);
      setSyncStatus('Disconnected from Google Calendar');
      setTimeout(() => setSyncStatus(null), 3000);
    } else {
      setSyncStatus('Failed to disconnect Google Calendar');
      setTimeout(() => setSyncStatus(null), 3000);
    }
  };

  // Refresh connection status periodically to keep UI in sync
  useEffect(() => {
    const interval = setInterval(async () => {
      const connected = await isGoogleCalendarConnected();
      setIsCalendarConnected(connected);
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleSyncCalendar = async () => {
    setIsSyncing(true);
    setSyncStatus('Syncing calendar events...');
    try {
      const events = await fetchGoogleCalendarEvents();
      if (events.length > 0) {
        // TODO: Implement Google Calendar sync via Laravel API
        // const synced = await syncGoogleCalendarEvents(events);
        setSyncStatus(`Found ${events.length} event(s) from Google Calendar. Sync via Laravel API coming soon!`);
      } else {
        setSyncStatus('No upcoming events found in Google Calendar');
      }
    } catch (error) {
      console.error('Error syncing calendar:', error);
      setSyncStatus('Failed to sync calendar. Please try again.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 5000);
    }
  };

  // -- Profile Handlers --
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setProfileImage(ev.target.result as string);
          setHasChanges(true);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleProfileSave = () => {
    // Mock API call
    setTimeout(() => {
      setHasChanges(false);
      alert('Profile updated successfully');
    }, 500);
  };

  // -- Behavior Handlers --
  const selectedBehavior = behaviors.find(b => b.id === selectedBehaviorId) || behaviors[0];

  const handleUpdateBehavior = (id: string, updates: Partial<Behavior>) => {
    setBehaviors(prev => prev.map(b => {
      if (b.id === id) return { ...b, ...updates };
      return b;
    }));
  };

  const handleActivateBehavior = (id: string) => {
    setBehaviors(prev => prev.map(b => ({
      ...b,
      isActive: b.id === id
    })));
  };

  const handleAddBehavior = () => {
    const newId = Date.now().toString();
    const newBehavior: Behavior = {
      id: newId,
      name: 'New Behavior',
      prompt: '',
      isActive: false,
      isSystem: false,
      files: []
    };
    setBehaviors(prev => {
        const updated = [...prev, newBehavior];
        return updated;
    });
    setSelectedBehaviorId(newId);
  };

  const handleDeleteBehavior = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (behaviors.length <= 1) return;
    const newBehaviors = behaviors.filter(b => b.id !== id);
    setBehaviors(newBehaviors);
    if (selectedBehaviorId === id) {
      setSelectedBehaviorId(newBehaviors[0].id);
    }
  };

  const handleSaveBehaviors = () => {
      saveStoredBehaviors(behaviors);
      alert('Tyna settings saved!');
  };

  // -- Render Views --

  const renderCustomizeTyna = () => (
    <div className="flex flex-col h-screen bg-[#F7F8FA]">
      <div className="h-[72px] px-8 flex items-center shrink-0 bg-white border-b border-gray-200">
        <button onClick={() => setView('main')} className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors text-[#666]">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[18px] font-semibold text-[#111]">Customize Tyna</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-[280px] bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-[12px] font-semibold text-[#888] tracking-wider uppercase mb-3">Behaviors</h2>
            <div className="space-y-1">
              {behaviors.map(b => (
                <div 
                  key={b.id}
                  onClick={() => setSelectedBehaviorId(b.id)}
                  className={`group flex items-center justify-between px-3 py-2.5 rounded-[10px] cursor-pointer text-[14px] transition-all ${
                    selectedBehaviorId === b.id 
                      ? 'bg-blue-50 text-blue-700 font-medium' 
                      : 'text-[#444] hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {b.isActive && <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 shadow-sm" />}
                    <span className="truncate">{b.name}</span>
                  </div>
                  {!b.isSystem && selectedBehaviorId === b.id && (
                     <button onClick={(e) => handleDeleteBehavior(b.id, e)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                       <Trash2 size={14} />
                     </button>
                  )}
                </div>
              ))}
            </div>
            <button 
              onClick={handleAddBehavior}
              className="mt-3 w-full py-2.5 border border-dashed border-gray-300 rounded-[10px] text-[13px] text-[#666] font-medium hover:bg-gray-50 hover:border-gray-400 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={14} />
              New Behavior
            </button>
          </div>
        </div>

        {/* Editor Panel */}
        {selectedBehavior ? (
          <div className="flex-1 bg-[#F7F8FA] p-8 overflow-y-auto">
            <div className="max-w-[720px] mx-auto bg-white rounded-[20px] shadow-sm border border-gray-200 p-8 min-h-[600px]">
              
              {/* Header */}
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100">
                 <input 
                   type="text" 
                   value={selectedBehavior.name}
                   onChange={(e) => handleUpdateBehavior(selectedBehavior.id, { name: e.target.value })}
                   className="text-[20px] font-semibold text-[#111] bg-transparent border-none focus:outline-none focus:ring-0 placeholder-gray-400 w-full"
                   placeholder="Behavior Name"
                 />
                 <div className="flex items-center gap-4 shrink-0 ml-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-[#666] font-medium">Active</span>
                      <button 
                        onClick={() => handleActivateBehavior(selectedBehavior.id)}
                        className={`w-[44px] h-[24px] rounded-full relative transition-colors duration-300 ${selectedBehavior.isActive ? 'bg-[#3B76FF]' : 'bg-gray-200'}`}
                      >
                        <div className={`absolute top-1 w-[16px] h-[16px] bg-white rounded-full shadow-sm transition-transform duration-300 ${selectedBehavior.isActive ? 'left-[24px]' : 'left-1'}`} />
                      </button>
                    </div>
                 </div>
              </div>

              {/* Prompt Editor */}
              <div className="mb-8">
                 <label className="block text-[13px] font-semibold text-[#444] mb-3 uppercase tracking-wide">System Instruction</label>
                 <div className="relative">
                   <textarea 
                     value={selectedBehavior.prompt}
                     onChange={(e) => handleUpdateBehavior(selectedBehavior.id, { prompt: e.target.value })}
                     className="w-full h-[320px] p-5 rounded-[12px] bg-[#F9FAFB] border border-gray-200 text-[14px] leading-relaxed text-[#333] focus:outline-none focus:bg-white focus:border-blue-500/50 focus:shadow-[0_0_0_4px_rgba(59,118,255,0.1)] transition-all resize-none font-mono"
                     placeholder="Describe how Tyna should behave..."
                   />
                   <div className="absolute bottom-4 right-4 text-[11px] text-[#999] bg-white/80 px-2 py-1 rounded border border-gray-100">
                      Markdown supported
                   </div>
                 </div>
              </div>

              {/* Files Section (Mock) */}
              <div className="mb-8">
                 <div className="flex items-center justify-between mb-3">
                   <label className="text-[13px] font-semibold text-[#444] uppercase tracking-wide">Knowledge Base</label>
                   <button className="text-[12px] text-blue-600 font-medium hover:underline flex items-center gap-1">
                     <Plus size={12} /> Add File
                   </button>
                 </div>
                 {selectedBehavior.files.length > 0 ? (
                   <div className="space-y-2">
                     {selectedBehavior.files.map((file, idx) => (
                       <div key={idx} className="flex items-center justify-between p-3 rounded-[10px] bg-gray-50 border border-gray-100 group">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded bg-white border border-gray-200 flex items-center justify-center text-red-500">
                             <FileText size={16} />
                           </div>
                           <span className="text-[13px] text-[#333] font-medium">{file}</span>
                         </div>
                         <button className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <Trash2 size={14} />
                         </button>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="p-8 border border-dashed border-gray-200 rounded-[12px] flex flex-col items-center justify-center text-center">
                      <p className="text-[13px] text-gray-500 mb-1">No files attached</p>
                      <p className="text-[12px] text-gray-400">Upload documents to ground Tyna's responses</p>
                   </div>
                 )}
              </div>

              <div className="flex justify-end pt-6 border-t border-gray-100">
                 <button onClick={handleSaveBehaviors} className="px-6 py-2.5 bg-[#111] hover:bg-black text-white text-[14px] font-medium rounded-[10px] shadow-lg shadow-gray-200 transition-transform active:scale-95">
                   Save Changes
                 </button>
              </div>

            </div>
          </div>
        ) : (
           <div className="flex-1 flex items-center justify-center text-gray-400">Loading settings...</div>
        )}
      </div>
    </div>
  );

  const renderPrivacy = () => (
    <div className="flex flex-col h-screen bg-[#F7F8FA] overflow-y-auto">
        {/* Header */}
        <div className="h-[72px] px-8 flex items-center sticky top-0 bg-white/90 backdrop-blur-md border-b border-gray-200 z-10">
          <button onClick={() => setView('main')} className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors text-[#666]">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-[18px] font-semibold text-[#111]">Privacy & Security</h1>
        </div>

        <div className="max-w-2xl mx-auto w-full p-8 space-y-8">
            
            {/* 2FA Section */}
            <section className="bg-white rounded-[20px] p-6 shadow-sm border border-gray-200">
               <div className="flex items-start gap-4 mb-6">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                     <Shield size={20} />
                  </div>
                  <div className="flex-1">
                     <h3 className="text-[16px] font-semibold text-[#111] mb-1">Two-Factor Authentication</h3>
                     <p className="text-[14px] text-gray-500 leading-relaxed">Add an extra layer of security to your account by requiring a code when logging in.</p>
                  </div>
                  <button 
                     onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
                     className={`w-[52px] h-[28px] rounded-full relative transition-colors duration-300 ${twoFactorEnabled ? 'bg-[#3B76FF]' : 'bg-gray-200'}`}
                  >
                      <div className={`absolute top-1 w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform duration-300 ${twoFactorEnabled ? 'left-[28px]' : 'left-1'}`} />
                  </button>
               </div>
               
               {twoFactorEnabled && (
                  <div className="bg-gray-50 rounded-[12px] p-4 border border-gray-100 animate-in fade-in slide-in-from-top-2">
                     <div className="flex items-center gap-3 mb-3">
                        <div className="bg-white p-2 rounded border border-gray-200">
                           {/* Mock QR */}
                           <div className="w-12 h-12 bg-gray-900" /> 
                        </div>
                        <div>
                           <div className="text-[13px] font-medium text-[#333]">Scan QR Code</div>
                           <div className="text-[12px] text-gray-500">Use Authenticator App</div>
                        </div>
                     </div>
                     <button className="text-[13px] text-blue-600 font-medium hover:underline">View Backup Codes</button>
                  </div>
               )}
            </section>

            {/* Session Management */}
            <section className="bg-white rounded-[20px] p-6 shadow-sm border border-gray-200">
               <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                     <Smartphone size={20} />
                  </div>
                  <div>
                     <h3 className="text-[16px] font-semibold text-[#111] mb-1">Active Sessions</h3>
                     <p className="text-[14px] text-gray-500">Manage devices where you're currently logged in.</p>
                  </div>
               </div>

               <div className="space-y-4">
                  {MOCK_SESSIONS.map(session => (
                     <div key={session.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-3">
                           <div className={`w-2 h-2 rounded-full ${session.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                           <div>
                              <div className="text-[14px] font-medium text-[#333]">{session.device}</div>
                              <div className="text-[12px] text-gray-500">{session.location} • {session.lastActive}</div>
                           </div>
                        </div>
                        {!session.active && (
                           <button className="text-[13px] text-red-500 font-medium hover:bg-red-50 px-3 py-1.5 rounded-[8px] transition-colors">
                              Revoke
                           </button>
                        )}
                        {session.active && (
                           <span className="text-[12px] text-gray-400 font-medium px-3">Current</span>
                        )}
                     </div>
                  ))}
               </div>
            </section>

            {/* Data Management */}
            <section className="bg-white rounded-[20px] p-6 shadow-sm border border-gray-200">
               <h3 className="text-[16px] font-semibold text-[#111] mb-4">Data Management</h3>
               <div className="space-y-3">
                  <button className="w-full flex items-center justify-between p-4 rounded-[12px] border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all group text-left">
                     <div>
                        <div className="text-[14px] font-medium text-[#333]">Export Data</div>
                        <div className="text-[12px] text-gray-500">Download all your transcripts and notes</div>
                     </div>
                     <Download size={18} className="text-gray-400 group-hover:text-[#333]" />
                  </button>
                  <button className="w-full flex items-center justify-between p-4 rounded-[12px] border border-red-100 bg-red-50/30 hover:bg-red-50 hover:border-red-200 transition-all group text-left">
                     <div>
                        <div className="text-[14px] font-medium text-red-600">Delete Account</div>
                        <div className="text-[12px] text-red-400">Permanently remove all data</div>
                     </div>
                     <AlertTriangle size={18} className="text-red-400 group-hover:text-red-600" />
                  </button>
               </div>
            </section>
        </div>
    </div>
  );

  const renderMainSettings = () => (
    <div className="flex flex-col h-screen bg-[#F7F8FA] overflow-y-auto pb-20">
      
      {/* Header */}
      <nav className="h-[72px] px-8 flex items-center gap-4 sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-30">
         <button onClick={onBack} className="text-[#666] hover:bg-gray-100 p-2 rounded-full transition-colors">
           <ArrowLeft size={24} strokeWidth={1.5} />
         </button>
         <h1 className="text-[20px] font-semibold text-[#111]">Settings</h1>
      </nav>

      <div className="max-w-[760px] mx-auto w-full mt-10 px-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* A. Profile Card */}
        <div className="bg-white rounded-[20px] shadow-[0_10px_40px_rgba(0,0,0,0.06)] overflow-hidden">
           <div className="p-9 flex flex-col md:flex-row items-start gap-8">
              {/* Avatar */}
              <div className="relative group shrink-0 mx-auto md:mx-0">
                 <div className="w-[96px] h-[96px] rounded-full bg-gray-100 overflow-hidden ring-4 ring-white shadow-lg">
                   <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                 </div>
                 <div 
                   onClick={() => fileInputRef.current?.click()}
                   className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-[2px]"
                 >
                    <Camera size={28} className="text-white drop-shadow-md" />
                 </div>
                 <input type="file" ref={fileInputRef} onChange={handleImageUpload} hidden accept="image/png, image/jpeg" />
              </div>

              {/* Fields */}
              <div className="flex-1 w-full space-y-5">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                       <label className="text-[13px] font-medium text-[#666] ml-1">First Name</label>
                       <input 
                         type="text" 
                         value={firstName} 
                         onChange={(e) => { setFirstName(e.target.value); setHasChanges(true); }}
                         className="w-full h-[48px] px-4 rounded-[12px] bg-white border border-[#E5E7EB] text-[#111] font-medium focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder-gray-300 shadow-sm"
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[13px] font-medium text-[#666] ml-1">Last Name</label>
                       <input 
                         type="text" 
                         value={lastName}
                         onChange={(e) => { setLastName(e.target.value); setHasChanges(true); }}
                         className="w-full h-[48px] px-4 rounded-[12px] bg-white border border-[#E5E7EB] text-[#111] font-medium focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder-gray-300 shadow-sm"
                       />
                    </div>
                 </div>
                 <div className="space-y-1.5">
                     <label className="text-[13px] font-medium text-[#666] ml-1">Email Address</label>
                     <div className="relative">
                        <input 
                          type="email" 
                          value={email}
                          readOnly
                          className="w-full h-[48px] px-4 rounded-[12px] bg-[#F9FAFB] border border-[#E5E7EB] text-[#555] font-medium focus:outline-none cursor-not-allowed"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-green-600 font-medium flex items-center gap-1 bg-green-50 px-2 py-1 rounded">
                           <Check size={12} /> Verified
                        </div>
                     </div>
                 </div>
              </div>
           </div>
           
           <div className="px-9 py-5 bg-[#F9FAFB] border-t border-gray-100 flex justify-end">
              <button 
                onClick={handleProfileSave}
                disabled={!hasChanges}
                className={`h-[44px] px-6 rounded-[12px] text-[14px] font-medium transition-all shadow-sm flex items-center gap-2 ${
                  hasChanges 
                  ? 'bg-[#111] hover:bg-black text-white shadow-md transform hover:-translate-y-0.5' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                 Save Changes
              </button>
           </div>
        </div>

        {/* Subscription Section */}
        <div>
           <h2 className="text-[#667] text-[13px] font-semibold tracking-wide uppercase mb-3 pl-1">Subscription</h2>
           <div className="bg-white rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden">
              {loadingSubscription ? (
                 <div className="p-6 text-center text-gray-500">Loading subscription...</div>
              ) : currentSubscription ? (
                 <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                       <div>
                          <h3 className="text-[18px] font-semibold text-[#111] mb-1">
                             {currentSubscription.plan?.name || 'Active Plan'}
                          </h3>
                          <p className="text-[13px] text-[#666]">
                             {currentSubscription.plan?.description || 'Your current subscription plan'}
                          </p>
                       </div>
                       <div className="text-right">
                          <div className="text-[24px] font-bold text-[#111]">
                             {currentSubscription.plan?.amount_formatted || 'Free'}
                          </div>
                          <div className="text-[11px] text-[#888]">
                             / {currentSubscription.plan?.interval || 'month'}
                          </div>
                       </div>
                    </div>
                    
                    {currentSubscription.trial_ends_at && new Date(currentSubscription.trial_ends_at) > new Date() && (
                       <div className="pt-4 border-t border-gray-100">
                          <p className="text-[12px] text-[#666]">
                             Trial ends: {new Date(currentSubscription.trial_ends_at).toLocaleDateString()}
                          </p>
                       </div>
                    )}
                    
                    {currentSubscription.current_period_end && (
                       <div className="pt-2">
                          <p className="text-[12px] text-[#666]">
                             Next billing: {new Date(currentSubscription.current_period_end).toLocaleDateString()}
                          </p>
                       </div>
                    )}
                    
                    {currentSubscription.cancel_at_period_end && (
                       <div className="pt-2">
                          <p className="text-[12px] text-orange-600 flex items-center gap-1">
                             <AlertTriangle size={14} />
                             Subscription will cancel at period end
                          </p>
                       </div>
                    )}
                    
                    <div className="pt-4 border-t border-gray-100 flex gap-2">
                       <button
                          onClick={() => setShowPlanSelector(true)}
                          className="flex-1 px-4 py-2.5 bg-[#111] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#222] transition-colors"
                       >
                          Change Plan
                       </button>
                       
                       {!currentSubscription.cancel_at_period_end ? (
                          <button
                             onClick={async () => {
                                if (window.confirm('Are you sure you want to cancel your subscription? It will remain active until the end of the billing period.')) {
                                   try {
                                      await cancelSubscription();
                                      // Recharger l'abonnement
                                      const updated = await getCurrentSubscription();
                                      setCurrentSubscription(updated);
                                      alert('Subscription will be cancelled at the end of the billing period.');
                                   } catch (error) {
                                      alert('Failed to cancel subscription. Please try again.');
                                   }
                                }
                             }}
                             className="px-4 py-2.5 bg-red-50 text-red-600 text-[13px] font-medium rounded-[8px] hover:bg-red-100 transition-colors"
                          >
                             Cancel
                          </button>
                       ) : (
                          <button
                             onClick={async () => {
                                try {
                                   await resumeSubscription();
                                   // Recharger l'abonnement
                                   const updated = await getCurrentSubscription();
                                   setCurrentSubscription(updated);
                                   alert('Subscription has been resumed.');
                                } catch (error) {
                                   alert('Failed to resume subscription. Please try again.');
                                }
                             }}
                             className="px-4 py-2.5 bg-green-50 text-green-600 text-[13px] font-medium rounded-[8px] hover:bg-green-100 transition-colors"
                          >
                             Resume
                          </button>
                       )}
                    </div>
                 </div>
              ) : (
                 <div className="p-6">
                    <p className="text-[14px] text-[#666] mb-4">No active subscription</p>
                    <button
                       onClick={() => setShowPlanSelector(true)}
                       className="w-full px-4 py-2.5 bg-[#111] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#222] transition-colors"
                    >
                       Choose a Plan
                    </button>
                 </div>
              )}
           </div>
        </div>

        {/* B. App Preferences */}
        <div>
           <h2 className="text-[#667] text-[13px] font-semibold tracking-wide uppercase mb-3 pl-1">App Preferences</h2>
           <div className="bg-white rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden divide-y divide-gray-50">
              
              {/* Notifications */}
              <div className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors cursor-pointer group">
                 <div className="flex items-center gap-5">
                    <div className="w-[44px] h-[44px] rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                       <Bell size={22} strokeWidth={2} />
                    </div>
                    <div>
                       <h3 className="text-[16px] font-medium text-[#111] mb-0.5">Notifications</h3>
                       <p className="text-[13px] text-[#666]">Manage how you receive alerts and summaries</p>
                    </div>
                 </div>
                 <div className="h-[32px] px-4 flex items-center justify-center rounded-full bg-gray-50 text-[#333] text-[13px] font-medium group-hover:bg-white group-hover:shadow-sm transition-all border border-transparent group-hover:border-gray-200">
                    Edit
                 </div>
              </div>

              {/* Privacy */}
              <div onClick={() => setView('privacy')} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors cursor-pointer group">
                 <div className="flex items-center gap-5">
                    <div className="w-[44px] h-[44px] rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                       <Shield size={22} strokeWidth={2} />
                    </div>
                    <div>
                       <h3 className="text-[16px] font-medium text-[#111] mb-0.5">Privacy & Security</h3>
                       <p className="text-[13px] text-[#666]">2FA, active sessions, and data controls</p>
                    </div>
                 </div>
                 <div className="h-[32px] px-4 flex items-center justify-center rounded-full bg-gray-50 text-[#333] text-[13px] font-medium group-hover:bg-white group-hover:shadow-sm transition-all border border-transparent group-hover:border-gray-200">
                    Manage
                 </div>
              </div>

              {/* Google Calendar Integration */}
              <div className="p-6">
                 <div className="flex items-center gap-5 mb-4">
                    <div className="w-[44px] h-[44px] rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                       <Calendar size={22} strokeWidth={2} />
                    </div>
                    <div className="flex-1">
                       <h3 className="text-[16px] font-medium text-[#111] mb-0.5">Google Calendar</h3>
                       <p className="text-[13px] text-[#666]">Sync your meetings from Google Calendar</p>
                    </div>
                 </div>
                 
                 {syncStatus && (
                    <div className={`mb-4 p-3 rounded-lg text-[13px] flex items-center gap-2 ${
                      syncStatus.includes('Success') || syncStatus.includes('connected')
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                    }`}>
                       {syncStatus.includes('Success') || syncStatus.includes('connected') ? (
                          <Check size={16} />
                       ) : (
                          <AlertTriangle size={16} />
                       )}
                       {syncStatus}
                    </div>
                 )}

                 {isCalendarConnected ? (
                    <div className="space-y-3">
                       <div className="flex items-center gap-2 text-[13px] text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                          <Check size={14} />
                          <span>Connected to Google Calendar</span>
                       </div>
                       <div className="flex gap-2">
                          <button
                             onClick={handleSyncCalendar}
                             disabled={isSyncing}
                             className="flex-1 px-4 py-2.5 bg-[#2A66FF] hover:bg-[#1e52e0] text-white text-[13px] font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                             {isSyncing ? (
                                <>
                                   <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                   Syncing...
                                </>
                             ) : (
                                <>
                                   <RefreshCw size={14} />
                                   Sync Now
                                </>
                             )}
                          </button>
                          <button
                             onClick={handleDisconnectGoogleCalendar}
                             className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[13px] font-medium rounded-lg transition-colors flex items-center gap-2"
                          >
                             <X size={14} />
                             Disconnect
                          </button>
                       </div>
                    </div>
                 ) : (
                    <div className="space-y-3">
                       {!isCalendarConfigured && (
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                             <div className="flex items-start gap-3">
                                <AlertTriangle size={18} className="text-blue-600 mt-0.5 shrink-0" />
                                <div className="flex-1">
                                   <div className="text-[14px] font-medium text-blue-800 mb-1">
                                      Configuration Required
                                   </div>
                                   <div className="text-[13px] text-blue-700 leading-relaxed">
                                      Make sure these environment variables are set in your deployment:
                                      <ul className="mt-2 ml-4 list-disc space-y-1">
                                         <li><code className="bg-blue-100 px-1.5 py-0.5 rounded text-[12px]">VITE_GOOGLE_CLIENT_ID</code> (frontend)</li>
                                         <li><code className="bg-blue-100 px-1.5 py-0.5 rounded text-[12px]">GOOGLE_CLIENT_ID</code> (backend)</li>
                                         <li><code className="bg-blue-100 px-1.5 py-0.5 rounded text-[12px]">GOOGLE_CLIENT_SECRET</code> (backend)</li>
                                         <li><code className="bg-blue-100 px-1.5 py-0.5 rounded text-[12px]">GOOGLE_REDIRECT_URI</code> (backend)</li>
                                      </ul>
                                      <div className="mt-2 text-[12px]">
                                         Get credentials from: <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a>
                                      </div>
                                   </div>
                                </div>
                             </div>
                          </div>
                       )}
                       <button
                          onClick={handleConnectGoogleCalendar}
                          className="w-full px-4 py-2.5 bg-[#2A66FF] hover:bg-[#1e52e0] text-white text-[13px] font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!isCalendarConfigured}
                          title={!isCalendarConfigured ? 'VITE_GOOGLE_CLIENT_ID not configured. Check console for details.' : 'Connect to Google Calendar'}
                       >
                          <Calendar size={14} />
                          Connect Google Calendar
                       </button>
                       {!isCalendarConfigured && (
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                             <div className="text-[11px] text-gray-600 mb-1 font-medium">Debug Info:</div>
                             <div className="text-[10px] text-gray-500 space-y-1">
                                <div>VITE_GOOGLE_CLIENT_ID: {import.meta.env.VITE_GOOGLE_CLIENT_ID ? '✓ Set (' + import.meta.env.VITE_GOOGLE_CLIENT_ID.substring(0, 20) + '...)' : '✗ Not set'}</div>
                                <div className="text-[9px] text-gray-400 mt-2">
                                   Note: VITE_ variables must be set at build time. After adding in Railway, you need to redeploy.
                                </div>
                             </div>
                          </div>
                       )}
                    </div>
                 )}
              </div>

              {/* Customize Tyna (New) */}
              <div 
                onClick={() => setView('customize')}
                className="p-6 flex items-center justify-between hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-transparent transition-colors cursor-pointer group relative overflow-hidden"
              >
                 {/* Selection Indicator Line */}
                 <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#3B76FF] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 
                 <div className="flex items-center gap-5">
                    <div className="w-[44px] h-[44px] rounded-full bg-gradient-to-br from-[#3B76FF] to-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-200 group-hover:rotate-12 transition-transform duration-300">
                       <Sparkles size={22} strokeWidth={2} />
                    </div>
                    <div>
                       <h3 className="text-[16px] font-bold text-[#111] mb-0.5 flex items-center gap-2">
                         Customize Tyna 
                         <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 tracking-wide uppercase">New</span>
                       </h3>
                       <p className="text-[13px] text-[#666]">Manage how Tyna behaves in meetings</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2 text-[#3B76FF] text-[14px] font-semibold group-hover:translate-x-1 transition-transform">
                    Configure <ChevronRight size={16} />
                 </div>
              </div>

           </div>
        </div>

        {/* C. Account */}
        <div>
           <h2 className="text-[#667] text-[13px] font-semibold tracking-wide uppercase mb-3 pl-1">Account</h2>
           <div className="bg-white rounded-[20px] shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-gray-100 overflow-hidden divide-y divide-gray-50">
              
              <div className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors cursor-pointer group">
                 <div className="flex items-center gap-5">
                    <div className="w-[44px] h-[44px] rounded-full bg-gray-50 text-gray-600 flex items-center justify-center shrink-0 group-hover:bg-gray-100 transition-colors">
                       <Lock size={22} strokeWidth={2} />
                    </div>
                    <div>
                       <h3 className="text-[16px] font-medium text-[#111] mb-0.5">Change Password</h3>
                       <p className="text-[13px] text-[#666]">Update your login credentials</p>
                    </div>
                 </div>
              </div>

              <div onClick={onLogout} className="p-6 flex items-center justify-between hover:bg-red-50/30 transition-colors cursor-pointer group">
                 <div className="flex items-center gap-5">
                    <div className="w-[44px] h-[44px] rounded-full bg-gray-50 text-gray-600 flex items-center justify-center shrink-0 group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
                       <LogOut size={22} strokeWidth={2} />
                    </div>
                    <div>
                       <h3 className="text-[16px] font-medium text-[#111] group-hover:text-red-600 transition-colors mb-0.5">Log Out</h3>
                       <p className="text-[13px] text-[#666]">Sign out of your account</p>
                    </div>
                 </div>
              </div>

           </div>
        </div>
        
        <div className="flex items-center justify-center gap-4 text-gray-400 pb-10 pt-4">
           <span className="text-[12px] hover:text-gray-600 cursor-pointer">Terms of Service</span>
           <span className="w-1 h-1 rounded-full bg-gray-300"></span>
           <span className="text-[12px] hover:text-gray-600 cursor-pointer">Privacy Policy</span>
           <span className="w-1 h-1 rounded-full bg-gray-300"></span>
           <span className="text-[12px]">v2.5.0</span>
        </div>

      </div>
    </div>
  );

  return (
    <>
      {view === 'main' && renderMainSettings()}
      {view === 'customize' && renderCustomizeTyna()}
      {view === 'privacy' && renderPrivacy()}
      
      {/* Plan Selector Modal */}
      {showPlanSelector && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowPlanSelector(false)}>
          <div className="bg-white rounded-[16px] p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[24px] font-bold text-[#111]">Choose a Plan</h2>
              <button
                onClick={() => setShowPlanSelector(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {availablePlans.length > 0 ? (
                availablePlans.map((plan) => {
                  const isCurrentPlan = currentSubscription?.plan?.id === plan.id;
                  const isStarter = plan.name === 'Starter';
                  const isPlus = plan.name === 'Plus';
                  const isPro = plan.name === 'Pro';
                  
                  return (
                    <div
                      key={plan.id}
                      className={`border rounded-[12px] p-4 ${
                        isCurrentPlan
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <h3 className="text-[18px] font-bold mb-2">{plan.name}</h3>
                      <div className="text-[32px] font-bold mb-2">
                        {plan.amount_formatted}
                        <span className="text-[14px] text-gray-500">/{plan.interval}</span>
                      </div>
                      <p className="text-[13px] text-gray-600 mb-4">{plan.description}</p>
                      
                      {isStarter && isCurrentPlan ? (
                        <div className="w-full px-4 py-2 bg-gray-100 text-gray-600 text-[13px] font-medium rounded-[8px] text-center">
                          Current plan
                        </div>
                      ) : isStarter ? (
                        <div className="w-full px-4 py-2 bg-gray-100 text-gray-600 text-[13px] font-medium rounded-[8px] text-center">
                          Current plan
                        </div>
                      ) : isPlus ? (
                        <button
                          onClick={async () => {
                            try {
                              const { checkout_url } = await createSubscription(
                                plan.id,
                                `${window.location.origin}/dashboard?subscription=success`,
                                `${window.location.origin}/settings?subscription=cancelled`
                              );
                              window.location.href = checkout_url;
                            } catch (error) {
                              console.error('Failed to create subscription:', error);
                              const errorMessage = error instanceof Error ? error.message : 'Failed to start subscription. Please try again.';
                              alert(errorMessage);
                            }
                          }}
                          className="w-full px-4 py-2 bg-[#111] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#222] transition-colors"
                        >
                          {currentSubscription ? 'Upgrade' : 'Subscribe'}
                        </button>
                      ) : isPro ? (
                        <button
                          onClick={async () => {
                            try {
                              const { checkout_url } = await createSubscription(
                                plan.id,
                                `${window.location.origin}/dashboard?subscription=success`,
                                `${window.location.origin}/settings?subscription=cancelled`
                              );
                              window.location.href = checkout_url;
                            } catch (error) {
                              console.error('Failed to create subscription:', error);
                              const errorMessage = error instanceof Error ? error.message : 'Failed to start subscription. Please try again.';
                              alert(errorMessage);
                            }
                          }}
                          className="w-full px-4 py-2 bg-[#111] text-white text-[13px] font-medium rounded-[8px] hover:bg-[#222] transition-colors"
                        >
                          {currentSubscription ? 'Upgrade' : 'Subscribe'}
                        </button>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="col-span-3 text-center py-8 text-gray-500">
                  Loading plans...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};