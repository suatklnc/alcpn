// Database types for Supabase
export interface Database {
  public: {
    Tables: {
      // User profiles table
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Material calculations table
      calculations: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          area: number;
          material_type: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          area: number;
          material_type: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          area?: number;
          material_type?: string;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          created_at?: string;
          updated_at?: string;
        };
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
  };
}
