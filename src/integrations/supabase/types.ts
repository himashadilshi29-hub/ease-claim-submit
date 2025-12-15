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
      claim_documents: {
        Row: {
          claim_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          ocr_confidence: number | null
          ocr_extracted_text: string | null
        }
        Insert: {
          claim_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          ocr_confidence?: number | null
          ocr_extracted_text?: string | null
        }
        Update: {
          claim_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          ocr_confidence?: number | null
          ocr_extracted_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_documents_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_history: {
        Row: {
          action: string
          claim_id: string
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["claim_status"] | null
          notes: string | null
          performed_by: string | null
          previous_status: Database["public"]["Enums"]["claim_status"] | null
        }
        Insert: {
          action: string
          claim_id: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["claim_status"] | null
          notes?: string | null
          performed_by?: string | null
          previous_status?: Database["public"]["Enums"]["claim_status"] | null
        }
        Update: {
          action?: string
          claim_id?: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["claim_status"] | null
          notes?: string | null
          performed_by?: string | null
          previous_status?: Database["public"]["Enums"]["claim_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_history_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
        ]
      }
      claims: {
        Row: {
          account_number: string | null
          admin_notes: string | null
          bank_name: string | null
          claim_amount: number
          claim_type: Database["public"]["Enums"]["claim_type"]
          created_at: string
          date_of_treatment: string | null
          diagnosis: string | null
          fraud_flags: number | null
          fraud_status: string | null
          id: string
          mobile_number: string | null
          ocr_confidence: number | null
          ocr_level: string | null
          policy_number: string
          processed_at: string | null
          reference_number: string
          rejection_reason: string | null
          relationship: Database["public"]["Enums"]["relationship_type"]
          risk_level: string | null
          risk_score: number | null
          status: Database["public"]["Enums"]["claim_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number?: string | null
          admin_notes?: string | null
          bank_name?: string | null
          claim_amount: number
          claim_type: Database["public"]["Enums"]["claim_type"]
          created_at?: string
          date_of_treatment?: string | null
          diagnosis?: string | null
          fraud_flags?: number | null
          fraud_status?: string | null
          id?: string
          mobile_number?: string | null
          ocr_confidence?: number | null
          ocr_level?: string | null
          policy_number: string
          processed_at?: string | null
          reference_number: string
          rejection_reason?: string | null
          relationship: Database["public"]["Enums"]["relationship_type"]
          risk_level?: string | null
          risk_score?: number | null
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string | null
          admin_notes?: string | null
          bank_name?: string | null
          claim_amount?: number
          claim_type?: Database["public"]["Enums"]["claim_type"]
          created_at?: string
          date_of_treatment?: string | null
          diagnosis?: string | null
          fraud_flags?: number | null
          fraud_status?: string | null
          id?: string
          mobile_number?: string | null
          ocr_confidence?: number | null
          ocr_level?: string | null
          policy_number?: string
          processed_at?: string | null
          reference_number?: string
          rejection_reason?: string | null
          relationship?: Database["public"]["Enums"]["relationship_type"]
          risk_level?: string | null
          risk_score?: number | null
          status?: Database["public"]["Enums"]["claim_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          nic: string | null
          portal: Database["public"]["Enums"]["user_portal"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          nic?: string | null
          portal?: Database["public"]["Enums"]["user_portal"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          nic?: string | null
          portal?: Database["public"]["Enums"]["user_portal"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["user_portal"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["user_portal"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["user_portal"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_portal: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_portal"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_portal"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      claim_status:
        | "pending"
        | "processing"
        | "approved"
        | "rejected"
        | "manual-review"
      claim_type: "opd" | "spectacles" | "dental"
      relationship_type: "self" | "spouse" | "child" | "parent"
      user_portal: "admin" | "branch" | "customer"
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
      claim_status: [
        "pending",
        "processing",
        "approved",
        "rejected",
        "manual-review",
      ],
      claim_type: ["opd", "spectacles", "dental"],
      relationship_type: ["self", "spouse", "child", "parent"],
      user_portal: ["admin", "branch", "customer"],
    },
  },
} as const
