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
          activity_type: string
          contact_id: string | null
          created_at: string | null
          deal_id: string | null
          description: string | null
          id: string
          property_id: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          description?: string | null
          id?: string
          property_id?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          description?: string | null
          id?: string
          property_id?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_log: {
        Row: {
          id: string
          user_id: string
          activity_type: string
          title: string
          description: string | null
          occurred_at: string
          created_at: string
          contact_id: string | null
          property_id: string | null
          listing_id: string | null
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          activity_type?: string
          title: string
          description?: string | null
          occurred_at?: string
          created_at?: string
          contact_id?: string | null
          property_id?: string | null
          listing_id?: string | null
          metadata?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          activity_type?: string
          title?: string
          description?: string | null
          occurred_at?: string
          created_at?: string
          contact_id?: string | null
          property_id?: string | null
          listing_id?: string | null
          metadata?: Json | null
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
            foreignKeyName: "activity_log_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          contact_id: string | null
          created_at: string
          date: string
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
      calendar_events: {
        Row: {
          all_day: boolean | null
          contact_id: string | null
          created_at: string | null
          deal_id: string | null
          description: string | null
          end_time: string
          event_type: string | null
          id: string
          location: string | null
          property_id: string | null
          reminder_minutes: number | null
          start_time: string
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          all_day?: boolean | null
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          description?: string | null
          end_time: string
          event_type?: string | null
          id?: string
          location?: string | null
          property_id?: string | null
          reminder_minutes?: number | null
          start_time: string
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          all_day?: boolean | null
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          description?: string | null
          end_time?: string
          event_type?: string | null
          id?: string
          location?: string | null
          property_id?: string | null
          reminder_minutes?: number | null
          start_time?: string
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
          is_primary: boolean | null
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
          is_primary?: boolean | null
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
          is_primary?: boolean | null
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
          contact_id: string
          created_at: string
          id: string
          is_primary: boolean
          label: string | null
          updated_at: string
          value: string
        }
        Insert: {
          channel_type: string
          contact_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          updated_at?: string
          value: string
        }
        Update: {
          channel_type?: string
          contact_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          updated_at?: string
          value?: string
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
          acquisition_date: string | null
          contact_id: string
          created_at: string
          holding_period_months: number | null
          id: string
          notes: string | null
          ownership_percentage: number | null
          property_id: string
          purchase_price: number | null
          role: string | null
          sale_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          acquisition_date?: string | null
          contact_id: string
          created_at?: string
          holding_period_months?: number | null
          id?: string
          notes?: string | null
          ownership_percentage?: number | null
          property_id: string
          purchase_price?: number | null
          role?: string | null
          sale_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          acquisition_date?: string | null
          contact_id?: string
          created_at?: string
          holding_period_months?: number | null
          id?: string
          notes?: string | null
          ownership_percentage?: number | null
          property_id?: string
          purchase_price?: number | null
          role?: string | null
          sale_price?: number | null
          updated_at?: string
          user_id?: string
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
          tag_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          tag_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
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
          address_line1: string | null
          address_line2: string | null
          city: string | null
          company: string | null
          country: string | null
          created_at: string | null
          current_situation_notes: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          name: string
          notes: string | null
          pain_points: string | null
          phone: string | null
          pipeline_stage: string | null
          pleasure_points: string | null
          postcode: string | null
          role: string | null
          selling_intentions: string | null
          source: string | null
          state: string | null
          status: string | null
          story: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          current_situation_notes?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          name: string
          notes?: string | null
          pain_points?: string | null
          phone?: string | null
          pipeline_stage?: string | null
          pleasure_points?: string | null
          postcode?: string | null
          role?: string | null
          selling_intentions?: string | null
          source?: string | null
          state?: string | null
          status?: string | null
          story?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          company?: string | null
          country?: string | null
          created_at?: string | null
          current_situation_notes?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          name?: string
          notes?: string | null
          pain_points?: string | null
          phone?: string | null
          pipeline_stage?: string | null
          pleasure_points?: string | null
          postcode?: string | null
          role?: string | null
          selling_intentions?: string | null
          source?: string | null
          state?: string | null
          status?: string | null
          story?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      deals: {
        Row: {
          contact_id: string | null
          created_at: string | null
          expected_close_date: string | null
          id: string
          notes: string | null
          probability: number | null
          property_id: string | null
          stage: string | null
          title: string
          updated_at: string | null
          user_id: string | null
          value: number | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          probability?: number | null
          property_id?: string | null
          stage?: string | null
          title: string
          updated_at?: string | null
          user_id?: string | null
          value?: number | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          probability?: number | null
          property_id?: string | null
          stage?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
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
          address: string | null
          address_line1: string | null
          address_line2: string | null
          bathrooms: number | null
          bedrooms: number | null
          building_size: number | null
          cap_rate: number | null
          city: string | null
          contact_id: string | null
          country: string | null
          created_at: string | null
          description: string | null
          documents: Json | null
          estimated_value: number | null
          features: string[] | null
          id: string
          images: string[] | null
          listing_date: string | null
          lot_size: number | null
          notes: string | null
          postcode: string | null
          price: number | null
          price_listed: number | null
          property_condition: string | null
          property_type: string | null
          rental_yield: number | null
          square_feet: number | null
          state: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
          year_built: number | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          building_size?: number | null
          cap_rate?: number | null
          city?: string | null
          contact_id?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          documents?: Json | null
          estimated_value?: number | null
          features?: string[] | null
          id?: string
          images?: string[] | null
          listing_date?: string | null
          lot_size?: number | null
          notes?: string | null
          postcode?: string | null
          price?: number | null
          price_listed?: number | null
          property_condition?: string | null
          property_type?: string | null
          rental_yield?: number | null
          square_feet?: number | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          year_built?: number | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          building_size?: number | null
          cap_rate?: number | null
          city?: string | null
          contact_id?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          documents?: Json | null
          estimated_value?: number | null
          features?: string[] | null
          id?: string
          images?: string[] | null
          listing_date?: string | null
          lot_size?: number | null
          notes?: string | null
          postcode?: string | null
          price?: number | null
          price_listed?: number | null
          property_condition?: string | null
          property_type?: string | null
          rental_yield?: number | null
          square_feet?: number | null
          state?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          year_built?: number | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
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
      create_contact_with_address: { Args: { payload: Json }; Returns: Json }
      create_property_with_address: { Args: { payload: Json }; Returns: Json }
      update_contact_with_address: { Args: { payload: Json }; Returns: Json }
    }
    Enums: {
      activity_log_type: "note" | "call" | "email" | "inspection" | "status_change" | "system" | "open_house" | "settlement"
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
    Enums: {
      activity_log_type: ["note", "call", "email", "inspection", "status_change", "system", "open_house", "settlement"] as const,
    },
  },
} as const
