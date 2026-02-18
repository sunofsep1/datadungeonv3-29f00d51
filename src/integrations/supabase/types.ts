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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          appointments_set: number | null
          calls_made: number | null
          closings: number | null
          contracts_signed: number | null
          created_at: string
          date: string
          gci_earned: number | null
          id: string
          listings_taken: number | null
          offers_written: number | null
          user_id: string
        }
        Insert: {
          appointments_set?: number | null
          calls_made?: number | null
          closings?: number | null
          contracts_signed?: number | null
          created_at?: string
          date?: string
          gci_earned?: number | null
          id?: string
          listings_taken?: number | null
          offers_written?: number | null
          user_id: string
        }
        Update: {
          appointments_set?: number | null
          calls_made?: number | null
          closings?: number | null
          contracts_signed?: number | null
          created_at?: string
          date?: string
          gci_earned?: number | null
          id?: string
          listings_taken?: number | null
          offers_written?: number | null
          user_id?: string
        }
        Relationships: []
      }
      activity_log: {
        Row: {
          activity_type: string
          contact_id: string | null
          created_at: string
          description: string | null
          id: string
          listing_id: string | null
          occurred_at: string
          property_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type?: string
          contact_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          listing_id?: string | null
          occurred_at?: string
          property_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          contact_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          listing_id?: string | null
          occurred_at?: string
          property_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          contact_id: string | null
          created_at: string
          date: string
          google_event_id: string | null
          id: string
          location: string | null
          notes: string | null
          status: string | null
          title: string
          type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          date: string
          google_event_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          status?: string | null
          title: string
          type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          date?: string
          google_event_id?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          status?: string | null
          title?: string
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      calls: {
        Row: {
          call_date: string
          contact_id: string | null
          contact_name: string | null
          created_at: string
          duration_minutes: number | null
          id: string
          notes: string | null
          outcome: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          call_date?: string
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          outcome?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          call_date?: string
          contact_id?: string | null
          contact_name?: string | null
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          outcome?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_addresses: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          address_type: string | null
          city: string | null
          contact_id: string
          country: string | null
          created_at: string
          id: string
          is_primary: boolean
          postal_code: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          address_type?: string | null
          city?: string | null
          contact_id: string
          country?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          address_type?: string | null
          city?: string | null
          contact_id?: string
          country?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_addresses_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_channels: {
        Row: {
          channel_type: string
          channel_value: string
          contact_id: string
          created_at: string
          id: string
          is_primary: boolean | null
          updated_at: string
        }
        Insert: {
          channel_type: string
          channel_value: string
          contact_id: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          updated_at?: string
        }
        Update: {
          channel_type?: string
          channel_value?: string
          contact_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_channels_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_property_links: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          notes: string | null
          property_id: string
          role: string
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          notes?: string | null
          property_id: string
          role?: string
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          property_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_property_links_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_property_links_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tags: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          tag_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          tag_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          current_situation_notes: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          pain_points: string | null
          phone: string | null
          pipeline_stage: string | null
          pleasure_points: string | null
          selling_intentions: string | null
          source: string | null
          status: string | null
          story: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_situation_notes?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          pain_points?: string | null
          phone?: string | null
          pipeline_stage?: string | null
          pleasure_points?: string | null
          selling_intentions?: string | null
          source?: string | null
          status?: string | null
          story?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_situation_notes?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          pain_points?: string | null
          phone?: string | null
          pipeline_stage?: string | null
          pleasure_points?: string | null
          selling_intentions?: string | null
          source?: string | null
          status?: string | null
          story?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interactions: {
        Row: {
          body: string | null
          channel: string | null
          contact_id: string
          created_at: string
          id: string
          subject: string | null
          timestamp: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          channel?: string | null
          contact_id: string
          created_at?: string
          id?: string
          subject?: string | null
          timestamp?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          channel?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          subject?: string | null
          timestamp?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_goals: {
        Row: {
          appointments_set_goal: number | null
          calls_made_goal: number | null
          closings_goal: number | null
          contracts_signed_goal: number | null
          gci_earned_goal: number | null
          id: string
          listings_taken_goal: number | null
          offers_written_goal: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          appointments_set_goal?: number | null
          calls_made_goal?: number | null
          closings_goal?: number | null
          contracts_signed_goal?: number | null
          gci_earned_goal?: number | null
          id?: string
          listings_taken_goal?: number | null
          offers_written_goal?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          appointments_set_goal?: number | null
          calls_made_goal?: number | null
          closings_goal?: number | null
          contracts_signed_goal?: number | null
          gci_earned_goal?: number | null
          id?: string
          listings_taken_goal?: number | null
          offers_written_goal?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          property_interest: string | null
          source: string | null
          status: string | null
          timeline: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          property_interest?: string | null
          source?: string | null
          status?: string | null
          timeline?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          property_interest?: string | null
          source?: string | null
          status?: string | null
          timeline?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      listings: {
        Row: {
          address: string
          bathrooms: number | null
          bedrooms: number | null
          contact_id: string | null
          created_at: string
          id: string
          notes: string | null
          pipeline_stage: string | null
          price: number | null
          property_type: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          bathrooms?: number | null
          bedrooms?: number | null
          contact_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          pipeline_stage?: string | null
          price?: number | null
          property_type?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          bathrooms?: number | null
          bedrooms?: number | null
          contact_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          pipeline_stage?: string | null
          price?: number | null
          property_type?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          content: string | null
          created_at: string
          id: string
          listing_id: string | null
          platform: string | null
          published_date: string | null
          scheduled_date: string | null
          status: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          platform?: string | null
          published_date?: string | null
          scheduled_date?: string | null
          status?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          platform?: string | null
          published_date?: string | null
          scheduled_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          country: string | null
          created_at: string
          id: string
          notes: string | null
          postcode: string | null
          price: number | null
          property_type: string | null
          state: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          postcode?: string | null
          price?: number | null
          property_type?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          postcode?: string | null
          price?: number | null
          property_type?: string | null
          state?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      vision_board_items: {
        Row: {
          color: string
          created_at: string
          id: string
          image_path: string | null
          image_url: string | null
          sort_order: number
          target_date: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          image_path?: string | null
          image_url?: string | null
          sort_order?: number
          target_date?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          image_path?: string | null
          image_url?: string | null
          sort_order?: number
          target_date?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
