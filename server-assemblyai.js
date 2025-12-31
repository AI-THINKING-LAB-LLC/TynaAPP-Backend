// AssemblyAI Universal Streaming v3 Backend (based on official example)
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import WebSocket from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// IMPORTANT: Your AssemblyAI API key (use environment variable in production)
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY || '595895f409724007acc99cb4dcd98c81';

// OpenAI API key (runtime variable, not VITE_*)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '';
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Google Calendar OAuth credentials
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/auth/callback/google';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

// Connection parameters optimized for better accuracy and longer phrases
const CONNECTION_PARAMS = {
  sample_rate: 16000,
  encoding: 'pcm_s16le',
  speech_model: 'universal-streaming-multilingual',
  language_detection: true,
  // Enhanced accuracy settings
  word_boost: JSON.stringify(['meeting', 'presentation', 'discussion', 'project', 'team']),
  boost_param: 'high', // Boost accuracy for specified words
  punctuate: true, // Add punctuation
  format_text: true, // Format numbers, dates, etc.
  disfluencies: false, // Remove filler words like "um", "uh"
  multichannel: false,
  dual_channel: false,
  // Optimized silence threshold for faster response while keeping complete sentences
  end_utterance_silence_threshold: 1000, // 1 second of silence before ending turn (default is 700ms)
  disable_partial_transcripts: true // Disable partial transcripts completely
};

// CORS configuration for production
const corsOptions = {
  origin: process.env.FRONTEND_URL || process.env.VITE_BACKEND_URL || '*',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// Serve static files from dist directory (frontend build)
const distPath = join(__dirname, 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  
  // SPA fallback: all routes serve index.html (except API endpoints)
  app.use((req, res, next) => {
    // Skip for API endpoints and WebSocket
    if (req.path.startsWith('/ws') || req.path.startsWith('/health') || req.path.startsWith('/api')) {
      return next();
    }
    // Serve index.html for all other routes (SPA routing)
    res.sendFile(join(distPath, 'index.html'));
  });
} else {
  // Root endpoint (only if no frontend)
  app.get('/', (req, res) => {
    res.json({ 
      message: 'Tyna Meet Backend Server',
      version: '1.0.0',
      endpoints: {
        websocket: `/ws - WebSocket endpoint for real-time transcription`,
        health: `/health - Health check endpoint`
      },
      provider: 'AssemblyAI Universal Streaming v3',
      status: 'running',
      note: 'Frontend not found. Build the frontend with: npm run build'
    });
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Tyna Meet Backend',
    provider: 'AssemblyAI Universal Streaming v3',
    websocket: `ws://${req.get('host')}/ws`,
    frontend: existsSync(distPath) ? 'served' : 'not found',
    openai: OPENAI_API_KEY ? 'configured' : 'not configured'
  });
});

// OpenAI Chat endpoint
app.post('/api/openai/chat', async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ 
      error: 'OpenAI API Key not configured',
      message: 'Please set OPENAI_API_KEY environment variable in Railway Dashboard > Variables'
    });
  }

  try {
    const { history, userQuery } = req.body;

    if (!history || !userQuery) {
      return res.status(400).json({ error: 'Missing history or userQuery' });
    }

    const transcriptText = history
      .map((entry) => `${entry.speaker} (${entry.timestamp}): ${entry.text}`)
      .join("\n");

    const messages = [
      {
        role: "system",
        content: `You are Tyna, a helpful multilingual meeting assistant. You can understand and respond in French, English, and other languages.
        
Your role is to:
- Answer questions about the meeting transcript
- Summarize key points
- Identify action items
- Help participants understand what was discussed

Always respond in the same language as the user's question.`
      },
      {
        role: "user",
        content: `Here is the meeting transcript so far:

---
${transcriptText}
---

User question: ${userQuery}

Please answer based on the transcript above.`
      }
    ];

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API Error:', error);
      return res.status(response.status).json({ 
        error: 'OpenAI API Error',
        message: error.error?.message || 'Unknown error'
      });
    }

    const data = await response.json();
    res.json({ 
      response: data.choices[0]?.message?.content || "I couldn't generate a response."
    });
  } catch (error) {
    console.error("OpenAI Chat Error:", error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'Failed to generate chat response'
    });
  }
});

