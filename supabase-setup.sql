-- Supabase Database Schema for Tyna
-- Run this in Supabase SQL Editor
-- This script is idempotent - safe to run multiple times

-- 1. Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT CHECK (status IN ('live', 'ended', 'scheduled')) DEFAULT 'live',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Transcripts table
CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  speaker TEXT NOT NULL,
  text TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  language_code TEXT,
  confidence FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Meeting summaries table
CREATE TABLE IF NOT EXISTS meeting_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE UNIQUE,
  summary_text TEXT DEFAULT '',
  action_items JSONB DEFAULT '[]'::jsonb,
  user_notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist (for existing tables)
DO $$ 
BEGIN
  -- Ensure status column exists first
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'meetings' AND column_name = 'status') THEN
    ALTER TABLE meetings ADD COLUMN status TEXT DEFAULT 'live';
  END IF;
  
  -- Update status constraint to include 'scheduled' (for Google Calendar meetings)
  -- Drop old constraint if it exists
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'meetings_status_check' 
             AND table_name = 'meetings') THEN
    ALTER TABLE meetings DROP CONSTRAINT meetings_status_check;
  END IF;
  
  -- Add new constraint with 'scheduled' included (only if column exists)
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'meetings' AND column_name = 'status') THEN
    ALTER TABLE meetings ADD CONSTRAINT meetings_status_check 
      CHECK (status IN ('live', 'ended', 'scheduled'));
  END IF;
  
  -- Add summary_text if it doesn't exist (migration from old schema)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'meeting_summaries' AND column_name = 'summary_text') THEN
    ALTER TABLE meeting_summaries ADD COLUMN summary_text TEXT DEFAULT '';
  END IF;
  
  -- Add user_notes if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'meeting_summaries' AND column_name = 'user_notes') THEN
    ALTER TABLE meeting_summaries ADD COLUMN user_notes TEXT DEFAULT '';
  END IF;
  
  -- Ensure started_at exists in meetings table (for schema cache issues)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'meetings' AND column_name = 'started_at') THEN
    ALTER TABLE meetings ADD COLUMN started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  
  -- Ensure ended_at exists in meetings table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'meetings' AND column_name = 'ended_at') THEN
    ALTER TABLE meetings ADD COLUMN ended_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Ensure duration_seconds exists in meetings table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'meetings' AND column_name = 'duration_seconds') THEN
    ALTER TABLE meetings ADD COLUMN duration_seconds INTEGER;
  END IF;
END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_summaries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can create own profile" ON profiles;
CREATE POLICY "Users can create own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for meetings
DROP POLICY IF EXISTS "Users can view own meetings" ON meetings;
CREATE POLICY "Users can view own meetings" ON meetings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own meetings" ON meetings;
CREATE POLICY "Users can create own meetings" ON meetings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own meetings" ON meetings;
CREATE POLICY "Users can update own meetings" ON meetings
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own meetings" ON meetings;
CREATE POLICY "Users can delete own meetings" ON meetings
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for transcripts
DROP POLICY IF EXISTS "Users can view transcripts of own meetings" ON transcripts;
CREATE POLICY "Users can view transcripts of own meetings" ON transcripts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM meetings 
      WHERE meetings.id = transcripts.meeting_id 
      AND meetings.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create transcripts for own meetings" ON transcripts;
CREATE POLICY "Users can create transcripts for own meetings" ON transcripts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings 
      WHERE meetings.id = transcripts.meeting_id 
      AND meetings.user_id = auth.uid()
    )
  );

-- RLS Policies for chat_messages
DROP POLICY IF EXISTS "Users can view chat of own meetings" ON chat_messages;
CREATE POLICY "Users can view chat of own meetings" ON chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM meetings 
      WHERE meetings.id = chat_messages.meeting_id 
      AND meetings.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create chat for own meetings" ON chat_messages;
CREATE POLICY "Users can create chat for own meetings" ON chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings 
      WHERE meetings.id = chat_messages.meeting_id 
      AND meetings.user_id = auth.uid()
    )
  );

-- RLS Policies for meeting_summaries
DROP POLICY IF EXISTS "Users can view summaries of own meetings" ON meeting_summaries;
CREATE POLICY "Users can view summaries of own meetings" ON meeting_summaries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM meetings 
      WHERE meetings.id = meeting_summaries.meeting_id 
      AND meetings.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create summaries for own meetings" ON meeting_summaries;
CREATE POLICY "Users can create summaries for own meetings" ON meeting_summaries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings 
      WHERE meetings.id = meeting_summaries.meeting_id 
      AND meetings.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update summaries for own meetings" ON meeting_summaries;
CREATE POLICY "Users can update summaries for own meetings" ON meeting_summaries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM meetings 
      WHERE meetings.id = meeting_summaries.meeting_id 
      AND meetings.user_id = auth.uid()
    )
  );

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_meeting_id ON transcripts(meeting_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_meeting_id ON chat_messages(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_summaries_meeting_id ON meeting_summaries(meeting_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Google Calendar OAuth tokens table
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for google_calendar_tokens
ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for google_calendar_tokens
DROP POLICY IF EXISTS "Users can view own Google Calendar tokens" ON google_calendar_tokens;
CREATE POLICY "Users can view own Google Calendar tokens" ON google_calendar_tokens
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own Google Calendar tokens" ON google_calendar_tokens;
CREATE POLICY "Users can create own Google Calendar tokens" ON google_calendar_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own Google Calendar tokens" ON google_calendar_tokens;
CREATE POLICY "Users can update own Google Calendar tokens" ON google_calendar_tokens
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own Google Calendar tokens" ON google_calendar_tokens;
CREATE POLICY "Users can delete own Google Calendar tokens" ON google_calendar_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Index for google_calendar_tokens
CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_user_id ON google_calendar_tokens(user_id);

-- Trigger for google_calendar_tokens
DROP TRIGGER IF EXISTS update_google_calendar_tokens_updated_at ON google_calendar_tokens;
CREATE TRIGGER update_google_calendar_tokens_updated_at
  BEFORE UPDATE ON google_calendar_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
