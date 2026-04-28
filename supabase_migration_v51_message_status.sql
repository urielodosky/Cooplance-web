-- Add delivered_at and is_read (if not exists) to messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id_is_read ON public.messages(receiver_id, is_read);