// OpenAI Title generation endpoint
app.post('/api/openai/title', async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ 
      error: 'OpenAI API Key not configured',
      message: 'Please set OPENAI_API_KEY environment variable in Railway Dashboard > Variables'
    });
  }

  try {
    const { transcript } = req.body;

    if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid transcript array' });
    }

    const transcriptText = transcript
      .slice(0, 20) // Use first 20 entries to keep it short
      .map((entry) => `${entry.speaker}: ${entry.text}`)
      .join("\n");

    const messages = [
      {
        role: "system",
        content: "You are a meeting assistant. Generate a concise, descriptive title (3-8 words) for a meeting based on its transcript. Return ONLY the title, no explanation."
      },
      {
        role: "user",
        content: `Based on this meeting transcript, generate a concise title (3-8 words):

${transcriptText}

Title:`
      }
    ];

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        max_tokens: 30
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const title = data.choices[0]?.message?.content?.trim() || "Untitled Session";
    
    // Clean up the title (remove quotes, extra spaces, etc.)
    const cleanTitle = title.replace(/^["']|["']$/g, '').trim();
    
    res.json({ title: cleanTitle || "Untitled Session" });
  } catch (error) {
    console.error("OpenAI Title Error:", error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'Failed to generate title',
      title: "Untitled Session"
    });
  }
});

// OpenAI Summary endpoint
app.post('/api/openai/summary', async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ 
      error: 'OpenAI API Key not configured',
      message: 'Please set OPENAI_API_KEY environment variable in Railway Dashboard > Variables'
    });
  }

  try {
    const { transcript } = req.body;

    if (!transcript || !Array.isArray(transcript)) {
      return res.status(400).json({ error: 'Missing or invalid transcript array' });
    }

    const transcriptText = transcript
      .map((entry) => `${entry.speaker}: ${entry.text}`)
      .join("\n");

    const messages = [
      {
        role: "system",
        content: "You are a meeting analysis assistant. Provide concise summaries and actionable items in JSON format."
      },
      {
        role: "user",
        content: `Analyze this meeting transcript and provide:
1. A concise summary (2-3 sentences)
2. Key action items (as an array)

Transcript:
${transcriptText}

Respond in JSON format:
{
  "summary": "...",
  "actionItems": ["...", "..."]
}`
      }
    ];

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.5,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    
    res.json({
      summary: parsed.summary || "No summary available.",
      actionItems: parsed.actionItems || []
    });
  } catch (error) {
    console.error("OpenAI Summary Error:", error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'Failed to generate summary',
      summary: "Error generating summary.",
      actionItems: []
    });
  }
});

// OpenAI Follow-up Email generation endpoint
app.post('/api/openai/followup-email', async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ 
      error: 'OpenAI API Key not configured',
      message: 'Please set OPENAI_API_KEY environment variable in Railway Dashboard > Variables'
    });
  }

  try {
    const { transcript, meetingTitle } = req.body;

    if (!transcript || !Array.isArray(transcript)) {
      return res.status(400).json({ error: 'Missing or invalid transcript array' });
    }

    const transcriptText = transcript
      .map((entry) => `${entry.speaker}: ${entry.text}`)
      .join("\n");

    // Extract emails from transcript
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const foundEmails = [...new Set(transcriptText.match(emailRegex) || [])];

    const messages = [
      {
        role: "system",
        content: "You are a professional meeting assistant. Generate professional follow-up emails based on meeting transcripts."
      },
      {
        role: "user",
        content: `Generate a professional follow-up email for this meeting:

Meeting Title: ${meetingTitle || 'Meeting'}

Transcript:
${transcriptText}

Please generate:
1. A professional email subject line
2. A professional email body that includes:
   - A brief greeting
   - A summary of key discussion points
   - Action items if any
   - A professional closing

Respond in JSON format:
{
  "subject": "...",
  "body": "...",
  "emails": [${foundEmails.map(e => `"${e}"`).join(', ')}]
}`
      }
    ];

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    
    res.json({
      subject: parsed.subject || `Follow-up: ${meetingTitle || 'Meeting'}`,
      body: parsed.body || "Thank you for attending the meeting.",
      emails: parsed.emails || foundEmails
    });
  } catch (error) {
    console.error("OpenAI Follow-up Email Error:", error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message || 'Failed to generate follow-up email',
      subject: `Follow-up: ${req.body.meetingTitle || 'Meeting'}`,
      body: "Thank you for attending the meeting.",
      emails: []
    });
  }
});

