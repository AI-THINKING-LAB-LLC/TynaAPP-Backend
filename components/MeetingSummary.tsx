
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Calendar, Search, Play, Link2, FileText, MessageSquare, Check, Mail } from 'lucide-react';
import { Meeting, ChatMessage } from '../types';
import { generateMeetingChatResponse, generateMeetingSummary, generateFollowUpEmail } from '../services/openaiService';
// import { updateMeetingNotes } from '../services/laravelDataService';

interface MeetingSummaryProps {
  meeting: Meeting;
  onBack: () => void;
  onStartMeeting: () => void;
  onOpenSettings: () => void;
  onUpdateMeeting: (id: string, updates: Partial<Meeting>) => void;
}

// Consistent color generator
const getSpeakerColor = (speaker: string) => {
  const colors = ['#6C63FF', '#FF6584', '#3B76FF', '#38B2AC', '#F6AD55'];
  let hash = 0;
  for (let i = 0; i < speaker.length; i++) {
    hash = speaker.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const MeetingSummary: React.FC<MeetingSummaryProps> = ({ 
  meeting, 
  onBack, 
  onStartMeeting, 
  onOpenSettings,
  onUpdateMeeting
}) => {
  // Sidebar state: 'closed', 'transcript', or 'chat'
  const [sidebarMode, setSidebarMode] = useState<'closed' | 'transcript' | 'chat'>('closed');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [notes, setNotes] = useState(meeting.userNotes || '');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryGenerated, setSummaryGenerated] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Generate automatic summary on mount if notes are empty and transcript exists
  useEffect(() => {
    const generateAutoSummary = async () => {
      // Only generate if:
      // 1. Notes are empty (no user notes and no existing summary)
      // 2. Transcript has content
      // 3. Summary hasn't been generated yet
      const hasNoNotes = !meeting.userNotes || meeting.userNotes.trim() === '';
      if (hasNoNotes && meeting.transcript.length > 0 && !summaryGenerated && !isGeneratingSummary) {
        setIsGeneratingSummary(true);
        try {
          const summaryData = await generateMeetingSummary(meeting.transcript);
          if (summaryData.summary) {
            // Format the summary nicely
            const formattedSummary = `📝 Meeting Summary\n\n${summaryData.summary}\n\n${summaryData.actionItems.length > 0 ? `✅ Action Items:\n${summaryData.actionItems.map(item => `• ${item}`).join('\n')}\n` : ''}`;
            setNotes(formattedSummary);
            setSummaryGenerated(true);
            // Auto-save the generated summary
            await updateMeetingNotes(meeting.id, formattedSummary);
            onUpdateMeeting(meeting.id, { userNotes: formattedSummary });
          }
        } catch (error) {
          console.error('Failed to generate summary:', error);
        } finally {
          setIsGeneratingSummary(false);
        }
      }
    };

    generateAutoSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting.id, meeting.transcript.length]);

  // Scroll to bottom of chat when new message arrives
  useEffect(() => {
    if (sidebarMode === 'chat' && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, sidebarMode]);

  // Update notes if meeting changes from outside (rare but good practice)
  useEffect(() => {
    setNotes(meeting.userNotes || '');
    // Reset summary generated flag when meeting changes
    if (meeting.userNotes && meeting.userNotes.trim() !== '') {
      setSummaryGenerated(true);
    } else {
      setSummaryGenerated(false);
    }
  }, [meeting.id, meeting.userNotes]);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setChatInput('');
    
    // Open chat sidebar if not already open
    setSidebarMode('chat');
    
    // Add user message
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: userText };
    setChatHistory(prev => [...prev, userMsg]);
    setIsTyping(true);

    // Call API
    const responseText = await generateMeetingChatResponse(meeting.transcript, userText);
    
    setIsTyping(false);
    setChatHistory(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: responseText }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/meeting/${meeting.id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleFollowUpEmail = async () => {
    setIsGeneratingEmail(true);
    try {
      // Générer l'email de suivi avec l'IA
      const emailData = await generateFollowUpEmail(meeting.transcript, meeting.title);
      
      // Extraire les emails du transcript si l'IA n'en a pas trouvé
      const transcriptText = meeting.transcript.map(t => t.text).join(' ');
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const foundEmails = [...new Set(transcriptText.match(emailRegex) || [])];
      const allEmails = emailData.emails.length > 0 ? emailData.emails : foundEmails;
      
      // Construire l'URL Gmail avec tous les paramètres
      // Utiliser le premier email comme destinataire principal, les autres en CC
      const toEmail = allEmails.length > 0 ? allEmails[0] : '';
      const ccEmails = allEmails.length > 1 ? allEmails.slice(1).join(',') : '';
      
      const subject = encodeURIComponent(emailData.subject);
      const body = encodeURIComponent(emailData.body);
      
      // URL Gmail compose avec tous les paramètres
      let gmailUrl = 'https://mail.google.com/mail/?view=cm&fs=1';
      if (toEmail) {
        gmailUrl += `&to=${encodeURIComponent(toEmail)}`;
      }
      if (ccEmails) {
        gmailUrl += `&cc=${encodeURIComponent(ccEmails)}`;
      }
      if (subject) {
        gmailUrl += `&su=${subject}`;
      }
      if (body) {
        gmailUrl += `&body=${body}`;
      }
      
      // Ouvrir Gmail dans un nouvel onglet
      window.open(gmailUrl, '_blank');
    } catch (error) {
      console.error('Error generating follow-up email:', error);
      alert('Erreur lors de la génération de l\'email. Veuillez réessayer.');
    } finally {
      setIsGeneratingEmail(false);
    }
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value;
    setNotes(newNotes);
    // Debounce save or save immediately? For demo, simple is better, 
    // but in real app use debounce. We'll update state immediately though.
  };

  const handleNoteBlur = async () => {
      // Save on blur (focus lost)
      if (notes !== meeting.userNotes) {
          await updateMeetingNotes(meeting.id, notes);
          onUpdateMeeting(meeting.id, { userNotes: notes });
      }
  };

  return (
    <div className="h-screen bg-white font-sans text-[#111] overflow-hidden flex flex-col selection:bg-blue-100 selection:text-blue-900">
      
      {/* 2.1 TOP NAVIGATION AREA */}
      <nav className="h-[72px] px-6 flex items-center justify-between shrink-0">
         {/* Left Cluster */}
         <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full text-[#666] transition-colors">
              <ArrowLeft size={24} strokeWidth={1.5} />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full text-[#666] transition-colors">
              <ArrowRight size={24} strokeWidth={1.5} />
            </button>
         </div>

         {/* Center Search */}
         <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999] group-focus-within:text-[#2E6BFF] transition-colors">
               <Search size={18} strokeWidth={2} />
            </div>
            <input 
              type="text" 
              placeholder="Search or ask anything..." 
              className="w-[480px] h-[40px] pl-11 pr-12 rounded-[20px] bg-[#F2F4F7] text-[14px] text-[#111] placeholder-[#999] focus:outline-none focus:bg-white focus:border focus:border-[#2E6BFF]/30 focus:shadow-[0_0_0_3px_rgba(47,90,255,0.15)] transition-all"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
               <span className="text-[10px] text-[#999] bg-white px-1.5 py-0.5 rounded border border-gray-200">Ctrl</span>
               <span className="text-[10px] text-[#999] bg-white px-1.5 py-0.5 rounded border border-gray-200">K</span>
            </div>
         </div>

         {/* Right Cluster */}
         <div className="flex items-center gap-5">
            <button 
              onClick={onStartMeeting}
              className="h-[36px] px-5 bg-gradient-to-b from-[#E6F0FF] to-[#D6E6FF] hover:from-[#dbe9ff] hover:to-[#cce0ff] text-[#2A66FF] text-[13px] font-semibold rounded-[18px] border border-[#BFD6FF] shadow-sm transition-all"
            >
              Start Tyna
            </button>
            <div 
              onClick={onOpenSettings}
              className="w-[32px] h-[32px] rounded-full bg-blue-100 overflow-hidden cursor-pointer ring-2 ring-transparent hover:ring-blue-100 transition-all"
            >
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Profile" className="w-full h-full object-cover" />
            </div>
         </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 relative flex overflow-hidden">
         
         {/* Center Document Area */}
         <div className="flex-1 flex flex-col items-center pt-10 px-8 overflow-y-auto pb-40 scroll-smooth">
            
            {/* 2.2 MEETING HEADER SECTION */}
            <div className="w-full max-w-[800px] mb-8 relative">
               <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                     <input 
                       type="text" 
                       defaultValue={meeting.title}
                       className="text-[24px] font-semibold text-[#111] tracking-tight bg-transparent border-none focus:outline-none focus:ring-0 w-full placeholder-gray-300"
                       placeholder="Untitled Session"
                     />
                     <div className="flex items-center gap-2 text-[#666] text-[14px]">
                        <Calendar size={14} className="text-[#2A66FF]" />
                        <span>{meeting.date || 'Tue, Nov 25'}</span>
                     </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <button 
                       onClick={handleFollowUpEmail}
                       disabled={isGeneratingEmail}
                       className={`h-[32px] px-4 text-[13px] font-medium rounded-[14px] flex items-center gap-2 transition-all ${isGeneratingEmail ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#E3EEFF] hover:bg-[#D0E1FF] text-[#2A66FF]'}`}
                     >
                        {isGeneratingEmail ? (
                          <>
                            <div className="w-4 h-4 border-2 border-[#2A66FF] border-t-transparent rounded-full animate-spin"></div>
                            <span>Génération...</span>
                          </>
                        ) : (
                          <>
                            <Mail size={16} />
                            <span>Follow up email</span>
                          </>
                        )}
                     </button>
                     <button 
                       onClick={handleShare}
                       className={`h-[32px] px-4 text-[13px] font-medium rounded-[14px] flex items-center gap-2 transition-all ${isCopied ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-[#E3EEFF] hover:bg-[#D0E1FF] text-[#2A66FF]'}`}
                     >
                        {isCopied ? <Check size={16} /> : <Link2 size={16} />}
                        {isCopied ? 'Copied!' : 'Share'}
                     </button>
                  </div>
               </div>
            </div>

            {/* 2.3 MAIN NOTES AREA */}
            <div className="w-full max-w-[800px] relative">
               {isGeneratingSummary && (
                 <div className="absolute top-4 right-4 flex items-center gap-2 text-[#2A66FF] text-[14px] bg-blue-50 px-3 py-1.5 rounded-full">
                   <div className="w-4 h-4 border-2 border-[#2A66FF] border-t-transparent rounded-full animate-spin"></div>
                   <span>Generating summary...</span>
                 </div>
               )}
               <textarea 
                 value={notes}
                 onChange={handleNoteChange}
                 onBlur={handleNoteBlur}
                 placeholder={isGeneratingSummary ? "Generating summary from transcript..." : "Write your notes here..."}
                 className="w-full h-[60vh] resize-none bg-transparent text-[16px] leading-[1.6] text-[#333] placeholder-[#999] focus:outline-none focus:ring-0 font-normal"
                 spellCheck={false}
               ></textarea>
            </div>
         </div>

         {/* Sliding Sidebar (Transcript or Chat) */}
         <div 
           className={`absolute top-0 right-0 h-full w-[360px] bg-white border-l border-gray-100 shadow-[-10px_0_40px_rgba(0,0,0,0.03)] transform transition-transform duration-300 ease-in-out z-20 flex flex-col ${sidebarMode !== 'closed' ? 'translate-x-0' : 'translate-x-full'}`}
         >
             <div className="h-[60px] flex items-center justify-between px-5 border-b border-gray-50 shrink-0">
                <div className="flex gap-4">
                   <button 
                     onClick={() => setSidebarMode('transcript')}
                     className={`text-[14px] font-medium pb-1 transition-colors ${sidebarMode === 'transcript' ? 'text-[#2A66FF] border-b-2 border-[#2A66FF]' : 'text-[#666] hover:text-[#333]'}`}
                   >
                     Transcript
                   </button>
                   <button 
                     onClick={() => setSidebarMode('chat')}
                     className={`text-[14px] font-medium pb-1 transition-colors ${sidebarMode === 'chat' ? 'text-[#2A66FF] border-b-2 border-[#2A66FF]' : 'text-[#666] hover:text-[#333]'}`}
                   >
                     Chat AI
                   </button>
                </div>
                <button onClick={() => setSidebarMode('closed')} className="text-[#999] hover:text-[#333]">Close</button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-5 bg-[#F9FAFB]">
                
                {/* Transcript View */}
                {sidebarMode === 'transcript' && (
                  <div className="space-y-6">
                    {meeting.transcript.map(t => (
                      <div key={t.id} className="group">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-[13px] font-semibold text-[#333]" style={{ color: getSpeakerColor(t.speaker) }}>{t.speaker}</span>
                            <span className="text-[11px] text-[#999] opacity-0 group-hover:opacity-100 transition-opacity">{t.timestamp}</span>
                        </div>
                        <p className="text-[14px] text-[#555] leading-relaxed">{t.text}</p>
                      </div>
                    ))}
                    {meeting.transcript.length === 0 && <p className="text-gray-400 text-sm text-center mt-10">No transcript available.</p>}
                  </div>
                )}

                {/* Chat View */}
                {sidebarMode === 'chat' && (
                  <div className="space-y-4">
                    {chatHistory.length === 0 && (
                      <div className="text-center mt-10">
                        <MessageSquare className="mx-auto text-blue-200 mb-2" size={32} />
                        <p className="text-gray-400 text-sm">Ask questions about the meeting to get started.</p>
                      </div>
                    )}
                    {chatHistory.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-[14px] leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-[#2A66FF] text-white' : 'bg-white text-[#333] border border-gray-100'}`}>
                            {msg.text}
                          </div>
                      </div>
                    ))}
                    {isTyping && (
                       <div className="flex justify-start">
                          <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex gap-1.5 shadow-sm">
                             <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                             <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                             <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                          </div>
                       </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}

             </div>
         </div>

      </div>

      {/* 3. BOTTOM FLOATING AI BAR */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30 animate-in slide-in-from-bottom-6 duration-500">
         <div className="h-[56px] pl-3 pr-2 bg-white rounded-[28px] shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-gray-100/50 flex items-center gap-3">
            
            {/* Left Actions */}
            <div className="flex items-center gap-2">
               <button 
                 onClick={onStartMeeting}
                 className="h-[36px] px-4 bg-[#F2F4F6] hover:bg-[#E5E7EB] text-[#555] text-[13px] font-medium rounded-[18px] flex items-center gap-2 transition-colors"
               >
                  <Play size={12} fill="currentColor" />
                  Resume
               </button>
               <button 
                 onClick={() => setSidebarMode(sidebarMode === 'transcript' ? 'closed' : 'transcript')}
                 className={`h-[36px] px-4 bg-[#F2F4F6] hover:bg-[#E5E7EB] text-[#555] text-[13px] font-medium rounded-[18px] flex items-center gap-2 transition-colors ${sidebarMode === 'transcript' ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-100' : ''}`}
               >
                  <FileText size={14} />
                  Transcript
               </button>
            </div>

            <div className="w-[1px] h-[24px] bg-gray-200 mx-1"></div>

            {/* AI Input */}
            <div className="relative flex items-center">
               <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about this meeting..." 
                  className="w-[320px] h-[40px] bg-[#F7F9FC] hover:bg-[#F2F4F6] focus:bg-white border border-transparent focus:border-blue-100 rounded-[20px] pl-4 pr-12 text-[14px] text-[#333] placeholder-[#888] focus:outline-none transition-all"
               />
               <button 
                 onClick={handleSendMessage}
                 disabled={!chatInput.trim()}
                 className={`absolute right-1 w-[32px] h-[32px] rounded-full flex items-center justify-center text-white shadow-sm transition-all active:scale-95 ${chatInput.trim() ? 'bg-[#2A66FF] hover:bg-[#255BE0]' : 'bg-gray-300 cursor-not-allowed'}`}
               >
                  <ArrowRight size={16} />
               </button>
            </div>

         </div>
      </div>

    </div>
  );
};
