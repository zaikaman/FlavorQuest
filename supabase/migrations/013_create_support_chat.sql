-- Migration: 013_create_support_chat
-- Description: Chat nghiệp vụ giữa customer, owner và admin
-- Created: 2026-03-15

CREATE TABLE IF NOT EXISTS support_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_type VARCHAR(32) NOT NULL CHECK (thread_type IN ('customer_owner', 'customer_admin', 'owner_admin')),
  customer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  poi_id UUID REFERENCES pois(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT,
  last_message_preview TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT support_threads_shape_check CHECK (
    (thread_type = 'customer_owner' AND customer_id IS NOT NULL AND owner_id IS NOT NULL AND poi_id IS NOT NULL)
    OR
    (thread_type = 'customer_admin' AND customer_id IS NOT NULL AND owner_id IS NULL AND poi_id IS NULL)
    OR
    (thread_type = 'owner_admin' AND customer_id IS NULL AND owner_id IS NOT NULL AND poi_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role VARCHAR(16) NOT NULL CHECK (sender_role IN ('customer', 'owner', 'admin')),
  content TEXT NOT NULL CHECK (char_length(trim(content)) > 0 AND char_length(content) <= 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_thread_reads (
  thread_id UUID NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (thread_id, user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS support_threads_customer_owner_unique
  ON support_threads(customer_id, owner_id, poi_id)
  WHERE thread_type = 'customer_owner';

CREATE UNIQUE INDEX IF NOT EXISTS support_threads_customer_admin_unique
  ON support_threads(customer_id)
  WHERE thread_type = 'customer_admin';

CREATE UNIQUE INDEX IF NOT EXISTS support_threads_owner_admin_unique
  ON support_threads(owner_id)
  WHERE thread_type = 'owner_admin';

CREATE INDEX IF NOT EXISTS idx_support_threads_customer_last_message
  ON support_threads(customer_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_threads_owner_last_message
  ON support_threads(owner_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_threads_type_last_message
  ON support_threads(thread_type, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_messages_thread_created
  ON support_messages(thread_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_support_thread_reads_user_updated
  ON support_thread_reads(user_id, updated_at DESC);

CREATE TRIGGER update_support_threads_updated_at
  BEFORE UPDATE ON support_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_thread_reads_updated_at
  BEFORE UPDATE ON support_thread_reads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE support_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_thread_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read accessible support threads"
  ON support_threads
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = customer_id
    OR auth.uid() = owner_id
    OR (
      thread_type IN ('customer_admin', 'owner_admin')
      AND EXISTS (
        SELECT 1
        FROM users
        WHERE users.id = auth.uid()
          AND users.role = 'admin'
      )
    )
  );

CREATE POLICY "Users can read accessible support messages"
  ON support_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM support_threads
      WHERE support_threads.id = support_messages.thread_id
        AND (
          auth.uid() = support_threads.customer_id
          OR auth.uid() = support_threads.owner_id
          OR (
            support_threads.thread_type IN ('customer_admin', 'owner_admin')
            AND EXISTS (
              SELECT 1
              FROM users
              WHERE users.id = auth.uid()
                AND users.role = 'admin'
            )
          )
        )
    )
  );

CREATE POLICY "Users can read own support read markers"
  ON support_thread_reads
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM support_threads
      WHERE support_threads.id = support_thread_reads.thread_id
        AND (
          auth.uid() = support_threads.customer_id
          OR auth.uid() = support_threads.owner_id
          OR (
            support_threads.thread_type IN ('customer_admin', 'owner_admin')
            AND EXISTS (
              SELECT 1
              FROM users
              WHERE users.id = auth.uid()
                AND users.role = 'admin'
            )
          )
        )
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'support_threads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_threads;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'support_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'support_thread_reads'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_thread_reads;
  END IF;
END $$;

COMMENT ON TABLE support_threads IS 'Luồng chat nghiệp vụ giữa customer, owner và admin';
COMMENT ON TABLE support_messages IS 'Tin nhắn trong từng luồng chat nghiệp vụ';
COMMENT ON TABLE support_thread_reads IS 'Mốc đã đọc theo từng người dùng cho từng luồng chat';
