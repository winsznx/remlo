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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          resource: string | null
          result: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource?: string | null
          result: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource?: string | null
          result?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      agent_decisions: {
        Row: {
          confidence: number | null
          created_at: string | null
          decision: Json
          decision_type: string
          employer_id: string | null
          executed: boolean | null
          executed_at: string | null
          id: string
          inputs: Json
          payroll_run_id: string | null
          reasoning: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          decision: Json
          decision_type: string
          employer_id?: string | null
          executed?: boolean | null
          executed_at?: string | null
          id?: string
          inputs: Json
          payroll_run_id?: string | null
          reasoning: string
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          decision?: Json
          decision_type?: string
          employer_id?: string | null
          executed?: boolean | null
          executed_at?: string | null
          id?: string
          inputs?: Json
          payroll_run_id?: string | null
          reasoning?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_decisions_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_decisions_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_pay_calls: {
        Row: {
          authorization_id: string
          created_at: string
          employer_id: string
          id: string
          recipient_wallet: string
          reference: string | null
          tx_hash: string | null
          usd_amount: number
        }
        Insert: {
          authorization_id: string
          created_at?: string
          employer_id: string
          id?: string
          recipient_wallet: string
          reference?: string | null
          tx_hash?: string | null
          usd_amount: number
        }
        Update: {
          authorization_id?: string
          created_at?: string
          employer_id?: string
          id?: string
          recipient_wallet?: string
          reference?: string | null
          tx_hash?: string | null
          usd_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_pay_calls_authorization_id_fkey"
            columns: ["authorization_id"]
            isOneToOne: false
            referencedRelation: "employer_agent_authorizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_pay_calls_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      autopayroll_authorizations: {
        Row: {
          access_key_address: string
          access_key_encrypted: Json
          authorize_tx_hash: string | null
          created_at: string
          cycles_executed: number
          employer_id: string
          expires_at_unix: number
          id: string
          last_run_at: string | null
          last_run_error: string | null
          last_run_status: string | null
          last_run_tx_hash: string | null
          notes: string | null
          per_period_amount: string
          period_seconds: number
          revoke_tx_hash: string | null
          scoped_selector: string
          scoped_target: string
          status: string
          token_address: string
          updated_at: string
        }
        Insert: {
          access_key_address: string
          access_key_encrypted: Json
          authorize_tx_hash?: string | null
          created_at?: string
          cycles_executed?: number
          employer_id: string
          expires_at_unix: number
          id?: string
          last_run_at?: string | null
          last_run_error?: string | null
          last_run_status?: string | null
          last_run_tx_hash?: string | null
          notes?: string | null
          per_period_amount: string
          period_seconds: number
          revoke_tx_hash?: string | null
          scoped_selector: string
          scoped_target: string
          status?: string
          token_address: string
          updated_at?: string
        }
        Update: {
          access_key_address?: string
          access_key_encrypted?: Json
          authorize_tx_hash?: string | null
          created_at?: string
          cycles_executed?: number
          employer_id?: string
          expires_at_unix?: number
          id?: string
          last_run_at?: string | null
          last_run_error?: string | null
          last_run_status?: string | null
          last_run_tx_hash?: string | null
          notes?: string | null
          per_period_amount?: string
          period_seconds?: number
          revoke_tx_hash?: string | null
          scoped_selector?: string
          scoped_target?: string
          status?: string
          token_address?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "autopayroll_authorizations_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_events: {
        Row: {
          created_at: string
          description: string | null
          employee_id: string | null
          employer_id: string | null
          event_type: string | null
          id: string
          metadata: Json | null
          result: string | null
          risk_score: number | null
          wallet_address: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          employee_id?: string | null
          employer_id?: string | null
          event_type?: string | null
          id?: string
          metadata?: Json | null
          result?: string | null
          risk_score?: number | null
          wallet_address?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          employee_id?: string | null
          employer_id?: string | null
          event_type?: string | null
          id?: string
          metadata?: Json | null
          result?: string | null
          risk_score?: number | null
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_events_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_events_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          created_at: string
          employer_id: string | null
          event_type: string
          id: string
          provider_event_id: string | null
          provider_message_id: string | null
          raw: Json | null
          recipient: string
          tags: Json | null
          template: string | null
        }
        Insert: {
          created_at?: string
          employer_id?: string | null
          event_type: string
          id?: string
          provider_event_id?: string | null
          provider_message_id?: string | null
          raw?: Json | null
          recipient: string
          tags?: Json | null
          template?: string | null
        }
        Update: {
          created_at?: string
          employer_id?: string | null
          event_type?: string
          id?: string
          provider_event_id?: string | null
          provider_message_id?: string | null
          raw?: Json | null
          recipient?: string
          tags?: Json | null
          template?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_events_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_suppressions: {
        Row: {
          created_at: string
          email: string
          reason: string
          source_event_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          reason: string
          source_event_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          reason?: string
          source_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_suppressions_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "email_events"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          active: boolean
          bridge_bank_account_id: string | null
          bridge_card_id: string | null
          bridge_customer_id: string | null
          bridge_kyc_link_id: string | null
          country_code: string | null
          created_at: string
          department: string | null
          email: string
          employee_id_hash: string | null
          employer_id: string
          first_name: string | null
          id: string
          invite_claimed_at: string | null
          invite_token_expires_at: string | null
          invite_token_hash: string | null
          invited_at: string | null
          job_title: string | null
          kyc_status: string | null
          kyc_token_hash: string | null
          kyc_verified_at: string | null
          last_name: string | null
          onboarded_at: string | null
          pay_frequency: string | null
          preferred_chain: string | null
          salary_amount: number | null
          salary_currency: string | null
          solana_wallet_address: string | null
          stream_contract: string | null
          updated_at: string
          user_id: string | null
          wallet_address: string | null
        }
        Insert: {
          active?: boolean
          bridge_bank_account_id?: string | null
          bridge_card_id?: string | null
          bridge_customer_id?: string | null
          bridge_kyc_link_id?: string | null
          country_code?: string | null
          created_at?: string
          department?: string | null
          email: string
          employee_id_hash?: string | null
          employer_id: string
          first_name?: string | null
          id?: string
          invite_claimed_at?: string | null
          invite_token_expires_at?: string | null
          invite_token_hash?: string | null
          invited_at?: string | null
          job_title?: string | null
          kyc_status?: string | null
          kyc_token_hash?: string | null
          kyc_verified_at?: string | null
          last_name?: string | null
          onboarded_at?: string | null
          pay_frequency?: string | null
          preferred_chain?: string | null
          salary_amount?: number | null
          salary_currency?: string | null
          solana_wallet_address?: string | null
          stream_contract?: string | null
          updated_at?: string
          user_id?: string | null
          wallet_address?: string | null
        }
        Update: {
          active?: boolean
          bridge_bank_account_id?: string | null
          bridge_card_id?: string | null
          bridge_customer_id?: string | null
          bridge_kyc_link_id?: string | null
          country_code?: string | null
          created_at?: string
          department?: string | null
          email?: string
          employee_id_hash?: string | null
          employer_id?: string
          first_name?: string | null
          id?: string
          invite_claimed_at?: string | null
          invite_token_expires_at?: string | null
          invite_token_hash?: string | null
          invited_at?: string | null
          job_title?: string | null
          kyc_status?: string | null
          kyc_token_hash?: string | null
          kyc_verified_at?: string | null
          last_name?: string | null
          onboarded_at?: string | null
          pay_frequency?: string | null
          preferred_chain?: string | null
          salary_amount?: number | null
          salary_currency?: string | null
          solana_wallet_address?: string | null
          stream_contract?: string | null
          updated_at?: string
          user_id?: string | null
          wallet_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      employer_agent_authorizations: {
        Row: {
          active: boolean
          agent_identifier: string
          allowed_recipients: string[] | null
          cap_halved_at: string | null
          cap_halved_reason: string | null
          created_at: string
          employer_id: string
          erc8004_agent_id: string | null
          erc8004_owner_address: string | null
          id: string
          identity_kind: string
          label: string
          pause_reason: string | null
          paused_at: string | null
          per_day_cap_usd: number
          per_tx_cap_original_usd: number | null
          per_tx_cap_usd: number
          revoked_at: string | null
          signing_secret: string | null
          signing_secret_rotated_at: string | null
          solana_pubkey: string | null
          velocity_per_minute: number
        }
        Insert: {
          active?: boolean
          agent_identifier: string
          allowed_recipients?: string[] | null
          cap_halved_at?: string | null
          cap_halved_reason?: string | null
          created_at?: string
          employer_id: string
          erc8004_agent_id?: string | null
          erc8004_owner_address?: string | null
          id?: string
          identity_kind?: string
          label: string
          pause_reason?: string | null
          paused_at?: string | null
          per_day_cap_usd?: number
          per_tx_cap_original_usd?: number | null
          per_tx_cap_usd?: number
          revoked_at?: string | null
          signing_secret?: string | null
          signing_secret_rotated_at?: string | null
          solana_pubkey?: string | null
          velocity_per_minute?: number
        }
        Update: {
          active?: boolean
          agent_identifier?: string
          allowed_recipients?: string[] | null
          cap_halved_at?: string | null
          cap_halved_reason?: string | null
          created_at?: string
          employer_id?: string
          erc8004_agent_id?: string | null
          erc8004_owner_address?: string | null
          id?: string
          identity_kind?: string
          label?: string
          pause_reason?: string | null
          paused_at?: string | null
          per_day_cap_usd?: number
          per_tx_cap_original_usd?: number | null
          per_tx_cap_usd?: number
          revoked_at?: string | null
          signing_secret?: string | null
          signing_secret_rotated_at?: string | null
          solana_pubkey?: string | null
          velocity_per_minute?: number
        }
        Relationships: [
          {
            foreignKeyName: "employer_agent_authorizations_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      employers: {
        Row: {
          active: boolean
          bridge_customer_id: string | null
          bridge_virtual_account_id: string | null
          company_name: string
          company_size: string | null
          created_at: string
          employer_admin_wallet: string | null
          id: string
          mpp_agent_key_hash: string | null
          owner_user_id: string
          solana_enabled: boolean | null
          solana_treasury_address: string | null
          subscription_tier: string | null
          tip403_policy_id: number | null
          treasury_contract: string | null
          updated_at: string
          virtual_master_address: string | null
          virtual_master_id: string | null
          virtual_master_registered_at: string | null
          virtual_master_salt: string | null
          virtual_master_tx_hash: string | null
          yield_preference: string | null
        }
        Insert: {
          active?: boolean
          bridge_customer_id?: string | null
          bridge_virtual_account_id?: string | null
          company_name: string
          company_size?: string | null
          created_at?: string
          employer_admin_wallet?: string | null
          id?: string
          mpp_agent_key_hash?: string | null
          owner_user_id: string
          solana_enabled?: boolean | null
          solana_treasury_address?: string | null
          subscription_tier?: string | null
          tip403_policy_id?: number | null
          treasury_contract?: string | null
          updated_at?: string
          virtual_master_address?: string | null
          virtual_master_id?: string | null
          virtual_master_registered_at?: string | null
          virtual_master_salt?: string | null
          virtual_master_tx_hash?: string | null
          yield_preference?: string | null
        }
        Update: {
          active?: boolean
          bridge_customer_id?: string | null
          bridge_virtual_account_id?: string | null
          company_name?: string
          company_size?: string | null
          created_at?: string
          employer_admin_wallet?: string | null
          id?: string
          mpp_agent_key_hash?: string | null
          owner_user_id?: string
          solana_enabled?: boolean | null
          solana_treasury_address?: string | null
          subscription_tier?: string | null
          tip403_policy_id?: number | null
          treasury_contract?: string | null
          updated_at?: string
          virtual_master_address?: string | null
          virtual_master_id?: string | null
          virtual_master_registered_at?: string | null
          virtual_master_salt?: string | null
          virtual_master_tx_hash?: string | null
          yield_preference?: string | null
        }
        Relationships: []
      }
      escrow_validator_configs: {
        Row: {
          active: boolean
          created_at: string | null
          employer_id: string
          id: string
          validator_address: string
          validator_id: string
          validator_type: string
          weight: number
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          employer_id: string
          id?: string
          validator_address: string
          validator_id: string
          validator_type: string
          weight?: number
        }
        Update: {
          active?: boolean
          created_at?: string | null
          employer_id?: string
          id?: string
          validator_address?: string
          validator_id?: string
          validator_type?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "escrow_validator_configs_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      escrows: {
        Row: {
          amount_base_units: number
          applied_expiry_hours: number | null
          chain: string
          created_at: string | null
          currency: string
          deliverable_hash: string | null
          deliverable_signature: string | null
          deliverable_submitted_at: string | null
          deliverable_uri: string | null
          employer_id: string
          escrow_pda: string
          expires_at: string
          id: string
          initialize_signature: string | null
          nonce: number
          refund_signature: string | null
          requested_expiry_hours: number | null
          requester_agent_identifier: string
          requester_pubkey: string
          rubric_hash: string
          rubric_prompt: string
          settlement_signature: string | null
          status: string
          updated_at: string | null
          validator_confidence: number | null
          validator_decided_at: string | null
          validator_model: string | null
          validator_reasoning: string | null
          validator_verdict: string | null
          verdict_signature: string | null
          worker_agent_identifier: string
          worker_attestation_count: number | null
          worker_reputation_tier: string | null
          worker_wallet_address: string
        }
        Insert: {
          amount_base_units: number
          applied_expiry_hours?: number | null
          chain?: string
          created_at?: string | null
          currency?: string
          deliverable_hash?: string | null
          deliverable_signature?: string | null
          deliverable_submitted_at?: string | null
          deliverable_uri?: string | null
          employer_id: string
          escrow_pda: string
          expires_at: string
          id?: string
          initialize_signature?: string | null
          nonce: number
          refund_signature?: string | null
          requested_expiry_hours?: number | null
          requester_agent_identifier: string
          requester_pubkey: string
          rubric_hash: string
          rubric_prompt: string
          settlement_signature?: string | null
          status?: string
          updated_at?: string | null
          validator_confidence?: number | null
          validator_decided_at?: string | null
          validator_model?: string | null
          validator_reasoning?: string | null
          validator_verdict?: string | null
          verdict_signature?: string | null
          worker_agent_identifier: string
          worker_attestation_count?: number | null
          worker_reputation_tier?: string | null
          worker_wallet_address: string
        }
        Update: {
          amount_base_units?: number
          applied_expiry_hours?: number | null
          chain?: string
          created_at?: string | null
          currency?: string
          deliverable_hash?: string | null
          deliverable_signature?: string | null
          deliverable_submitted_at?: string | null
          deliverable_uri?: string | null
          employer_id?: string
          escrow_pda?: string
          expires_at?: string
          id?: string
          initialize_signature?: string | null
          nonce?: number
          refund_signature?: string | null
          requested_expiry_hours?: number | null
          requester_agent_identifier?: string
          requester_pubkey?: string
          rubric_hash?: string
          rubric_prompt?: string
          settlement_signature?: string | null
          status?: string
          updated_at?: string | null
          validator_confidence?: number | null
          validator_decided_at?: string | null
          validator_model?: string | null
          validator_reasoning?: string | null
          validator_verdict?: string | null
          verdict_signature?: string | null
          worker_agent_identifier?: string
          worker_attestation_count?: number | null
          worker_reputation_tier?: string | null
          worker_wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrows_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_attempts: {
        Row: {
          attempted_at: string
          id: number
          ip_hash: string
          success: boolean
          token_hash: string | null
        }
        Insert: {
          attempted_at?: string
          id?: number
          ip_hash: string
          success?: boolean
          token_hash?: string | null
        }
        Update: {
          attempted_at?: string
          id?: number
          ip_hash?: string
          success?: boolean
          token_hash?: string | null
        }
        Relationships: []
      }
      mcp_oauth_auth_codes: {
        Row: {
          client_id: string
          code: string
          code_challenge: string
          code_challenge_method: string
          created_at: string
          expires_at: string
          privy_user_id: string
          redirect_uri: string
          scope: string
          used: boolean
        }
        Insert: {
          client_id: string
          code: string
          code_challenge: string
          code_challenge_method: string
          created_at?: string
          expires_at: string
          privy_user_id: string
          redirect_uri: string
          scope: string
          used?: boolean
        }
        Update: {
          client_id?: string
          code?: string
          code_challenge?: string
          code_challenge_method?: string
          created_at?: string
          expires_at?: string
          privy_user_id?: string
          redirect_uri?: string
          scope?: string
          used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "mcp_oauth_auth_codes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "mcp_oauth_clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
      mcp_oauth_clients: {
        Row: {
          client_id: string
          client_name: string
          created_at: string
          redirect_uris: string[]
          scope: string
          software_id: string | null
          software_version: string | null
        }
        Insert: {
          client_id: string
          client_name: string
          created_at?: string
          redirect_uris: string[]
          scope?: string
          software_id?: string | null
          software_version?: string | null
        }
        Update: {
          client_id?: string
          client_name?: string
          created_at?: string
          redirect_uris?: string[]
          scope?: string
          software_id?: string | null
          software_version?: string | null
        }
        Relationships: []
      }
      mcp_oauth_refresh_tokens: {
        Row: {
          client_id: string
          created_at: string
          expires_at: string
          privy_user_id: string
          revoked: boolean
          scope: string
          token: string
        }
        Insert: {
          client_id: string
          created_at?: string
          expires_at: string
          privy_user_id: string
          revoked?: boolean
          scope: string
          token: string
        }
        Update: {
          client_id?: string
          created_at?: string
          expires_at?: string
          privy_user_id?: string
          revoked?: boolean
          scope?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_oauth_refresh_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "mcp_oauth_clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
      mpp_sessions: {
        Row: {
          agent_wallet: string
          channel_tx_hash: string | null
          closed_at: string | null
          employer_id: string | null
          id: string
          last_action: string | null
          max_deposit: number | null
          opened_at: string | null
          status: string | null
          total_spent: number | null
        }
        Insert: {
          agent_wallet: string
          channel_tx_hash?: string | null
          closed_at?: string | null
          employer_id?: string | null
          id?: string
          last_action?: string | null
          max_deposit?: number | null
          opened_at?: string | null
          status?: string | null
          total_spent?: number | null
        }
        Update: {
          agent_wallet?: string
          channel_tx_hash?: string | null
          closed_at?: string | null
          employer_id?: string | null
          id?: string
          last_action?: string | null
          max_deposit?: number | null
          opened_at?: string | null
          status?: string | null
          total_spent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mpp_sessions_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          employer_id: string
          id: string
          kind: string
          link: string | null
          metadata: Json | null
          read_at: string | null
          severity: string
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          employer_id: string
          id?: string
          kind: string
          link?: string | null
          metadata?: Json | null
          read_at?: string | null
          severity?: string
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          employer_id?: string
          id?: string
          kind?: string
          link?: string | null
          metadata?: Json | null
          read_at?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_items: {
        Row: {
          amount: number
          chain: string
          created_at: string
          employee_id: string
          id: string
          memo_bytes: string | null
          memo_decoded: Json | null
          payroll_run_id: string
          policy_rejection_reason: string | null
          solana_signature: string | null
          status: string
          tx_hash: string | null
        }
        Insert: {
          amount: number
          chain?: string
          created_at?: string
          employee_id: string
          id?: string
          memo_bytes?: string | null
          memo_decoded?: Json | null
          payroll_run_id: string
          policy_rejection_reason?: string | null
          solana_signature?: string | null
          status?: string
          tx_hash?: string | null
        }
        Update: {
          amount?: number
          chain?: string
          created_at?: string
          employee_id?: string
          id?: string
          memo_bytes?: string | null
          memo_decoded?: Json | null
          payroll_run_id?: string
          policy_rejection_reason?: string | null
          solana_signature?: string | null
          status?: string
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_items_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          block_number: number | null
          chain: string
          council_approved_at: string | null
          created_at: string
          created_by: string | null
          employee_count: number
          employer_id: string
          fee_amount: number
          finalized_at: string | null
          id: string
          mpp_receipt_hash: string | null
          settlement_time_ms: number | null
          solana_signatures: string[] | null
          status: string
          token_address: string | null
          total_amount: number
          tx_hash: string | null
        }
        Insert: {
          block_number?: number | null
          chain?: string
          council_approved_at?: string | null
          created_at?: string
          created_by?: string | null
          employee_count?: number
          employer_id: string
          fee_amount?: number
          finalized_at?: string | null
          id?: string
          mpp_receipt_hash?: string | null
          settlement_time_ms?: number | null
          solana_signatures?: string[] | null
          status?: string
          token_address?: string | null
          total_amount?: number
          tx_hash?: string | null
        }
        Update: {
          block_number?: number | null
          chain?: string
          council_approved_at?: string | null
          created_at?: string
          created_by?: string | null
          employee_count?: number
          employer_id?: string
          fee_amount?: number
          finalized_at?: string | null
          id?: string
          mpp_receipt_hash?: string | null
          settlement_time_ms?: number | null
          solana_signatures?: string[] | null
          status?: string
          token_address?: string | null
          total_amount?: number
          tx_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      remlo_agent_profiles: {
        Row: {
          active: boolean
          agent_identifier: string
          capabilities: string[]
          contact_url: string | null
          description: string | null
          display_name: string
          endpoint: string | null
          erc8004_agent_id: string | null
          erc8004_chain: string
          last_refreshed_at: string
          owner_address: string
          registered_at: string
          registered_via: string
          registration_tx_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          agent_identifier: string
          capabilities?: string[]
          contact_url?: string | null
          description?: string | null
          display_name: string
          endpoint?: string | null
          erc8004_agent_id?: string | null
          erc8004_chain?: string
          last_refreshed_at?: string
          owner_address: string
          registered_at?: string
          registered_via?: string
          registration_tx_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          agent_identifier?: string
          capabilities?: string[]
          contact_url?: string | null
          description?: string | null
          display_name?: string
          endpoint?: string | null
          erc8004_agent_id?: string | null
          erc8004_chain?: string
          last_refreshed_at?: string
          owner_address?: string
          registered_at?: string
          registered_via?: string
          registration_tx_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reputation_writes: {
        Row: {
          attempts: number
          attestation_pda: string | null
          chain: string
          created_at: string | null
          id: string
          last_error: string | null
          last_signer_path: string | null
          last_tempo_error: string | null
          payload: Json
          schema_id: string
          source_id: string | null
          source_type: string
          status: string
          subject_address: string
          tempo_broadcast_failures: number
          tx_signature: string | null
          updated_at: string | null
          written_at: string | null
        }
        Insert: {
          attempts?: number
          attestation_pda?: string | null
          chain: string
          created_at?: string | null
          id?: string
          last_error?: string | null
          last_signer_path?: string | null
          last_tempo_error?: string | null
          payload?: Json
          schema_id: string
          source_id?: string | null
          source_type: string
          status?: string
          subject_address: string
          tempo_broadcast_failures?: number
          tx_signature?: string | null
          updated_at?: string | null
          written_at?: string | null
        }
        Update: {
          attempts?: number
          attestation_pda?: string | null
          chain?: string
          created_at?: string | null
          id?: string
          last_error?: string | null
          last_signer_path?: string | null
          last_tempo_error?: string | null
          payload?: Json
          schema_id?: string
          source_id?: string | null
          source_type?: string
          status?: string
          subject_address?: string
          tempo_broadcast_failures?: number
          tx_signature?: string | null
          updated_at?: string | null
          written_at?: string | null
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          body: string
          created_at: string
          email: string
          employee_id: string | null
          employer_id: string | null
          id: string
          metadata: Json | null
          resolution_note: string | null
          resolved_at: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string | null
          user_role: string
        }
        Insert: {
          assigned_to?: string | null
          body: string
          created_at?: string
          email: string
          employee_id?: string | null
          employer_id?: string | null
          id?: string
          metadata?: Json | null
          resolution_note?: string | null
          resolved_at?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
          user_role: string
        }
        Update: {
          assigned_to?: string | null
          body?: string
          created_at?: string
          email?: string
          employee_id?: string | null
          employer_id?: string | null
          id?: string
          metadata?: Json | null
          resolution_note?: string | null
          resolved_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      system_announcement_dismissals: {
        Row: {
          announcement_id: string
          dismissed_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          dismissed_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          dismissed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_announcement_dismissals_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "system_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      system_announcements: {
        Row: {
          audience: string
          body: string
          created_at: string
          created_by: string
          employer_id: string | null
          expires_at: string | null
          id: string
          link_label: string | null
          link_url: string | null
          published_at: string | null
          severity: string
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          body: string
          created_at?: string
          created_by: string
          employer_id?: string | null
          expires_at?: string | null
          id?: string
          link_label?: string | null
          link_url?: string | null
          published_at?: string | null
          severity?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          created_by?: string
          employer_id?: string | null
          expires_at?: string | null
          id?: string
          link_label?: string | null
          link_url?: string | null
          published_at?: string | null
          severity?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_announcements_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_decisions: {
        Row: {
          action_payload: Json
          action_type: string
          council_confidence: number | null
          council_reasoning: string | null
          council_verdict: string | null
          created_at: string | null
          employer_id: string
          executed_at: string | null
          execution_error: string | null
          execution_signature: string | null
          finalized_at: string | null
          id: string
          proposer_user_id: string | null
          rationale: string
          status: string
        }
        Insert: {
          action_payload?: Json
          action_type: string
          council_confidence?: number | null
          council_reasoning?: string | null
          council_verdict?: string | null
          created_at?: string | null
          employer_id: string
          executed_at?: string | null
          execution_error?: string | null
          execution_signature?: string | null
          finalized_at?: string | null
          id?: string
          proposer_user_id?: string | null
          rationale: string
          status?: string
        }
        Update: {
          action_payload?: Json
          action_type?: string
          council_confidence?: number | null
          council_reasoning?: string | null
          council_verdict?: string | null
          created_at?: string | null
          employer_id?: string
          executed_at?: string | null
          execution_error?: string | null
          execution_signature?: string | null
          finalized_at?: string | null
          id?: string
          proposer_user_id?: string | null
          rationale?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "treasury_decisions_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_preferences: {
        Row: {
          announcement_email: boolean
          card_activity_email: boolean
          employer_message_email: boolean
          kyc_email: boolean
          payroll_email: boolean
          payroll_inapp: boolean
          updated_at: string
          user_id: string
          weekly_summary_email: boolean
        }
        Insert: {
          announcement_email?: boolean
          card_activity_email?: boolean
          employer_message_email?: boolean
          kyc_email?: boolean
          payroll_email?: boolean
          payroll_inapp?: boolean
          updated_at?: string
          user_id: string
          weekly_summary_email?: boolean
        }
        Update: {
          announcement_email?: boolean
          card_activity_email?: boolean
          employer_message_email?: boolean
          kyc_email?: boolean
          payroll_email?: boolean
          payroll_inapp?: boolean
          updated_at?: string
          user_id?: string
          weekly_summary_email?: boolean
        }
        Relationships: []
      }
      validator_votes: {
        Row: {
          confidence: number | null
          decision_type: string
          escrow_id: string
          id: string
          reasoning: string | null
          validator_address: string
          validator_id: string
          validator_type: string
          verdict: string
          voted_at: string | null
        }
        Insert: {
          confidence?: number | null
          decision_type?: string
          escrow_id: string
          id?: string
          reasoning?: string | null
          validator_address: string
          validator_id: string
          validator_type: string
          verdict: string
          voted_at?: string | null
        }
        Update: {
          confidence?: number | null
          decision_type?: string
          escrow_id?: string
          id?: string
          reasoning?: string | null
          validator_address?: string
          validator_id?: string
          validator_type?: string
          verdict?: string
          voted_at?: string | null
        }
        Relationships: []
      }
      virtual_address_inflows: {
        Row: {
          amount: string
          block_number: number | null
          decimals: number
          employee_id: string | null
          employer_id: string
          id: string
          log_index: number | null
          observed_at: string
          sender_address: string | null
          symbol: string | null
          token_address: string
          tx_hash: string
          user_tag: string
        }
        Insert: {
          amount: string
          block_number?: number | null
          decimals: number
          employee_id?: string | null
          employer_id: string
          id?: string
          log_index?: number | null
          observed_at?: string
          sender_address?: string | null
          symbol?: string | null
          token_address: string
          tx_hash: string
          user_tag: string
        }
        Update: {
          amount?: string
          block_number?: number | null
          decimals?: number
          employee_id?: string | null
          employer_id?: string
          id?: string
          log_index?: number | null
          observed_at?: string
          sender_address?: string | null
          symbol?: string | null
          token_address?: string
          tx_hash?: string
          user_tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "virtual_address_inflows_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "virtual_address_inflows_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employers"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_subscribers: {
        Row: {
          confirm_token: string
          confirmed_at: string | null
          created_at: string
          email: string
          ip_inet: unknown
          referrer: string | null
          resend_contact_id: string | null
          source: string
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          confirm_token: string
          confirmed_at?: string | null
          created_at?: string
          email: string
          ip_inet?: unknown
          referrer?: string | null
          resend_contact_id?: string | null
          source?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          confirm_token?: string
          confirmed_at?: string | null
          created_at?: string
          email?: string
          ip_inet?: unknown
          referrer?: string | null
          resend_contact_id?: string | null
          source?: string
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          event_type: string | null
          external_id: string
          received_at: string
          source: string
        }
        Insert: {
          event_type?: string | null
          external_id: string
          received_at?: string
          source: string
        }
        Update: {
          event_type?: string | null
          external_id?: string
          received_at?: string
          source?: string
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
    Enums: {},
  },
} as const
