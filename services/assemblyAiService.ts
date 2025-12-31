// AssemblyAI Universal Streaming v3 service

export interface AssemblyAIWord {
  text: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: string;
}

export interface AssemblyAIMessage {
  type?: string; // 'Begin', 'Turn', 'Termination', 'connected'
  transcript?: string; // Full transcript for end_of_turn
  utterance?: string; // Partial utterance during turn
  end_of_turn?: boolean;
  language_code?: string;
  language_confidence?: number;
  words?: AssemblyAIWord[];
  error?: string;
}

export interface AssemblyAIConnection {
  socket: WebSocket;
  sendAudio: (buffer: ArrayBuffer) => void;
  close: () => void;
}

export async function createAssemblyAIConnection(
  onMessage: (msg: AssemblyAIMessage) => void,
): Promise<AssemblyAIConnection | null> {
  
  return new Promise((resolve, reject) => {
    // Connect to backend WebSocket proxy
    // Priority: VITE_BACKEND_URL > window.location.origin (production) > localhost (development only)
    let backendUrl = import.meta.env.VITE_BACKEND_URL;
    
    // Detect if we're in production (not localhost)
    const isProduction = typeof window !== 'undefined' && 
      !window.location.hostname.includes('localhost') && 
      !window.location.hostname.includes('127.0.0.1');
    
    // If VITE_BACKEND_URL is not set, try to use current origin (for Railway/production)
    if (!backendUrl && typeof window !== 'undefined') {
      backendUrl = window.location.origin;
      if (isProduction) {
        console.warn('⚠️ VITE_BACKEND_URL not set in production, using current origin:', backendUrl);
        console.warn('💡 For better reliability, set VITE_BACKEND_URL=https://votre-app.railway.app in Railway variables and redeploy');
      } else {
        console.log('ℹ️ Using current origin for WebSocket:', backendUrl);
      }
    }
    
    // Final fallback to localhost ONLY in development
    if (!backendUrl) {
      if (isProduction) {
        const errorMsg = 'VITE_BACKEND_URL is not set in production. Please set VITE_BACKEND_URL=https://votre-app.railway.app in Railway variables and redeploy.';
        console.error('❌', errorMsg);
        reject(new Error(errorMsg));
        return;
      }
      backendUrl = 'http://localhost:3001';
      console.log('ℹ️ Using localhost for development:', backendUrl);
    }
    
    // Never use localhost in production
    if (isProduction && (backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1'))) {
      const errorMsg = 'Cannot use localhost in production. Please set VITE_BACKEND_URL=https://votre-app.railway.app in Railway variables and redeploy.';
      console.error('❌', errorMsg);
      console.error('Current backendUrl:', backendUrl);
      reject(new Error(errorMsg));
      return;
    }
    
    const wsProtocol = backendUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = backendUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const wsUrl = `${wsProtocol}://${wsHost}/ws`;
    
    // Log connection attempt
    console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);
    if (!import.meta.env.VITE_BACKEND_URL && typeof window !== 'undefined') {
      if (isProduction) {
        console.warn('⚠️ Using auto-detected backend URL. Set VITE_BACKEND_URL for better reliability.');
      }
    }
    
    const socket = new WebSocket(wsUrl);

    socket.binaryType = "arraybuffer";

    socket.onopen = () => {
      onMessage({ type: 'connected' });
      
      // Return connection object once connected
      const sendAudio = (buffer: ArrayBuffer) => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(buffer);
        } else {
          // WebSocket not open
        }
      };

      const close = () => {
        // Connection closed
        console.trace('Call stack:');
        try {
          if (socket.readyState === WebSocket.OPEN) {
            socket.close();
          }
        } catch {
          // ignore
        }
      };

      resolve({ socket, sendAudio, close });
    };

    socket.onmessage = (event) => {
      try {
        if (typeof event.data === 'string') {
          const data = JSON.parse(event.data) as AssemblyAIMessage;
          // Log ALL messages to debug
          // Message received
          onMessage(data);
        }
      } catch (err) {
        console.error("Failed to parse AssemblyAI message", err);
      }
    };

    socket.onerror = (event) => {
      let errorMsg = `WebSocket connection failed to ${wsUrl}.`;
      
      // Provide helpful error message based on the URL
      if (wsUrl.includes('localhost')) {
        errorMsg += '\n\n❌ Problem: Trying to connect to localhost in production.';
        errorMsg += '\n✅ Solution: Add VITE_BACKEND_URL=https://votre-app.railway.app in Railway variables and redeploy.';
      } else {
        errorMsg += '\n\nPossible causes:';
        errorMsg += '\n1. VITE_BACKEND_URL is not set correctly in Railway';
        errorMsg += '\n2. The server is not running';
        errorMsg += '\n3. The WebSocket endpoint is not accessible';
        errorMsg += '\n\n✅ Check Railway logs to verify the server is running.';
      }
      
      console.error("✗ AssemblyAI WebSocket error:", errorMsg);
      console.error("Attempted URL:", wsUrl);
      console.error("VITE_BACKEND_URL:", import.meta.env.VITE_BACKEND_URL || 'NOT SET');
      if (typeof window !== 'undefined') {
        console.error("Current origin:", window.location.origin);
      }
      reject(new Error(errorMsg));
    };

    socket.onclose = (event) => {
      // Connection closed
    };

    // Timeout after 30 seconds (increased for slower connections)
    setTimeout(() => {
      if (socket.readyState !== WebSocket.OPEN) {
        const timeoutError = new Error(`WebSocket connection timeout after 30 seconds. URL: ${wsUrl}`);
        console.error('❌ WebSocket timeout:', timeoutError);
        socket.close();
        reject(timeoutError);
      }
    }, 30000);
  });
}
