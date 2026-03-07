/**
 * Database Types - Generated from Supabase Schema
 * 
 * TEMPORARY FILE: Placeholder types until Supabase CLI generates actual types
 * 
 * To generate actual types, run:
 * ```bash
 * supabase gen types typescript --project-id lvmtwqgvlgngnegoaxam > lib/types/database.types.ts
 * ```
 * 
 * Or if you have project linked locally:
 * ```bash
 * supabase gen types typescript --linked > lib/types/database.types.ts
 * ```
 * 
 * This file will be replaced with actual generated types after running the command.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      pois: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
          owner_id: string | null;
          lat: number;
          lng: number;
          radius: number;
          priority: number;
          name_vi: string;
          name_en: string | null;
          name_ja: string | null;
          name_fr: string | null;
          name_ko: string | null;
          name_zh: string | null;
          description_vi: string;
          description_en: string | null;
          description_ja: string | null;
          description_fr: string | null;
          description_ko: string | null;
          description_zh: string | null;
          audio_url_vi: string | null;
          audio_url_en: string | null;
          audio_url_ja: string | null;
          audio_url_fr: string | null;
          audio_url_ko: string | null;
          audio_url_zh: string | null;
          image_url: string | null;
          signature_dish: string | null;
          fun_fact: string | null;
          estimated_hours: string | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          owner_id?: string | null;
          lat: number;
          lng: number;
          radius?: number;
          priority?: number;
          name_vi: string;
          name_en?: string | null;
          name_ja?: string | null;
          name_fr?: string | null;
          name_ko?: string | null;
          name_zh?: string | null;
          description_vi: string;
          description_en?: string | null;
          description_ja?: string | null;
          description_fr?: string | null;
          description_ko?: string | null;
          description_zh?: string | null;
          audio_url_vi?: string | null;
          audio_url_en?: string | null;
          audio_url_ja?: string | null;
          audio_url_fr?: string | null;
          audio_url_ko?: string | null;
          audio_url_zh?: string | null;
          image_url?: string | null;
          signature_dish?: string | null;
          fun_fact?: string | null;
          estimated_hours?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
          owner_id?: string | null;
          lat?: number;
          lng?: number;
          radius?: number;
          priority?: number;
          name_vi?: string;
          name_en?: string | null;
          name_ja?: string | null;
          name_fr?: string | null;
          name_ko?: string | null;
          name_zh?: string | null;
          description_vi?: string;
          description_en?: string | null;
          description_ja?: string | null;
          description_fr?: string | null;
          description_ko?: string | null;
          description_zh?: string | null;
          audio_url_vi?: string | null;
          audio_url_en?: string | null;
          audio_url_ja?: string | null;
          audio_url_fr?: string | null;
          audio_url_ko?: string | null;
          audio_url_zh?: string | null;
          image_url?: string | null;
          signature_dish?: string | null;
          fun_fact?: string | null;
          estimated_hours?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pois_owner_id_fkey';
            columns: ['owner_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      analytics_logs: {
        Row: {
          id: string;
          created_at: string;
          event_type: 'tour_start' | 'tour_end' | 'auto_play' | 'manual_play' | 'skip' | 'settings_change';
          poi_id: string | null;
          language: string | null;
          rounded_lat: number | null;
          rounded_lng: number | null;
          session_id: string | null;
          user_agent: string | null;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          event_type: 'tour_start' | 'tour_end' | 'auto_play' | 'manual_play' | 'skip' | 'settings_change';
          poi_id?: string | null;
          language?: string | null;
          rounded_lat?: number | null;
          rounded_lng?: number | null;
          session_id?: string | null;
          user_agent?: string | null;
          metadata?: Json | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          event_type?: 'tour_start' | 'tour_end' | 'auto_play' | 'manual_play' | 'skip' | 'settings_change';
          poi_id?: string | null;
          language?: string | null;
          rounded_lat?: number | null;
          rounded_lng?: number | null;
          session_id?: string | null;
          user_agent?: string | null;
          metadata?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'analytics_logs_poi_id_fkey';
            columns: ['poi_id'];
            referencedRelation: 'pois';
            referencedColumns: ['id'];
          }
        ];
      };
      users: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          email: string;
          role: 'customer' | 'owner' | 'admin';
          customer_access_granted: boolean;
          customer_access_granted_at: string | null;
          customer_access_payment_order_code: number | null;
          customer_access_payment_link_id: string | null;
        };
        Insert: {
          id: string;
          created_at?: string;
          updated_at?: string;
          email: string;
          role?: 'customer' | 'owner' | 'admin';
          customer_access_granted?: boolean;
          customer_access_granted_at?: string | null;
          customer_access_payment_order_code?: number | null;
          customer_access_payment_link_id?: string | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          email?: string;
          role?: 'customer' | 'owner' | 'admin';
          customer_access_granted?: boolean;
          customer_access_granted_at?: string | null;
          customer_access_payment_order_code?: number | null;
          customer_access_payment_link_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'users_id_fkey';
            columns: ['id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      dishes: {
        Row: {
          id: string;
          poi_id: string;
          name: string;
          description: string | null;
          price: number;
          is_available: boolean;
          image_url: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          poi_id: string;
          name: string;
          description?: string | null;
          price: number;
          is_available?: boolean;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          poi_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          is_available?: boolean;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'dishes_poi_id_fkey';
            columns: ['poi_id'];
            referencedRelation: 'pois';
            referencedColumns: ['id'];
          }
        ];
      };
      preorder_orders: {
        Row: {
          id: string;
          poi_id: string;
          customer_id: string;
          customer_name: string | null;
          customer_phone: string | null;
          note: string | null;
          pickup_time: string | null;
          status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'cancelled';
          total_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          poi_id: string;
          customer_id: string;
          customer_name?: string | null;
          customer_phone?: string | null;
          note?: string | null;
          pickup_time?: string | null;
          status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'cancelled';
          total_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          poi_id?: string;
          customer_id?: string;
          customer_name?: string | null;
          customer_phone?: string | null;
          note?: string | null;
          pickup_time?: string | null;
          status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'cancelled';
          total_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'preorder_orders_poi_id_fkey';
            columns: ['poi_id'];
            referencedRelation: 'pois';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'preorder_orders_customer_id_fkey';
            columns: ['customer_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
      preorder_order_items: {
        Row: {
          id: string;
          order_id: string;
          dish_id: string;
          quantity: number;
          unit_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          dish_id: string;
          quantity: number;
          unit_price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          dish_id?: string;
          quantity?: number;
          unit_price?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'preorder_order_items_order_id_fkey';
            columns: ['order_id'];
            referencedRelation: 'preorder_orders';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'preorder_order_items_dish_id_fkey';
            columns: ['dish_id'];
            referencedRelation: 'dishes';
            referencedColumns: ['id'];
          }
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          order_id: string | null;
          title: string;
          message: string;
          type: 'order_created' | 'order_update' | 'system';
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          order_id?: string | null;
          title: string;
          message: string;
          type?: 'order_created' | 'order_update' | 'system';
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          order_id?: string | null;
          title?: string;
          message?: string;
          type?: 'order_created' | 'order_update' | 'system';
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_order_id_fkey';
            columns: ['order_id'];
            referencedRelation: 'preorder_orders';
            referencedColumns: ['id'];
          }
        ];
      };
      customer_access_payments: {
        Row: {
          id: string;
          user_id: string;
          order_code: number;
          payment_link_id: string | null;
          amount: number;
          status: 'PENDING' | 'PROCESSING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'FAILED' | 'UNDERPAID';
          checkout_url: string | null;
          qr_code: string | null;
          description: string;
          return_query: Json | null;
          raw_payment_data: Json | null;
          webhook_payload: Json | null;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          order_code: number;
          payment_link_id?: string | null;
          amount: number;
          status?: 'PENDING' | 'PROCESSING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'FAILED' | 'UNDERPAID';
          checkout_url?: string | null;
          qr_code?: string | null;
          description: string;
          return_query?: Json | null;
          raw_payment_data?: Json | null;
          webhook_payload?: Json | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          order_code?: number;
          payment_link_id?: string | null;
          amount?: number;
          status?: 'PENDING' | 'PROCESSING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'FAILED' | 'UNDERPAID';
          checkout_url?: string | null;
          qr_code?: string | null;
          description?: string;
          return_query?: Json | null;
          raw_payment_data?: Json | null;
          webhook_payload?: Json | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'customer_access_payments_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'users';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_poi_analytics: {
        Args: {
          poi_uuid: string;
        };
        Returns: {
          event_type: string;
          language: string;
          event_count: number;
        }[];
      };
      get_tour_analytics: {
        Args: {
          start_date: string;
          end_date: string;
        };
        Returns: {
          date: string;
          total_tours: number;
          total_plays: number;
          unique_sessions: number;
        }[];
      };
      is_admin: {
        Args: {
          user_uuid: string;
        };
        Returns: boolean;
      };
      current_user_is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      promote_to_admin: {
        Args: {
          user_email: string;
        };
        Returns: boolean;
      };
      demote_to_user: {
        Args: {
          user_email: string;
        };
        Returns: boolean;
      };
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
    Enums: {
      event_type: 'tour_start' | 'tour_end' | 'auto_play' | 'manual_play' | 'skip' | 'settings_change';
      user_role: 'customer' | 'owner' | 'admin';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
