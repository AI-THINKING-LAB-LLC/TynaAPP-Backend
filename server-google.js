// Google Cloud Speech-to-Text WebSocket proxy
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import fetch from 'node-fetch';

const app = express();
const PORT = 3001;

// IMPORTANT: Get your Google Cloud API key from https://console.cloud.google.com/
// Enable Cloud Speech-to-Text API and create an API key
const GOOGLE_API_KEY = 'AIzaSyDmfNCyPNAMvLveB2moH7P0SlixD7g9hUQ';

app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (clientWs) => {
  console.log('Client connected to Google Speech proxy');
  
  let audioBuffer = [];
  let isProcessing = false;
  
  // Send connected message
  clientWs.send(JSON.stringify({ type: 'connected' }));

  // Buffer audio and transcribe every 5 seconds (longer for better accuracy)
  const transcribeInterval = setInterval(async () => {
    if (audioBuffer.length === 0 || isProcessing) return;
    
    isProcessing = true;
    const audioData = Buffer.concat(audioBuffer);
    audioBuffer = [];
    
    try {
      // Convert to base64
      const base64Audio = audioData.toString('base64');
      
      // Call Google Speech-to-Text API
      const response = await fetch(
        `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: {
              encoding: 'LINEAR16',
              sampleRateHertz: 16000,
              languageCode: 'fr-FR',
              alternativeLanguageCodes: ['en-US', 'es-ES', 'de-DE', 'it-IT', 'pt-PT', 'ar-SA'],
              enableAutomaticPunctuation: true,
              diarizationConfig: {
                enableSpeakerDiarization: true,
                minSpeakerCount: 1,
                maxSpeakerCount: 6,
              },
              model: 'latest_long',
            },
            audio: {
              content: base64Audio,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('Google Speech API error:', response.status, error);
        clientWs.send(JSON.stringify({ 
          type: 'error',
          error: `API error ${response.status}: ${error.substring(0, 200)}` 
        }));
        isProcessing = false;
        return;
      }

      const result = await response.json();
      console.log('Google Speech result:', JSON.stringify(result).substring(0, 200));
      
      if (result.results && result.results.length > 0) {
        // Send transcript to client
        clientWs.send(JSON.stringify({
          type: 'transcript',
          results: result.results,
        }));
      }
    } catch (error) {
      console.error('Transcription error:', error);
      clientWs.send(JSON.stringify({ 
        type: 'error',
        error: error.message 
      }));
    }
    
    isProcessing = false;
  }, 5000); // Process every 5 seconds

  // Receive audio from client
  clientWs.on('message', (data) => {
    if (Buffer.isBuffer(data)) {
      audioBuffer.push(data);
    }
  });

  clientWs.on('close', () => {
    console.log('Client disconnected');
    clearInterval(transcribeInterval);
  });

  clientWs.on('error', (error) => {
    console.error('Client WebSocket error:', error);
    clearInterval(transcribeInterval);
  });
});

server.listen(PORT, () => {
  console.log(`Tyna backend with Google Speech running on http://localhost:${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
  console.log('');
  if (GOOGLE_API_KEY === 'YOUR_GOOGLE_CLOUD_API_KEY_HERE') {
    console.log('⚠️  WARNING: Please set your Google Cloud API key in server-google.js');
    console.log('   1. Go to: https://console.cloud.google.com/');
    console.log('   2. Enable Cloud Speech-to-Text API');
    console.log('   3. Create an API key');
  } else {
    console.log('✓ Google Cloud API key configured');
  }
});
