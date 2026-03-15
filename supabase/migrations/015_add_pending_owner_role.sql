-- Migration: 015_add_pending_owner_role
-- Description: Add pending-owner as a first-class user role for owner approval flow

ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_role_check;

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.users;
DROP POLICY IF EXISTS "Users can read accessible support threads" ON public.support_threads;
DROP POLICY IF EXISTS "Users can read accessible support messages" ON public.support_messages;
DROP POLICY IF EXISTS "Users can read own support read markers" ON public.support_thread_reads;

ALTER TABLE public.users
ALTER COLUMN role TYPE VARCHAR(32);

ALTER TABLE public.users
ADD CONSTRAINT users_role_check
CHECK (role IN ('customer', 'pending-owner', 'owner', 'admin'));

CREATE POLICY "Admins can read all profiles"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update user roles"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can read accessible support threads"
  ON public.support_threads
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = customer_id
    OR auth.uid() = owner_id
    OR (
      thread_type IN ('customer_admin', 'owner_admin')
      AND EXISTS (
        SELECT 1
        FROM public.users
        WHERE users.id = auth.uid()
          AND users.role = 'admin'
      )
    )
  );

CREATE POLICY "Users can read accessible support messages"
  ON public.support_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.support_threads
      WHERE support_threads.id = support_messages.thread_id
        AND (
          auth.uid() = support_threads.customer_id
          OR auth.uid() = support_threads.owner_id
          OR (
            support_threads.thread_type IN ('customer_admin', 'owner_admin')
            AND EXISTS (
              SELECT 1
              FROM public.users
              WHERE users.id = auth.uid()
                AND users.role = 'admin'
            )
          )
        )
    )
  );

CREATE POLICY "Users can read own support read markers"
  ON public.support_thread_reads
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.support_threads
      WHERE support_threads.id = support_thread_reads.thread_id
        AND (
          auth.uid() = support_threads.customer_id
          OR auth.uid() = support_threads.owner_id
          OR (
            support_threads.thread_type IN ('customer_admin', 'owner_admin')
            AND EXISTS (
              SELECT 1
              FROM public.users
              WHERE users.id = auth.uid()
                AND users.role = 'admin'
            )
          )
        )
    )
  );

CREATE INDEX IF NOT EXISTS idx_users_role_pending_owner
ON public.users(role)
WHERE role = 'pending-owner';

COMMENT ON CONSTRAINT users_role_check ON public.users IS
'Role hợp lệ của người dùng: customer, pending-owner, owner, admin';
