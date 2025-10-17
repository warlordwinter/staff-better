export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)";
  };
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone_number: string | null;
          zip_code: string | null;
          system_readiness: string | null;
          referral_source: string | null;
          setup_completed: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          phone_number?: string | null;
          zip_code?: string | null;
          system_readiness?: string | null;
          referral_source?: string | null;
          setup_completed?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string | null;
          phone_number?: string | null;
          zip_code?: string | null;
          system_readiness?: string | null;
          referral_source?: string | null;
          setup_completed?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          role: string | null;
          email: string | null;
          phone_number: string | null;
          sms_opt_out: boolean | null;
          whatsapp: string | null;
          created_at: string | null;
          auth_id: string | null;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          role?: string | null;
          email?: string | null;
          phone_number?: string | null;
          sms_opt_out?: boolean | null;
          whatsapp?: string | null;
          created_at?: string | null;
          auth_id?: string | null;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          role?: string | null;
          email?: string | null;
          phone_number?: string | null;
          sms_opt_out?: boolean | null;
          whatsapp?: string | null;
          created_at?: string | null;
          auth_id?: string | null;
        };
        Relationships: [];
      };
      company_managers: {
        Row: {
          company_id: string;
          user_id: string;
        };
        Insert: {
          company_id: string;
          user_id: string;
        };
        Update: {
          company_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_managers_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_managers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      company_associates: {
        Row: {
          company_id: string;
          user_id: string;
        };
        Insert: {
          company_id: string;
          user_id: string;
        };
        Update: {
          company_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "company_associates_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "company_associates_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      jobs: {
        Row: {
          id: string;
          title: string;
          location: string | null;
          company_id: string;
          associate_id: string | null;
          start_date: string | null;
          end_date: string | null;
          pay_rate: number | null;
          incentive_bonus: number | null;
          num_reminders: number | null;
          job_status: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          location?: string | null;
          company_id: string;
          associate_id?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          pay_rate?: number | null;
          incentive_bonus?: number | null;
          num_reminders?: number | null;
          job_status?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          location?: string | null;
          company_id?: string;
          associate_id?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          pay_rate?: number | null;
          incentive_bonus?: number | null;
          num_reminders?: number | null;
          job_status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_associate_id_fkey";
            columns: ["associate_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      job_reminders: {
        Row: {
          id: string;
          job_id: string;
          reminder_type: string | null;
          interval_hours: number | null;
          last_sent: string | null;
          max_reminders: number | null;
        };
        Insert: {
          id?: string;
          job_id: string;
          reminder_type?: string | null;
          interval_hours?: number | null;
          last_sent?: string | null;
          max_reminders?: number | null;
        };
        Update: {
          id?: string;
          job_id?: string;
          reminder_type?: string | null;
          interval_hours?: number | null;
          last_sent?: string | null;
          max_reminders?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "job_reminders_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      confirmation_status_enum:
        | "UNCONFIRMED"
        | "SOFT_CONFIRMED"
        | "LIKELY_CONFIRMED"
        | "CONFIRMED"
        | "DECLINED";
      job_status_enum: "ACTIVE" | "PAST" | "UPCOMING";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

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
} as const;
