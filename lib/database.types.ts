export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      employers: {
        Row: {
          id: string
          owner_user_id: string
          company_name: string
          company_size: string | null
          employer_admin_wallet: string | null
          treasury_contract: string | null
          bridge_customer_id: string | null
          bridge_virtual_account_id: string | null
          tip403_policy_id: number | null
          subscription_tier: string
          mpp_agent_key_hash: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_user_id: string
          company_name: string
          company_size?: string | null
          employer_admin_wallet?: string | null
          treasury_contract?: string | null
          bridge_customer_id?: string | null
          bridge_virtual_account_id?: string | null
          tip403_policy_id?: number | null
          subscription_tier?: string
          mpp_agent_key_hash?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_user_id?: string
          company_name?: string
          company_size?: string | null
          employer_admin_wallet?: string | null
          treasury_contract?: string | null
          bridge_customer_id?: string | null
          bridge_virtual_account_id?: string | null
          tip403_policy_id?: number | null
          subscription_tier?: string
          mpp_agent_key_hash?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          id: string
          employer_id: string
          user_id: string | null
          wallet_address: string | null
          email: string
          first_name: string | null
          last_name: string | null
          job_title: string | null
          department: string | null
          country_code: string | null
          salary_amount: number | null
          salary_currency: string
          pay_frequency: string
          employee_id_hash: string | null
          bridge_customer_id: string | null
          bridge_card_id: string | null
          bridge_bank_account_id: string | null
          kyc_status: string
          kyc_verified_at: string | null
          stream_contract: string | null
          active: boolean
          invited_at: string | null
          onboarded_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employer_id: string
          user_id?: string | null
          wallet_address?: string | null
          email: string
          first_name?: string | null
          last_name?: string | null
          job_title?: string | null
          department?: string | null
          country_code?: string | null
          salary_amount?: number | null
          salary_currency?: string
          pay_frequency?: string
          employee_id_hash?: string | null
          bridge_customer_id?: string | null
          bridge_card_id?: string | null
          bridge_bank_account_id?: string | null
          kyc_status?: string
          kyc_verified_at?: string | null
          stream_contract?: string | null
          active?: boolean
          invited_at?: string | null
          onboarded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employer_id?: string
          user_id?: string | null
          wallet_address?: string | null
          email?: string
          first_name?: string | null
          last_name?: string | null
          job_title?: string | null
          department?: string | null
          country_code?: string | null
          salary_amount?: number | null
          salary_currency?: string
          pay_frequency?: string
          employee_id_hash?: string | null
          bridge_customer_id?: string | null
          bridge_card_id?: string | null
          bridge_bank_account_id?: string | null
          kyc_status?: string
          kyc_verified_at?: string | null
          stream_contract?: string | null
          active?: boolean
          invited_at?: string | null
          onboarded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payroll_runs: {
        Row: {
          id: string
          employer_id: string
          status: string
          total_amount: number | null
          employee_count: number | null
          fee_amount: number
          token_address: string
          tx_hash: string | null
          mpp_receipt_hash: string | null
          block_number: number | null
          finalized_at: string | null
          settlement_time_ms: number | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          employer_id: string
          status?: string
          total_amount?: number | null
          employee_count?: number | null
          fee_amount?: number
          token_address?: string
          tx_hash?: string | null
          mpp_receipt_hash?: string | null
          block_number?: number | null
          finalized_at?: string | null
          settlement_time_ms?: number | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          employer_id?: string
          status?: string
          total_amount?: number | null
          employee_count?: number | null
          fee_amount?: number
          token_address?: string
          tx_hash?: string | null
          mpp_receipt_hash?: string | null
          block_number?: number | null
          finalized_at?: string | null
          settlement_time_ms?: number | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      payment_items: {
        Row: {
          id: string
          payroll_run_id: string
          employee_id: string
          amount: number
          memo_bytes: string | null
          memo_decoded: Json | null
          status: string
          tx_hash: string | null
          created_at: string
        }
        Insert: {
          id?: string
          payroll_run_id: string
          employee_id: string
          amount: number
          memo_bytes?: string | null
          memo_decoded?: Json | null
          status?: string
          tx_hash?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          payroll_run_id?: string
          employee_id?: string
          amount?: number
          memo_bytes?: string | null
          memo_decoded?: Json | null
          status?: string
          tx_hash?: string | null
          created_at?: string
        }
        Relationships: []
      }
      compliance_events: {
        Row: {
          id: string
          employer_id: string | null
          employee_id: string | null
          wallet_address: string | null
          event_type: string | null
          result: string | null
          risk_score: number | null
          description: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          employer_id?: string | null
          employee_id?: string | null
          wallet_address?: string | null
          event_type?: string | null
          result?: string | null
          risk_score?: number | null
          description?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          employer_id?: string | null
          employee_id?: string | null
          wallet_address?: string | null
          event_type?: string | null
          result?: string | null
          risk_score?: number | null
          description?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      mpp_sessions: {
        Row: {
          id: string
          employer_id: string | null
          agent_wallet: string
          channel_tx_hash: string | null
          max_deposit: number | null
          total_spent: number
          status: string
          opened_at: string
          closed_at: string | null
          last_action: string | null
        }
        Insert: {
          id?: string
          employer_id?: string | null
          agent_wallet: string
          channel_tx_hash?: string | null
          max_deposit?: number | null
          total_spent?: number
          status?: string
          opened_at?: string
          closed_at?: string | null
          last_action?: string | null
        }
        Update: {
          id?: string
          employer_id?: string | null
          agent_wallet?: string
          channel_tx_hash?: string | null
          max_deposit?: number | null
          total_spent?: number
          status?: string
          opened_at?: string
          closed_at?: string | null
          last_action?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
