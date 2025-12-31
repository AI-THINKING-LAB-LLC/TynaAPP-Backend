// Deepgram WebSocket proxy for real-time transcription with diarization
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

const app = express();
const PORT = 3001;

// IMPORTANT: Get your Deepgram API key from https://console.deepgram.com/
const DEEPGRAM_API_KEY = 'e49e843191cd4b4a171692b9e0c3514285709e22';

app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (clientWs) => {
  console.log('Client connected to Deepgram proxy');
  
  try {
    // Create Deepgram client
    const deepgram = createClient(DEEPGRAM_API_KEY);
    
    // Create live transcription connection
    const dgConnection = deepgram.listen.live({
      model: 'nova-2',
      language: 'multi',
      diarize: true,
      punctuate: true,
      smart_format: true,
      interim_results: false,
      utterance_end_ms: 1500,
      vad_events: true,
      encoding: 'linear16',
      sample_rate: 16000,
      channels: 1,
    });

    dgConnection.on(LiveTranscriptionEvents.Open, () => {
      console.log('Connected to Deepgram');
      clientWs.send(JSON.stringify({ type: 'connected' }));
    });

    dgConnection.on(LiveTranscriptionEvents.Transcript, (data) => {
      // Only forward final transcripts with actual content
      if (data.is_final && data.channel?.alternatives?.[0]?.transcript) {
        const transcript = data.channel.alternatives[0].transcript.trim();
        if (transcript.length > 0) {
          console.log('Deepgram transcript:', transcript);
          clientWs.send(JSON.stringify(data));
        }
      }
    });

    dgConnection.on(LiveTranscriptionEvents.Error, (error) => {
      console.error('Deepgram error:', error);
      clientWs.send(JSON.stringify({ 
        type: 'error',
        error: error.message 
      }));
    });

    dgConnection.on(LiveTranscriptionEvents.Close, () => {
      console.log('Deepgram connection closed');
      clientWs.close();
    });

    // Forward client audio to Deepgram
    clientWs.on('message', (data) => {
      if (Buffer.isBuffer(data)) {
        dgConnection.send(data);
      }
    });

    clientWs.on('close', () => {
      console.log('Client disconnected');
      dgConnection.finish();
    });

    clientWs.on('error', (error) => {
      console.error('Client WebSocket error:', error);
      dgConnection.finish();
    });

  } catch (error) {
    console.error('Failed to create Deepgram connection:', error);
    clientWs.send(JSON.stringify({ 
      type: 'error',
      error: error.message 
    }));
    clientWs.close();
  }
});

server.listen(PORT, () => {
  console.log(`Tyna backend with Deepgram running on http://localhost:${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
  console.log('');
  if (DEEPGRAM_API_KEY === 'YOUR_DEEPGRAM_API_KEY_HERE') {
    console.log('⚠️  WARNING: Please set your Deepgram API key in server-deepgram.js');
    console.log('   Get one for free at: https://console.deepgram.com/signup');
  } else {
    console.log('✓ Deepgram API key configured');
  }
});
