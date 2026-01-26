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
        Relationships: [];
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
          role: 'user' | 'admin';
        };
        Insert: {
          id: string;
          created_at?: string;
          updated_at?: string;
          email: string;
          role?: 'user' | 'admin';
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          email?: string;
          role?: 'user' | 'admin';
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
    };
    Enums: {
      event_type: 'tour_start' | 'tour_end' | 'auto_play' | 'manual_play' | 'skip' | 'settings_change';
      user_role: 'user' | 'admin';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
