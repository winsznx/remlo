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
          solana_treasury_address: string | null
          solana_enabled: boolean
          active: boolean
          yield_preference: string | null
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
          solana_treasury_address?: string | null
          solana_enabled?: boolean
          active?: boolean
          yield_preference?: string | null
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
          solana_treasury_address?: string | null
          solana_enabled?: boolean
          active?: boolean
          yield_preference?: string | null
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
          solana_wallet_address: string | null
          preferred_chain: string
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
          bridge_kyc_link_id: string | null
          kyc_status: string
          kyc_verified_at: string | null
          stream_contract: string | null
          active: boolean
          invited_at: string | null
          onboarded_at: string | null
          invite_token_hash: string | null
          invite_token_expires_at: string | null
          invite_claimed_at: string | null
          kyc_token_hash: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employer_id: string
          user_id?: string | null
          wallet_address?: string | null
          solana_wallet_address?: string | null
          preferred_chain?: string
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
          bridge_kyc_link_id?: string | null
          kyc_status?: string
          kyc_verified_at?: string | null
          stream_contract?: string | null
          active?: boolean
          invited_at?: string | null
          onboarded_at?: string | null
          invite_token_hash?: string | null
          invite_token_expires_at?: string | null
          invite_claimed_at?: string | null
          kyc_token_hash?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employer_id?: string
          user_id?: string | null
          wallet_address?: string | null
          solana_wallet_address?: string | null
          preferred_chain?: string
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
          bridge_kyc_link_id?: string | null
          kyc_status?: string
          kyc_verified_at?: string | null
          stream_contract?: string | null
          active?: boolean
          invited_at?: string | null
          onboarded_at?: string | null
          invite_token_hash?: string | null
          invite_token_expires_at?: string | null
          invite_claimed_at?: string | null
          kyc_token_hash?: string | null
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
          chain: string
          solana_signatures: string[] | null
          council_approved_at: string | null
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
          chain?: string
          solana_signatures?: string[] | null
          council_approved_at?: string | null
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
          chain?: string
          solana_signatures?: string[] | null
          council_approved_at?: string | null
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
          chain: string
          solana_signature: string | null
          policy_rejection_reason: string | null
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
          chain?: string
          solana_signature?: string | null
          policy_rejection_reason?: string | null
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
          chain?: string
          solana_signature?: string | null
          policy_rejection_reason?: string | null
          created_at?: string
        }
        Relationships: []
      }
      email_events: {
        Row: {
          id: string
          provider_event_id: string | null
          provider_message_id: string | null
          event_type: string
          recipient: string
          template: string | null
          employer_id: string | null
          tags: Json | null
          raw: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          provider_event_id?: string | null
          provider_message_id?: string | null
          event_type: string
          recipient: string
          template?: string | null
          employer_id?: string | null
          tags?: Json | null
          raw?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          provider_event_id?: string | null
          provider_message_id?: string | null
          event_type?: string
          recipient?: string
          template?: string | null
          employer_id?: string | null
          tags?: Json | null
          raw?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      email_suppressions: {
        Row: {
          email: string
          reason: string
          source_event_id: string | null
          created_at: string
        }
        Insert: {
          email: string
          reason: string
          source_event_id?: string | null
          created_at?: string
        }
        Update: {
          email?: string
          reason?: string
          source_event_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          employer_id: string
          kind: string
          title: string
          body: string | null
          severity: string
          link: string | null
          metadata: Json | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          employer_id: string
          kind: string
          title: string
          body?: string | null
          severity?: string
          link?: string | null
          metadata?: Json | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          employer_id?: string
          kind?: string
          title?: string
          body?: string | null
          severity?: string
          link?: string | null
          metadata?: Json | null
          read_at?: string | null
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
      agent_decisions: {
        Row: {
          id: string
          employer_id: string | null
          payroll_run_id: string | null
          decision_type: string
          inputs: Json
          reasoning: string
          decision: Json
          confidence: number | null
          executed: boolean
          executed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          employer_id?: string | null
          payroll_run_id?: string | null
          decision_type: string
          inputs: Json
          reasoning: string
          decision: Json
          confidence?: number | null
          executed?: boolean
          executed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          employer_id?: string | null
          payroll_run_id?: string | null
          decision_type?: string
          inputs?: Json
          reasoning?: string
          decision?: Json
          confidence?: number | null
          executed?: boolean
          executed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      employer_agent_authorizations: {
        Row: {
          id: string
          employer_id: string
          label: string
          agent_identifier: string
          per_tx_cap_usd: number
          per_day_cap_usd: number
          active: boolean
          created_at: string
          revoked_at: string | null
          signing_secret: string | null
          signing_secret_rotated_at: string | null
          identity_kind: 'hmac' | 'erc8004_tempo' | 'sas_solana'
          erc8004_agent_id: string | null
          erc8004_owner_address: string | null
          solana_pubkey: string | null
          velocity_per_minute: number
          allowed_recipients: string[] | null
          paused_at: string | null
          pause_reason: string | null
          per_tx_cap_original_usd: number | null
          cap_halved_at: string | null
          cap_halved_reason: string | null
        }
        Insert: {
          id?: string
          employer_id: string
          label: string
          agent_identifier: string
          per_tx_cap_usd?: number
          per_day_cap_usd?: number
          active?: boolean
          created_at?: string
          revoked_at?: string | null
          signing_secret?: string | null
          signing_secret_rotated_at?: string | null
          identity_kind?: 'hmac' | 'erc8004_tempo' | 'sas_solana'
          erc8004_agent_id?: string | null
          erc8004_owner_address?: string | null
          solana_pubkey?: string | null
          velocity_per_minute?: number
          allowed_recipients?: string[] | null
          paused_at?: string | null
          pause_reason?: string | null
          per_tx_cap_original_usd?: number | null
          cap_halved_at?: string | null
          cap_halved_reason?: string | null
        }
        Update: {
          id?: string
          employer_id?: string
          label?: string
          agent_identifier?: string
          per_tx_cap_usd?: number
          per_day_cap_usd?: number
          active?: boolean
          created_at?: string
          revoked_at?: string | null
          signing_secret?: string | null
          signing_secret_rotated_at?: string | null
          identity_kind?: 'hmac' | 'erc8004_tempo' | 'sas_solana'
          erc8004_agent_id?: string | null
          erc8004_owner_address?: string | null
          solana_pubkey?: string | null
          velocity_per_minute?: number
          allowed_recipients?: string[] | null
          paused_at?: string | null
          pause_reason?: string | null
          per_tx_cap_original_usd?: number | null
          cap_halved_at?: string | null
          cap_halved_reason?: string | null
        }
        Relationships: []
      }
      waitlist_subscribers: {
        Row: {
          email: string
          confirm_token: string
          confirmed_at: string | null
          unsubscribed_at: string | null
          source: string
          referrer: string | null
          ip_inet: string | null
          resend_contact_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          email: string
          confirm_token: string
          confirmed_at?: string | null
          unsubscribed_at?: string | null
          source?: string
          referrer?: string | null
          ip_inet?: string | null
          resend_contact_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          confirm_token?: string
          confirmed_at?: string | null
          unsubscribed_at?: string | null
          source?: string
          referrer?: string | null
          ip_inet?: string | null
          resend_contact_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_announcements: {
        Row: {
          id: string
          title: string
          body: string
          link_url: string | null
          link_label: string | null
          severity: 'info' | 'success' | 'warning' | 'error'
          audience: 'all' | 'employers' | 'employees' | 'admins'
          published_at: string | null
          expires_at: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          body: string
          link_url?: string | null
          link_label?: string | null
          severity?: 'info' | 'success' | 'warning' | 'error'
          audience?: 'all' | 'employers' | 'employees' | 'admins'
          published_at?: string | null
          expires_at?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          body?: string
          link_url?: string | null
          link_label?: string | null
          severity?: 'info' | 'success' | 'warning' | 'error'
          audience?: 'all' | 'employers' | 'employees' | 'admins'
          published_at?: string | null
          expires_at?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_announcement_dismissals: {
        Row: {
          announcement_id: string
          user_id: string
          dismissed_at: string
        }
        Insert: {
          announcement_id: string
          user_id: string
          dismissed_at?: string
        }
        Update: {
          announcement_id?: string
          user_id?: string
          dismissed_at?: string
        }
        Relationships: []
      }
      remlo_agent_profiles: {
        Row: {
          agent_identifier: string
          erc8004_agent_id: string | null
          erc8004_chain: 'tempo' | 'solana'
          owner_address: string
          display_name: string
          description: string | null
          endpoint: string | null
          capabilities: string[]
          contact_url: string | null
          registered_via: 'tempo' | 'base' | 'solana'
          registration_tx_id: string | null
          active: boolean
          registered_at: string
          updated_at: string
          last_refreshed_at: string
        }
        Insert: {
          agent_identifier: string
          erc8004_agent_id?: string | null
          erc8004_chain?: 'tempo' | 'solana'
          owner_address: string
          display_name: string
          description?: string | null
          endpoint?: string | null
          capabilities?: string[]
          contact_url?: string | null
          registered_via?: 'tempo' | 'base' | 'solana'
          registration_tx_id?: string | null
          active?: boolean
          registered_at?: string
          updated_at?: string
          last_refreshed_at?: string
        }
        Update: {
          agent_identifier?: string
          erc8004_agent_id?: string
          erc8004_chain?: 'tempo' | 'solana'
          owner_address?: string
          display_name?: string
          description?: string | null
          endpoint?: string | null
          capabilities?: string[]
          contact_url?: string | null
          registered_via?: 'tempo' | 'base' | 'solana'
          registration_tx_id?: string | null
          active?: boolean
          registered_at?: string
          updated_at?: string
          last_refreshed_at?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          source: string
          external_id: string
          received_at: string
          event_type: string | null
        }
        Insert: {
          source: string
          external_id: string
          received_at?: string
          event_type?: string | null
        }
        Update: {
          source?: string
          external_id?: string
          received_at?: string
          event_type?: string | null
        }
        Relationships: []
      }
      invite_attempts: {
        Row: {
          id: number
          ip_hash: string
          token_hash: string | null
          success: boolean
          attempted_at: string
        }
        Insert: {
          id?: number
          ip_hash: string
          token_hash?: string | null
          success?: boolean
          attempted_at?: string
        }
        Update: {
          id?: number
          ip_hash?: string
          token_hash?: string | null
          success?: boolean
          attempted_at?: string
        }
        Relationships: []
      }
      agent_pay_calls: {
        Row: {
          id: string
          authorization_id: string
          employer_id: string
          recipient_wallet: string
          usd_amount: number
          tx_hash: string | null
          reference: string | null
          created_at: string
        }
        Insert: {
          id?: string
          authorization_id: string
          employer_id: string
          recipient_wallet: string
          usd_amount: number
          tx_hash?: string | null
          reference?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          authorization_id?: string
          employer_id?: string
          recipient_wallet?: string
          usd_amount?: number
          tx_hash?: string | null
          reference?: string | null
          created_at?: string
        }
        Relationships: []
      }
      escrows: {
        Row: {
          id: string
          employer_id: string
          requester_agent_identifier: string
          worker_agent_identifier: string
          requester_pubkey: string
          worker_wallet_address: string
          nonce: number
          escrow_pda: string
          amount_base_units: number
          currency: string
          chain: string
          rubric_prompt: string
          rubric_hash: string
          deliverable_uri: string | null
          deliverable_hash: string | null
          deliverable_submitted_at: string | null
          validator_verdict: 'approved' | 'rejected' | null
          validator_confidence: number | null
          validator_reasoning: string | null
          validator_model: string | null
          validator_decided_at: string | null
          initialize_signature: string | null
          deliverable_signature: string | null
          verdict_signature: string | null
          settlement_signature: string | null
          refund_signature: string | null
          status: 'posted' | 'delivered' | 'validating' | 'voting' | 'settled' | 'rejected_refunded' | 'expired_refunded'
          expires_at: string
          requested_expiry_hours: number | null
          applied_expiry_hours: number | null
          worker_reputation_tier: string | null
          worker_attestation_count: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employer_id: string
          requester_agent_identifier: string
          worker_agent_identifier: string
          requester_pubkey: string
          worker_wallet_address: string
          nonce: number
          escrow_pda: string
          amount_base_units: number
          currency?: string
          chain?: string
          rubric_prompt: string
          rubric_hash: string
          deliverable_uri?: string | null
          deliverable_hash?: string | null
          deliverable_submitted_at?: string | null
          validator_verdict?: 'approved' | 'rejected' | null
          validator_confidence?: number | null
          validator_reasoning?: string | null
          validator_model?: string | null
          validator_decided_at?: string | null
          initialize_signature?: string | null
          deliverable_signature?: string | null
          verdict_signature?: string | null
          settlement_signature?: string | null
          refund_signature?: string | null
          status?: 'posted' | 'delivered' | 'validating' | 'voting' | 'settled' | 'rejected_refunded' | 'expired_refunded'
          expires_at: string
          requested_expiry_hours?: number | null
          applied_expiry_hours?: number | null
          worker_reputation_tier?: string | null
          worker_attestation_count?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employer_id?: string
          requester_agent_identifier?: string
          worker_agent_identifier?: string
          requester_pubkey?: string
          worker_wallet_address?: string
          nonce?: number
          escrow_pda?: string
          amount_base_units?: number
          currency?: string
          chain?: string
          rubric_prompt?: string
          rubric_hash?: string
          deliverable_uri?: string | null
          deliverable_hash?: string | null
          deliverable_submitted_at?: string | null
          validator_verdict?: 'approved' | 'rejected' | null
          validator_confidence?: number | null
          validator_reasoning?: string | null
          validator_model?: string | null
          validator_decided_at?: string | null
          initialize_signature?: string | null
          deliverable_signature?: string | null
          verdict_signature?: string | null
          settlement_signature?: string | null
          refund_signature?: string | null
          status?: 'posted' | 'delivered' | 'validating' | 'voting' | 'settled' | 'rejected_refunded' | 'expired_refunded'
          expires_at?: string
          requested_expiry_hours?: number | null
          applied_expiry_hours?: number | null
          worker_reputation_tier?: string | null
          worker_attestation_count?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      validator_votes: {
        Row: {
          id: string
          escrow_id: string
          validator_id: string
          validator_address: string
          validator_type: 'llm_claude' | 'llm_gpt4' | 'human' | 'oracle'
          verdict: 'approved' | 'rejected'
          confidence: number | null
          reasoning: string | null
          voted_at: string
          decision_type: 'escrow_verdict' | 'treasury_action'
        }
        Insert: {
          id?: string
          escrow_id: string
          validator_id: string
          validator_address: string
          validator_type: 'llm_claude' | 'llm_gpt4' | 'human' | 'oracle'
          verdict: 'approved' | 'rejected'
          confidence?: number | null
          reasoning?: string | null
          voted_at?: string
          decision_type?: 'escrow_verdict' | 'treasury_action'
        }
        Update: {
          verdict?: 'approved' | 'rejected'
          confidence?: number | null
          reasoning?: string | null
          decision_type?: 'escrow_verdict' | 'treasury_action'
        }
        Relationships: []
      }
      treasury_decisions: {
        Row: {
          id: string
          employer_id: string
          action_type: 'yield_route_change' | 'allocation_rebalance' | 'large_payroll_approval'
          action_payload: Record<string, unknown>
          rationale: string
          status:
            | 'pending_council'
            | 'council_approved'
            | 'council_rejected'
            | 'executed'
            | 'execution_failed'
            | 'cancelled'
          council_verdict: 'approved' | 'rejected' | null
          council_confidence: number | null
          council_reasoning: string | null
          execution_signature: string | null
          execution_error: string | null
          proposer_user_id: string | null
          created_at: string
          finalized_at: string | null
          executed_at: string | null
        }
        Insert: {
          id?: string
          employer_id: string
          action_type: 'yield_route_change' | 'allocation_rebalance' | 'large_payroll_approval'
          action_payload?: Record<string, unknown>
          rationale: string
          status?:
            | 'pending_council'
            | 'council_approved'
            | 'council_rejected'
            | 'executed'
            | 'execution_failed'
            | 'cancelled'
          council_verdict?: 'approved' | 'rejected' | null
          council_confidence?: number | null
          council_reasoning?: string | null
          execution_signature?: string | null
          execution_error?: string | null
          proposer_user_id?: string | null
          created_at?: string
          finalized_at?: string | null
          executed_at?: string | null
        }
        Update: {
          status?:
            | 'pending_council'
            | 'council_approved'
            | 'council_rejected'
            | 'executed'
            | 'execution_failed'
            | 'cancelled'
          council_verdict?: 'approved' | 'rejected' | null
          council_confidence?: number | null
          council_reasoning?: string | null
          execution_signature?: string | null
          execution_error?: string | null
          finalized_at?: string | null
          executed_at?: string | null
        }
        Relationships: []
      }
      escrow_validator_configs: {
        Row: {
          id: string
          employer_id: string
          validator_id: string
          validator_address: string
          validator_type: 'llm_claude' | 'llm_gpt4' | 'human' | 'oracle'
          weight: number
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          employer_id: string
          validator_id: string
          validator_address: string
          validator_type: 'llm_claude' | 'llm_gpt4' | 'human' | 'oracle'
          weight?: number
          active?: boolean
          created_at?: string
        }
        Update: {
          validator_id?: string
          validator_address?: string
          validator_type?: 'llm_claude' | 'llm_gpt4' | 'human' | 'oracle'
          weight?: number
          active?: boolean
        }
        Relationships: []
      }
      mcp_oauth_clients: {
        Row: {
          client_id: string
          client_name: string
          redirect_uris: string[]
          scope: string
          software_id: string | null
          software_version: string | null
          created_at: string
        }
        Insert: {
          client_id: string
          client_name: string
          redirect_uris: string[]
          scope?: string
          software_id?: string | null
          software_version?: string | null
          created_at?: string
        }
        Update: {
          client_name?: string
          redirect_uris?: string[]
          scope?: string
          software_id?: string | null
          software_version?: string | null
        }
        Relationships: []
      }
      mcp_oauth_auth_codes: {
        Row: {
          code: string
          client_id: string
          privy_user_id: string
          redirect_uri: string
          scope: string
          code_challenge: string
          code_challenge_method: string
          expires_at: string
          used: boolean
          created_at: string
        }
        Insert: {
          code: string
          client_id: string
          privy_user_id: string
          redirect_uri: string
          scope: string
          code_challenge: string
          code_challenge_method: string
          expires_at: string
          used?: boolean
          created_at?: string
        }
        Update: {
          used?: boolean
        }
        Relationships: []
      }
      mcp_oauth_refresh_tokens: {
        Row: {
          token: string
          client_id: string
          privy_user_id: string
          scope: string
          revoked: boolean
          expires_at: string
          created_at: string
        }
        Insert: {
          token: string
          client_id: string
          privy_user_id: string
          scope: string
          revoked?: boolean
          expires_at: string
          created_at?: string
        }
        Update: {
          revoked?: boolean
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
