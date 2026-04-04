-- SUPABASE MIGRATION V4: CHAT SYSTEM

-- 1. Chats Table
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT DEFAULT 'direct', -- 'direct', 'project', 'order'
    context_id UUID, -- References projects.id or jobs.id (not hard linked to allow flexible types)
    context_title TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_message TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Chat Participants (Many-to-Many)
CREATE TABLE IF NOT EXISTS chat_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(chat_id, user_id)
);

-- 3. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    sender_name TEXT,
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]', -- Array of { type, url }
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS POLICIES

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Players can see chats they participate in
CREATE POLICY "Users can view their participant records" ON chat_participants
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view chats they are in" ON chats
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_participants 
            WHERE chat_id = chats.id AND user_id = auth.uid()
        )
    );

-- Messages can be seen by chat participants
CREATE POLICY "Participants can view messages" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_participants 
            WHERE chat_id = messages.id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Participants can insert messages" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_participants 
            WHERE chat_id = messages.chat_id AND user_id = auth.uid()
        )
    );
