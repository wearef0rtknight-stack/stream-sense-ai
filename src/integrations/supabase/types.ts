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
      search_cache: {
        Row: {
          analysis: string | null
          created_at: string
          hit_count: number
          id: string
          language: string
          platform: string
          query_norm: string
          raw_query: string
          results: Json
          updated_at: string
        }
        Insert: {
          analysis?: string | null
          created_at?: string
          hit_count?: number
          id?: string
          language?: string
          platform?: string
          query_norm: string
          raw_query: string
          results?: Json
          updated_at?: string
        }
        Update: {
          analysis?: string | null
          created_at?: string
          hit_count?: number
          id?: string
          language?: string
          platform?: string
          query_norm?: string
          raw_query?: string
          results?: Json
          updated_at?: string
        }
        Relationships: []
      }
      taste_profiles: {
        Row: {
          created_at: string
          id: string
          interactions: number
          searches: Json
          subject_key: string
          updated_at: string
          user_id: string | null
          weights: Json
        }
        Insert: {
          created_at?: string
          id?: string
          interactions?: number
          searches?: Json
          subject_key: string
          updated_at?: string
          user_id?: string | null
          weights?: Json
        }
        Update: {
          created_at?: string
          id?: string
          interactions?: number
          searches?: Json
          subject_key?: string
          updated_at?: string
          user_id?: string | null
          weights?: Json
        }
        Relationships: []
      }
      titles: {
        Row: {
          analysis: string | null
          audio_tracks: string[]
          availability_ok: boolean
          box_office: string | null
          budget: string | null
          category: string | null
          created_at: string
          genres: string[]
          hindi_status: string
          hindi_verified_on: string | null
          id: string
          last_checked_at: string
          name: string
          platform: string | null
          poster_url: string | null
          rating_imdb: number | null
          rating_rt: number | null
          runtime: string | null
          slug: string
          stream_url: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          analysis?: string | null
          audio_tracks?: string[]
          availability_ok?: boolean
          box_office?: string | null
          budget?: string | null
          category?: string | null
          created_at?: string
          genres?: string[]
          hindi_status?: string
          hindi_verified_on?: string | null
          id?: string
          last_checked_at?: string
          name: string
          platform?: string | null
          poster_url?: string | null
          rating_imdb?: number | null
          rating_rt?: number | null
          runtime?: string | null
          slug: string
          stream_url?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          analysis?: string | null
          audio_tracks?: string[]
          availability_ok?: boolean
          box_office?: string | null
          budget?: string | null
          category?: string | null
          created_at?: string
          genres?: string[]
          hindi_status?: string
          hindi_verified_on?: string | null
          id?: string
          last_checked_at?: string
          name?: string
          platform?: string | null
          poster_url?: string | null
          rating_imdb?: number | null
          rating_rt?: number | null
          runtime?: string | null
          slug?: string
          stream_url?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_cached_search: {
        Args: {
          _language: string
          _platform: string
          _query: string
          _threshold?: number
        }
        Returns: {
          analysis: string
          id: string
          raw_query: string
          results: Json
          similarity: number
          updated_at: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
