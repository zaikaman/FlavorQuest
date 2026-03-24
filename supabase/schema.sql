-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.analytics_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  poi_id uuid,
  session_id uuid NOT NULL,
  rounded_lat double precision,
  rounded_lng double precision,
  language character varying CHECK (language::text = ANY (ARRAY['vi'::character varying, 'en'::character varying, 'ja'::character varying, 'fr'::character varying, 'ko'::character varying, 'zh'::character varying]::text[])),
  event_type character varying NOT NULL CHECK (event_type::text = ANY (ARRAY['tour_start'::character varying, 'tour_end'::character varying, 'auto_play'::character varying, 'manual_play'::character varying, 'skip'::character varying, 'settings_change'::character varying]::text[])),
  listen_duration integer CHECK (listen_duration >= 0),
  completed boolean,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  user_agent text,
  metadata jsonb,
  CONSTRAINT analytics_logs_pkey PRIMARY KEY (id),
  CONSTRAINT analytics_logs_poi_id_fkey FOREIGN KEY (poi_id) REFERENCES public.pois(id)
);
CREATE TABLE public.chat_conversations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  workspace_role character varying NOT NULL CHECK (workspace_role::text = ANY (ARRAY['customer'::character varying, 'owner'::character varying, 'admin'::character varying]::text[])),
  title text NOT NULL DEFAULT 'Cuộc trò chuyện mới'::text,
  last_message_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT chat_conversations_pkey PRIMARY KEY (id),
  CONSTRAINT chat_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.chat_messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL,
  role character varying NOT NULL CHECK (role::text = ANY (ARRAY['user'::character varying, 'assistant'::character varying]::text[])),
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chat_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id)
);
CREATE TABLE public.dishes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  poi_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL CHECK (price >= 0::numeric),
  is_available boolean NOT NULL DEFAULT true,
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT dishes_pkey PRIMARY KEY (id),
  CONSTRAINT dishes_poi_id_fkey FOREIGN KEY (poi_id) REFERENCES public.pois(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  order_id uuid,
  title text NOT NULL,
  message text NOT NULL,
  type character varying NOT NULL DEFAULT 'order_update'::character varying CHECK (type::text = ANY (ARRAY['order_created'::character varying, 'order_update'::character varying, 'system'::character varying]::text[])),
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT notifications_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.preorder_orders(id)
);
CREATE TABLE public.pois (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  radius integer NOT NULL DEFAULT 20 CHECK (radius >= 1 AND radius <= 100),
  priority integer NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  name_vi text NOT NULL,
  name_en text NOT NULL,
  name_ja text,
  name_fr text,
  name_ko text,
  name_zh text,
  description_vi text,
  description_en text,
  description_ja text,
  description_fr text,
  description_ko text,
  description_zh text,
  audio_url_vi text,
  audio_url_en text,
  audio_url_ja text,
  audio_url_fr text,
  audio_url_ko text,
  audio_url_zh text,
  image_url text,
  signature_dish text,
  fun_fact text,
  estimated_hours text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  owner_id uuid,
  category_tags ARRAY NOT NULL DEFAULT ARRAY[]::text[] CHECK (category_tags <@ ARRAY['snails'::text, 'seafood'::text, 'grill'::text]),
  CONSTRAINT pois_pkey PRIMARY KEY (id),
  CONSTRAINT pois_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id)
);
CREATE TABLE public.preorder_order_items (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  order_id uuid NOT NULL,
  dish_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0::numeric),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT preorder_order_items_pkey PRIMARY KEY (id),
  CONSTRAINT preorder_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.preorder_orders(id),
  CONSTRAINT preorder_order_items_dish_id_fkey FOREIGN KEY (dish_id) REFERENCES public.dishes(id)
);
CREATE TABLE public.preorder_orders (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  poi_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  customer_name text,
  customer_phone text,
  note text,
  pickup_time timestamp with time zone CHECK (pickup_time IS NULL OR pickup_time > now()) NOT VALI),
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'confirmed'::character varying, 'preparing'::character varying, 'ready'::character varying, 'delivering'::character varying, 'delivered'::character varying, 'cancelled'::character varying]::text[])),
  total_amount numeric NOT NULL DEFAULT 0 CHECK (total_amount >= 0::numeric),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  order_type character varying NOT NULL DEFAULT 'pickup'::character varying CHECK (order_type::text = ANY (ARRAY['pickup'::character varying, 'delivery'::character varying]::text[])),
  delivery_address text,
  delivery_time timestamp with time zone CHECK (delivery_time IS NULL OR delivery_time > now()) NOT VALI),
  CONSTRAINT preorder_orders_pkey PRIMARY KEY (id),
  CONSTRAINT preorder_orders_poi_id_fkey FOREIGN KEY (poi_id) REFERENCES public.pois(id),
  CONSTRAINT preorder_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id)
);
CREATE TABLE public.support_messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  thread_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_role character varying NOT NULL CHECK (sender_role::text = ANY (ARRAY['customer'::character varying, 'owner'::character varying, 'admin'::character varying]::text[])),
  content text NOT NULL CHECK (char_length(TRIM(BOTH FROM content)) > 0 AND char_length(content) <= 4000),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT support_messages_pkey PRIMARY KEY (id),
  CONSTRAINT support_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.support_threads(id),
  CONSTRAINT support_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id)
);
CREATE TABLE public.support_thread_reads (
  thread_id uuid NOT NULL,
  user_id uuid NOT NULL,
  last_read_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT support_thread_reads_pkey PRIMARY KEY (thread_id, user_id),
  CONSTRAINT support_thread_reads_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.support_threads(id),
  CONSTRAINT support_thread_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.support_threads (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  thread_type character varying NOT NULL CHECK (thread_type::text = ANY (ARRAY['customer_owner'::character varying, 'customer_admin'::character varying, 'owner_admin'::character varying]::text[])),
  customer_id uuid,
  owner_id uuid,
  poi_id uuid,
  created_by uuid NOT NULL,
  subject text,
  last_message_preview text,
  last_message_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT support_threads_pkey PRIMARY KEY (id),
  CONSTRAINT support_threads_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id),
  CONSTRAINT support_threads_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id),
  CONSTRAINT support_threads_poi_id_fkey FOREIGN KEY (poi_id) REFERENCES public.pois(id),
  CONSTRAINT support_threads_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.tours (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name_vi text NOT NULL,
  name_en text,
  name_ja text,
  name_fr text,
  name_ko text,
  name_zh text,
  description_vi text,
  description_en text,
  description_ja text,
  description_fr text,
  description_ko text,
  description_zh text,
  poi_ids ARRAY NOT NULL DEFAULT ARRAY[]::uuid[] CHECK (cardinality(poi_ids) > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  cover_image_url text,
  estimated_duration_min integer CHECK (estimated_duration_min IS NULL OR estimated_duration_min >= 1 AND estimated_duration_min <= 1440),
  CONSTRAINT tours_pkey PRIMARY KEY (id),
  CONSTRAINT tours_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  role character varying NOT NULL DEFAULT 'customer'::character varying CHECK (role::text = ANY (ARRAY['customer'::character varying, 'pending-owner'::character varying, 'owner'::character varying, 'admin'::character varying]::text[])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  owner_request_status character varying CHECK (owner_request_status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying]::text[])),
  owner_requested_at timestamp with time zone,
  owner_reviewed_at timestamp with time zone,
  owner_reviewed_by uuid,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT users_owner_reviewed_by_fkey FOREIGN KEY (owner_reviewed_by) REFERENCES public.users(id)
);