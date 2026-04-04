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
          activity_date: string
          activity_type: string
          attachments: Json | null
          body: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string | null
          deal_id: string | null
          direction: string | null
          duration_minutes: number | null
          id: string
          outcome: string | null
          owner_id: string
          property_id: string | null
          subject: string | null
        }
        Insert: {
          activity_date?: string
          activity_type: string
          attachments?: Json | null
          body?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          direction?: string | null
          duration_minutes?: number | null
          id?: string
          outcome?: string | null
          owner_id: string
          property_id?: string | null
          subject?: string | null
        }
        Update: {
          activity_date?: string
          activity_type?: string
          attachments?: Json | null
          body?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          direction?: string | null
          duration_minutes?: number | null
          id?: string
          outcome?: string | null
          owner_id?: string
          property_id?: string | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
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
          activity_type: Database["public"]["Enums"]["activity_log_type"]
          contact_id: string | null
          created_at: string
          description: string | null
          id: string
          listing_id: string | null
          metadata: Json | null
          occurred_at: string
          property_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          activity_type?: Database["public"]["Enums"]["activity_log_type"]
          contact_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          listing_id?: string | null
          metadata?: Json | null
          occurred_at?: string
          property_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_log_type"]
          contact_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          listing_id?: string | null
          metadata?: Json | null
          occurred_at?: string
          property_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      affirmations: {
        Row: {
          created_at: string
          id: string
          sort_order: number
          text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          sort_order?: number
          text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          sort_order?: number
          text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          reminder_sent_at: string | null
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
          reminder_sent_at?: string | null
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
          reminder_sent_at?: string | null
          status?: string | null
          title?: string
          type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      companies: {
        Row: {
          address: string | null
          company_type: string | null
          created_at: string | null
          domain: string | null
          email: string | null
          id: string
          industry: string | null
          last_activity_at: string | null
          name: string
          notes: string | null
          owner_id: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          company_type?: string | null
          created_at?: string | null
          domain?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          last_activity_at?: string | null
          name: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          company_type?: string | null
          created_at?: string | null
          domain?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          last_activity_at?: string | null
          name?: string
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      contact_companies: {
        Row: {
          company_id: string
          contact_id: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          role: string | null
        }
        Insert: {
          company_id: string
          contact_id: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          role?: string | null
        }
        Update: {
          company_id?: string
          contact_id?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_companies_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_documents: {
        Row: {
          category: string
          contact_id: string
          created_at: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          name: string
          property_id: string | null
          user_id: string
        }
        Insert: {
          category?: string
          contact_id: string
          created_at?: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name: string
          property_id?: string | null
          user_id: string
        }
        Update: {
          category?: string
          contact_id?: string
          created_at?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          property_id?: string | null
          user_id?: string
        }
        Relationships: []
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
        Relationships: []
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
          address: string | null
          assigned_at: string | null
          buying_budget_max: number | null
          buying_budget_min: number | null
          contact_type: string | null
          created_at: string | null
          date_of_birth: string | null
          do_not_contact: boolean | null
          email: string | null
          email_opt_out: boolean | null
          first_name: string
          id: string
          last_activity_at: string | null
          last_name: string
          lead_status: string | null
          lifecycle_stage: string | null
          mobile: string | null
          next_follow_up_at: string | null
          notes: string | null
          owner_id: string | null
          phone: string | null
          postcode: string | null
          preferred_contact_method: string | null
          preferred_suburbs: string[] | null
          property_requirements: Json | null
          rating: string | null
          sms_opt_out: boolean | null
          source: string | null
          state: string | null
          suburb: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          assigned_at?: string | null
          buying_budget_max?: number | null
          buying_budget_min?: number | null
          contact_type?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          do_not_contact?: boolean | null
          email?: string | null
          email_opt_out?: boolean | null
          first_name: string
          id?: string
          last_activity_at?: string | null
          last_name: string
          lead_status?: string | null
          lifecycle_stage?: string | null
          mobile?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          postcode?: string | null
          preferred_contact_method?: string | null
          preferred_suburbs?: string[] | null
          property_requirements?: Json | null
          rating?: string | null
          sms_opt_out?: boolean | null
          source?: string | null
          state?: string | null
          suburb?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          assigned_at?: string | null
          buying_budget_max?: number | null
          buying_budget_min?: number | null
          contact_type?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          do_not_contact?: boolean | null
          email?: string | null
          email_opt_out?: boolean | null
          first_name?: string
          id?: string
          last_activity_at?: string | null
          last_name?: string
          lead_status?: string | null
          lifecycle_stage?: string | null
          mobile?: string | null
          next_follow_up_at?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          postcode?: string | null
          preferred_contact_method?: string | null
          preferred_suburbs?: string[] | null
          property_requirements?: Json | null
          rating?: string | null
          sms_opt_out?: boolean | null
          source?: string | null
          state?: string | null
          suburb?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      deal_contacts: {
        Row: {
          contact_id: string
          created_at: string | null
          deal_id: string
          id: string
          is_primary: boolean | null
          role: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          deal_id: string
          id?: string
          is_primary?: boolean | null
          role?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          deal_id?: string
          id?: string
          is_primary?: boolean | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deal_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_contacts_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          actual_close_date: string | null
          amount: number | null
          close_reason: string | null
          created_at: string | null
          deal_name: string
          deal_status: string | null
          deal_type: string | null
          expected_close_date: string | null
          id: string
          notes: string | null
          owner_id: string
          pipeline_id: string
          primary_company_id: string | null
          primary_contact_id: string | null
          probability: number | null
          property_id: string | null
          stage_id: string
          updated_at: string | null
          weighted_amount: number | null
        }
        Insert: {
          actual_close_date?: string | null
          amount?: number | null
          close_reason?: string | null
          created_at?: string | null
          deal_name: string
          deal_status?: string | null
          deal_type?: string | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          owner_id: string
          pipeline_id: string
          primary_company_id?: string | null
          primary_contact_id?: string | null
          probability?: number | null
          property_id?: string | null
          stage_id: string
          updated_at?: string | null
          weighted_amount?: number | null
        }
        Update: {
          actual_close_date?: string | null
          amount?: number | null
          close_reason?: string | null
          created_at?: string | null
          deal_name?: string
          deal_status?: string | null
          deal_type?: string | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          pipeline_id?: string
          primary_company_id?: string | null
          primary_contact_id?: string | null
          probability?: number | null
          property_id?: string | null
          stage_id?: string
          updated_at?: string | null
          weighted_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_primary_company_id_fkey"
            columns: ["primary_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
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
          {
            foreignKeyName: "deals_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
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
        Relationships: []
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
      list_memberships: {
        Row: {
          added_by_id: string | null
          company_id: string | null
          contact_id: string | null
          created_at: string | null
          id: string
          list_id: string
        }
        Insert: {
          added_by_id?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          list_id: string
        }
        Update: {
          added_by_id?: string | null
          company_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          id?: string
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_memberships_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_memberships_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: []
      }
      lists: {
        Row: {
          created_at: string | null
          description: string | null
          filter_conditions: Json | null
          id: string
          last_refreshed_at: string | null
          list_type: string
          member_count: number | null
          name: string
          object_type: string
          owner_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          filter_conditions?: Json | null
          id?: string
          last_refreshed_at?: string | null
          list_type: string
          member_count?: number | null
          name: string
          object_type: string
          owner_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          filter_conditions?: Json | null
          id?: string
          last_refreshed_at?: string | null
          list_type?: string
          member_count?: number | null
          name?: string
          object_type?: string
          owner_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      oauth_states: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          auto_create_tasks: Json | null
          created_at: string | null
          display_order: number
          id: string
          is_closed_lost: boolean | null
          is_closed_won: boolean | null
          name: string
          pipeline_id: string
          probability: number | null
          required_fields: Json | null
          sla_days: number | null
          updated_at: string | null
        }
        Insert: {
          auto_create_tasks?: Json | null
          created_at?: string | null
          display_order: number
          id?: string
          is_closed_lost?: boolean | null
          is_closed_won?: boolean | null
          name: string
          pipeline_id: string
          probability?: number | null
          required_fields?: Json | null
          sla_days?: number | null
          updated_at?: string | null
        }
        Update: {
          auto_create_tasks?: Json | null
          created_at?: string | null
          display_order?: number
          id?: string
          is_closed_lost?: boolean | null
          is_closed_won?: boolean | null
          name?: string
          pipeline_id?: string
          probability?: number | null
          required_fields?: Json | null
          sla_days?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          pipeline_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          pipeline_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          pipeline_type?: string
          updated_at?: string | null
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
          appraisal_date: string | null
          bathrooms: number | null
          bedrooms: number | null
          car_spaces: number | null
          contract_date: string | null
          country: string | null
          created_at: string | null
          estimated_value: number | null
          features: string[] | null
          floor_area_sqm: number | null
          id: string
          images: Json | null
          land_area_sqm: number | null
          list_price: number | null
          listed_at: string | null
          listing_agent_id: string | null
          listing_status: string | null
          notes: string | null
          owner_contact_id: string | null
          postcode: string
          property_description: string | null
          property_type: string
          sale_price: number | null
          settlement_date: string | null
          sold_at: string | null
          state: string
          street_address: string
          suburb: string
          updated_at: string | null
          year_built: number | null
        }
        Insert: {
          appraisal_date?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          car_spaces?: number | null
          contract_date?: string | null
          country?: string | null
          created_at?: string | null
          estimated_value?: number | null
          features?: string[] | null
          floor_area_sqm?: number | null
          id?: string
          images?: Json | null
          land_area_sqm?: number | null
          list_price?: number | null
          listed_at?: string | null
          listing_agent_id?: string | null
          listing_status?: string | null
          notes?: string | null
          owner_contact_id?: string | null
          postcode: string
          property_description?: string | null
          property_type: string
          sale_price?: number | null
          settlement_date?: string | null
          sold_at?: string | null
          state: string
          street_address: string
          suburb: string
          updated_at?: string | null
          year_built?: number | null
        }
        Update: {
          appraisal_date?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          car_spaces?: number | null
          contract_date?: string | null
          country?: string | null
          created_at?: string | null
          estimated_value?: number | null
          features?: string[] | null
          floor_area_sqm?: number | null
          id?: string
          images?: Json | null
          land_area_sqm?: number | null
          list_price?: number | null
          listed_at?: string | null
          listing_agent_id?: string | null
          listing_status?: string | null
          notes?: string | null
          owner_contact_id?: string | null
          postcode?: string
          property_description?: string | null
          property_type?: string
          sale_price?: number | null
          settlement_date?: string | null
          sold_at?: string | null
          state?: string
          street_address?: string
          suburb?: string
          updated_at?: string | null
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_owner_contact_id_fkey"
            columns: ["owner_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_views: {
        Row: {
          created_at: string | null
          filters: Json
          id: string
          is_default: boolean | null
          name: string
          object_type: string
          owner_id: string
          sort_by: string | null
          sort_direction: string | null
          updated_at: string | null
          visibility: string | null
          visible_columns: Json | null
        }
        Insert: {
          created_at?: string | null
          filters: Json
          id?: string
          is_default?: boolean | null
          name: string
          object_type: string
          owner_id: string
          sort_by?: string | null
          sort_direction?: string | null
          updated_at?: string | null
          visibility?: string | null
          visible_columns?: Json | null
        }
        Update: {
          created_at?: string | null
          filters?: Json
          id?: string
          is_default?: boolean | null
          name?: string
          object_type?: string
          owner_id?: string
          sort_by?: string | null
          sort_direction?: string | null
          updated_at?: string | null
          visibility?: string | null
          visible_columns?: Json | null
        }
        Relationships: []
      }
      sequence_enrollments: {
        Row: {
          completed_at: string | null
          contact_id: string
          created_at: string | null
          current_step_index: number | null
          enrolled_by_id: string
          id: string
          sequence_id: string
          status: string | null
          unenroll_reason: string | null
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          created_at?: string | null
          current_step_index?: number | null
          enrolled_by_id: string
          id?: string
          sequence_id: string
          status?: string | null
          unenroll_reason?: string | null
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          created_at?: string | null
          current_step_index?: number | null
          enrolled_by_id?: string
          id?: string
          sequence_id?: string
          status?: string | null
          unenroll_reason?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sequence_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sequences: {
        Row: {
          auto_unenroll_on_meeting: boolean | null
          auto_unenroll_on_reply: boolean | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          owner_id: string | null
          steps: Json
          updated_at: string | null
        }
        Insert: {
          auto_unenroll_on_meeting?: boolean | null
          auto_unenroll_on_reply?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          owner_id?: string | null
          steps: Json
          updated_at?: string | null
        }
        Update: {
          auto_unenroll_on_meeting?: boolean | null
          auto_unenroll_on_reply?: boolean | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          owner_id?: string | null
          steps?: Json
          updated_at?: string | null
        }
        Relationships: []
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
      tasks: {
        Row: {
          assigned_to_id: string | null
          automation_sequence_id: string | null
          automation_workflow_id: string | null
          body: string | null
          company_id: string | null
          completed_at: string | null
          contact_id: string | null
          created_at: string | null
          created_by_automation: boolean | null
          deal_id: string | null
          due_date: string | null
          due_time: string | null
          id: string
          notes: string | null
          owner_id: string
          priority: string | null
          property_id: string | null
          reminder_at: string | null
          status: string | null
          task_type: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          assigned_to_id?: string | null
          automation_sequence_id?: string | null
          automation_workflow_id?: string | null
          body?: string | null
          company_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by_automation?: boolean | null
          deal_id?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          notes?: string | null
          owner_id: string
          priority?: string | null
          property_id?: string | null
          reminder_at?: string | null
          status?: string | null
          task_type?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          assigned_to_id?: string | null
          automation_sequence_id?: string | null
          automation_workflow_id?: string | null
          body?: string | null
          company_id?: string | null
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string | null
          created_by_automation?: boolean | null
          deal_id?: string | null
          due_date?: string | null
          due_time?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          priority?: string | null
          property_id?: string | null
          reminder_at?: string | null
          status?: string | null
          task_type?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_google_tokens: {
        Row: {
          access_token: string
          expires_at: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          expires_at: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          expires_at?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vision_board: {
        Row: {
          cards: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          cards?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          cards?: Json
          updated_at?: string
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
      workflows: {
        Row: {
          actions: Json
          created_at: string | null
          description: string | null
          enrollment_count: number | null
          id: string
          is_active: boolean | null
          last_executed_at: string | null
          name: string
          trigger_conditions: Json | null
          trigger_object: string
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          actions: Json
          created_at?: string | null
          description?: string | null
          enrollment_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          name: string
          trigger_conditions?: Json | null
          trigger_object: string
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          created_at?: string | null
          description?: string | null
          enrollment_count?: number | null
          id?: string
          is_active?: boolean | null
          last_executed_at?: string | null
          name?: string
          trigger_conditions?: Json | null
          trigger_object?: string
          trigger_type?: string
          updated_at?: string | null
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
      activity_log_type:
        | "note"
        | "call"
        | "email"
        | "inspection"
        | "status_change"
        | "system"
        | "open_house"
        | "settlement"
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
      activity_log_type: [
        "note",
        "call",
        "email",
        "inspection",
        "status_change",
        "system",
        "open_house",
        "settlement",
      ],
    },
  },
} as const
