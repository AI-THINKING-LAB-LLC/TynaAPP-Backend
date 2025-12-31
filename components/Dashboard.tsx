
import React, { useState, useRef, useEffect } from 'react';
import { Search, Calendar, Play, MoreHorizontal, Link2, RefreshCw, Trash2, Clock, CalendarDays, BarChart3, Crown, ChevronDown, Check } from 'lucide-react';
import { Meeting, UserProfile } from '../types';
import { isToday, isYesterday, isThisWeek, parseISO } from 'date-fns';
import { 
  isGoogleCalendarConnected, 
  fetchGoogleCalendarEvents
} from '../services/googleCalendarService';
import { getCurrentSubscription, CurrentSubscription, createSubscription, fetchPlans } from '../services/planService';
// Google Calendar sync will be implemented via Laravel API
// import { syncGoogleCalendarEvents } from '../services/supabaseService';

interface DashboardProps {
  onStartMeeting: () => void;
  onViewSummary: (meeting: Meeting) => void;
  onOpenSettings: () => void;
  onOpenAnalytics: () => void;
  onDeleteMeeting: (id: string) => void;
  pastMeetings: Meeting[];
  userProfile: UserProfile | null;
  onRefreshMeetings?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  onStartMeeting, 
  onViewSummary, 
  onOpenSettings,
  onOpenAnalytics,
  onDeleteMeeting,
  pastMeetings, 
  userProfile,
  onRefreshMeetings
}) => {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [showPlanDropdown, setShowPlanDropdown] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const planDropdownRef = useRef<HTMLDivElement>(null);

  // Load current subscription and available plans
  useEffect(() => {
    const loadData = async () => {
      setLoadingSubscription(true);
      try {
        const subscription = await getCurrentSubscription();
        setCurrentSubscription(subscription);
        
        // Load available plans for dropdown
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

  // Close plan dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (planDropdownRef.current && !planDropdownRef.current.contains(event.target as Node)) {
        setShowPlanDropdown(false);
      }
    };

    if (showPlanDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPlanDropdown]);

  // Check Google Calendar connection status
  useEffect(() => {
    const checkConnection = async () => {
      const connected = await isGoogleCalendarConnected();
      console.log('[Dashboard] Google Calendar connected:', connected);
      setIsCalendarConnected(connected);
    };
    checkConnection();
    
    // Refresh connection status periodically
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle Google Calendar sync
  const handleSyncGoogleCalendar = async () => {
    if (!isCalendarConnected) {
      onOpenSettings();
      return;
    }

    setIsSyncingCalendar(true);
    try {
      const events = await fetchGoogleCalendarEvents();
      if (events.length > 0) {
        // TODO: Implement Google Calendar sync via Laravel API
        // const synced = await syncGoogleCalendarEvents(events);
        // For now, just refresh meetings
        if (onRefreshMeetings) {
          onRefreshMeetings();
        }
        alert(`Found ${events.length} event(s) from Google Calendar. Sync via Laravel API coming soon!`);
      } else {
        alert('No upcoming events found in Google Calendar');
      }
    } catch (error) {
      console.error('Error syncing calendar:', error);
      alert('Failed to sync calendar. Please try again.');
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
         setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Extract first name for greeting
  const firstName = userProfile?.fullName ? userProfile.fullName.split(' ')[0] : 'User';
  // Use avatar or fallback
  const avatarUrl = userProfile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName}`;

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDeleteMeeting(id);
    setActiveMenuId(null);
  };

  const renderMeetingRow = (meeting: Meeting) => {
    const isMenuOpen = activeMenuId === meeting.id;
    const isScheduled = meeting.status === 'scheduled';

    const handleMenuToggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      setActiveMenuId(isMenuOpen ? null : meeting.id);
    };

    return (
      <div 
        key={meeting.id}
        onClick={() => !isScheduled && onViewSummary(meeting)}
        className={`group relative h-[56px] w-full rounded-[12px] hover:bg-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center px-4 transition-all duration-200 border border-transparent hover:border-gray-100 ${!isScheduled ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {/* Title Column */}
        <div className="flex-1 flex items-center gap-3 overflow-hidden">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isScheduled ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
               <span className="text-[12px] font-bold">
                 {isScheduled ? <CalendarDays size={14} /> : meeting.title.charAt(0)}
               </span>
            </div>
            <div className="flex flex-col overflow-hidden">
               <span className="text-[#222] text-[15px] font-medium tracking-tight truncate group-hover:text-[#1E63FF] transition-colors">
                 {meeting.title}
               </span>
               <span className="text-[#888] text-[11px] font-normal truncate">
                 {meeting.participantCount} participant{meeting.participantCount !== 1 ? 's' : ''} • {meeting.duration}
               </span>
            </div>
        </div>

        {/* Right Info Column */}
        <div className="flex items-center justify-end shrink-0 ml-4">
             {isScheduled ? (
                <>
                  {/* Scheduled time and date */}
                  <div className="text-right mr-3 flex flex-col items-end gap-0.5">
                      <div className="flex items-center gap-1.5 text-[#666]">
                          <Clock size={12} />
                          <span className="text-[13px] font-medium">
                              {meeting.time}
                          </span>
                      </div>
                      <span className="text-[11px] text-[#888]">
                          {meeting.date}
                      </span>
                  </div>
                  <button 
                    onClick={onStartMeeting}
                    className="px-3 py-1.5 bg-[#111] hover:bg-black text-white text-[12px] font-medium rounded-full shadow-sm transition-transform active:scale-95 flex items-center gap-1.5"
                  >
                    <Play size={10} fill="currentColor" /> Start
                  </button>
                </>
             ) : (
                <>
                  {/* Time */}
                  <div className="w-[80px] text-right mr-3 flex items-center justify-end gap-1.5 text-[#888]">
                      <Clock size={13} />
                      <span className="text-[13px] font-normal">
                          {meeting.time}
                      </span>
                  </div>

                  {/* Action Menu Trigger */}
                  <div className="w-[24px] flex justify-center relative">
                      <button 
                        onClick={handleMenuToggle}
                        className={`p-1 rounded-[6px] text-[#999] hover:text-[#555] hover:bg-[rgba(0,0,0,0.05)] transition-all duration-150 transform ${isMenuOpen ? 'opacity-100 bg-[rgba(0,0,0,0.05)] text-[#555]' : 'opacity-0 group-hover:opacity-100 group-hover:-translate-x-0.5'}`}
                      >
                          <MoreHorizontal size={20} />
                      </button>

                      {isMenuOpen && (
                          <div 
                            ref={menuRef}
                            onClick={(e) => e.stopPropagation()} 
                            className="absolute top-[32px] right-0 w-[180px] bg-white shadow-[0_8px_28px_rgba(0,0,0,0.12)] border border-[rgba(0,0,0,0.08)] rounded-[12px] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 origin-top-right cursor-default"
                          >
                              <button className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-[rgba(0,0,0,0.04)] transition-colors text-[13px] text-[#333] font-medium">
                                <Link2 size={15} />
                                Copy link
                              </button>
                              <button className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-[rgba(0,0,0,0.04)] transition-colors text-[13px] text-[#333] font-medium">
                                <RefreshCw size={15} />
                                Regenerate
                              </button>
                              <div className="h-[1px] bg-gray-100 my-1"></div>
                              <button 
                                  onClick={(e) => handleDelete(e, meeting.id)}
                                  className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-red-50 transition-colors text-[13px] text-[#E54848] font-medium"
                              >
                                <Trash2 size={15} />
                                Delete
                              </button>
                          </div>
                      )}
                  </div>
                </>
             )}
        </div>
      </div>
    );
  };

  // Filter meetings by search query
  const filteredMeetings = pastMeetings.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group meetings
  const upcomingMeetings: Meeting[] = [];
  const todayMeetings: Meeting[] = [];
  const yesterdayMeetings: Meeting[] = [];
  const olderMeetings: Meeting[] = [];

  const sortedMeetings = [...filteredMeetings].sort((a, b) => {
      // Basic safeguard, assumes fetch returns sorted
      return 0; 
  });

  sortedMeetings.forEach(meeting => {
      // CRITICAL: Scheduled meetings MUST go to Upcoming Schedule, never to History
      if (meeting.status === 'scheduled') {
          console.log(`[Dashboard] Meeting "${meeting.title}" is scheduled, adding to Upcoming Schedule`);
          upcomingMeetings.push(meeting);
          return; // IMPORTANT: return early to prevent adding to history
      }

      // Only recorded/ended meetings go to history sections
      // Double-check: if it's not scheduled, it must be recorded
      if (meeting.status !== 'scheduled') {
          const d = meeting.date.toLowerCase();
          if (d === 'today' || d.includes(new Date().toLocaleDateString())) {
              todayMeetings.push(meeting);
          } else if (d === 'yesterday') {
              yesterdayMeetings.push(meeting);
          } else {
              olderMeetings.push(meeting);
          }
      }
  });
  
  // Sort upcoming meetings by scheduled time (earliest first)
  upcomingMeetings.sort((a, b) => {
      if (a.scheduledAt && b.scheduledAt) {
          return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
      }
      return 0;
  });

  return (
    <div className="h-screen overflow-y-auto bg-[#F7F8FA] font-sans text-[#111] pb-20 selection:bg-blue-100 selection:text-blue-900">
      
      {/* Top Nav */}
      <nav className="h-[72px] px-8 flex items-center justify-between sticky top-0 bg-[#F7F8FA]/90 backdrop-blur-md z-30 transition-all border-b border-transparent">
        <div className="w-[120px] font-bold text-xl tracking-tight text-[#2E6BFF]">
           Tyna.
        </div>

        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999] group-focus-within:text-[#2E6BFF] transition-colors duration-200">
            <Search size={18} strokeWidth={2} />
          </div>
          <input 
            type="text" 
            placeholder="Search meetings..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-[480px] h-[40px] pl-11 pr-4 rounded-[20px] bg-white border border-[#E6E9EE] text-[14px] text-[#111] placeholder-[#999] focus:outline-none focus:border-[#2E6BFF]/30 focus:shadow-[0_0_0_3px_rgba(47,90,255,0.15)] transition-all duration-200 shadow-sm hover:shadow-md"
          />
        </div>

        <div className="flex items-center justify-end gap-3">
           <button
             onClick={onOpenAnalytics}
             className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
             title="Analytics"
           >
             <BarChart3 size={18} className="text-[#2E6BFF]" />
           </button>
           
           {/* Plan Dropdown Menu */}
           {!loadingSubscription && (
             <div className="relative" ref={planDropdownRef}>
               <button
                 onClick={() => setShowPlanDropdown(!showPlanDropdown)}
                 className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all hover:border-[#2E6BFF]/30 group"
               >
                 <Crown size={14} className="text-[#2E6BFF]" />
                 <span className="text-[12px] font-medium text-gray-700">
                   {currentSubscription?.plan?.name || 'Starter'}
                 </span>
                 <ChevronDown 
                   size={14} 
                   className={`text-gray-500 transition-transform duration-200 ${showPlanDropdown ? 'rotate-180' : ''}`}
                 />
               </button>
               
               {showPlanDropdown && (
                 <div className="absolute top-full right-0 mt-2 w-[280px] bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                   {/* Header */}
                   <div className="px-4 py-3 bg-gradient-to-r from-[#2E6BFF]/5 to-blue-50 border-b border-gray-100">
                     <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                       Current Plan
                     </div>
                     <div className="flex items-center justify-between">
                       <div>
                         <div className="text-[16px] font-bold text-gray-900">
                           {currentSubscription?.plan?.name || 'Starter'}
                         </div>
                         <div className="text-[12px] text-gray-600 mt-0.5">
                           {currentSubscription?.plan?.amount_formatted || 'Free'}/{currentSubscription?.plan?.interval || 'month'}
                         </div>
                       </div>
                       <Crown size={20} className="text-[#2E6BFF]" />
                     </div>
                   </div>
                   
                   {/* Plans List */}
                   <div className="max-h-[320px] overflow-y-auto">
                     {availablePlans.map((plan) => {
                       const isCurrentPlan = currentSubscription?.plan?.id === plan.id;
                       const isStarter = plan.name === 'Starter';
                       
                       return (
                         <button
                           key={plan.id}
                           onClick={async () => {
                             if (isCurrentPlan || isStarter) {
                               setShowPlanDropdown(false);
                               return;
                             }
                             
                             try {
                               const successUrl = `${window.location.origin}/dashboard?subscription=success`;
                               const cancelUrl = `${window.location.origin}/dashboard?subscription=cancelled`;
                               const { checkout_url } = await createSubscription(plan.id, successUrl, cancelUrl);
                               window.location.href = checkout_url;
                             } catch (error) {
                               console.error('Failed to create subscription:', error);
                               const errorMessage = error instanceof Error ? error.message : 'Failed to upgrade. Please try again.';
                               alert(errorMessage);
                               setShowPlanDropdown(false);
                             }
                           }}
                           className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                             isCurrentPlan ? 'bg-blue-50' : ''
                           }`}
                         >
                           <div className="flex items-center justify-between">
                             <div className="flex-1">
                               <div className="flex items-center gap-2">
                                 <div className={`text-[14px] font-semibold ${isCurrentPlan ? 'text-blue-700' : 'text-gray-900'}`}>
                                   {plan.name}
                                 </div>
                                 {isCurrentPlan && (
                                   <Check size={14} className="text-blue-600" />
                                 )}
                               </div>
                               <div className="text-[12px] text-gray-500 mt-1">
                                 {plan.description}
                               </div>
                               <div className="flex items-baseline gap-1 mt-2">
                                 <span className={`text-[16px] font-bold ${isCurrentPlan ? 'text-blue-700' : 'text-gray-900'}`}>
                                   {plan.amount_formatted}
                                 </span>
                                 <span className="text-[11px] text-gray-500">/{plan.interval}</span>
                               </div>
                             </div>
                             {!isCurrentPlan && !isStarter && (
                               <div className="ml-3 px-3 py-1.5 bg-[#2E6BFF] text-white text-[11px] font-semibold rounded-md hover:bg-[#2563EB] transition-colors whitespace-nowrap">
                                 Upgrade
                               </div>
                             )}
                           </div>
                         </button>
                       );
                     })}
                   </div>
                   
                   {/* Footer */}
                   <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                     <button
                       onClick={() => {
                         setShowPlanDropdown(false);
                         // Navigate to settings or open plan selector
                         window.location.href = `${window.location.origin}/settings`;
                       }}
                       className="text-[11px] text-gray-600 hover:text-[#2E6BFF] transition-colors"
                     >
                       View all plans →
                     </button>
                   </div>
                 </div>
               )}
             </div>
           )}

           <div 
             onClick={onOpenSettings}
             className="w-[32px] h-[32px] rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 overflow-hidden ring-2 ring-white shadow-sm cursor-pointer hover:shadow-md transition-shadow active:scale-95 shrink-0"
           >
             <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
           </div>
        </div>
      </nav>

      {/* Hero Banner */}
      <div className="max-w-4xl mx-auto px-6 mt-10 relative">
        <div className="h-[180px] w-full rounded-[24px] relative overflow-hidden shadow-[0_8px_32px_rgba(46,107,255,0.12)] group">
           <div className="absolute inset-0 bg-gradient-to-r from-[#2E6BFF] to-[#1E40AF]"></div>
           <div className="absolute top-[-50%] right-[-10%] w-[400px] h-[400px] bg-white opacity-[0.1] blur-[60px] rounded-full pointer-events-none"></div>
           
           <div className="relative z-10 h-full flex flex-col justify-center px-10 items-start">
              <h1 className="text-white text-[22px] font-semibold tracking-tight mb-2">
                Good morning, {firstName}
              </h1>
              <p className="text-blue-100 text-[14px] font-medium mb-6">
                You have {upcomingMeetings.length} upcoming meetings today. Tyna is ready.
              </p>
              
              <div className="flex items-center gap-3">
                <button 
                    onClick={onStartMeeting}
                    className="h-[40px] px-5 rounded-[20px] bg-white text-[#1E63FF] text-[14px] font-semibold shadow-lg hover:shadow-xl flex items-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                >
                  <Play size={14} fill="currentColor" />
                  Start Listening
                </button>
                {isCalendarConnected && (
                  <button 
                      onClick={handleSyncGoogleCalendar}
                      disabled={isSyncingCalendar}
                      className="h-[40px] px-4 rounded-[20px] bg-white/20 hover:bg-white/30 text-white text-[14px] font-medium shadow-lg hover:shadow-xl flex items-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Sync Google Calendar"
                  >
                    {isSyncingCalendar ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Syncing...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={14} />
                        Sync Calendar
                      </>
                    )}
                  </button>
                )}
              </div>
           </div>
        </div>
      </div>

      {/* Meeting List */}
      <div className="max-w-4xl mx-auto px-6 mt-12 pb-20 space-y-10">

        {/* Upcoming Section - Simple Model Like Project Kickoff */}
        {upcomingMeetings.length > 0 && (
          <div>
              <h2 className="text-[#666] text-[12px] font-semibold uppercase tracking-wider mb-4 pl-2 flex items-center gap-2">
                 <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                 Upcoming Schedule
              </h2>
              <div className="space-y-2">
                  {upcomingMeetings.map(m => renderMeetingRow(m))}
              </div>
          </div>
        )}
        
        {todayMeetings.length > 0 && (
          <div>
              <h2 className="text-[#888] text-[12px] font-semibold uppercase tracking-wider mb-4 pl-2">Today's History</h2>
              <div className="space-y-2">
                  {todayMeetings.map(m => renderMeetingRow(m))}
              </div>
          </div>
        )}

        {yesterdayMeetings.length > 0 && (
           <div>
             <h2 className="text-[#888] text-[12px] font-semibold uppercase tracking-wider mb-4 pl-2">Yesterday</h2>
             <div className="space-y-2">
                {yesterdayMeetings.map(m => renderMeetingRow(m))}
             </div>
           </div>
        )}
        
        {olderMeetings.length > 0 && (
           <div>
             <h2 className="text-[#888] text-[12px] font-semibold uppercase tracking-wider mb-4 pl-2">Previous 30 Days</h2>
             <div className="space-y-2">
                {olderMeetings.map(m => renderMeetingRow(m))}
             </div>
           </div>
        )}

        {filteredMeetings.length === 0 && (
           <div className="text-center py-20">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                 <Calendar size={24} />
              </div>
              <p className="text-gray-500 font-medium">{pastMeetings.length === 0 ? "No meetings recorded yet." : "No meetings match your search."}</p>
              <p className="text-gray-400 text-sm mt-1">{pastMeetings.length === 0 ? "Start listening to build your history." : "Try a different keyword."}</p>
           </div>
        )}

      </div>
    </div>
  );
};