// Google Calendar OAuth Token Exchange endpoint
app.post('/api/google-calendar/token', async (req, res) => {
  try {
    const { code, redirectUri } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({ error: 'Google Calendar OAuth not configured on server' });
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri || GOOGLE_REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Google OAuth token exchange error:', tokenResponse.status, errorText);
      return res.status(tokenResponse.status).json({ 
        error: 'Failed to exchange authorization code',
        details: errorText 
      });
    }

    const tokenData = await tokenResponse.json();
    
    res.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type || 'Bearer'
    });
  } catch (error) {
    console.error('Google Calendar token exchange error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Google Calendar Token Refresh endpoint
app.post('/api/google-calendar/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({ error: 'Google Calendar OAuth not configured on server' });
    }

    // Refresh access token
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Google OAuth token refresh error:', tokenResponse.status, errorText);
      return res.status(tokenResponse.status).json({ 
        error: 'Failed to refresh access token',
        details: errorText 
      });
    }

    const tokenData = await tokenResponse.json();
    
    res.json({
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type || 'Bearer'
    });
  } catch (error) {
    console.error('Google Calendar token refresh error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Google Calendar Events Fetch endpoint
app.get('/api/google-calendar/events', async (req, res) => {
  try {
    // Get access token from Authorization header or query parameter
    let accessToken = null;
    
    // Try Authorization header first (more secure)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }
    
    // Fallback to query parameter
    if (!accessToken) {
      accessToken = req.query.accessToken;
    }

    if (!accessToken) {
      return res.status(400).json({ error: 'Access token is required (use Authorization: Bearer <token> header or ?accessToken= query parameter)' });
    }

    // Get timeMin and timeMax from query parameters, or use defaults
    const timeMin = req.query.timeMin || new Date().toISOString();
    const timeMax = req.query.timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // Next 7 days

    const eventsResponse = await fetch(
      `${GOOGLE_CALENDAR_API}/users/me/calendarList?minAccessRole=owner`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!eventsResponse.ok) {
      const errorText = await eventsResponse.text();
      console.error('Google Calendar API error:', eventsResponse.status, errorText);
      return res.status(eventsResponse.status).json({ 
        error: 'Failed to fetch calendar list',
        details: errorText 
      });
    }

    const calendars = await eventsResponse.json();
    
    // Fetch events from primary calendar
    const eventsResponse2 = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!eventsResponse2.ok) {
      const errorText = await eventsResponse2.text();
      console.error('Google Calendar events API error:', eventsResponse2.status, errorText);
      return res.status(eventsResponse2.status).json({ 
        error: 'Failed to fetch events',
        details: errorText 
      });
    }

    const eventsData = await eventsResponse2.json();
    
    res.json({
      events: eventsData.items || [],
      calendars: calendars.items || []
    });
  } catch (error) {
    console.error('Google Calendar events fetch error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Google Calendar Sync: Create meeting from event (backend endpoint to avoid schema cache issues)
app.post('/api/google-calendar/create-meeting', async (req, res) => {
  try {
    const { userId, title, startTime, duration, eventId } = req.body;

    if (!userId || !title || !startTime) {
      return res.status(400).json({ error: 'userId, title, and startTime are required' });
    }

    // Import Supabase client (you'll need to configure this)
    // For now, we'll return the meeting data and let frontend handle the insert
    // This is a workaround until we can properly configure Supabase on backend
    
    res.json({
      success: true,
      meeting: {
        id: `calendar-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        user_id: userId,
        title: title,
        startTime: startTime,
        duration: duration || 3600,
        eventId: eventId
      }
    });
  } catch (error) {
    console.error('Error creating meeting from calendar event:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Google Calendar OAuth Callback endpoint (redirects to frontend with code)
app.get('/api/auth/callback/google', async (req, res) => {
  try {
    const { code, error } = req.query;

    if (error) {
      // OAuth error - redirect to frontend with error
      const frontendUrl = process.env.FRONTEND_URL || process.env.VITE_BACKEND_URL || 'http://localhost:5173';
      const errorStr = String(error || 'unknown_error');
      return res.redirect(`${frontendUrl}/settings?google_calendar_error=${encodeURIComponent(errorStr)}`);
    }

    if (!code) {
      // No code - redirect to frontend
      const frontendUrl = process.env.FRONTEND_URL || process.env.VITE_BACKEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/settings?google_calendar_error=no_code`);
    }

    // Redirect to frontend with the code for processing
    const frontendUrl = process.env.FRONTEND_URL || process.env.VITE_BACKEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/settings?code=${code}&google_calendar_callback=true`);
  } catch (error) {
    console.error('Google Calendar callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || process.env.VITE_BACKEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/settings?google_calendar_error=server_error`);
  }
});

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (clientWs) => {
  // Build WebSocket URL with query parameters
  const params = new URLSearchParams(CONNECTION_PARAMS);
  const wsUrl = `wss://streaming.assemblyai.com/v3/ws?${params.toString()}`;
  
  // Connect to AssemblyAI WebSocket
  const assemblyWs = new WebSocket(wsUrl, {
    headers: {
      'Authorization': ASSEMBLYAI_API_KEY
    }
  });

  assemblyWs.on('open', () => {
    clientWs.send(JSON.stringify({ type: 'connected' }));
  });

  assemblyWs.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      const msgType = message.type;

      if (msgType === 'Begin') {
        clientWs.send(JSON.stringify(message));
      } 
      else if (msgType === 'Turn') {
        // Afficher seulement les transcriptions finales
        if (message.end_of_turn && message.transcript) {
          console.log(message.transcript);
        }
        // Send ALL Turn messages to client
        clientWs.send(JSON.stringify(message));
      }
      else if (msgType === 'Termination') {
        clientWs.send(JSON.stringify(message));
      }
      else {
        // Forward any other message types
        clientWs.send(JSON.stringify(message));
      }
    } catch (err) {
      console.error('Failed to parse AssemblyAI message:', err);
    }
  });

  assemblyWs.on('error', (error) => {
    console.error('AssemblyAI WebSocket error:', error);
    clientWs.send(JSON.stringify({ error: 'AssemblyAI connection error' }));
  });

  assemblyWs.on('close', () => {
    clientWs.close();
  });

  // Forward audio from client to AssemblyAI
  clientWs.on('message', (data) => {
    if (Buffer.isBuffer(data) && assemblyWs.readyState === WebSocket.OPEN) {
      assemblyWs.send(data);
    }
  });

  clientWs.on('close', () => {
    if (assemblyWs.readyState === WebSocket.OPEN) {
      // Send termination message
      try {
        assemblyWs.send(JSON.stringify({ type: 'Terminate' }));
      } catch (err) {
        // Silent fail
      }
      assemblyWs.close();
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Tyna backend with AssemblyAI Universal Streaming v3`);
  console.log(`📡 Running on http://0.0.0.0:${PORT}`);
  console.log(`🔌 WebSocket: ws://0.0.0.0:${PORT}/ws`);
  console.log(`✓ API key configured`);
  console.log(`✓ Model: ${CONNECTION_PARAMS.speech_model}`);
  console.log(`✓ Language detection: enabled`);
  console.log(`✓ Sample rate: ${CONNECTION_PARAMS.sample_rate}Hz`);
  console.log(`✓ OpenAI: ${OPENAI_API_KEY ? 'configured' : 'not configured (set OPENAI_API_KEY)'}`);
  console.log(`✓ API endpoints: /api/openai/chat, /api/openai/summary, /api/openai/title, /api/openai/followup-email`);
  console.log(`✓ Google Calendar endpoints: /api/google-calendar/token, /api/google-calendar/refresh, /api/google-calendar/events`);
  // Google Calendar configuration endpoint (for frontend to get CLIENT_ID dynamically)
  app.get('/api/config/google-calendar', (req, res) => {
    res.json({
      clientId: GOOGLE_CLIENT_ID || null,
      configured: !!GOOGLE_CLIENT_ID,
      redirectUri: GOOGLE_REDIRECT_URI
    });
  });

  console.log(`✓ Google Calendar OAuth: ${GOOGLE_CLIENT_ID ? 'configured' : 'not configured (set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET)'}\n`);
});
