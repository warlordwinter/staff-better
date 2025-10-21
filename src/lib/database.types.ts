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
          email: string;
          phone_number: string | null;
          zip_code: string;
          system_readiness: "yes" | "no" | "maybe" | null;
          referral_source: string;
          setup_completed: boolean | null;
          created_at: string;
          updated_at: string | null;
          user_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone_number?: string | null;
          zip_code: string;
          system_readiness?: "yes" | "no" | "maybe" | null;
          referral_source: string;
          setup_completed?: boolean | null;
          created_at?: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone_number?: string | null;
          zip_code?: string;
          system_readiness?: "yes" | "no" | "maybe" | null;
          referral_source?: string;
          setup_completed?: boolean | null;
          created_at?: string;
          updated_at?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "companies_user_id_fkey";
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
            foreignKeyName: "fk_company_associate_company";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_company_associate_user";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
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
            foreignKeyName: "fk_company_manager_company";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_company_manager_user";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      groups: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "groups_company_id_fkey";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
      group_members: {
        Row: {
          group_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          group_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          group_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_members_user_id_fkey";
            columns: ["user_id"];
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
          reminder_type: "SMS" | "EMAIL" | "WHATSAPP" | null;
          interval_hours: number;
          last_sent: string | null;
          max_reminders: number | null;
        };
        Insert: {
          id?: string;
          job_id: string;
          reminder_type?: "SMS" | "EMAIL" | "WHATSAPP" | null;
          interval_hours: number;
          last_sent?: string | null;
          max_reminders?: number | null;
        };
        Update: {
          id?: string;
          job_id?: string;
          reminder_type?: "SMS" | "EMAIL" | "WHATSAPP" | null;
          interval_hours?: number;
          last_sent?: string | null;
          max_reminders?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_reminder_job";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          }
        ];
      };
      jobs: {
        Row: {
          id: string;
          title: string | null;
          location: string | null;
          company_id: string;
          associate_id: string | null;
          start_date: string | null;
          end_date: string | null;
          num_reminders: number | null;
          job_status: "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED" | null;
          client_company: string | null;
        };
        Insert: {
          id?: string;
          title?: string | null;
          location?: string | null;
          company_id: string;
          associate_id?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          num_reminders?: number | null;
          job_status?:
            | "UPCOMING"
            | "ONGOING"
            | "COMPLETED"
            | "CANCELLED"
            | null;
          client_company?: string | null;
        };
        Update: {
          id?: string;
          title?: string | null;
          location?: string | null;
          company_id?: string;
          associate_id?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          num_reminders?: number | null;
          job_status?:
            | "UPCOMING"
            | "ONGOING"
            | "COMPLETED"
            | "CANCELLED"
            | null;
          client_company?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fk_job_company";
            columns: ["company_id"];
            isOneToOne: false;
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_job_associate";
            columns: ["associate_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      users: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          role: "MANAGER" | "ASSOCIATE";
          email: string | null;
          phone_number: string;
          sms_opt_out: boolean | null;
          whatsapp: string | null;
          created_at: string;
          auth_id: string | null;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          role: "MANAGER" | "ASSOCIATE";
          email?: string | null;
          phone_number: string;
          sms_opt_out?: boolean | null;
          whatsapp?: string | null;
          created_at?: string;
          auth_id?: string | null;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          role?: "MANAGER" | "ASSOCIATE";
          email?: string | null;
          phone_number?: string;
          sms_opt_out?: boolean | null;
          whatsapp?: string | null;
          created_at?: string;
          auth_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
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
    Enums: {},
  },
} as const;
