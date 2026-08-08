/* eslint-disable */
// AUTO-GENERATED — DO NOT EDIT
// Run migrations to regenerate.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      analyses: {
        Row: {
          category: Json | null
          created_at: string | null
          first_impression: string | null
          id: string
          overall_score: number | null
          ownership: string | null
          result: Json
          signals: Json | null
          traits: Json | null
          user_id: string
        }
        Insert: {
          category?: Json | null
          created_at?: string | null
          first_impression?: string | null
          id?: string
          overall_score?: number | null
          ownership?: string | null
          result?: Json
          signals?: Json | null
          traits?: Json | null
          user_id: string
        }
        Update: {
          category?: Json | null
          created_at?: string | null
          first_impression?: string | null
          id?: string
          overall_score?: number | null
          ownership?: string | null
          result?: Json
          signals?: Json | null
          traits?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analyses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blink_profiles: {
        Row: {
          avatar_url: string | null
          best_rank: number | null
          category: string | null
          created_at: string
          display_name: string | null
          handle: string | null
          id: string
          is_public: boolean
          last_verified_at: string | null
          peak_score: number
          score: number
          streak: number
          updated_at: string
          verified_count: number
        }
        Insert: {
          avatar_url?: string | null
          best_rank?: number | null
          category?: string | null
          created_at?: string
          display_name?: string | null
          handle?: string | null
          id: string
          is_public?: boolean
          last_verified_at?: string | null
          peak_score?: number
          score?: number
          streak?: number
          updated_at?: string
          verified_count?: number
        }
        Update: {
          avatar_url?: string | null
          best_rank?: number | null
          category?: string | null
          created_at?: string
          display_name?: string | null
          handle?: string | null
          id?: string
          is_public?: boolean
          last_verified_at?: string | null
          peak_score?: number
          score?: number
          streak?: number
          updated_at?: string
          verified_count?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          auth_method: string | null
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          updated_at: string | null
        }
        Insert: {
          auth_method?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_method?: string | null
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      score_history: {
        Row: {
          analysis_id: string | null
          category: string | null
          created_at: string
          id: string
          image_hash: string | null
          score: number
          user_id: string
          verified: boolean
        }
        Insert: {
          analysis_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          image_hash?: string | null
          score: number
          user_id: string
          verified?: boolean
        }
        Update: {
          analysis_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          image_hash?: string | null
          score?: number
          user_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "score_history_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_winners: {
        Row: {
          category: string | null
          created_at: string
          id: string
          improvement: number
          score: number
          user_id: string
          week_start: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          improvement?: number
          score: number
          user_id: string
          week_start: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          improvement?: number
          score?: number
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      leaderboard: {
        Row: {
          avatar_url: string | null
          category: string | null
          category_rank: number | null
          display_name: string | null
          handle: string | null
          id: string | null
          last_verified_at: string | null
          peak_score: number | null
          rank: number | null
          score: number | null
          streak: number | null
          verified_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      user_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
