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
  CONSTRAINT analytics_logs_pkey PRIMARY KEY (id),
  CONSTRAINT analytics_logs_poi_id_fkey FOREIGN KEY (poi_id) REFERENCES public.pois(id)
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
  lat double precision NOT NULL CHECK (lat >= 10.750::double precision AND lat <= 10.765::double precision),
  lng double precision NOT NULL CHECK (lng >= 106.690::double precision AND lng <= 106.710::double precision),
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
  pickup_time timestamp with time zone,
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'confirmed'::character varying, 'preparing'::character varying, 'ready'::character varying, 'cancelled'::character varying]::text[])),
  total_amount numeric NOT NULL DEFAULT 0 CHECK (total_amount >= 0::numeric),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT preorder_orders_pkey PRIMARY KEY (id),
  CONSTRAINT preorder_orders_poi_id_fkey FOREIGN KEY (poi_id) REFERENCES public.pois(id),
  CONSTRAINT preorder_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  role character varying NOT NULL DEFAULT 'customer'::character varying CHECK (role::text = ANY (ARRAY['customer'::character varying, 'owner'::character varying, 'admin'::character varying]::text[])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);