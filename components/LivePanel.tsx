
import React, { useState, useEffect, useRef } from 'react';
import { Square, MoreHorizontal, X, ArrowRight, Play, Mic, AlertCircle, Minimize2, Maximize2, ChevronUp } from 'lucide-react';
import { TranscriptEntry, ChatMessage } from '../types';
import { generateMeetingChatResponse } from '../services/openaiService';
import { createAssemblyAIConnection, type AssemblyAIConnection, type AssemblyAIMessage } from "../services/assemblyAiService";

interface LivePanelProps {
  status: 'live' | 'ended';
  onStop: () => void;
  onStart?: () => void;
  onClose?: () => void;
  transcript: TranscriptEntry[];
  elapsedSeconds: number;
  onTranscriptUpdate?: (entry: TranscriptEntry) => void;
}

const formatTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Helper to safely get API key
const getApiKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY || '';
    }
  } catch (e) {
    // Ignore
  }
  return '';
};

// Generate a consistent color based on speaker name
const getSpeakerColor = (speaker: string) => {
  const colors = ['#6C63FF', '#FF6584', '#3B76FF', '#38B2AC', '#F6AD55'];
  let hash = 0;
  for (let i = 0; i < speaker.length; i++) {
    hash = speaker.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// Audio helpers
function createBlob(data: Float32Array): { data: string; mimeType: string } {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  let binary = '';
  const bytes = new Uint8Array(int16.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return {
    data: btoa(binary),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// Create WAV file blob from Float32Array audio data
function createWavBlob(audioData: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const dataLength = audioData.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);
  
  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);
  
  // Convert Float32 to Int16 PCM data
  const offset = 44;
  for (let i = 0; i < audioData.length; i++) {
    const sample = Math.max(-1, Math.min(1, audioData[i]));
    view.setInt16(offset + i * 2, sample * 0x7FFF, true);
  }
  
  return new Blob([buffer], { type: 'audio/wav' });
}

export const LivePanel: React.FC<LivePanelProps> = ({ 
  status, 
  onStop, 
  onStart, 
  onClose,
  transcript, 
  elapsedSeconds,
  onTranscriptUpdate
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'transcript'>('transcript');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentUtterance, setCurrentUtterance] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [accumulatedText, setAccumulatedText] = useState<string>(''); // Accumulate fragments
  const [debugLogs, setDebugLogs] = useState<string[]>([]); // Debug logs visible in UI
  
  // Stealth Mode State
  const [isMinimized, setIsMinimized] = useState(false);
  
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Debug helper
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLogs(prev => [...prev.slice(-10), `[${timestamp}] ${message}`]); // Keep last 10 logs
    console.log(message);
  };
  
  // Audio & API Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null); // Combined stream
  const processorRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);
  const assemblyAIRef = useRef<AssemblyAIConnection | null>(null);
  const isSessionActiveRef = useRef<boolean>(false);
  const accumulationTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadAudioDevices = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter((d) => d.kind === 'audioinput');
        setAudioDevices(inputs);
      } catch (err) {
        console.error('Failed to enumerate audio devices', err);
      }
    };

    loadAudioDevices();

    // Cleanup on unmount
    return () => {
      if (assemblyAIRef.current) {
        assemblyAIRef.current.close();
        assemblyAIRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    if (activeTab === 'transcript' && !isMinimized) {
      transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript, currentUtterance, activeTab, isMinimized]);

  // Auto-Minimize Effect (Stealth Mode)
  useEffect(() => {
    if (status === 'live' && isConnected) {
       // Wait 1 second after connecting, then minimize to get out of the way
       const timer = setTimeout(() => {
         setIsMinimized(true);
       }, 1000);
       return () => clearTimeout(timer);
    }
  }, [status, isConnected]);

  // Cleanup on unmount or status change
  useEffect(() => {
    if (status === 'ended') {
      console.log('Meeting ended, cleaning up...');
      cleanupAudio();
      setIsMinimized(false); // Auto expand when meeting ends
    }
    // NO CLEANUP on re-render to prevent disconnection
    // Cleanup will only happen when cleanupAudio() is explicitly called
  }, [status]);

  const cleanupAudio = () => {
    console.log('🧹 Cleaning up audio resources...');
    isSessionActiveRef.current = false;
    setAccumulatedText(''); // Clear accumulated fragments
    
    // 1. Close AssemblyAI connection first
    if (assemblyAIRef.current) {
      try {
        console.log('🔌 Closing AssemblyAI connection...');
        assemblyAIRef.current.close();
        console.log('✅ AssemblyAI connection closed');
      } catch (e) {
        console.error('❌ Error closing AssemblyAI:', e);
      }
      assemblyAIRef.current = null;
    }
    
    // 2. Disconnect Processor
    if (processorRef.current) {
      try {
        console.log('🔌 Disconnecting processor...');
        processorRef.current.disconnect();
        console.log('✅ Processor disconnected');
      } catch (e) {
        console.error('❌ Error disconnecting processor:', e);
      }
      processorRef.current = null;
    }
    
    // 3. Stop Screen Audio Tracks
    if (screenStreamRef.current) {
      console.log('🛑 Stopping screen tracks...');
      screenStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.error('❌ Error stopping screen track:', e);
        }
      });
      screenStreamRef.current = null;
      console.log('✅ Screen tracks stopped');
    }
    
    // 4. Stop Microphone Tracks
    if (micStreamRef.current) {
      console.log('🛑 Stopping microphone tracks...');
      micStreamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.error('❌ Error stopping mic track:', e);
        }
      });
      micStreamRef.current = null;
      console.log('✅ Microphone tracks stopped');
    }
    
    // 5. Stop Mixed Stream
    if (streamRef.current) {
      console.log('🛑 Stopping mixed stream tracks...');
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          console.error('❌ Error stopping mixed track:', e);
        }
      });
      streamRef.current = null;
      console.log('✅ Mixed stream tracks stopped');
    }
    
    // 6. Close Audio Context (always close when stopping)
    if (audioContextRef.current) {
      try {
        console.log('🔌 Closing AudioContext...');
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
        }
        console.log('✅ AudioContext closed');
      } catch (e) {
        console.error('❌ Error closing AudioContext:', e);
      }
      audioContextRef.current = null;
    }
    
    setIsConnected(false);
    setCurrentUtterance('');
    console.log('✅ Audio cleanup completed');
  };

  // Start Live Capture
  useEffect(() => {
    if (status === 'live' && !isConnected && !error) {
      startLiveSession();
    }
  }, [status, isConnected, error]);

  const startLiveSession = async () => {
    try {
      // Check if already connected (prevent double mounting in React strict mode)
      if (isConnected || audioContextRef.current) {
        console.log('Already connected, skipping...');
        return;
      }

      // Create new AudioContext
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      // Store reference immediately to prevent double initialization
      audioContextRef.current = audioCtx;
      
      // Verify AudioContext is not closed
      if (audioCtx.state === 'closed') {
        console.error('AudioContext created in closed state');
        setError('AudioContext is closed. Please refresh the page.');
        audioContextRef.current = null;
        return;
      }
      
      // Resume AudioContext if suspended
      if (audioCtx.state === 'suspended') {
        console.log('Resuming suspended AudioContext...');
        await audioCtx.resume();
      }
      
      console.log('AudioContext state:', audioCtx.state);

      // Check if mediaDevices is available
      if (!navigator.mediaDevices) {
        setError('Media devices not supported. Please use a modern browser (Chrome, Firefox, Edge).');
        return;
      }

      // 1. Get screen audio
      setLoadingStatus('Requesting screen capture...');
      console.log('🖥️ Requesting screen audio capture...');
      let screenStream: MediaStream | null = null;
      try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });
        
        const audioTracks = screenStream.getAudioTracks();
        if (audioTracks.length === 0) {
          console.warn('⚠️ No audio track in screen capture. Make sure to check "Share audio"');
        }
        
        // Stop video tracks, we only need audio
        screenStream.getVideoTracks().forEach(track => track.stop());
        screenStreamRef.current = screenStream;
        setLoadingStatus('Screen captured ✓');
        console.log('✓ Screen audio captured');
      } catch (screenError: any) {
        console.error('✗ Screen capture error:', screenError);
        setError('Screen capture cancelled or failed. Please try again and make sure to share audio.');
        return;
      }

      // 2. Get microphone
      setLoadingStatus('Requesting microphone access...');
      console.log('🎤 Requesting microphone access...');
      let micStream: MediaStream | null = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        micStreamRef.current = micStream;
        setLoadingStatus('Microphone granted ✓');
        console.log('✓ Microphone access granted!');
      } catch (micError: any) {
        console.error('✗ Microphone access error:', micError);
        
        let errorMsg = 'Microphone access denied. ';
        if (micError.name === 'NotAllowedError') {
          errorMsg += 'Please allow microphone access.';
        } else if (micError.name === 'NotFoundError') {
          errorMsg += 'No microphone found.';
        } else {
          errorMsg += micError.message || 'Unknown error.';
        }
        
        setError(errorMsg);
        return;
      }

      // 3. Mix both audio sources
      const destination = audioCtx.createMediaStreamDestination();
      
      const screenAudioTracks = screenStream.getAudioTracks();
      if (screenAudioTracks.length > 0) {
        const screenSource = audioCtx.createMediaStreamSource(screenStream);
        screenSource.connect(destination);
        console.log('✓ Screen audio connected to mixer');
      }
      
      const micSource = audioCtx.createMediaStreamSource(micStream);
      micSource.connect(destination);
      setLoadingStatus('Mixing audio sources...');
      console.log('✓ Microphone connected to mixer');

      // 4. Use the mixed stream
      const mixedStream = destination.stream;
      streamRef.current = mixedStream;
      const source = audioCtx.createMediaStreamSource(mixedStream);
      console.log('✓ Mixed audio source created');
      
      // Create AssemblyAI connection FIRST
      setLoadingStatus('Connecting to transcription service...');
      addDebugLog('🔌 Creating AssemblyAI connection...');
      const connection = await createAssemblyAIConnection((msg: AssemblyAIMessage) => {
        // Log ALL messages received
        addDebugLog(`📨 Message type: ${msg.type}`);
        
        if (msg.type === 'connected' || msg.type === 'Begin') {
          addDebugLog('✅ AssemblyAI connected and ready');
          return;
        }

        if (msg.error) {
          addDebugLog('❌ AssemblyAI error: ' + msg.error);
          setError(`AssemblyAI error: ${msg.error}`);
          return;
        }

        // Process Turn messages
        if (msg.type === 'Turn') {
          addDebugLog(`🔄 Turn message - end_of_turn: ${msg.end_of_turn}, has transcript: ${!!msg.transcript}`);
          
          // Display ALL transcripts immediately to debug
          if (msg.end_of_turn && msg.transcript) {
            const text = msg.transcript.trim();
            if (!text) {
              addDebugLog('⚠️ Empty transcript received');
              return;
            }

            addDebugLog('📝 Transcript: ' + text.substring(0, 50));

            const speaker = msg.language_code ? `Speaker (${msg.language_code})` : 'Speaker';
            
            const newEntry: TranscriptEntry = {
              id: Date.now().toString(),
              speaker,
              text: text,
              timestamp: new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
            };
            
            addDebugLog('✅ Adding to transcript list');
            if (onTranscriptUpdate) onTranscriptUpdate(newEntry);
          }
        }
      });

      if (!connection) {
        setError('Failed to connect to AssemblyAI');
        return;
      }

      assemblyAIRef.current = connection;
      setIsConnected(true);
      setError(null);
      isSessionActiveRef.current = true;
      setLoadingStatus('Setting up audio processing...');
      addDebugLog('✅ Connection established, session active');

      // NOW setup audio processing and connect to source
      try {
        console.log('Loading AudioWorklet module...');
        await audioCtx.audioWorklet.addModule('/audio-processor.js');
        const workletNode = new AudioWorkletNode(audioCtx, 'audio-stream-processor');
        processorRef.current = workletNode;

        // Connect audio source to worklet
        source.connect(workletNode);
        workletNode.connect(audioCtx.destination);
        
        setLoadingStatus('');
        addDebugLog('✅ Audio processing ready, listening...');
        
        let audioChunkCount = 0;
        // Setup message handler to send audio to AssemblyAI
        workletNode.port.onmessage = (event) => {
          if (assemblyAIRef.current && event.data) {
            assemblyAIRef.current.sendAudio(event.data);
            audioChunkCount++;
            // Log every 10 chunks to show audio is flowing
            if (audioChunkCount % 10 === 0) {
              addDebugLog(`🎵 Audio chunks sent: ${audioChunkCount}`);
            }
          }
        };
      } catch (workletError) {
        console.warn('AudioWorklet failed, falling back to ScriptProcessor:', workletError);
        
        // Fallback to ScriptProcessor
        const scriptProcessor = audioCtx.createScriptProcessor(4096, 1, 1);
        processorRef.current = scriptProcessor as any;
        
        source.connect(scriptProcessor);
        scriptProcessor.connect(audioCtx.destination);
        
        console.log('✓ ScriptProcessor fallback active');
        
        // Buffer for ScriptProcessor
        let buffer: number[] = [];
        const bufferSize = 8192;
        
        scriptProcessor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Accumulate samples
          for (let i = 0; i < inputData.length; i++) {
            buffer.push(inputData[i]);
          }
          
          // Send when buffer is full enough
          if (buffer.length >= bufferSize && assemblyAIRef.current) {
            const int16 = new Int16Array(buffer.length);
            for (let i = 0; i < buffer.length; i++) {
              const s = Math.max(-1, Math.min(1, buffer[i]));
              int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            // Send audio silently (remove log to avoid console spam)
            assemblyAIRef.current.sendAudio(int16.buffer);
            buffer = [];
          }
        };
      }

    } catch (err) {
      console.error("Failed to start live session", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Error: ${errorMessage}`);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: chatInput };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    const responseText = await generateMeetingChatResponse(transcript, userMsg.text);
    
    setIsTyping(false);
    setChatHistory(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: responseText }]);
  };

  // --- MINIMIZED VIEW (STEALTH MODE) ---
  if (isMinimized) {
    return (
      <div 
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 h-[48px] px-4 rounded-full flex items-center gap-3 cursor-pointer z-50 animate-in fade-in slide-in-from-bottom-4 transition-all duration-300 hover:scale-105 shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-white/20 group"
        style={{
            background: 'rgba(32, 32, 32, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
        }}
      >
         {/* Pulsing Dot */}
         <div className="relative w-2.5 h-2.5">
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${isConnected ? 'bg-red-500 animate-ping' : 'bg-yellow-500'}`}></span>
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isConnected ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
         </div>
         
         <div className="flex flex-col">
            <span className="text-white text-[12px] font-medium leading-none mb-0.5">Tyna is listening</span>
            <span className="text-white/50 text-[10px] font-mono leading-none">{formatTime(elapsedSeconds)}</span>
         </div>

         <div className="w-[1px] h-[16px] bg-white/10 mx-1"></div>
         
         <ChevronUp size={16} className="text-white/60 group-hover:text-white transition-colors" />
      </div>
    );
  }

  // --- MAXIMIZED VIEW ---
  return (
    <div 
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[340px] rounded-[20px] shadow-[0_12px_36px_rgba(0,0,0,0.35)] flex flex-col overflow-hidden z-50 transition-all duration-300 animate-in fade-in zoom-in-95 border border-white/10"
      style={{
        background: 'rgba(32, 32, 32, 0.70)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
      }}
    >
      
      {/* Header */}
      <div className="h-[56px] flex items-center justify-between px-6 shrink-0 border-b border-white/5 relative">
          <div className="flex items-center gap-3">
             {status === 'live' && (
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-red-500 animate-pulse' : 'bg-yellow-500'}`}></div>
             )}
             <span className="text-white text-[16px] font-semibold tracking-tight">
               {status === 'live' ? 'Live Meeting' : 'Meeting Ended'}
             </span>
             {status === 'live' && (
               <span className="bg-white/10 text-white/80 text-[12px] px-2 py-0.5 rounded-[6px] font-mono tracking-wide">
                 {formatTime(elapsedSeconds)}
               </span>
             )}
          </div>

          <div className="flex items-center gap-3">
             {status === 'live' ? (
                <>
                    <button 
                        onClick={() => setIsMinimized(true)}
                        className="w-[32px] h-[32px] flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                        title="Minimize"
                    >
                        <Minimize2 size={16} />
                    </button>
                    <button 
                    onClick={() => {
                      console.log('🛑 Stop button clicked');
                      // Cleanup audio resources immediately
                      cleanupAudio();
                      // Then call onStop to save meeting
                      onStop();
                    }} 
                    className="h-[32px] px-4 bg-red-500/90 hover:bg-red-600 text-white text-[13px] font-medium rounded-[16px] flex items-center gap-2 transition-all transform hover:-translate-y-0.5 shadow-lg shadow-red-500/20"
                    >
                    <Square size={12} fill="currentColor" />
                    Stop
                    </button>
                </>
             ) : (
                <button 
                  onClick={onStart}
                  className="h-[32px] px-4 bg-[#3B76FF] hover:bg-[#2F63E5] text-white text-[13px] font-medium rounded-[16px] flex items-center gap-2 transition-all transform hover:-translate-y-0.5 shadow-lg shadow-blue-500/20"
                >
                  <Play size={12} fill="currentColor" />
                  Start Listening
                </button>
             )}
             
             {status === 'ended' && (
               <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1">
                 <X size={20} />
               </button>
             )}
          </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center px-6 border-b border-white/5 h-[48px] relative shrink-0">
        <button 
           onClick={() => setActiveTab('transcript')}
           className={`relative h-full flex items-center justify-center mr-6 text-[14px] font-medium transition-colors ${activeTab === 'transcript' ? 'text-white' : 'text-white/45 hover:text-white/70'}`}
        >
          Transcript
          {activeTab === 'transcript' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3B76FF] rounded-t-sm shadow-[0_0_10px_rgba(59,118,255,0.5)] transition-all" />
          )}
        </button>
        <button 
           onClick={() => setActiveTab('chat')}
           className={`relative h-full flex items-center justify-center text-[14px] font-medium transition-colors ${activeTab === 'chat' ? 'text-white' : 'text-white/45 hover:text-white/70'}`}
        >
          Chat
          {activeTab === 'chat' && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#3B76FF] rounded-t-sm shadow-[0_0_10px_rgba(59,118,255,0.5)] transition-all" />
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto dark-scroll relative group">
         
         {/* Error Banner */}
         {error && (
            <div className="absolute top-2 left-4 right-4 bg-red-500/20 border border-red-500/50 text-red-100 text-[13px] p-2 rounded-lg flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
         )}

         {/* Top Shadow for Scroll Hint */}
         <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-black/20 to-transparent pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>

         {activeTab === 'chat' && (
           <div className="flex flex-col min-h-full p-6">
              <div className="flex-1 space-y-4 mb-4">
                 {chatHistory.length === 0 && (
                   <div className="text-center mt-8 space-y-3 opacity-60">
                     <p className="text-white/60 text-sm">Ask Tyna about this session</p>
                     <div className="flex flex-wrap justify-center gap-2">
                        {["Summarize", "Key Decisions", "Next Steps"].map(s => (
                          <button key={s} onClick={() => setChatInput(s)} className="bg-white/10 hover:bg-white/15 border border-white/10 text-white/80 text-[12px] px-3 py-1 rounded-[14px] transition-all">
                            {s}
                          </button>
                        ))}
                     </div>
                   </div>
                 )}
                 {chatHistory.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-[14px] leading-relaxed ${msg.role === 'user' ? 'bg-[#3B76FF] text-white shadow-md' : 'bg-white/10 text-white/90 border border-white/5'}`}>
                         {msg.text}
                       </div>
                    </div>
                 ))}
                 {isTyping && (
                   <div className="flex justify-start">
                      <div className="bg-white/10 rounded-2xl px-4 py-3 flex gap-1.5">
                         <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce"></div>
                         <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce delay-100"></div>
                         <div className="w-1.5 h-1.5 bg-white/50 rounded-full animate-bounce delay-200"></div>
                      </div>
                   </div>
                 )}
                 <div ref={chatEndRef} />
              </div>
           </div>
         )}

         {activeTab === 'transcript' && (
           <div className="p-6 space-y-6">
             {transcript.map((entry) => (
                <div key={entry.id} className="flex gap-4 group">
                   <div 
                      className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-sm mt-0.5"
                      style={{ backgroundColor: getSpeakerColor(entry.speaker) }}
                   >
                      {entry.speaker.charAt(0)}
                   </div>
                   <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                         <span className="text-white/90 font-medium text-[14px]">{entry.speaker}</span>
                         <span className="text-white/40 text-[12px] font-normal">{entry.timestamp}</span>
                      </div>
                      <p className="text-white/85 text-[15px] leading-[1.55] font-light tracking-wide">{entry.text}</p>
                   </div>
                </div>
             ))}
             
             {/* Live Current Utterance */}
             {currentUtterance && (
                <div className="flex gap-4 animate-pulse opacity-70">
                    <div className="w-[26px] h-[26px] rounded-full bg-gray-500 flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-0.5">
                       •
                    </div>
                    <div className="flex-1">
                       <p className="text-white/85 text-[15px] leading-[1.55] font-light italic">{currentUtterance}...</p>
                    </div>
                </div>
             )}

             {/* Loading Status */}
             {loadingStatus && (
                <div className="text-center text-white/60 text-sm mt-12 font-light">
                  <div className="inline-block mb-2">
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white/80 rounded-full animate-spin"></div>
                  </div>
                  <br/>
                  {loadingStatus}
                </div>
             )}

             {/* Debug Logs Panel */}
             {debugLogs.length > 0 && (
                <div className="mt-6 p-4 bg-black/40 rounded-lg border border-white/10">
                  <div className="text-white/60 text-xs font-mono space-y-1">
                    <div className="text-white/80 font-bold mb-2">🔍 Debug Logs:</div>
                    {debugLogs.map((log, idx) => (
                      <div key={idx} className="text-white/70">{log}</div>
                    ))}
                  </div>
                </div>
             )}

             {transcript.length === 0 && !currentUtterance && !loadingStatus && debugLogs.length === 0 && (
                <div className="text-center text-white/30 text-sm mt-12 font-light">
                  <Mic className="inline-block mb-2 opacity-50" size={24} />
                  <br/>
                  {status === 'live' ? (isConnected ? 'Listening...' : 'Connecting to AI...') : 'No transcript available.'}
                </div>
             )}
             <div ref={transcriptEndRef} />
           </div>
         )}
      </div>

      {/* Input Area (Only for Chat tab) */}
      {activeTab === 'chat' && (
        <div className="p-4 border-t border-white/5 bg-black/20 shrink-0">
           <div className="relative">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask follow-up questions..."
                className="w-full h-[44px] rounded-[14px] bg-white/[0.12] border border-white/[0.14] text-white placeholder-white/45 pl-4 pr-12 text-[14px] focus:outline-none focus:bg-white/[0.15] focus:border-white/20 transition-all"
              />
              <button 
                onClick={handleSendMessage}
                className="absolute right-1.5 top-1.5 w-[36px] h-[36px] rounded-full bg-[#3B76FF] hover:bg-[#2F63E5] flex items-center justify-center text-white transition-all shadow-lg hover:shadow-blue-500/30 transform hover:scale-105 active:scale-95"
              >
                 <ArrowRight size={18} />
              </button>
           </div>
        </div>
      )}
    </div>
  );
};
