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
          id: string
          job_status: Database["public"]["Enums"]["job_status_enum"] | null
          job_title: string | null
          start_date: string | null
          start_time: string | null
        }
        Insert: {
          company_id: string
          customer_name: string
          id?: string
          job_status?: Database["public"]["Enums"]["job_status_enum"] | null
          job_title?: string | null
          start_date?: string | null
          start_time?: string | null
        }
        Update: {
          company_id?: string
          customer_name?: string
          id?: string
          job_status?: Database["public"]["Enums"]["job_status_enum"] | null
          job_title?: string | null
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
            foreignKeyName: "fk_user_profiles_company_id"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
      confirmation_status_enum: [
        "UNCONFIRMED",
        "SOFT_CONFIRMED",
        "LIKELY_CONFIRMED",
        "CONFIRMED",
        "DECLINED",
      ],
      job_status_enum: ["ACTIVE", "PAST", "UPCOMING"],
    },
  },
} as const
