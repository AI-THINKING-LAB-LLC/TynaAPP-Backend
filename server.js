// WebSocket proxy server for AssemblyAI Universal Streaming
import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

const app = express();
const PORT = 3001;

// IMPORTANT: Replace with your actual AssemblyAI API key
const ASSEMBLYAI_API_KEY = '595895f409724007acc99cb4dcd98c81';

app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (clientWs) => {
  console.log('Client connected to proxy');
  
  // Connect to AssemblyAI v3 Universal Streaming
  const assemblyWs = new WebSocket(
    `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${ASSEMBLYAI_API_KEY}`
  );

  assemblyWs.on('open', () => {
    console.log('Connected to AssemblyAI');
    clientWs.send(JSON.stringify({ type: 'connected' }));
  });

  assemblyWs.on('message', (data) => {
    // Forward AssemblyAI messages to client
    clientWs.send(data);
  });

  assemblyWs.on('error', (error) => {
    console.error('AssemblyAI WebSocket error:', error);
    clientWs.send(JSON.stringify({ type: 'error', message: error.message }));
  });

  assemblyWs.on('close', () => {
    console.log('AssemblyAI connection closed');
    clientWs.close();
  });

  clientWs.on('message', (data) => {
    // Forward client audio to AssemblyAI
    if (assemblyWs.readyState === WebSocket.OPEN) {
      assemblyWs.send(data);
    }
  });

  clientWs.on('close', () => {
    console.log('Client disconnected');
    assemblyWs.close();
  });

  clientWs.on('error', (error) => {
    console.error('Client WebSocket error:', error);
    assemblyWs.close();
  });
});

server.listen(PORT, () => {
  console.log(`Tyna backend running on http://localhost:${PORT}`);
  console.log(`WebSocket proxy available at ws://localhost:${PORT}/ws`);
});
