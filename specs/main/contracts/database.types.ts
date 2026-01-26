/**
 * Supabase Database Type Definitions
 *
 * File này được auto-generate bởi Supabase CLI:
 * `supabase gen types typescript --project-id <PROJECT_ID> > contracts/database.types.ts`
 *
 * KHÔNG chỉnh sửa file này manually - chạy lại command trên để regenerate
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      pois: {
        Row: {
          id: string;
          lat: number;
          lng: number;
          radius: number;
          priority: number;
          name_vi: string;
          name_en: string;
          name_ja: string | null;
          name_fr: string | null;
          name_ko: string | null;
          name_zh: string | null;
          description_vi: string | null;
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
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          lat: number;
          lng: number;
          radius?: number;
          priority?: number;
          name_vi: string;
          name_en: string;
          name_ja?: string | null;
          name_fr?: string | null;
          name_ko?: string | null;
          name_zh?: string | null;
          description_vi?: string | null;
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
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          lat?: number;
          lng?: number;
          radius?: number;
          priority?: number;
          name_vi?: string;
          name_en?: string;
          name_ja?: string | null;
          name_fr?: string | null;
          name_ko?: string | null;
          name_zh?: string | null;
          description_vi?: string | null;
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
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      analytics_logs: {
        Row: {
          id: string;
          poi_id: string | null;
          session_id: string;
          rounded_lat: number | null;
          rounded_lng: number | null;
          language: string | null;
          event_type: string;
          listen_duration: number | null;
          completed: boolean | null;
          timestamp: string;
          user_agent: string | null;
        };
        Insert: {
          id?: string;
          poi_id?: string | null;
          session_id: string;
          rounded_lat?: number | null;
          rounded_lng?: number | null;
          language?: string | null;
          event_type: string;
          listen_duration?: number | null;
          completed?: boolean | null;
          timestamp?: string;
          user_agent?: string | null;
        };
        Update: {
          id?: string;
          poi_id?: string | null;
          session_id?: string;
          rounded_lat?: number | null;
          rounded_lng?: number | null;
          language?: string | null;
          event_type?: string;
          listen_duration?: number | null;
          completed?: boolean | null;
          timestamp?: string;
          user_agent?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'analytics_logs_poi_id_fkey';
            columns: ['poi_id'];
            referencedRelation: 'pois';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          id: string;
          email: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
