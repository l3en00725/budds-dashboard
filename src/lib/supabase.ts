import { createClient } from '@supabase/supabase-js';
import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// For client-side usage
export const createClientComponentClient = () =>
  createBrowserClient(supabaseUrl, supabaseAnonKey);

// For server-side usage (API routes, server components)
export const createServerComponentClient = async () => {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  });
};

// For admin operations (service role)
export const createServiceRoleClient = () =>
  createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

// Database types for TypeScript
export interface Database {
  public: {
    Tables: {
      jobber_jobs: {
        Row: {
          id: string;
          job_id: string;
          job_number: string | null;
          title: string | null;
          description: string | null;
          status: string | null;
          invoiced: boolean;
          revenue: number | null;
          client_id: string | null;
          client_name: string | null;
          start_date: string | null;
          end_date: string | null;
          created_at_jobber: string | null;
          pulled_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          job_number?: string;
          title?: string;
          description?: string;
          status?: string;
          invoiced?: boolean;
          revenue?: number;
          client_id?: string;
          client_name?: string;
          start_date?: string;
          end_date?: string;
          created_at_jobber?: string;
          pulled_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          job_number?: string;
          title?: string;
          description?: string;
          status?: string;
          invoiced?: boolean;
          revenue?: number;
          client_id?: string;
          client_name?: string;
          start_date?: string;
          end_date?: string;
          created_at_jobber?: string;
          pulled_at?: string;
        };
      };
      jobber_quotes: {
        Row: {
          id: string;
          quote_id: string;
          quote_number: string | null;
          client_id: string | null;
          client_name: string | null;
          client_email: string | null;
          client_phone: string | null;
          status: string | null;
          amount: number | null;
          created_at_jobber: string | null;
          expires_at: string | null;
          pulled_at: string;
        };
        Insert: {
          id?: string;
          quote_id: string;
          quote_number?: string;
          client_id?: string;
          client_name?: string;
          client_email?: string;
          client_phone?: string;
          status?: string;
          amount?: number;
          created_at_jobber?: string;
          expires_at?: string;
          pulled_at?: string;
        };
        Update: {
          id?: string;
          quote_id?: string;
          quote_number?: string;
          client_id?: string;
          client_name?: string;
          client_email?: string;
          client_phone?: string;
          status?: string;
          amount?: number;
          created_at_jobber?: string;
          expires_at?: string;
          pulled_at?: string;
        };
      };
      jobber_invoices: {
        Row: {
          id: string;
          invoice_id: string;
          invoice_number: string | null;
          client_id: string | null;
          client_name: string | null;
          job_id: string | null;
          status: string | null;
          amount: number | null;
          balance: number | null;
          issue_date: string | null;
          due_date: string | null;
          created_at_jobber: string | null;
          pulled_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          invoice_number?: string;
          client_id?: string;
          client_name?: string;
          job_id?: string;
          status?: string;
          amount?: number;
          balance?: number;
          issue_date?: string;
          due_date?: string;
          created_at_jobber?: string;
          pulled_at?: string;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          invoice_number?: string;
          client_id?: string;
          client_name?: string;
          job_id?: string;
          status?: string;
          amount?: number;
          balance?: number;
          issue_date?: string;
          due_date?: string;
          created_at_jobber?: string;
          pulled_at?: string;
        };
      };
      jobber_payments: {
        Row: {
          id: string;
          payment_id: string;
          customer: string | null;
          client_id: string | null;
          invoice_id: string | null;
          amount: number | null;
          payment_date: string | null;
          payment_method: string | null;
          created_at_jobber: string | null;
          pulled_at: string;
        };
        Insert: {
          id?: string;
          payment_id: string;
          customer?: string;
          client_id?: string;
          invoice_id?: string;
          amount?: number;
          payment_date?: string;
          payment_method?: string;
          created_at_jobber?: string;
          pulled_at?: string;
        };
        Update: {
          id?: string;
          payment_id?: string;
          customer?: string;
          client_id?: string;
          invoice_id?: string;
          amount?: number;
          payment_date?: string;
          payment_method?: string;
          created_at_jobber?: string;
          pulled_at?: string;
        };
      };
      quickbooks_revenue_ytd: {
        Row: {
          id: string;
          year: number | null;
          ytd_revenue: number | null;
          ttm_revenue: number | null;
          ttm_revenue_last_year: number | null;
          pulled_at: string;
        };
        Insert: {
          id?: string;
          year?: number;
          ytd_revenue?: number;
          ttm_revenue?: number;
          ttm_revenue_last_year?: number;
          pulled_at?: string;
        };
        Update: {
          id?: string;
          year?: number;
          ytd_revenue?: number;
          ttm_revenue?: number;
          ttm_revenue_last_year?: number;
          pulled_at?: string;
        };
      };
      openphone_calls: {
        Row: {
          id: string;
          call_id: string;
          caller_number: string | null;
          direction: string | null;
          duration: number | null;
          transcript: string | null;
          classified_as_booked: boolean | null;
          classification_confidence: number | null;
          call_date: string | null;
          pulled_at: string;
        };
        Insert: {
          id?: string;
          call_id: string;
          caller_number?: string;
          direction?: string;
          duration?: number;
          transcript?: string;
          classified_as_booked?: boolean;
          classification_confidence?: number;
          call_date?: string;
          pulled_at?: string;
        };
        Update: {
          id?: string;
          call_id?: string;
          caller_number?: string;
          direction?: string;
          duration?: number;
          transcript?: string;
          classified_as_booked?: boolean;
          classification_confidence?: number;
          call_date?: string;
          pulled_at?: string;
        };
      };
      dashboard_targets: {
        Row: {
          id: string;
          target_type: string | null;
          target_value: number | null;
          period: string | null;
          year: number | null;
          month: number | null;
          week: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          target_type?: string;
          target_value?: number;
          period?: string;
          year?: number;
          month?: number;
          week?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          target_type?: string;
          target_value?: number;
          period?: string;
          year?: number;
          month?: number;
          week?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      sync_log: {
        Row: {
          id: string;
          sync_type: string | null;
          status: string | null;
          records_synced: number | null;
          error_message: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sync_type?: string;
          status?: string;
          records_synced?: number;
          error_message?: string;
          started_at?: string;
          completed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          sync_type?: string;
          status?: string;
          records_synced?: number;
          error_message?: string;
          started_at?: string;
          completed_at?: string;
          created_at?: string;
        };
      };
    };
  };
}