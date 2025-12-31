import { TranscriptEntry } from "../types";

// Get backend URL (for API calls)
const getBackendUrl = (): string => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  if (backendUrl) {
    return backendUrl.replace(/\/$/, ''); // Remove trailing slash
  }
  // Fallback to current origin in production
  if (typeof window !== 'undefined' && !import.meta.env.DEV) {
    return window.location.origin;
  }
  // Default to localhost for development
  return 'http://localhost:3001';
};

export const generateMeetingChatResponse = async (
  history: TranscriptEntry[],
  userQuery: string
): Promise<string> => {
  try {
    const backendUrl = getBackendUrl();
    const apiUrl = `${backendUrl}/api/openai/chat`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        history,
        userQuery
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('Backend API Error:', error);
      
      if (response.status === 500 && error.message?.includes('not configured')) {
        return "⚠️ OpenAI API Key not configured.\n\n" +
               "✅ Solution:\n" +
               "1. Add OPENAI_API_KEY in Railway Dashboard > Variables\n" +
               "2. The server will automatically pick it up (no redeploy needed!)\n" +
               "3. Refresh this page\n\n" +
               "💡 Note: Use OPENAI_API_KEY (not VITE_OPENAI_API_KEY) - it works at runtime!";
      }
      
      return `❌ Error: ${error.message || 'Failed to generate response'}`;
    }

    const data = await response.json();
    return data.response || "I couldn't generate a response.";
  } catch (error) {
    console.error("OpenAI Chat Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Sorry, I'm having trouble connecting to the server: ${errorMessage}`;
  }
};

export const generateMeetingTitle = async (
  transcript: TranscriptEntry[]
): Promise<string> => {
  try {
    // Si le transcript est vide, retourner un titre par défaut
    if (!transcript || transcript.length === 0) {
      return 'Untitled Session';
    }

    const backendUrl = getBackendUrl();
    const apiUrl = `${backendUrl}/api/openai/title`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transcript
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('Backend API Error:', error);
      
      if (response.status === 500 && error.message?.includes('not configured')) {
        // Fallback: générer un titre simple basé sur le premier message
        const firstText = transcript[0]?.text || '';
        if (firstText.length > 0) {
          const words = firstText.split(' ').slice(0, 5).join(' ');
          return words.length > 50 ? words.substring(0, 50) + '...' : words;
        }
        return 'Untitled Session';
      }
      
      // Fallback en cas d'erreur
      const firstText = transcript[0]?.text || '';
      if (firstText.length > 0) {
        const words = firstText.split(' ').slice(0, 5).join(' ');
        return words.length > 50 ? words.substring(0, 50) + '...' : words;
      }
      return 'Untitled Session';
    }

    const data = await response.json();
    return data.title || 'Untitled Session';
  } catch (error) {
    console.error("OpenAI Title Error:", error);
    // Fallback: utiliser les premiers mots du transcript
    if (transcript && transcript.length > 0) {
      const firstText = transcript[0]?.text || '';
      if (firstText.length > 0) {
        const words = firstText.split(' ').slice(0, 5).join(' ');
        return words.length > 50 ? words.substring(0, 50) + '...' : words;
      }
    }
    return 'Untitled Session';
  }
};

export const generateFollowUpEmail = async (
  transcript: TranscriptEntry[],
  meetingTitle: string
): Promise<{ subject: string; body: string; emails: string[] }> => {
  try {
    const backendUrl = getBackendUrl();
    const apiUrl = `${backendUrl}/api/openai/followup-email`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transcript,
        meetingTitle
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('Backend API Error:', error);
      
      if (response.status === 500 && error.message?.includes('not configured')) {
        return {
          subject: `Follow-up: ${meetingTitle}`,
          body: "Thank you for attending the meeting. Please find the meeting summary attached.",
          emails: []
        };
      }
      
      // Fallback: extract emails manually
      const transcriptText = transcript.map(t => t.text).join(' ');
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const emails = [...new Set(transcriptText.match(emailRegex) || [])];
      
      return {
        subject: `Follow-up: ${meetingTitle}`,
        body: "Thank you for attending the meeting. Please find the meeting summary attached.",
        emails
      };
    }

    const data = await response.json();
    return {
      subject: data.subject || `Follow-up: ${meetingTitle}`,
      body: data.body || "Thank you for attending the meeting.",
      emails: data.emails || []
    };
  } catch (error) {
    console.error("OpenAI Follow-up Email Error:", error);
    // Fallback: extract emails manually
    const transcriptText = transcript.map(t => t.text).join(' ');
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = [...new Set(transcriptText.match(emailRegex) || [])];
    
    return {
      subject: `Follow-up: ${meetingTitle}`,
      body: "Thank you for attending the meeting. Please find the meeting summary attached.",
      emails
    };
  }
};

export const generateMeetingSummary = async (
  transcript: TranscriptEntry[]
): Promise<{ summary: string; actionItems: string[] }> => {
  try {
    const backendUrl = getBackendUrl();
    const apiUrl = `${backendUrl}/api/openai/summary`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transcript
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('Backend API Error:', error);
      
      if (response.status === 500 && error.message?.includes('not configured')) {
        return {
          summary: "⚠️ OpenAI API Key not configured.\n\n" +
                  "✅ Solution:\n" +
                  "1. Add OPENAI_API_KEY in Railway Dashboard > Variables\n" +
                  "2. The server will automatically pick it up (no redeploy needed!)\n" +
                  "3. Refresh this page\n\n" +
                  "💡 Note: Use OPENAI_API_KEY (not VITE_OPENAI_API_KEY) - it works at runtime!",
          actionItems: [
            "Add OPENAI_API_KEY in Railway Dashboard > Variables",
            "Refresh this page",
            "Try generating the summary again"
          ]
        };
      }
      
      return {
        summary: `Error: ${error.message || 'Failed to generate summary'}`,
        actionItems: []
      };
    }

    const data = await response.json();
    return {
      summary: data.summary || "No summary available.",
      actionItems: data.actionItems || []
    };
  } catch (error) {
    console.error("OpenAI Summary Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      summary: `Error generating summary: ${errorMessage}`,
      actionItems: []
    };
  }
};
