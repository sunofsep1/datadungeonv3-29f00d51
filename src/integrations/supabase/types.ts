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
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
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
      activity_schedule_instances: {
        Row: {
          applied_at: string
          applies_to: string
          contact_id: string | null
          created_at: string
          id: string
          listing_id: string | null
          status: string
          template_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string
          applies_to: string
          contact_id?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          status?: string
          template_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string
          applies_to?: string
          contact_id?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          status?: string
          template_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_schedule_instances_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_schedule_instances_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_schedule_instances_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_schedule_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "activity_schedule_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_schedule_step_runs: {
        Row: {
          body: string | null
          completed_at: string | null
          contact_task_id: string | null
          created_at: string
          due_at: string
          id: string
          instance_id: string
          sort_order: number
          step_type: string
          template_step_id: string | null
          title: string
        }
        Insert: {
          body?: string | null
          completed_at?: string | null
          contact_task_id?: string | null
          created_at?: string
          due_at: string
          id?: string
          instance_id: string
          sort_order?: number
          step_type?: string
          template_step_id?: string | null
          title: string
        }
        Update: {
          body?: string | null
          completed_at?: string | null
          contact_task_id?: string | null
          created_at?: string
          due_at?: string
          id?: string
          instance_id?: string
          sort_order?: number
          step_type?: string
          template_step_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_schedule_step_runs_contact_task_id_fkey"
            columns: ["contact_task_id"]
            isOneToOne: false
            referencedRelation: "contact_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_schedule_step_runs_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "activity_schedule_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_schedule_step_runs_template_step_id_fkey"
            columns: ["template_step_id"]
            isOneToOne: false
            referencedRelation: "activity_schedule_template_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_schedule_template_steps: {
        Row: {
          body: string | null
          created_at: string
          id: string
          offset_days: number
          sort_order: number
          step_type: string
          template_id: string
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          offset_days?: number
          sort_order?: number
          step_type?: string
          template_id: string
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          offset_days?: number
          sort_order?: number
          step_type?: string
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_schedule_template_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "activity_schedule_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_schedule_templates: {
        Row: {
          applies_to: string
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applies_to: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applies_to?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      ai_action_items: {
        Row: {
          action_type: string
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          error_message: string | null
          execution_result: Json | null
          id: string
          payload_execute: Json
          payload_preview: Json
          run_id: string
          sort_order: number
          status: string
          target_id: string | null
          target_type: string
          user_id: string
        }
        Insert: {
          action_type: string
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_result?: Json | null
          id?: string
          payload_execute?: Json
          payload_preview?: Json
          run_id: string
          sort_order?: number
          status?: string
          target_id?: string | null
          target_type?: string
          user_id: string
        }
        Update: {
          action_type?: string
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          error_message?: string | null
          execution_result?: Json | null
          id?: string
          payload_execute?: Json
          payload_preview?: Json
          run_id?: string
          sort_order?: number
          status?: string
          target_id?: string | null
          target_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_action_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_action_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_action_runs: {
        Row: {
          actual_cost_usd: number
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          estimated_cost_usd: number
          id: string
          prompt: string
          status: string
          user_id: string
        }
        Insert: {
          actual_cost_usd?: number
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          estimated_cost_usd?: number
          id?: string
          prompt: string
          status?: string
          user_id: string
        }
        Update: {
          actual_cost_usd?: number
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          estimated_cost_usd?: number
          id?: string
          prompt?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_usage_daily: {
        Row: {
          cache_creation_tokens: number
          cache_read_tokens: number
          cost_usd: number
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          provider: string
          total_tokens: number
          updated_at: string
          usage_date: string
          user_id: string | null
        }
        Insert: {
          cache_creation_tokens?: number
          cache_read_tokens?: number
          cost_usd?: number
          id?: string
          input_tokens?: number
          model: string
          output_tokens?: number
          provider?: string
          total_tokens?: number
          updated_at?: string
          usage_date: string
          user_id?: string | null
        }
        Update: {
          cache_creation_tokens?: number
          cache_read_tokens?: number
          cost_usd?: number
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          provider?: string
          total_tokens?: number
          updated_at?: string
          usage_date?: string
          user_id?: string | null
        }
        Relationships: []
      }
      ai_usage_events: {
        Row: {
          cache_creation_tokens: number
          cache_read_tokens: number
          cost_usd: number
          fetched_at: string
          id: string
          input_tokens: number
          model: string
          output_tokens: number
          provider_request_id: string | null
          raw_payload: Json
          source: string
          total_tokens: number
          usage_date: string
          user_id: string | null
        }
        Insert: {
          cache_creation_tokens?: number
          cache_read_tokens?: number
          cost_usd?: number
          fetched_at?: string
          id?: string
          input_tokens?: number
          model: string
          output_tokens?: number
          provider_request_id?: string | null
          raw_payload?: Json
          source?: string
          total_tokens?: number
          usage_date: string
          user_id?: string | null
        }
        Update: {
          cache_creation_tokens?: number
          cache_read_tokens?: number
          cost_usd?: number
          fetched_at?: string
          id?: string
          input_tokens?: number
          model?: string
          output_tokens?: number
          provider_request_id?: string | null
          raw_payload?: Json
          source?: string
          total_tokens?: number
          usage_date?: string
          user_id?: string | null
        }
        Relationships: []
      }
      annual_reviews: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          insurance_partner: string | null
          loan_officer_partner: string | null
          notes: string | null
          scheduled_date: string | null
          status: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          insurance_partner?: string | null
          loan_officer_partner?: string | null
          notes?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          insurance_partner?: string | null
          loan_officer_partner?: string | null
          notes?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "annual_reviews_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_reviews_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
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
      buyer_requirements: {
        Row: {
          action: string
          baths_min: number | null
          beds_min: number | null
          building_max_sqm: number | null
          building_min_sqm: number | null
          category: string | null
          contact_id: string
          created_at: string
          features_required: string[]
          id: string
          land_max_sqm: number | null
          land_min_sqm: number | null
          notes: string | null
          parking_min: number | null
          price_max: number | null
          price_min: number | null
          property_type: string | null
          state: string | null
          suburbs: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          action?: string
          baths_min?: number | null
          beds_min?: number | null
          building_max_sqm?: number | null
          building_min_sqm?: number | null
          category?: string | null
          contact_id: string
          created_at?: string
          features_required?: string[]
          id?: string
          land_max_sqm?: number | null
          land_min_sqm?: number | null
          notes?: string | null
          parking_min?: number | null
          price_max?: number | null
          price_min?: number | null
          property_type?: string | null
          state?: string | null
          suburbs?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string
          baths_min?: number | null
          beds_min?: number | null
          building_max_sqm?: number | null
          building_min_sqm?: number | null
          category?: string | null
          contact_id?: string
          created_at?: string
          features_required?: string[]
          id?: string
          land_max_sqm?: number | null
          land_min_sqm?: number | null
          notes?: string | null
          parking_min?: number | null
          price_max?: number | null
          price_min?: number | null
          property_type?: string | null
          state?: string | null
          suburbs?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_requirements_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_requirements_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
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
      community_events: {
        Row: {
          created_at: string
          description: string | null
          event_date: string
          id: string
          location: string | null
          name: string
          quarter: number | null
          status: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_date: string
          id?: string
          location?: string | null
          name: string
          quarter?: number | null
          status?: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          description?: string | null
          event_date?: string
          id?: string
          location?: string | null
          name?: string
          quarter?: number | null
          status?: string
          updated_at?: string
          user_id?: string
          year?: number
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
      competitor_listings: {
        Row: {
          address: string
          analysis_id: string
          condition_vs_ours: string | null
          days_on_market: number | null
          id: string
          list_price: number | null
          notes: string | null
        }
        Insert: {
          address: string
          analysis_id: string
          condition_vs_ours?: string | null
          days_on_market?: number | null
          id?: string
          list_price?: number | null
          notes?: string | null
        }
        Update: {
          address?: string
          analysis_id?: string
          condition_vs_ours?: string | null
          days_on_market?: number | null
          id?: string
          list_price?: number | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_listings_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "pricing_analyses"
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
      contact_class_assignments: {
        Row: {
          class_id: string
          contact_id: string
          created_at: string
        }
        Insert: {
          class_id: string
          contact_id: string
          created_at?: string
        }
        Update: {
          class_id?: string
          contact_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_class_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "contact_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_class_assignments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_class_assignments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_classes: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
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
          {
            foreignKeyName: "contact_companies_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
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
      contact_playbook_assignments: {
        Row: {
          completed_at: string | null
          contact_id: string
          created_at: string
          current_step_index: number
          id: string
          playbook_template_id: string
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          created_at?: string
          current_step_index?: number
          id?: string
          playbook_template_id: string
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          created_at?: string
          current_step_index?: number
          id?: string
          playbook_template_id?: string
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_playbook_assignments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_playbook_assignments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_playbook_assignments_playbook_template_id_fkey"
            columns: ["playbook_template_id"]
            isOneToOne: false
            referencedRelation: "playbook_templates"
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
        Relationships: []
      }
      contact_relations: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          related_contact_id: string
          relation_label: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          related_contact_id: string
          relation_label?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          related_contact_id?: string
          relation_label?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_relations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_relations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_relations_related_contact_id_fkey"
            columns: ["related_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_relations_related_contact_id_fkey"
            columns: ["related_contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_requirements: {
        Row: {
          baths_min: number | null
          beds_min: number | null
          building_max_sqm: number | null
          building_min_sqm: number | null
          category: string | null
          contact_id: string
          created_at: string
          features_required: Json
          id: string
          land_max_sqm: number | null
          land_min_sqm: number | null
          notes: string | null
          parking_min: number | null
          price_max: number | null
          price_min: number | null
          property_type: string | null
          regions: Json
          sale_rental: string
          state: string | null
          suburbs: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          baths_min?: number | null
          beds_min?: number | null
          building_max_sqm?: number | null
          building_min_sqm?: number | null
          category?: string | null
          contact_id: string
          created_at?: string
          features_required?: Json
          id?: string
          land_max_sqm?: number | null
          land_min_sqm?: number | null
          notes?: string | null
          parking_min?: number | null
          price_max?: number | null
          price_min?: number | null
          property_type?: string | null
          regions?: Json
          sale_rental?: string
          state?: string | null
          suburbs?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          baths_min?: number | null
          beds_min?: number | null
          building_max_sqm?: number | null
          building_min_sqm?: number | null
          category?: string | null
          contact_id?: string
          created_at?: string
          features_required?: Json
          id?: string
          land_max_sqm?: number | null
          land_min_sqm?: number | null
          notes?: string | null
          parking_min?: number | null
          price_max?: number | null
          price_min?: number | null
          property_type?: string | null
          regions?: Json
          sale_rental?: string
          state?: string | null
          suburbs?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_requirements_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_requirements_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_scores: {
        Row: {
          contact_id: string
          last_calculated: string
          score_breakdown: Json
          total_score: number
          user_id: string
        }
        Insert: {
          contact_id: string
          last_calculated?: string
          score_breakdown?: Json
          total_score?: number
          user_id: string
        }
        Update: {
          contact_id?: string
          last_calculated?: string
          score_breakdown?: Json
          total_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_scores_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_scores_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "stale_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_subscriptions: {
        Row: {
          contact_id: string
          subscribed: boolean
          subscription_kind: string
          updated_at: string
        }
        Insert: {
          contact_id: string
          subscribed?: boolean
          subscription_kind: string
          updated_at?: string
        }
        Update: {
          contact_id?: string
          subscribed?: boolean
          subscription_kind?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_subscriptions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_subscriptions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
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
            foreignKeyName: "contact_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_tasks: {
        Row: {
          completed_at: string | null
          contact_id: string
          created_at: string
          due_at: string | null
          id: string
          notes: string | null
          sequence_enrollment_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          created_at?: string
          due_at?: string | null
          id?: string
          notes?: string | null
          sequence_enrollment_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          created_at?: string
          due_at?: string | null
          id?: string
          notes?: string | null
          sequence_enrollment_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tasks_sequence_enrollment_id_fkey"
            columns: ["sequence_enrollment_id"]
            isOneToOne: false
            referencedRelation: "nurture_archived_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_tasks_sequence_enrollment_id_fkey"
            columns: ["sequence_enrollment_id"]
            isOneToOne: false
            referencedRelation: "nurture_sequence_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          address_line1: string | null
          address_line2: string | null
          agentbox_id: number | null
          agentbox_synced_at: string | null
          aml_id_verified: boolean
          aml_notes: string | null
          aml_pep_clear: boolean
          aml_verified_at: string | null
          anniversary_date: string | null
          assigned_at: string | null
          buying_budget_max: number | null
          buying_budget_min: number | null
          category: string | null
          city: string | null
          classification_meta: Json
          client_ref: string | null
          coming_to_market: string | null
          company_name: string | null
          contact_category: string
          contact_type: string | null
          country: string | null
          created_at: string | null
          current_situation_notes: string | null
          date_of_birth: string | null
          dnc_email: boolean
          dnc_mail: boolean
          dnc_phone: boolean
          dnc_sms: boolean
          do_not_contact: boolean | null
          email: string | null
          email_opt_out: boolean | null
          facebook_url: string | null
          facsimile: string | null
          first_name: string | null
          home_phone: string | null
          id: string
          instagram_url: string | null
          job_title: string | null
          journey_stage: string | null
          last_activity_at: string | null
          last_name: string | null
          last_touch_date: string | null
          lead_status: string | null
          lead_temperature: string
          lifecycle_stage: string | null
          linkedin_url: string | null
          mobile: string | null
          name: string | null
          next_follow_up_at: string | null
          next_touch_date: string | null
          notes: string | null
          owner_id: string | null
          pain_points: string | null
          phone: string | null
          pipeline_stage: string | null
          pleasure_points: string | null
          postcode: string | null
          preferred_contact_method: string | null
          preferred_suburbs: string[] | null
          property_requirements: Json | null
          rating: string | null
          reapit_id: string | null
          reapit_synced_at: string | null
          relationship_category: string | null
          role_category: string | null
          salutation: string | null
          selling_intentions: string | null
          sms_opt_out: boolean | null
          source: string | null
          state: string | null
          status: string | null
          story: string | null
          suburb: string | null
          tags: string[] | null
          timeframe_category: string
          title: string | null
          twitter_handle: string | null
          updated_at: string | null
          user_id: string | null
          website: string | null
          work_phone: string | null
        }
        Insert: {
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          agentbox_id?: number | null
          agentbox_synced_at?: string | null
          aml_id_verified?: boolean
          aml_notes?: string | null
          aml_pep_clear?: boolean
          aml_verified_at?: string | null
          anniversary_date?: string | null
          assigned_at?: string | null
          buying_budget_max?: number | null
          buying_budget_min?: number | null
          category?: string | null
          city?: string | null
          classification_meta?: Json
          client_ref?: string | null
          coming_to_market?: string | null
          company_name?: string | null
          contact_category?: string
          contact_type?: string | null
          country?: string | null
          created_at?: string | null
          current_situation_notes?: string | null
          date_of_birth?: string | null
          dnc_email?: boolean
          dnc_mail?: boolean
          dnc_phone?: boolean
          dnc_sms?: boolean
          do_not_contact?: boolean | null
          email?: string | null
          email_opt_out?: boolean | null
          facebook_url?: string | null
          facsimile?: string | null
          first_name?: string | null
          home_phone?: string | null
          id?: string
          instagram_url?: string | null
          job_title?: string | null
          journey_stage?: string | null
          last_activity_at?: string | null
          last_name?: string | null
          last_touch_date?: string | null
          lead_status?: string | null
          lead_temperature?: string
          lifecycle_stage?: string | null
          linkedin_url?: string | null
          mobile?: string | null
          name?: string | null
          next_follow_up_at?: string | null
          next_touch_date?: string | null
          notes?: string | null
          owner_id?: string | null
          pain_points?: string | null
          phone?: string | null
          pipeline_stage?: string | null
          pleasure_points?: string | null
          postcode?: string | null
          preferred_contact_method?: string | null
          preferred_suburbs?: string[] | null
          property_requirements?: Json | null
          rating?: string | null
          reapit_id?: string | null
          reapit_synced_at?: string | null
          relationship_category?: string | null
          role_category?: string | null
          salutation?: string | null
          selling_intentions?: string | null
          sms_opt_out?: boolean | null
          source?: string | null
          state?: string | null
          status?: string | null
          story?: string | null
          suburb?: string | null
          tags?: string[] | null
          timeframe_category?: string
          title?: string | null
          twitter_handle?: string | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
          work_phone?: string | null
        }
        Update: {
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          agentbox_id?: number | null
          agentbox_synced_at?: string | null
          aml_id_verified?: boolean
          aml_notes?: string | null
          aml_pep_clear?: boolean
          aml_verified_at?: string | null
          anniversary_date?: string | null
          assigned_at?: string | null
          buying_budget_max?: number | null
          buying_budget_min?: number | null
          category?: string | null
          city?: string | null
          classification_meta?: Json
          client_ref?: string | null
          coming_to_market?: string | null
          company_name?: string | null
          contact_category?: string
          contact_type?: string | null
          country?: string | null
          created_at?: string | null
          current_situation_notes?: string | null
          date_of_birth?: string | null
          dnc_email?: boolean
          dnc_mail?: boolean
          dnc_phone?: boolean
          dnc_sms?: boolean
          do_not_contact?: boolean | null
          email?: string | null
          email_opt_out?: boolean | null
          facebook_url?: string | null
          facsimile?: string | null
          first_name?: string | null
          home_phone?: string | null
          id?: string
          instagram_url?: string | null
          job_title?: string | null
          journey_stage?: string | null
          last_activity_at?: string | null
          last_name?: string | null
          last_touch_date?: string | null
          lead_status?: string | null
          lead_temperature?: string
          lifecycle_stage?: string | null
          linkedin_url?: string | null
          mobile?: string | null
          name?: string | null
          next_follow_up_at?: string | null
          next_touch_date?: string | null
          notes?: string | null
          owner_id?: string | null
          pain_points?: string | null
          phone?: string | null
          pipeline_stage?: string | null
          pleasure_points?: string | null
          postcode?: string | null
          preferred_contact_method?: string | null
          preferred_suburbs?: string[] | null
          property_requirements?: Json | null
          rating?: string | null
          reapit_id?: string | null
          reapit_synced_at?: string | null
          relationship_category?: string | null
          role_category?: string | null
          salutation?: string | null
          selling_intentions?: string | null
          sms_opt_out?: boolean | null
          source?: string | null
          state?: string | null
          status?: string | null
          story?: string | null
          suburb?: string | null
          tags?: string[] | null
          timeframe_category?: string
          title?: string | null
          twitter_handle?: string | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
          work_phone?: string | null
        }
        Relationships: []
      }
      crm_workflow_enrollments: {
        Row: {
          completed_at: string | null
          contact_id: string | null
          context: Json
          current_step_order: number
          enrolled_at: string
          id: string
          listing_id: string | null
          next_action_at: string
          status: string
          user_id: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          contact_id?: string | null
          context?: Json
          current_step_order?: number
          enrolled_at?: string
          id?: string
          listing_id?: string | null
          next_action_at?: string
          status?: string
          user_id: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string | null
          context?: Json
          current_step_order?: number
          enrolled_at?: string
          id?: string
          listing_id?: string | null
          next_action_at?: string
          status?: string
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_workflow_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_workflow_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_workflow_enrollments_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_workflow_enrollments_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "crm_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_workflow_step_runs: {
        Row: {
          action_type: string
          branch_taken: boolean | null
          detail: string | null
          enrollment_id: string
          executed_at: string
          id: string
          status: string
          step_order: number
          user_id: string
          workflow_id: string
        }
        Insert: {
          action_type: string
          branch_taken?: boolean | null
          detail?: string | null
          enrollment_id: string
          executed_at?: string
          id?: string
          status: string
          step_order: number
          user_id: string
          workflow_id: string
        }
        Update: {
          action_type?: string
          branch_taken?: boolean | null
          detail?: string | null
          enrollment_id?: string
          executed_at?: string
          id?: string
          status?: string
          step_order?: number
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_workflow_step_runs_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "crm_workflow_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_workflow_step_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "crm_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_workflow_steps: {
        Row: {
          action_config: Json
          action_type: string
          branch_condition: Json
          created_at: string
          delay_minutes: number
          id: string
          next_step_order_if_false: number | null
          next_step_order_if_true: number | null
          step_order: number
          workflow_id: string
        }
        Insert: {
          action_config?: Json
          action_type: string
          branch_condition?: Json
          created_at?: string
          delay_minutes?: number
          id?: string
          next_step_order_if_false?: number | null
          next_step_order_if_true?: number | null
          step_order: number
          workflow_id: string
        }
        Update: {
          action_config?: Json
          action_type?: string
          branch_condition?: Json
          created_at?: string
          delay_minutes?: number
          id?: string
          next_step_order_if_false?: number | null
          next_step_order_if_true?: number | null
          step_order?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "crm_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_workflows: {
        Row: {
          created_at: string
          description: string | null
          enrollment_count: number
          id: string
          is_active: boolean
          last_executed_at: string | null
          name: string
          trigger_conditions: Json
          trigger_object: string
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enrollment_count?: number
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          name: string
          trigger_conditions?: Json
          trigger_object?: string
          trigger_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enrollment_count?: number
          id?: string
          is_active?: boolean
          last_executed_at?: string | null
          name?: string
          trigger_conditions?: Json
          trigger_object?: string
          trigger_type?: string
          updated_at?: string
          user_id?: string
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
            foreignKeyName: "deal_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
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
          classification_meta: Json
          close_reason: string | null
          created_at: string | null
          deal_name: string
          deal_status: string | null
          deal_type: string | null
          expected_close_date: string | null
          id: string
          journey_stage: string | null
          lead_temperature: string
          notes: string | null
          owner_id: string
          pipeline_id: string
          primary_company_id: string | null
          primary_contact_id: string | null
          probability: number | null
          property_id: string | null
          relationship_category: string | null
          role_category: string | null
          stage_id: string
          timeframe_category: string
          updated_at: string | null
          weighted_amount: number | null
        }
        Insert: {
          actual_close_date?: string | null
          amount?: number | null
          classification_meta?: Json
          close_reason?: string | null
          created_at?: string | null
          deal_name: string
          deal_status?: string | null
          deal_type?: string | null
          expected_close_date?: string | null
          id?: string
          journey_stage?: string | null
          lead_temperature?: string
          notes?: string | null
          owner_id: string
          pipeline_id: string
          primary_company_id?: string | null
          primary_contact_id?: string | null
          probability?: number | null
          property_id?: string | null
          relationship_category?: string | null
          role_category?: string | null
          stage_id: string
          timeframe_category?: string
          updated_at?: string | null
          weighted_amount?: number | null
        }
        Update: {
          actual_close_date?: string | null
          amount?: number | null
          classification_meta?: Json
          close_reason?: string | null
          created_at?: string | null
          deal_name?: string
          deal_status?: string | null
          deal_type?: string | null
          expected_close_date?: string | null
          id?: string
          journey_stage?: string | null
          lead_temperature?: string
          notes?: string | null
          owner_id?: string
          pipeline_id?: string
          primary_company_id?: string | null
          primary_contact_id?: string | null
          probability?: number | null
          property_id?: string | null
          relationship_category?: string | null
          role_category?: string | null
          stage_id?: string
          timeframe_category?: string
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
            foreignKeyName: "deals_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
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
      entity_audit_log: {
        Row: {
          changed_at: string
          entity_id: string
          entity_type: string
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
          summary: string
          user_id: string
        }
        Insert: {
          changed_at?: string
          entity_id: string
          entity_type: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          summary: string
          user_id: string
        }
        Update: {
          changed_at?: string
          entity_id?: string
          entity_type?: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          summary?: string
          user_id?: string
        }
        Relationships: []
      }
      event_invites: {
        Row: {
          contact_id: string
          event_id: string
          id: string
          invited_at: string
          responded_at: string | null
          rsvp_status: string
        }
        Insert: {
          contact_id: string
          event_id: string
          id?: string
          invited_at?: string
          responded_at?: string | null
          rsvp_status?: string
        }
        Update: {
          contact_id?: string
          event_id?: string
          id?: string
          invited_at?: string
          responded_at?: string | null
          rsvp_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_invites_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invites_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_invites_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "community_events"
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
      invoice_line_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          gst_rate: number
          id: string
          invoice_id: string
          position: number
          quantity: number
          unit_price: number
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description: string
          gst_rate?: number
          id?: string
          invoice_id: string
          position?: number
          quantity?: number
          unit_price?: number
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          gst_rate?: number
          id?: string
          invoice_id?: string
          position?: number
          quantity?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          contact_id: string | null
          counterparty_abn: string | null
          counterparty_name: string
          created_at: string
          currency: string
          direction: string
          due_date: string
          file_name: string | null
          file_path: string | null
          file_size: number | null
          gst_amount: number | null
          gst_mode: string
          id: string
          invoice_number: string
          issue_date: string
          listing_id: string | null
          mime_type: string | null
          notes: string | null
          paid_amount: number | null
          paid_date: string | null
          property_address: string | null
          reimbursable: boolean
          reimbursement_invoice_id: string | null
          source: string
          status: string
          subtotal: number
          terms_days: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_id?: string | null
          counterparty_abn?: string | null
          counterparty_name: string
          created_at?: string
          currency?: string
          direction: string
          due_date: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          gst_amount?: number | null
          gst_mode?: string
          id?: string
          invoice_number: string
          issue_date: string
          listing_id?: string | null
          mime_type?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          property_address?: string | null
          reimbursable?: boolean
          reimbursement_invoice_id?: string | null
          source?: string
          status?: string
          subtotal?: number
          terms_days?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_id?: string | null
          counterparty_abn?: string | null
          counterparty_name?: string
          created_at?: string
          currency?: string
          direction?: string
          due_date?: string
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          gst_amount?: number | null
          gst_mode?: string
          id?: string
          invoice_number?: string
          issue_date?: string
          listing_id?: string | null
          mime_type?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_date?: string | null
          property_address?: string | null
          reimbursable?: boolean
          reimbursement_invoice_id?: string | null
          source?: string
          status?: string
          subtotal?: number
          terms_days?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_reimbursement_invoice_id_fkey"
            columns: ["reimbursement_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
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
      lead_score_rules: {
        Row: {
          condition_type: string
          created_at: string
          id: string
          is_active: boolean
          points: number
          rule_name: string
          user_id: string | null
        }
        Insert: {
          condition_type: string
          created_at?: string
          id?: string
          is_active?: boolean
          points: number
          rule_name: string
          user_id?: string | null
        }
        Update: {
          condition_type?: string
          created_at?: string
          id?: string
          is_active?: boolean
          points?: number
          rule_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          contact_id: string | null
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
          contact_id?: string | null
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
          contact_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "list_memberships_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
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
      listing_campaign_expenses: {
        Row: {
          agent_paid: number
          category: string
          cost: number
          created_at: string
          expense_date: string
          id: string
          invoice_no: string | null
          item_comment: string | null
          listing_id: string
          office_paid: number
          supplier: string | null
          supplier_status: string
          updated_at: string
          user_id: string
          vendor_paid: number
        }
        Insert: {
          agent_paid?: number
          category?: string
          cost?: number
          created_at?: string
          expense_date?: string
          id?: string
          invoice_no?: string | null
          item_comment?: string | null
          listing_id: string
          office_paid?: number
          supplier?: string | null
          supplier_status?: string
          updated_at?: string
          user_id: string
          vendor_paid?: number
        }
        Update: {
          agent_paid?: number
          category?: string
          cost?: number
          created_at?: string
          expense_date?: string
          id?: string
          invoice_no?: string | null
          item_comment?: string | null
          listing_id?: string
          office_paid?: number
          supplier?: string | null
          supplier_status?: string
          updated_at?: string
          user_id?: string
          vendor_paid?: number
        }
        Relationships: [
          {
            foreignKeyName: "listing_campaign_expenses_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_commission_splits: {
        Row: {
          agent_name: string
          created_at: string
          id: string
          listing_id: string
          sort_order: number
          split_pct: number
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_name: string
          created_at?: string
          id?: string
          listing_id: string
          sort_order?: number
          split_pct: number
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_name?: string
          created_at?: string
          id?: string
          listing_id?: string
          sort_order?: number
          split_pct?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_commission_splits_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_contact_links: {
        Row: {
          contact_id: string
          created_at: string
          firm_name: string | null
          id: string
          listing_id: string
          offer_status: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          firm_name?: string | null
          id?: string
          listing_id: string
          offer_status?: string | null
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          firm_name?: string | null
          id?: string
          listing_id?: string
          offer_status?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_contact_links_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_contact_links_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_contact_links_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_contract_documents: {
        Row: {
          created_at: string
          doc_type: string
          file_name: string
          id: string
          listing_id: string
          mime_type: string | null
          offer_id: string
          parsed_snapshot: Json | null
          source: string
          storage_path: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          file_name: string
          id?: string
          listing_id: string
          mime_type?: string | null
          offer_id: string
          parsed_snapshot?: Json | null
          source?: string
          storage_path: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_name?: string
          id?: string
          listing_id?: string
          mime_type?: string | null
          offer_id?: string
          parsed_snapshot?: Json | null
          source?: string
          storage_path?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_contract_documents_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_contract_documents_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "listing_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_inspection_attendees: {
        Row: {
          checked_in_at: string
          contact_id: string | null
          created_at: string
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          inspection_id: string
          interest_level: string | null
          working_with_agent: boolean
        }
        Insert: {
          checked_in_at?: string
          contact_id?: string | null
          created_at?: string
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          inspection_id: string
          interest_level?: string | null
          working_with_agent?: boolean
        }
        Update: {
          checked_in_at?: string
          contact_id?: string | null
          created_at?: string
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          inspection_id?: string
          interest_level?: string | null
          working_with_agent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "listing_inspection_attendees_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_inspection_attendees_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_inspection_attendees_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "listing_open_inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_marketing_funds: {
        Row: {
          approved_amount: number
          comments: string | null
          created_at: string
          fund_date: string
          id: string
          listing_id: string
          received_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_amount?: number
          comments?: string | null
          created_at?: string
          fund_date?: string
          id?: string
          listing_id: string
          received_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_amount?: number
          comments?: string | null
          created_at?: string
          fund_date?: string
          id?: string
          listing_id?: string
          received_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_marketing_funds_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_offers: {
        Row: {
          balance_held_ibd: number | null
          balance_held_trust: number | null
          buyer_contact_id: string | null
          buyer_solicitor_contact_id: string | null
          commission_type: string
          created_at: string
          deposit_amount: number | null
          deposit_type: string
          display_price: string | null
          exchange_date: string | null
          expected_settlement_date: string | null
          expected_unconditional_date: string | null
          gross_comm_exgst: number | null
          gross_comm_incgst: number | null
          ibd_account_name: string | null
          ibd_account_number: string | null
          ibd_bank: string | null
          ibd_branch: string | null
          ibd_bsb: string | null
          id: string
          inclusions: string | null
          investor: boolean
          listing_id: string
          notes: string | null
          offer_date: string
          offer_price: number
          portal_status: string
          ref_code: string
          settlement_date: string | null
          special_conditions: string | null
          status: string
          updated_at: string
          user_id: string
          vendor_solicitor_contact_id: string | null
        }
        Insert: {
          balance_held_ibd?: number | null
          balance_held_trust?: number | null
          buyer_contact_id?: string | null
          buyer_solicitor_contact_id?: string | null
          commission_type?: string
          created_at?: string
          deposit_amount?: number | null
          deposit_type?: string
          display_price?: string | null
          exchange_date?: string | null
          expected_settlement_date?: string | null
          expected_unconditional_date?: string | null
          gross_comm_exgst?: number | null
          gross_comm_incgst?: number | null
          ibd_account_name?: string | null
          ibd_account_number?: string | null
          ibd_bank?: string | null
          ibd_branch?: string | null
          ibd_bsb?: string | null
          id?: string
          inclusions?: string | null
          investor?: boolean
          listing_id: string
          notes?: string | null
          offer_date?: string
          offer_price: number
          portal_status?: string
          ref_code: string
          settlement_date?: string | null
          special_conditions?: string | null
          status?: string
          updated_at?: string
          user_id: string
          vendor_solicitor_contact_id?: string | null
        }
        Update: {
          balance_held_ibd?: number | null
          balance_held_trust?: number | null
          buyer_contact_id?: string | null
          buyer_solicitor_contact_id?: string | null
          commission_type?: string
          created_at?: string
          deposit_amount?: number | null
          deposit_type?: string
          display_price?: string | null
          exchange_date?: string | null
          expected_settlement_date?: string | null
          expected_unconditional_date?: string | null
          gross_comm_exgst?: number | null
          gross_comm_incgst?: number | null
          ibd_account_name?: string | null
          ibd_account_number?: string | null
          ibd_bank?: string | null
          ibd_branch?: string | null
          ibd_bsb?: string | null
          id?: string
          inclusions?: string | null
          investor?: boolean
          listing_id?: string
          notes?: string | null
          offer_date?: string
          offer_price?: number
          portal_status?: string
          ref_code?: string
          settlement_date?: string | null
          special_conditions?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          vendor_solicitor_contact_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_offers_buyer_contact_id_fkey"
            columns: ["buyer_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_offers_buyer_contact_id_fkey"
            columns: ["buyer_contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_offers_buyer_solicitor_contact_id_fkey"
            columns: ["buyer_solicitor_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_offers_buyer_solicitor_contact_id_fkey"
            columns: ["buyer_solicitor_contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_offers_vendor_solicitor_contact_id_fkey"
            columns: ["vendor_solicitor_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_offers_vendor_solicitor_contact_id_fkey"
            columns: ["vendor_solicitor_contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_open_inspections: {
        Row: {
          check_in_token: string
          created_at: string
          ends_at: string
          id: string
          listing_id: string
          open_type: string
          starts_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          check_in_token?: string
          created_at?: string
          ends_at: string
          id?: string
          listing_id: string
          open_type?: string
          starts_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          check_in_token?: string
          created_at?: string
          ends_at?: string
          id?: string
          listing_id?: string
          open_type?: string
          starts_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_open_inspections_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_portal_configs: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          last_message: string | null
          last_pushed_at: string | null
          last_status: string
          listing_id: string
          portal_key: string
          portal_listing_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_message?: string | null
          last_pushed_at?: string | null
          last_status?: string
          listing_id: string
          portal_key: string
          portal_listing_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_message?: string | null
          last_pushed_at?: string | null
          last_status?: string
          listing_id?: string
          portal_key?: string
          portal_listing_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_portal_configs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_portal_feed_logs: {
        Row: {
          created_at: string
          exported_at: string
          id: string
          listing_id: string
          message: string | null
          portal_key: string
          portal_listing_id: string | null
          processed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exported_at?: string
          id?: string
          listing_id: string
          message?: string | null
          portal_key: string
          portal_listing_id?: string | null
          processed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exported_at?: string
          id?: string
          listing_id?: string
          message?: string | null
          portal_key?: string
          portal_listing_id?: string | null
          processed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_portal_feed_logs_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_portal_hits: {
        Row: {
          created_at: string
          hit_count: number
          hit_month: string
          id: string
          listing_id: string
          notes: string | null
          portal_key: string | null
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hit_count?: number
          hit_month: string
          id?: string
          listing_id: string
          notes?: string | null
          portal_key?: string | null
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hit_count?: number
          hit_month?: string
          id?: string
          listing_id?: string
          notes?: string | null
          portal_key?: string | null
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_portal_hits_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_resources: {
        Row: {
          created_at: string
          id: string
          kind: string
          listing_id: string
          sort_order: number
          title: string | null
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          listing_id: string
          sort_order?: number
          title?: string | null
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          listing_id?: string
          sort_order?: number
          title?: string | null
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_resources_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_stage_automations: {
        Row: {
          created_at: string
          email_html: string | null
          email_subject: string | null
          id: string
          pipeline_stage: string
          sms_body: string | null
          task_due_days: number | null
          task_title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_html?: string | null
          email_subject?: string | null
          id?: string
          pipeline_stage: string
          sms_body?: string | null
          task_due_days?: number | null
          task_title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_html?: string | null
          email_subject?: string | null
          id?: string
          pipeline_stage?: string
          sms_body?: string | null
          task_due_days?: number | null
          task_title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      listing_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          due_at: string | null
          id: string
          listing_id: string
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          listing_id: string
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          listing_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_tasks_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_vendor_updates: {
        Row: {
          channel: string
          created_at: string
          id: string
          listing_id: string
          sent_at: string
          summary: string | null
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          id?: string
          listing_id: string
          sent_at?: string
          summary?: string | null
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          id?: string
          listing_id?: string
          sent_at?: string
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_vendor_updates_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          access_details: string | null
          action_plan_name: string | null
          action_plan_progress: number
          address: string
          address_display_mode: string
          agentbox_id: number | null
          agentbox_synced_at: string | null
          authority_type: string | null
          bathrooms: number | null
          bedrooms: number | null
          campaign_buyer_matches_count: number
          campaign_enquiry_count: number
          campaign_inspection_count: number
          campaign_last_enquiry_at: string | null
          campaign_next_inspection_at: string | null
          campaign_offers_count: number
          campaign_start_at: string | null
          classification_meta: Json
          commission_gross_pct: number | null
          compliance_agency_agreement_signed: boolean
          compliance_form6_uploaded: boolean
          compliance_id_verified: boolean
          contact_id: string | null
          contract_body_corporate_days: number | null
          contract_building_pest_days: number | null
          contract_due_diligence_days: number | null
          contract_finance_days: number | null
          contract_subject_sale_days: number | null
          council_rates_amount: number | null
          council_rates_period: string | null
          created_at: string
          display_price: string | null
          feature_flags: Json
          for_sale_or_lease: string
          gst_status: string | null
          hidden_listing: boolean
          hide_address_portal: boolean
          id: string
          internal_info: string | null
          investment_flag: boolean
          journey_stage: string | null
          key_date_agency_expiry: string | null
          key_date_appraisal: string | null
          key_date_contract: string | null
          key_date_listed: string | null
          key_date_settlement: string | null
          land_tax_amount: number | null
          land_tax_period: string | null
          lead_temperature: string
          lease_potential_weekly: number | null
          legal_block: string | null
          legal_deposited_plan: string | null
          legal_description: string | null
          legal_folio: string | null
          legal_lot: string | null
          legal_section: string | null
          legal_volume: string | null
          legal_zoning: string | null
          listed_as_auction: boolean
          listing_image_url: string | null
          marketing_description: string | null
          marketing_headline: string | null
          mkt_brochure_status: string
          mkt_copywriting_status: string
          mkt_domain_status: string
          mkt_photography_status: string
          mkt_realestate_status: string
          mkt_social_ads_status: string
          mkt_video_status: string
          negotiator_id: string | null
          notes: string | null
          off_market: boolean
          other_outgoings_amount: number | null
          other_outgoings_period: string | null
          pipeline_stage: string | null
          price: number | null
          property_id: string | null
          property_type: string | null
          quote_price: number | null
          reapit_id: string | null
          reapit_synced_at: string | null
          relationship_category: string | null
          return_pct: number | null
          role_category: string | null
          sale_method: string | null
          search_price: number | null
          search_price_max: number | null
          search_price_min: number | null
          status: string | null
          strata_admin_amount: number | null
          strata_admin_period: string | null
          strata_sinking_amount: number | null
          strata_sinking_period: string | null
          tenanted: boolean
          timeframe_category: string
          updated_at: string
          user_id: string
          vendor_update_last_sent_at: string | null
          vendor_update_next_due_at: string | null
          water_rates_amount: number | null
          water_rates_period: string | null
        }
        Insert: {
          access_details?: string | null
          action_plan_name?: string | null
          action_plan_progress?: number
          address: string
          address_display_mode?: string
          agentbox_id?: number | null
          agentbox_synced_at?: string | null
          authority_type?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          campaign_buyer_matches_count?: number
          campaign_enquiry_count?: number
          campaign_inspection_count?: number
          campaign_last_enquiry_at?: string | null
          campaign_next_inspection_at?: string | null
          campaign_offers_count?: number
          campaign_start_at?: string | null
          classification_meta?: Json
          commission_gross_pct?: number | null
          compliance_agency_agreement_signed?: boolean
          compliance_form6_uploaded?: boolean
          compliance_id_verified?: boolean
          contact_id?: string | null
          contract_body_corporate_days?: number | null
          contract_building_pest_days?: number | null
          contract_due_diligence_days?: number | null
          contract_finance_days?: number | null
          contract_subject_sale_days?: number | null
          council_rates_amount?: number | null
          council_rates_period?: string | null
          created_at?: string
          display_price?: string | null
          feature_flags?: Json
          for_sale_or_lease?: string
          gst_status?: string | null
          hidden_listing?: boolean
          hide_address_portal?: boolean
          id?: string
          internal_info?: string | null
          investment_flag?: boolean
          journey_stage?: string | null
          key_date_agency_expiry?: string | null
          key_date_appraisal?: string | null
          key_date_contract?: string | null
          key_date_listed?: string | null
          key_date_settlement?: string | null
          land_tax_amount?: number | null
          land_tax_period?: string | null
          lead_temperature?: string
          lease_potential_weekly?: number | null
          legal_block?: string | null
          legal_deposited_plan?: string | null
          legal_description?: string | null
          legal_folio?: string | null
          legal_lot?: string | null
          legal_section?: string | null
          legal_volume?: string | null
          legal_zoning?: string | null
          listed_as_auction?: boolean
          listing_image_url?: string | null
          marketing_description?: string | null
          marketing_headline?: string | null
          mkt_brochure_status?: string
          mkt_copywriting_status?: string
          mkt_domain_status?: string
          mkt_photography_status?: string
          mkt_realestate_status?: string
          mkt_social_ads_status?: string
          mkt_video_status?: string
          negotiator_id?: string | null
          notes?: string | null
          off_market?: boolean
          other_outgoings_amount?: number | null
          other_outgoings_period?: string | null
          pipeline_stage?: string | null
          price?: number | null
          property_id?: string | null
          property_type?: string | null
          quote_price?: number | null
          reapit_id?: string | null
          reapit_synced_at?: string | null
          relationship_category?: string | null
          return_pct?: number | null
          role_category?: string | null
          sale_method?: string | null
          search_price?: number | null
          search_price_max?: number | null
          search_price_min?: number | null
          status?: string | null
          strata_admin_amount?: number | null
          strata_admin_period?: string | null
          strata_sinking_amount?: number | null
          strata_sinking_period?: string | null
          tenanted?: boolean
          timeframe_category?: string
          updated_at?: string
          user_id: string
          vendor_update_last_sent_at?: string | null
          vendor_update_next_due_at?: string | null
          water_rates_amount?: number | null
          water_rates_period?: string | null
        }
        Update: {
          access_details?: string | null
          action_plan_name?: string | null
          action_plan_progress?: number
          address?: string
          address_display_mode?: string
          agentbox_id?: number | null
          agentbox_synced_at?: string | null
          authority_type?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          campaign_buyer_matches_count?: number
          campaign_enquiry_count?: number
          campaign_inspection_count?: number
          campaign_last_enquiry_at?: string | null
          campaign_next_inspection_at?: string | null
          campaign_offers_count?: number
          campaign_start_at?: string | null
          classification_meta?: Json
          commission_gross_pct?: number | null
          compliance_agency_agreement_signed?: boolean
          compliance_form6_uploaded?: boolean
          compliance_id_verified?: boolean
          contact_id?: string | null
          contract_body_corporate_days?: number | null
          contract_building_pest_days?: number | null
          contract_due_diligence_days?: number | null
          contract_finance_days?: number | null
          contract_subject_sale_days?: number | null
          council_rates_amount?: number | null
          council_rates_period?: string | null
          created_at?: string
          display_price?: string | null
          feature_flags?: Json
          for_sale_or_lease?: string
          gst_status?: string | null
          hidden_listing?: boolean
          hide_address_portal?: boolean
          id?: string
          internal_info?: string | null
          investment_flag?: boolean
          journey_stage?: string | null
          key_date_agency_expiry?: string | null
          key_date_appraisal?: string | null
          key_date_contract?: string | null
          key_date_listed?: string | null
          key_date_settlement?: string | null
          land_tax_amount?: number | null
          land_tax_period?: string | null
          lead_temperature?: string
          lease_potential_weekly?: number | null
          legal_block?: string | null
          legal_deposited_plan?: string | null
          legal_description?: string | null
          legal_folio?: string | null
          legal_lot?: string | null
          legal_section?: string | null
          legal_volume?: string | null
          legal_zoning?: string | null
          listed_as_auction?: boolean
          listing_image_url?: string | null
          marketing_description?: string | null
          marketing_headline?: string | null
          mkt_brochure_status?: string
          mkt_copywriting_status?: string
          mkt_domain_status?: string
          mkt_photography_status?: string
          mkt_realestate_status?: string
          mkt_social_ads_status?: string
          mkt_video_status?: string
          negotiator_id?: string | null
          notes?: string | null
          off_market?: boolean
          other_outgoings_amount?: number | null
          other_outgoings_period?: string | null
          pipeline_stage?: string | null
          price?: number | null
          property_id?: string | null
          property_type?: string | null
          quote_price?: number | null
          reapit_id?: string | null
          reapit_synced_at?: string | null
          relationship_category?: string | null
          return_pct?: number | null
          role_category?: string | null
          sale_method?: string | null
          search_price?: number | null
          search_price_max?: number | null
          search_price_min?: number | null
          status?: string | null
          strata_admin_amount?: number | null
          strata_admin_period?: string | null
          strata_sinking_amount?: number | null
          strata_sinking_period?: string | null
          tenanted?: boolean
          timeframe_category?: string
          updated_at?: string
          user_id?: string
          vendor_update_last_sent_at?: string | null
          vendor_update_next_due_at?: string | null
          water_rates_amount?: number | null
          water_rates_period?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
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
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_key: string | null
          id: string
          kind: string
          priority: string
          read_at: string | null
          related_contact_id: string | null
          related_listing_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_key?: string | null
          id?: string
          kind: string
          priority?: string
          read_at?: string | null
          related_contact_id?: string | null
          related_listing_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_key?: string | null
          id?: string
          kind?: string
          priority?: string
          read_at?: string | null
          related_contact_id?: string | null
          related_listing_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      nurture_sequence_enrollments: {
        Row: {
          completed_at: string | null
          contact_id: string
          created_at: string
          current_step_index: number
          id: string
          next_step_at: string | null
          pause_followup_cadence: boolean
          pause_reason: string | null
          sequence_id: string
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          created_at?: string
          current_step_index?: number
          id?: string
          next_step_at?: string | null
          pause_followup_cadence?: boolean
          pause_reason?: string | null
          sequence_id: string
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          created_at?: string
          current_step_index?: number
          id?: string
          next_step_at?: string | null
          pause_followup_cadence?: boolean
          pause_reason?: string | null
          sequence_id?: string
          started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nurture_sequence_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nurture_sequence_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nurture_sequence_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "nurture_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      nurture_sequence_step_runs: {
        Row: {
          activated_at: string
          completed_at: string | null
          created_at: string
          enrollment_id: string
          error: string | null
          id: string
          status: string
          step_id: string | null
          step_index: number
          task_id: string | null
          updated_at: string
        }
        Insert: {
          activated_at?: string
          completed_at?: string | null
          created_at?: string
          enrollment_id: string
          error?: string | null
          id?: string
          status?: string
          step_id?: string | null
          step_index: number
          task_id?: string | null
          updated_at?: string
        }
        Update: {
          activated_at?: string
          completed_at?: string | null
          created_at?: string
          enrollment_id?: string
          error?: string | null
          id?: string
          status?: string
          step_id?: string | null
          step_index?: number
          task_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nurture_sequence_step_runs_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "nurture_archived_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nurture_sequence_step_runs_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "nurture_sequence_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nurture_sequence_step_runs_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "nurture_sequence_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nurture_sequence_step_runs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "contact_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      nurture_sequence_steps: {
        Row: {
          body: string | null
          created_at: string
          email_html: string | null
          email_subject: string | null
          id: string
          offset_days: number
          sequence_id: string
          sort_order: number
          step_type: string
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          email_html?: string | null
          email_subject?: string | null
          id?: string
          offset_days?: number
          sequence_id: string
          sort_order?: number
          step_type: string
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          email_html?: string | null
          email_subject?: string | null
          id?: string
          offset_days?: number
          sequence_id?: string
          sort_order?: number
          step_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "nurture_sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "nurture_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      nurture_sequences: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
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
      offer_conditions: {
        Row: {
          completed_at: string | null
          condition_type: string
          created_at: string
          due_date: string
          id: string
          label: string
          listing_id: string
          notes: string | null
          offer_id: string
          sort_order: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          condition_type: string
          created_at?: string
          due_date: string
          id?: string
          label: string
          listing_id: string
          notes?: string | null
          offer_id: string
          sort_order?: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          condition_type?: string
          created_at?: string
          due_date?: string
          id?: string
          label?: string
          listing_id?: string
          notes?: string | null
          offer_id?: string
          sort_order?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_conditions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_conditions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "listing_offers"
            referencedColumns: ["id"]
          },
        ]
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
      playbook_template_steps: {
        Row: {
          body: string | null
          created_at: string
          id: string
          playbook_template_id: string
          sort_order: number
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          playbook_template_id: string
          sort_order?: number
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          playbook_template_id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "playbook_template_steps_playbook_template_id_fkey"
            columns: ["playbook_template_id"]
            isOneToOne: false
            referencedRelation: "playbook_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      playbook_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
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
      price_brackets: {
        Row: {
          active_supply: number
          analysis_id: string
          bracket_high: number
          bracket_low: number
          id: string
          opportunity_score: number | null
          recent_demand: number
        }
        Insert: {
          active_supply?: number
          analysis_id: string
          bracket_high: number
          bracket_low: number
          id?: string
          opportunity_score?: number | null
          recent_demand?: number
        }
        Update: {
          active_supply?: number
          analysis_id?: string
          bracket_high?: number
          bracket_low?: number
          id?: string
          opportunity_score?: number | null
          recent_demand?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_brackets_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "pricing_analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_analyses: {
        Row: {
          bracket_size: number
          created_at: string
          id: string
          listing_id: string
          listing_price_estimate: number | null
          notes: string | null
          recommended_price: number | null
          tam_high: number
          tam_low: number
          updated_at: string
        }
        Insert: {
          bracket_size?: number
          created_at?: string
          id?: string
          listing_id: string
          listing_price_estimate?: number | null
          notes?: string | null
          recommended_price?: number | null
          tam_high: number
          tam_low: number
          updated_at?: string
        }
        Update: {
          bracket_size?: number
          created_at?: string
          id?: string
          listing_id?: string
          listing_price_estimate?: number | null
          notes?: string | null
          recommended_price?: number | null
          tam_high?: number
          tam_low?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_analyses_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
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
          appraisal_date: string | null
          bathrooms: number | null
          bedrooms: number | null
          car_spaces: number | null
          city: string | null
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
          owner_id: string | null
          postcode: string | null
          price: number | null
          price_listed: number | null
          property_description: string | null
          property_report: Json | null
          property_type: string | null
          sale_price: number | null
          settlement_date: string | null
          sold_at: string | null
          state: string | null
          street_address: string | null
          suburb: string | null
          updated_at: string | null
          user_id: string | null
          year_built: number | null
          latitude: number | null
          longitude: number | null
          geocoded_at: string | null
        }
        Insert: {
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          appraisal_date?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          car_spaces?: number | null
          city?: string | null
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
          owner_id?: string | null
          postcode?: string | null
          price?: number | null
          price_listed?: number | null
          property_description?: string | null
          property_report?: Json | null
          property_type?: string | null
          sale_price?: number | null
          settlement_date?: string | null
          sold_at?: string | null
          state?: string | null
          street_address?: string | null
          suburb?: string | null
          updated_at?: string | null
          user_id?: string | null
          year_built?: number | null
          latitude?: number | null
          longitude?: number | null
          geocoded_at?: string | null
        }
        Update: {
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          appraisal_date?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          car_spaces?: number | null
          city?: string | null
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
          owner_id?: string | null
          postcode?: string | null
          price?: number | null
          price_listed?: number | null
          property_description?: string | null
          property_report?: Json | null
          property_type?: string | null
          sale_price?: number | null
          settlement_date?: string | null
          sold_at?: string | null
          state?: string | null
          street_address?: string | null
          suburb?: string | null
          updated_at?: string | null
          user_id?: string | null
          year_built?: number | null
          latitude?: number | null
          longitude?: number | null
          geocoded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_owner_contact_id_fkey"
            columns: ["owner_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_owner_contact_id_fkey"
            columns: ["owner_contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      review_prep_checklist: {
        Row: {
          annual_review_id: string
          completed_at: string | null
          created_at: string
          id: string
          is_complete: boolean
          item: string
        }
        Insert: {
          annual_review_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          is_complete?: boolean
          item: string
        }
        Update: {
          annual_review_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          is_complete?: boolean
          item?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_prep_checklist_annual_review_id_fkey"
            columns: ["annual_review_id"]
            isOneToOne: false
            referencedRelation: "annual_reviews"
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
      script_library_templates: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          psychology_note: string | null
          situation_trigger: string | null
          sort_order: number
          tags: string[]
          title: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          psychology_note?: string | null
          situation_trigger?: string | null
          sort_order?: number
          tags?: string[]
          title: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          psychology_note?: string | null
          situation_trigger?: string | null
          sort_order?: number
          tags?: string[]
          title?: string
        }
        Relationships: []
      }
      scripts: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          is_active: boolean
          psychology_note: string | null
          situation_trigger: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          psychology_note?: string | null
          situation_trigger?: string | null
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          psychology_note?: string | null
          situation_trigger?: string | null
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
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
            foreignKeyName: "sequence_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
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
      sms_contact_list_members: {
        Row: {
          contact_id: string
          created_at: string
          list_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          list_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_contact_list_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_contact_list_members_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_contact_list_members_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "sms_contact_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_contact_lists: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sms_outbound: {
        Row: {
          batch_id: string | null
          body_preview: string | null
          contact_id: string | null
          created_at: string
          error: string | null
          id: string
          provider: string
          provider_message_id: string | null
          status: string
          to_phone: string
          user_id: string
        }
        Insert: {
          batch_id?: string | null
          body_preview?: string | null
          contact_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          provider: string
          provider_message_id?: string | null
          status?: string
          to_phone: string
          user_id: string
        }
        Update: {
          batch_id?: string | null
          body_preview?: string | null
          contact_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          provider?: string
          provider_message_id?: string | null
          status?: string
          to_phone?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_outbound_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_outbound_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_scheduled_broadcast_recipients: {
        Row: {
          broadcast_id: string
          contact_id: string
        }
        Insert: {
          broadcast_id: string
          contact_id: string
        }
        Update: {
          broadcast_id?: string
          contact_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_scheduled_broadcast_recipients_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "sms_scheduled_broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_scheduled_broadcast_recipients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_scheduled_broadcast_recipients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_scheduled_broadcasts: {
        Row: {
          append_opt_out: boolean
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          merge_fields: Json
          message: string
          scheduled_at: string
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          append_opt_out?: boolean
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          merge_fields?: Json
          message: string
          scheduled_at: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          append_opt_out?: boolean
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          merge_fields?: Json
          message?: string
          scheduled_at?: string
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sms_user_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          name?: string
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
            foreignKeyName: "tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
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
      todos: {
        Row: {
          completed: boolean
          created_at: string
          due_at: string | null
          id: string
          priority: string
          recurrence: string
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          due_at?: string | null
          id?: string
          priority?: string
          recurrence?: string
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          due_at?: string | null
          id?: string
          priority?: string
          recurrence?: string
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      touches: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          logged_by: string | null
          notes: string | null
          touch_date: string
          touch_type: string
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          logged_by?: string | null
          notes?: string | null
          touch_date?: string
          touch_type: string
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          logged_by?: string | null
          notes?: string | null
          touch_date?: string
          touch_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "touches_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "touches_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_communication_settings: {
        Row: {
          sms_signature: string
          updated_at: string
          user_id: string
        }
        Insert: {
          sms_signature?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          sms_signature?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_reminder_preferences: {
        Row: {
          digest_enabled: boolean
          digest_frequency: string
          last_digest_sent_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          digest_enabled?: boolean
          digest_frequency?: string
          last_digest_sent_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          digest_enabled?: boolean
          digest_frequency?: string
          last_digest_sent_at?: string | null
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
          notes: string | null
          sort_order: number
          status: string | null
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
          notes?: string | null
          sort_order?: number
          status?: string | null
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
          notes?: string | null
          sort_order?: number
          status?: string | null
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
      daily_touch_summary: {
        Row: {
          completed: number | null
          daily_target: number | null
          touch_type: string | null
        }
        Relationships: []
      }
      nurture_archived_enrollments: {
        Row: {
          completed_at: string | null
          contact_id: string | null
          id: string | null
          sequence_id: string | null
          started_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          contact_id?: string | null
          id?: string | null
          sequence_id?: string | null
          started_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          contact_id?: string | null
          id?: string | null
          sequence_id?: string | null
          started_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nurture_sequence_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nurture_sequence_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "stale_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nurture_sequence_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "nurture_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      nurture_archived_step_runs: {
        Row: {
          activated_at: string | null
          completed_at: string | null
          enrollment_id: string | null
          error: string | null
          id: string | null
          status: string | null
          step_id: string | null
          step_index: number | null
          task_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nurture_sequence_step_runs_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "nurture_archived_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nurture_sequence_step_runs_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "nurture_sequence_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nurture_sequence_step_runs_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "nurture_sequence_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nurture_sequence_step_runs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "contact_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      stale_contacts: {
        Row: {
          contact_category: string | null
          days_since_last_touch: number | null
          id: string | null
          last_activity_at: string | null
          last_touch_date: string | null
          name: string | null
          next_touch_date: string | null
          owner_id: string | null
          user_id: string | null
        }
        Insert: {
          contact_category?: string | null
          days_since_last_touch?: never
          id?: string | null
          last_activity_at?: string | null
          last_touch_date?: string | null
          name?: string | null
          next_touch_date?: string | null
          owner_id?: string | null
          user_id?: string | null
        }
        Update: {
          contact_category?: string | null
          days_since_last_touch?: never
          id?: string | null
          last_activity_at?: string | null
          last_touch_date?: string | null
          name?: string | null
          next_touch_date?: string | null
          owner_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      apply_activity_schedule: {
        Args: {
          p_contact_id?: string
          p_listing_id?: string
          p_template_id: string
        }
        Returns: string
      }
      cleanup_old_notifications: {
        Args: { days_old?: number }
        Returns: number
      }
      complete_activity_schedule_step: {
        Args: { p_step_run_id: string }
        Returns: undefined
      }
      complete_nurture_step_and_advance: {
        Args: {
          p_enrollment_id: string
          p_outcome?: string
          p_step_run_id: string
        }
        Returns: {
          completed_at: string
          current_step_index: number
          enrollment_id: string
          next_step_at: string
          step_run_id: string
        }[]
      }
      create_contact_with_address: { Args: { payload: Json }; Returns: Json }
      create_notification: {
        Args: {
          p_action_label?: string
          p_action_url?: string
          p_body?: string
          p_entity_id?: string
          p_entity_type?: string
          p_event_key?: string
          p_kind: string
          p_priority: string
          p_related_contact_id?: string
          p_related_listing_id?: string
          p_title: string
          p_user_id: string
        }
        Returns: string
      }
      create_property_with_address: { Args: { payload: Json }; Returns: Json }
      generate_actionable_notifications: {
        Args: { p_user_id?: string }
        Returns: number
      }
      generate_birthday_reminders: { Args: never; Returns: Json }
      generate_nurture_step_due_notifications: {
        Args: { p_user_id?: string }
        Returns: number
      }
      generate_overdue_task_notifications: {
        Args: { p_user_id?: string }
        Returns: number
      }
      generate_stale_contact_notifications: {
        Args: { p_user_id?: string }
        Returns: number
      }
      get_daily_touch_summary: {
        Args: never
        Returns: {
          completed: number
          daily_target: number
          touch_type: string
        }[]
      }
      get_data_health: { Args: never; Returns: Json }
      get_lead_rule_points: {
        Args: { p_condition_type: string; p_default: number; p_user_id: string }
        Returns: number
      }
      get_ofi_check_in_by_token:
        | {
            Args: { p_token: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_ofi_check_in_by_token(p_token => text), public.get_ofi_check_in_by_token(p_token => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"[]
          }
        | {
            Args: { p_token: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_ofi_check_in_by_token(p_token => text), public.get_ofi_check_in_by_token(p_token => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"[]
          }
      get_touch_activity_report: {
        Args: { p_range?: string }
        Returns: {
          contact_id: string
          contact_name: string
          event_id: string
          notes: string
          occurred_at: string
          source: string
          touch_type: string
        }[]
      }
      get_weekly_touch_summary: {
        Args: never
        Returns: {
          completed: number
          touch_type: string
          weekly_target: number
        }[]
      }
      log_touch_manual: {
        Args: {
          p_contact_id: string
          p_notes?: string
          p_touch_date?: string
          p_touch_type: string
        }
        Returns: string
      }
      match_buyers_for_listing: {
        Args: { p_listing_id: string }
        Returns: {
          contact_email: string
          contact_id: string
          contact_name: string
          contact_phone: string
          match_score: number
          requirement_id: string
        }[]
      }
      ofi_check_in_attendee:
        | {
            Args: {
              p_contact_id?: string
              p_guest_email?: string
              p_guest_name?: string
              p_guest_phone?: string
              p_token: string
            }
            Returns: string
          }
        | {
            Args: {
              p_contact_id?: string
              p_guest_email?: string
              p_guest_name?: string
              p_guest_phone?: string
              p_interest_level?: string
              p_token: string
              p_working_with_agent?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              p_contact_id?: string
              p_guest_email?: string
              p_guest_name?: string
              p_guest_phone?: string
              p_token: string
            }
            Returns: string
          }
      recalculate_all_contact_scores_system: { Args: never; Returns: Json }
      recalculate_contact_score: {
        Args: { p_contact_id: string }
        Returns: number
      }
      recalculate_lead_scores: { Args: { p_user_id?: string }; Returns: number }
      recalculate_my_lead_scores: { Args: never; Returns: number }
      refresh_listing_buyer_match_count: {
        Args: { p_listing_id: string }
        Returns: undefined
      }
      run_notification_digest_for_current_user: { Args: never; Returns: Json }
      run_notification_digest_system: { Args: never; Returns: Json }
      search_scripts: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          category: string
          content: string
          created_at: string
          id: string
          is_active: boolean
          psychology_note: string | null
          situation_trigger: string | null
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "scripts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      seed_january_annual_reviews: {
        Args: { p_max?: number; p_year: number }
        Returns: Json
      }
      seed_scripts_from_library: { Args: never; Returns: number }
      sync_listing_inspection_kpis: {
        Args: { p_listing_id: string }
        Returns: undefined
      }
      sync_listing_offers_kpis: {
        Args: { p_listing_id: string }
        Returns: undefined
      }
      update_contact_with_address: { Args: { payload: Json }; Returns: Json }
      user_can_access_contact: { Args: { cid: string }; Returns: boolean }
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
        | "offer"
        | "comms"
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
        "offer",
        "comms",
      ],
    },
  },
} as const
