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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      associates: {
        Row: {
          company_id: string | null
          email_address: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone_number: string
          reminder_opt_out: boolean | null
          sms_opt_out: boolean | null
          updated_at: string | null
        }
        Insert: {
          company_id?: string | null
          email_address?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone_number: string
          reminder_opt_out?: boolean | null
          sms_opt_out?: boolean | null
          updated_at?: string | null
        }
        Update: {
          company_id?: string | null
          email_address?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone_number?: string
          reminder_opt_out?: boolean | null
          sms_opt_out?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "associates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          brand_name: string | null
          brand_type: string | null
          created_at: string | null
          customer_id: string
          id: string
          status: string | null
          twilio_brand_sid: string | null
          updated_at: string | null
          waba_id: string | null
        }
        Insert: {
          brand_name?: string | null
          brand_type?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          status?: string | null
          twilio_brand_sid?: string | null
          updated_at?: string | null
          waba_id?: string | null
        }
        Update: {
          brand_name?: string | null
          brand_type?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          status?: string | null
          twilio_brand_sid?: string | null
          updated_at?: string | null
          waba_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brands_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "isv_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          brand_id: string
          campaign_sid: string | null
          created_at: string | null
          customer_id: string
          estimated_volume: number | null
          id: string
          messaging_service_sid: string | null
          sample_message: string | null
          status: string | null
          updated_at: string | null
          use_case: string | null
        }
        Insert: {
          brand_id: string
          campaign_sid?: string | null
          created_at?: string | null
          customer_id: string
          estimated_volume?: number | null
          id?: string
          messaging_service_sid?: string | null
          sample_message?: string | null
          status?: string | null
          updated_at?: string | null
          use_case?: string | null
        }
        Update: {
          brand_id?: string
          campaign_sid?: string | null
          created_at?: string | null
          customer_id?: string
          estimated_volume?: number | null
          id?: string
          messaging_service_sid?: string | null
          sample_message?: string | null
          status?: string | null
          updated_at?: string | null
          use_case?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "isv_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          company_name: string
          created_at: string | null
          email: string
          id: string
          non_temp_employees: number | null
          phone_number: string | null
          referral_source: string
          setup_completed: boolean | null
          system_readiness: string | null
          updated_at: string | null
          user_id: string
          zip_code: string
        }
        Insert: {
          company_name: string
          created_at?: string | null
          email: string
          id?: string
          non_temp_employees?: number | null
          phone_number?: string | null
          referral_source: string
          setup_completed?: boolean | null
          system_readiness?: string | null
          updated_at?: string | null
          user_id: string
          zip_code: string
        }
        Update: {
          company_name?: string
          created_at?: string | null
          email?: string
          id?: string
          non_temp_employees?: number | null
          phone_number?: string | null
          referral_source?: string
          setup_completed?: boolean | null
          system_readiness?: string | null
          updated_at?: string | null
          user_id?: string
          zip_code?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          associate_id: string
          company_id: string
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          associate_id: string
          company_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          associate_id?: string
          company_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_associate_id_fkey"
            columns: ["associate_id"]
            isOneToOne: false
            referencedRelation: "associates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      group_associates: {
        Row: {
          associate_id: string
          created_at: string | null
          group_id: string
        }
        Insert: {
          associate_id: string
          created_at?: string | null
          group_id: string
        }
        Update: {
          associate_id?: string
          created_at?: string | null
          group_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ga_associate_id_fkey"
            columns: ["associate_id"]
            isOneToOne: false
            referencedRelation: "associates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ga_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          company_id: string
          created_at: string | null
          description: string | null
          group_name: string
          id: string
        }
        Insert: {
          company_id: string
          created_at?: string | null
          description?: string | null
          group_name: string
          id?: string
        }
        Update: {
          company_id?: string
          created_at?: string | null
          description?: string | null
          group_name?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      isv_customers: {
        Row: {
          address: string | null
          business_type: string | null
          company_id: string | null
          contact_email: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          estimated_monthly_volume: number | null
          id: string
          legal_name: string
          meta_admin_email: string | null
          meta_business_manager_id: string | null
          migration_completed_at: string | null
          migration_status:
            | Database["public"]["Enums"]["migration_status_type"]
            | null
          name: string
          opt_in_description: string | null
          phone_number_preference: string | null
          primary_account_brand_sid: string | null
          primary_account_campaign_sid: string | null
          primary_account_customer_profile_sid: string | null
          primary_account_messaging_service_sid: string | null
          status: string | null
          tax_id: string | null
          updated_at: string | null
          use_case_descriptions: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          business_type?: string | null
          company_id?: string | null
          contact_email: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          estimated_monthly_volume?: number | null
          id?: string
          legal_name: string
          meta_admin_email?: string | null
          meta_business_manager_id?: string | null
          migration_completed_at?: string | null
          migration_status?:
            | Database["public"]["Enums"]["migration_status_type"]
            | null
          name: string
          opt_in_description?: string | null
          phone_number_preference?: string | null
          primary_account_brand_sid?: string | null
          primary_account_campaign_sid?: string | null
          primary_account_customer_profile_sid?: string | null
          primary_account_messaging_service_sid?: string | null
          status?: string | null
          tax_id?: string | null
          updated_at?: string | null
          use_case_descriptions?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          business_type?: string | null
          company_id?: string | null
          contact_email?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          estimated_monthly_volume?: number | null
          id?: string
          legal_name?: string
          meta_admin_email?: string | null
          meta_business_manager_id?: string | null
          migration_completed_at?: string | null
          migration_status?:
            | Database["public"]["Enums"]["migration_status_type"]
            | null
          name?: string
          opt_in_description?: string | null
          phone_number_preference?: string | null
          primary_account_brand_sid?: string | null
          primary_account_campaign_sid?: string | null
          primary_account_customer_profile_sid?: string | null
          primary_account_messaging_service_sid?: string | null
          status?: string | null
          tax_id?: string | null
          updated_at?: string | null
          use_case_descriptions?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "isv_customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      isv_messages: {
        Row: {
          body: string | null
          created_at: string | null
          customer_id: string
          direction: string
          error_code: string | null
          error_message: string | null
          from_number: string
          id: string
          status: string | null
          template_id: string | null
          to_number: string
          twilio_sid: string | null
          updated_at: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          customer_id: string
          direction: string
          error_code?: string | null
          error_message?: string | null
          from_number: string
          id?: string
          status?: string | null
          template_id?: string | null
          to_number: string
          twilio_sid?: string | null
          updated_at?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          customer_id?: string
          direction?: string
          error_code?: string | null
          error_message?: string | null
          from_number?: string
          id?: string
          status?: string | null
          template_id?: string | null
          to_number?: string
          twilio_sid?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "isv_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "isv_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "isv_messages_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      isv_numbers: {
        Row: {
          country_code: string | null
          created_at: string | null
          customer_id: string
          id: string
          messaging_service_sid: string | null
          phone_number: string
          provisioned_for_whatsapp: boolean | null
          twilio_number_sid: string
          updated_at: string | null
          whatsapp_status: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          messaging_service_sid?: string | null
          phone_number: string
          provisioned_for_whatsapp?: boolean | null
          twilio_number_sid: string
          updated_at?: string | null
          whatsapp_status?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          messaging_service_sid?: string | null
          phone_number?: string
          provisioned_for_whatsapp?: boolean | null
          twilio_number_sid?: string
          updated_at?: string | null
          whatsapp_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "isv_numbers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "isv_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      job_assignments: {
        Row: {
          associate_id: string
          confirmation_status:
            | Database["public"]["Enums"]["confirmation_status_enum"]
            | null
          job_id: string
          last_confirmation_time: string | null
          last_reminder_time: string | null
          num_reminders: number | null
          reminder_sent_at: string[] | null
          reminder_types: string[] | null
          start_time: string | null
          work_date: string | null
        }
        Insert: {
          associate_id: string
          confirmation_status?:
            | Database["public"]["Enums"]["confirmation_status_enum"]
            | null
          job_id: string
          last_confirmation_time?: string | null
          last_reminder_time?: string | null
          num_reminders?: number | null
          reminder_sent_at?: string[] | null
          reminder_types?: string[] | null
          start_time?: string | null
          work_date?: string | null
        }
        Update: {
          associate_id?: string
          confirmation_status?:
            | Database["public"]["Enums"]["confirmation_status_enum"]
            | null
          job_id?: string
          last_confirmation_time?: string | null
          last_reminder_time?: string | null
          num_reminders?: number | null
          reminder_sent_at?: string[] | null
          reminder_types?: string[] | null
          start_time?: string | null
          work_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_assignments_associate_id_fkey"
            columns: ["associate_id"]
            isOneToOne: false
            referencedRelation: "associates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          company_id: string
          customer_name: string
          day_of_time: string | null
          id: string
          job_status: Database["public"]["Enums"]["job_status_enum"] | null
          job_title: string | null
          night_before_time: string | null
          start_date: string | null
          start_time: string | null
        }
        Insert: {
          company_id: string
          customer_name: string
          day_of_time?: string | null
          id?: string
          job_status?: Database["public"]["Enums"]["job_status_enum"] | null
          job_title?: string | null
          night_before_time?: string | null
          start_date?: string | null
          start_time?: string | null
        }
        Update: {
          company_id?: string
          customer_name?: string
          day_of_time?: string | null
          id?: string
          job_status?: Database["public"]["Enums"]["job_status_enum"] | null
          job_title?: string | null
          night_before_time?: string | null
          start_date?: string | null
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          conversation_id: string
          delivered_at: string | null
          direction: string | null
          id: string
          sender_type: string
          sent_at: string | null
          status: string | null
          twilio_sid: string | null
        }
        Insert: {
          body?: string | null
          conversation_id: string
          delivered_at?: string | null
          direction?: string | null
          id?: string
          sender_type: string
          sent_at?: string | null
          status?: string | null
          twilio_sid?: string | null
        }
        Update: {
          body?: string | null
          conversation_id?: string
          delivered_at?: string | null
          direction?: string | null
          id?: string
          sender_type?: string
          sent_at?: string | null
          status?: string | null
          twilio_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      opt_info: {
        Row: {
          associate_id: string
          first_reminder_opt_out: boolean
          first_sms_opt_out: boolean
          reminder_opt_out_time: string | null
          sms_opt_out_time: string | null
        }
        Insert: {
          associate_id: string
          first_reminder_opt_out?: boolean
          first_sms_opt_out?: boolean
          reminder_opt_out_time?: string | null
          sms_opt_out_time?: string | null
        }
        Update: {
          associate_id?: string
          first_reminder_opt_out?: boolean
          first_sms_opt_out?: boolean
          reminder_opt_out_time?: string | null
          sms_opt_out_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "opt_info_associate_id_fkey"
            columns: ["associate_id"]
            isOneToOne: true
            referencedRelation: "associates"
            referencedColumns: ["id"]
          },
        ]
      }
      opt_outs: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          opt_in_proof: Json | null
          opt_out_method: string | null
          opt_out_type: string | null
          phone_number: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          opt_in_proof?: Json | null
          opt_out_method?: string | null
          opt_out_type?: string | null
          phone_number: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          opt_in_proof?: Json | null
          opt_out_method?: string | null
          opt_out_type?: string | null
          phone_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "opt_outs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "isv_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_schedules: {
        Row: {
          created_at: string | null
          id: string
          job_id: string
          reminder_type: string
          schedule_arn: string
          scheduled_time: string
          start_time: string
          updated_at: string | null
          work_date: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id: string
          reminder_type: string
          schedule_arn: string
          scheduled_time: string
          start_time: string
          updated_at?: string | null
          work_date: string
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string
          reminder_type?: string
          schedule_arn?: string
          scheduled_time?: string
          start_time?: string
          updated_at?: string | null
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_job"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          body: string
          category: string | null
          created_at: string | null
          customer_id: string
          id: string
          language: string | null
          rejection_reason: string | null
          status: string | null
          template_name: string
          twilio_template_id: string | null
          updated_at: string | null
        }
        Insert: {
          body: string
          category?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          language?: string | null
          rejection_reason?: string | null
          status?: string | null
          template_name: string
          twilio_template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          body?: string
          category?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          language?: string | null
          rejection_reason?: string | null
          status?: string | null
          template_name?: string
          twilio_template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "isv_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      twilio_subaccounts: {
        Row: {
          api_key_secret_encrypted: string | null
          api_key_sid: string | null
          auth_token_encrypted: string
          created_at: string | null
          customer_id: string
          friendly_name: string | null
          id: string
          messaging_service_sid: string | null
          status: string | null
          subaccount_sid: string
          updated_at: string | null
        }
        Insert: {
          api_key_secret_encrypted?: string | null
          api_key_sid?: string | null
          auth_token_encrypted: string
          created_at?: string | null
          customer_id: string
          friendly_name?: string | null
          id?: string
          messaging_service_sid?: string | null
          status?: string | null
          subaccount_sid: string
          updated_at?: string | null
        }
        Update: {
          api_key_secret_encrypted?: string | null
          api_key_sid?: string | null
          auth_token_encrypted?: string
          created_at?: string | null
          customer_id?: string
          friendly_name?: string | null
          id?: string
          messaging_service_sid?: string | null
          status?: string | null
          subaccount_sid?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "twilio_subaccounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "isv_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          company_id: string | null
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string | null
          customer_id: string | null
          error: string | null
          event_payload: Json
          event_type: string
          id: string
          processed: boolean | null
          processed_at: string | null
          retry_count: number | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          error?: string | null
          event_payload: Json
          event_type: string
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          retry_count?: number | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          error?: string | null
          event_payload?: Json
          event_type?: string
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          retry_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "isv_customers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      confirmation_status_enum:
        | "UNCONFIRMED"
        | "SOFT_CONFIRMED"
        | "LIKELY_CONFIRMED"
        | "CONFIRMED"
        | "DECLINED"
      job_status_enum: "ACTIVE" | "PAST" | "UPCOMING"
      migration_status_type:
        | "pending"
        | "approved"
        | "migrating"
        | "completed"
        | "failed"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      confirmation_status_enum: [
        "UNCONFIRMED",
        "SOFT_CONFIRMED",
        "LIKELY_CONFIRMED",
        "CONFIRMED",
        "DECLINED",
      ],
      job_status_enum: ["ACTIVE", "PAST", "UPCOMING"],
      migration_status_type: [
        "pending",
        "approved",
        "migrating",
        "completed",
        "failed",
      ],
    },
  },
} as const
