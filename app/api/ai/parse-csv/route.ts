import { NextRequest, NextResponse } from 'next/server'
import { runClaudeJson } from '@/lib/ai'
import { CSV_EMPLOYEE_FIELDS, autoMapEmployeeHeaders, type CsvMappedEmployee } from '@/lib/csv-mapping'

interface ParseCsvResponse {
  mapping: Partial<Record<keyof CsvMappedEmployee, string>>
  confidence: 'low' | 'medium' | 'high'
  warnings: string[]
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    headers?: string[]
    sampleRows?: Array<Record<string, string>>
  }

  const headers = body.headers ?? []
  if (!Array.isArray(headers) || headers.length === 0) {
    return NextResponse.json({ error: 'headers is required' }, { status: 400 })
  }

  const heuristicMapping = autoMapEmployeeHeaders(headers)
  const missingRequired = CSV_EMPLOYEE_FIELDS
    .filter((field) => field.required && !heuristicMapping[field.key])
    .map((field) => field.label)

  const result = await runClaudeJson<ParseCsvResponse>({
    system: [
      'You map messy payroll CSV headers into the Remlo employee import schema.',
      'Return JSON only with keys mapping, confidence, warnings.',
      'Only map to these fields:',
      CSV_EMPLOYEE_FIELDS.map((field) => field.key).join(', '),
      'Do not invent headers that do not exist.',
      'Prefer empty mappings and warnings over risky guesses.',
    ].join(' '),
    prompt: JSON.stringify({
      headers,
      sampleRows: body.sampleRows ?? [],
      heuristicMapping,
      requiredFields: CSV_EMPLOYEE_FIELDS.filter((field) => field.required).map((field) => field.key),
    }),
    fallback: () => ({
      mapping: heuristicMapping,
      confidence: missingRequired.length === 0 ? 'medium' : 'low',
      warnings: missingRequired.length > 0
        ? [`Still missing required fields: ${missingRequired.join(', ')}`]
        : ['Used local header heuristics because Claude is unavailable in this environment.'],
    }),
  })

  return NextResponse.json(result)
}
