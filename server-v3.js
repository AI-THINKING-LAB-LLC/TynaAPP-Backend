// Hybrid AssemblyAI backend: quasi-real-time transcription using file API
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = 3001;

// IMPORTANT: Replace with your actual AssemblyAI API key
const ASSEMBLYAI_API_KEY = '595895f409724007acc99cb4dcd98c81';

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ type: 'audio/wav', limit: '50mb' }));

// Upload audio chunk to AssemblyAI
app.post('/api/upload-audio', async (req, res) => {
  try {
    console.log('Uploading audio chunk...');
    const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: {
        'authorization': ASSEMBLYAI_API_KEY,
      },
      body: req.body,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      console.error('Upload error:', error);
      return res.status(uploadResponse.status).json({ error });
    }

    const data = await uploadResponse.json();
    console.log('Audio uploaded:', data.upload_url);
    res.json(data);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start transcription with speaker diarization and language detection
app.post('/api/transcribe', async (req, res) => {
  try {
    const { audio_url } = req.body;
    console.log('Starting transcription for:', audio_url);

    const response = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        'authorization': ASSEMBLYAI_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        audio_url,
        speaker_labels: true,
        language_detection: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Transcription error:', error);
      return res.status(response.status).json({ error });
    }

    const data = await response.json();
    console.log('Transcription started:', data.id);
    res.json(data);
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Poll transcription status
app.get('/api/transcript/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
      headers: {
        'authorization': ASSEMBLYAI_API_KEY,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Poll error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Tyna backend running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  POST /api/upload-audio - Upload audio chunk');
  console.log('  POST /api/transcribe - Start transcription');
  console.log('  GET /api/transcript/:id - Poll transcription status');
});
