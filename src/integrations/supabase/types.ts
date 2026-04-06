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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
      contact_playbook_assignments: {
        Row: {
          id: string
          contact_id: string
          playbook_template_id: string
          user_id: string
          current_step_index: number
          started_at: string
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contact_id: string
          playbook_template_id: string
          user_id: string
          current_step_index?: number
          started_at?: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          contact_id?: string
          playbook_template_id?: string
          user_id?: string
          current_step_index?: number
          started_at?: string
          completed_at?: string | null
          created_at?: string
          updated_at?: string
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
        ]
      }
      contact_tasks: {
        Row: {
          id: string
          contact_id: string
          user_id: string
          title: string
          notes: string | null
          due_at: string | null
          completed_at: string | null
          sequence_enrollment_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contact_id: string
          user_id: string
          title: string
          notes?: string | null
          due_at?: string | null
          completed_at?: string | null
          sequence_enrollment_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          contact_id?: string
          user_id?: string
          title?: string
          notes?: string | null
          due_at?: string | null
          completed_at?: string | null
          sequence_enrollment_id?: string | null
          created_at?: string
          updated_at?: string
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
          trigger_object?: string
          trigger_type?: string
          trigger_conditions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nurture_sequence_enrollments: {
        Row: {
          id: string
          contact_id: string
          sequence_id: string
          user_id: string
          current_step_index: number
          started_at: string
          next_step_at: string | null
          completed_at: string | null
          pause_followup_cadence: boolean
          pause_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          contact_id: string
          sequence_id: string
          user_id: string
          current_step_index?: number
          started_at?: string
          next_step_at?: string | null
          completed_at?: string | null
          pause_followup_cadence?: boolean
          pause_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          contact_id?: string
          sequence_id?: string
          user_id?: string
          current_step_index?: number
          started_at?: string
          next_step_at?: string | null
          completed_at?: string | null
          pause_followup_cadence?: boolean
          pause_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      nurture_sequences: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      nurture_sequence_steps: {
        Row: {
          id: string
          sequence_id: string
          sort_order: number
          offset_days: number
          step_type: string
          title: string
          body: string | null
          email_subject: string | null
          email_html: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sequence_id: string
          sort_order?: number
          offset_days?: number
          step_type: string
          title: string
          body?: string | null
          email_subject?: string | null
          email_html?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sequence_id?: string
          sort_order?: number
          offset_days?: number
          step_type?: string
          title?: string
          body?: string | null
          email_subject?: string | null
          email_html?: string | null
          created_at?: string
        }
        Relationships: []
      }
      playbook_templates: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      playbook_template_steps: {
        Row: {
          id: string
          playbook_template_id: string
          sort_order: number
          title: string
          body: string | null
          created_at: string
        }
        Insert: {
          id?: string
          playbook_template_id: string
          sort_order?: number
          title: string
          body?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          playbook_template_id?: string
          sort_order?: number
          title?: string
          body?: string | null
          created_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          address: string | null
          address_line1: string | null
          address_line2: string | null
          assigned_at: string | null
          buying_budget_max: number | null
          buying_budget_min: number | null
          city: string | null
          contact_type: string | null
          contact_category: string
          country: string | null
          created_at: string | null
          coming_to_market: string | null
          current_situation_notes: string | null
          do_not_contact: boolean | null
          email: string | null
          email_opt_out: boolean | null
          first_name: string | null
          id: string
          last_activity_at: string | null
          last_touch_date: string | null
          last_name: string | null
          lead_status: string | null
          lifecycle_stage: string | null
          mobile: string | null
          name: string | null
          next_follow_up_at: string | null
          next_touch_date: string | null
          notes: string | null
          owner_id: string | null
          pain_points: string | null
          phone: string | null
          pipeline_stage: string | null
          role_category: string | null
          timeframe_category: string
          lead_temperature: string
          journey_stage: string | null
          relationship_category: string | null
          classification_meta: Json
          pleasure_points: string | null
          postcode: string | null
          preferred_contact_method: string | null
          preferred_suburbs: string[] | null
          property_requirements: Json | null
          rating: string | null
          selling_intentions: string | null
          sms_opt_out: boolean | null
          source: string | null
          state: string | null
          status: string | null
          story: string | null
          suburb: string | null
          tags: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          assigned_at?: string | null
          buying_budget_max?: number | null
          buying_budget_min?: number | null
          city?: string | null
          contact_type?: string | null
          contact_category?: string
          country?: string | null
          created_at?: string | null
          coming_to_market?: string | null
          current_situation_notes?: string | null
          do_not_contact?: boolean | null
          email?: string | null
          email_opt_out?: boolean | null
          first_name?: string | null
          id?: string
          last_activity_at?: string | null
          last_touch_date?: string | null
          last_name?: string | null
          lead_status?: string | null
          lifecycle_stage?: string | null
          mobile?: string | null
          name?: string | null
          next_follow_up_at?: string | null
          next_touch_date?: string | null
          notes?: string | null
          owner_id?: string | null
          pain_points?: string | null
          phone?: string | null
          pipeline_stage?: string | null
          role_category?: string | null
          timeframe_category?: string
          lead_temperature?: string
          journey_stage?: string | null
          relationship_category?: string | null
          classification_meta?: Json
          pleasure_points?: string | null
          postcode?: string | null
          preferred_contact_method?: string | null
          preferred_suburbs?: string[] | null
          property_requirements?: Json | null
          rating?: string | null
          selling_intentions?: string | null
          sms_opt_out?: boolean | null
          source?: string | null
          state?: string | null
          status?: string | null
          story?: string | null
          suburb?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          assigned_at?: string | null
          buying_budget_max?: number | null
          buying_budget_min?: number | null
          city?: string | null
          contact_type?: string | null
          contact_category?: string
          country?: string | null
          created_at?: string | null
          coming_to_market?: string | null
          current_situation_notes?: string | null
          do_not_contact?: boolean | null
          email?: string | null
          email_opt_out?: boolean | null
          first_name?: string | null
          id?: string
          last_activity_at?: string | null
          last_touch_date?: string | null
          last_name?: string | null
          lead_status?: string | null
          lifecycle_stage?: string | null
          mobile?: string | null
          name?: string | null
          next_follow_up_at?: string | null
          next_touch_date?: string | null
          notes?: string | null
          owner_id?: string | null
          pain_points?: string | null
          phone?: string | null
          pipeline_stage?: string | null
          role_category?: string | null
          timeframe_category?: string
          lead_temperature?: string
          journey_stage?: string | null
          relationship_category?: string | null
          classification_meta?: Json
          pleasure_points?: string | null
          postcode?: string | null
          preferred_contact_method?: string | null
          preferred_suburbs?: string[] | null
          property_requirements?: Json | null
          rating?: string | null
          selling_intentions?: string | null
          sms_opt_out?: boolean | null
          source?: string | null
          state?: string | null
          status?: string | null
          story?: string | null
          suburb?: string | null
          tags?: string[] | null
          updated_at?: string | null
          user_id?: string | null
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
            foreignKeyName: "list_memberships_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
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
        Relationships: []
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
        Relationships: []
      }
      listings: {
        Row: {
          action_plan_name: string | null
          action_plan_progress: number
          address: string
          bathrooms: number | null
          bedrooms: number | null
          campaign_buyer_matches_count: number
          campaign_enquiry_count: number
          campaign_inspection_count: number
          campaign_last_enquiry_at: string | null
          campaign_next_inspection_at: string | null
          campaign_offers_count: number
          campaign_start_at: string | null
          contact_id: string | null
          contract_body_corporate_days: number | null
          contract_building_pest_days: number | null
          contract_due_diligence_days: number | null
          contract_finance_days: number | null
          contract_subject_sale_days: number | null
          created_at: string
          id: string
          listing_image_url: string | null
          notes: string | null
          pipeline_stage: string | null
          price: number | null
          property_id: string | null
          property_type: string | null
          role_category: string | null
          timeframe_category: string
          lead_temperature: string
          journey_stage: string | null
          relationship_category: string | null
          classification_meta: Json
          compliance_agency_agreement_signed: boolean
          compliance_form6_uploaded: boolean
          compliance_id_verified: boolean
          key_date_appraisal: string | null
          key_date_contract: string | null
          key_date_listed: string | null
          key_date_settlement: string | null
          mkt_brochure_status: string
          mkt_copywriting_status: string
          mkt_domain_status: string
          mkt_photography_status: string
          mkt_realestate_status: string
          mkt_social_ads_status: string
          mkt_video_status: string
          status: string | null
          updated_at: string
          user_id: string
          vendor_update_last_sent_at: string | null
          vendor_update_next_due_at: string | null
        }
        Insert: {
          action_plan_name?: string | null
          action_plan_progress?: number
          address: string
          bathrooms?: number | null
          bedrooms?: number | null
          campaign_buyer_matches_count?: number
          campaign_enquiry_count?: number
          campaign_inspection_count?: number
          campaign_last_enquiry_at?: string | null
          campaign_next_inspection_at?: string | null
          campaign_offers_count?: number
          campaign_start_at?: string | null
          contact_id?: string | null
          contract_body_corporate_days?: number | null
          contract_building_pest_days?: number | null
          contract_due_diligence_days?: number | null
          contract_finance_days?: number | null
          contract_subject_sale_days?: number | null
          created_at?: string
          id?: string
          listing_image_url?: string | null
          notes?: string | null
          pipeline_stage?: string | null
          price?: number | null
          property_id?: string | null
          property_type?: string | null
          role_category?: string | null
          timeframe_category?: string
          lead_temperature?: string
          journey_stage?: string | null
          relationship_category?: string | null
          classification_meta?: Json
          compliance_agency_agreement_signed?: boolean
          compliance_form6_uploaded?: boolean
          compliance_id_verified?: boolean
          key_date_appraisal?: string | null
          key_date_contract?: string | null
          key_date_listed?: string | null
          key_date_settlement?: string | null
          mkt_brochure_status?: string
          mkt_copywriting_status?: string
          mkt_domain_status?: string
          mkt_photography_status?: string
          mkt_realestate_status?: string
          mkt_social_ads_status?: string
          mkt_video_status?: string
          status?: string | null
          updated_at?: string
          user_id: string
          vendor_update_last_sent_at?: string | null
          vendor_update_next_due_at?: string | null
        }
        Update: {
          action_plan_name?: string | null
          action_plan_progress?: number
          address?: string
          bathrooms?: number | null
          bedrooms?: number | null
          campaign_buyer_matches_count?: number
          campaign_enquiry_count?: number
          campaign_inspection_count?: number
          campaign_last_enquiry_at?: string | null
          campaign_next_inspection_at?: string | null
          campaign_offers_count?: number
          campaign_start_at?: string | null
          contact_id?: string | null
          contract_body_corporate_days?: number | null
          contract_building_pest_days?: number | null
          contract_due_diligence_days?: number | null
          contract_finance_days?: number | null
          contract_subject_sale_days?: number | null
          created_at?: string
          id?: string
          listing_image_url?: string | null
          notes?: string | null
          pipeline_stage?: string | null
          price?: number | null
          property_id?: string | null
          property_type?: string | null
          role_category?: string | null
          timeframe_category?: string
          lead_temperature?: string
          journey_stage?: string | null
          relationship_category?: string | null
          classification_meta?: Json
          compliance_agency_agreement_signed?: boolean
          compliance_form6_uploaded?: boolean
          compliance_id_verified?: boolean
          key_date_appraisal?: string | null
          key_date_contract?: string | null
          key_date_listed?: string | null
          key_date_settlement?: string | null
          mkt_brochure_status?: string
          mkt_copywriting_status?: string
          mkt_domain_status?: string
          mkt_photography_status?: string
          mkt_realestate_status?: string
          mkt_social_ads_status?: string
          mkt_video_status?: string
          status?: string | null
          updated_at?: string
          user_id?: string
          vendor_update_last_sent_at?: string | null
          vendor_update_next_due_at?: string | null
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
        Relationships: []
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
          recent_demand?: number
        }
        Update: {
          active_supply?: number
          analysis_id?: string
          bracket_high?: number
          bracket_low?: number
          id?: string
          recent_demand?: number
        }
        Relationships: []
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
        Relationships: []
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
      script_library_templates: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          psychology_note: string | null
          situation_trigger: string | null
          sort_order: number
          tags: string[] | null
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
          tags?: string[] | null
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
          tags?: string[] | null
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
          tags: string[] | null
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
          tags?: string[] | null
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
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_reminder_preferences: {
        Row: {
          user_id: string
          digest_enabled: boolean
          digest_frequency: string
          last_digest_sent_at: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          digest_enabled?: boolean
          digest_frequency?: string
          last_digest_sent_at?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          digest_enabled?: boolean
          digest_frequency?: string
          last_digest_sent_at?: string | null
          updated_at?: string
        }
        Relationships: []
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
      todos: {
        Row: {
          id: string
          user_id: string
          title: string
          completed: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          completed?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          completed?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
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
      seed_january_annual_reviews: {
        Args: { p_max?: number; p_year: number }
        Returns: Json
      }
      seed_scripts_from_library: { Args: Record<string, never>; Returns: number }
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
