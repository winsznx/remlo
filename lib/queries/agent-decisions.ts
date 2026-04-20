import { createServerClient } from '@/lib/supabase-server'
import type { Database, Json } from '@/lib/database.types'

export type AgentDecision = Database['public']['Tables']['agent_decisions']['Row']
type InsertAgentDecision = Database['public']['Tables']['agent_decisions']['Insert']

export async function insertAgentDecision(decision: {
  employer_id?: string | null
  payroll_run_id?: string | null
  decision_type: string
  inputs: Record<string, unknown>
  reasoning: string
  decision: Record<string, unknown>
  confidence?: number | null
}): Promise<AgentDecision | null> {
  const client = createServerClient()
  const { data } = await client
    .from('agent_decisions')
    .insert({
      ...decision,
      inputs: decision.inputs as unknown as Json,
      decision: decision.decision as unknown as Json,
    } satisfies InsertAgentDecision)
    .select('*')
    .single()
  return data ?? null
}

export async function getAgentDecisionsByEmployer(
  employerId: string,
  limit = 50,
): Promise<AgentDecision[]> {
  const client = createServerClient()
  const { data } = await client
    .from('agent_decisions')
    .select('*')
    .eq('employer_id', employerId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}

export async function getAgentDecisionsByPayrollRun(
  runId: string,
): Promise<AgentDecision[]> {
  const client = createServerClient()
  const { data } = await client
    .from('agent_decisions')
    .select('*')
    .eq('payroll_run_id', runId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getAgentDecisionById(
  decisionId: string,
): Promise<AgentDecision | null> {
  const client = createServerClient()
  const { data } = await client
    .from('agent_decisions')
    .select('*')
    .eq('id', decisionId)
    .single()
  return data ?? null
}

export async function markDecisionExecuted(decisionId: string): Promise<void> {
  const client = createServerClient()
  await client
    .from('agent_decisions')
    .update({ executed: true, executed_at: new Date().toISOString() })
    .eq('id', decisionId)
}
