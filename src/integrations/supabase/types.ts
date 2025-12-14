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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      companies: {
        Row: {
          cnpj: string
          created_at: string
          id: string
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          updated_at: string
        }
        Insert: {
          cnpj: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_refresh_history: {
        Row: {
          completed_at: string | null
          created_at: string
          dashboard_id: string
          error_message: string | null
          id: string
          started_at: string
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          dashboard_id: string
          error_message?: string | null
          id?: string
          started_at?: string
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          dashboard_id?: string
          error_message?: string | null
          id?: string
          started_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboard_refresh_history_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboards: {
        Row: {
          company_id: string | null
          created_at: string
          credential_id: string | null
          dashboard_id: string
          dataset_id: string | null
          embed_type: string
          id: string
          name: string
          owner_id: string
          public_link: string | null
          report_section: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          credential_id?: string | null
          dashboard_id: string
          dataset_id?: string | null
          embed_type?: string
          id?: string
          name: string
          owner_id: string
          public_link?: string | null
          report_section?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          credential_id?: string | null
          dashboard_id?: string
          dataset_id?: string | null
          embed_type?: string
          id?: string
          name?: string
          owner_id?: string
          public_link?: string | null
          report_section?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dashboards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboards_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "power_bi_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dashboards_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      power_bi_configs: {
        Row: {
          client_id: string
          client_secret: string
          company_id: string | null
          created_at: string
          id: string
          name: string
          password: string | null
          tenant_id: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          client_id: string
          client_secret: string
          company_id?: string | null
          created_at?: string
          id?: string
          name?: string
          password?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          client_id?: string
          client_secret?: string
          company_id?: string | null
          created_at?: string
          id?: string
          name?: string
          password?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "power_bi_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "power_bi_configs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      report_subscriptions: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          dashboard_id: string
          export_format: Database["public"]["Enums"]["export_format"]
          frequency: Database["public"]["Enums"]["schedule_frequency"]
          id: string
          is_active: boolean
          last_sent_at: string | null
          name: string
          next_send_at: string | null
          report_page: string | null
          schedule_day_of_month: number | null
          schedule_days_of_week: number[] | null
          schedule_interval_hours: number | null
          schedule_time: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          dashboard_id: string
          export_format?: Database["public"]["Enums"]["export_format"]
          frequency?: Database["public"]["Enums"]["schedule_frequency"]
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          name: string
          next_send_at?: string | null
          report_page?: string | null
          schedule_day_of_month?: number | null
          schedule_days_of_week?: number[] | null
          schedule_interval_hours?: number | null
          schedule_time?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          dashboard_id?: string
          export_format?: Database["public"]["Enums"]["export_format"]
          frequency?: Database["public"]["Enums"]["schedule_frequency"]
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          name?: string
          next_send_at?: string | null
          report_page?: string | null
          schedule_day_of_month?: number | null
          schedule_days_of_week?: number[] | null
          schedule_interval_hours?: number | null
          schedule_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_subscriptions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_subscriptions_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_logs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          recipients_count: number | null
          started_at: string
          status: string
          subscription_id: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          recipients_count?: number | null
          started_at?: string
          status: string
          subscription_id: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          recipients_count?: number | null
          started_at?: string
          status?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_logs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "report_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_recipients: {
        Row: {
          apply_rls: boolean
          created_at: string
          email: string
          id: string
          name: string | null
          rls_user_id: string | null
          subscription_id: string
        }
        Insert: {
          apply_rls?: boolean
          created_at?: string
          email: string
          id?: string
          name?: string | null
          rls_user_id?: string | null
          subscription_id: string
        }
        Update: {
          apply_rls?: boolean
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          rls_user_id?: string | null
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_recipients_rls_user_id_fkey"
            columns: ["rls_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_recipients_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "report_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          message: string
          sender_type: string
          status: string | null
          user_id: string
          whatsapp_message_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          message: string
          sender_type: string
          status?: string | null
          user_id: string
          whatsapp_message_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          message?: string
          sender_type?: string
          status?: string | null
          user_id?: string
          whatsapp_message_id?: string | null
        }
        Relationships: []
      }
      user_dashboard_access: {
        Row: {
          created_at: string
          dashboard_id: string
          granted_by: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dashboard_id: string
          granted_by: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dashboard_id?: string
          granted_by?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_dashboard_access_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_dashboard_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_dashboard_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_dashboard_refresh_permissions: {
        Row: {
          created_at: string
          dashboard_id: string
          granted_by: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dashboard_id: string
          granted_by: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          dashboard_id?: string
          granted_by?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_dashboard_refresh_permissions_dashboard_id_fkey"
            columns: ["dashboard_id"]
            isOneToOne: false
            referencedRelation: "dashboards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          company_id: string | null
          created_at: string
          dashboard_ids: string[]
          email: string
          expires_at: string
          id: string
          invited_by: string
          invited_role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company_id?: string | null
          created_at?: string
          dashboard_ids?: string[]
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          invited_role?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string | null
          created_at?: string
          dashboard_ids?: string[]
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          invited_role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      export_format: "pdf" | "pptx"
      schedule_frequency: "once" | "daily" | "weekly" | "monthly" | "interval"
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
      app_role: ["admin", "user"],
      export_format: ["pdf", "pptx"],
      schedule_frequency: ["once", "daily", "weekly", "monthly", "interval"],
    },
  },
} as const
