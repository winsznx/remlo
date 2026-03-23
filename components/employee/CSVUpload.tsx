'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { usePrivyAuthedFetch } from '@/lib/hooks/usePrivyAuthedFetch'
import { CSV_EMPLOYEE_FIELDS, autoMapEmployeeHeaders, type CsvMappedEmployee } from '@/lib/csv-mapping'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'upload' | 'map' | 'preview' | 'done'

interface RawRow {
  [key: string]: string
}

interface CSVUploadProps {
  open: boolean
  onClose: () => void
  onUpload?: (count: number) => void
  onImported?: (count: number) => void
}

interface BulkImportSummary {
  imported: number
  created: number
  existing: number
  emailSent: number
  kycPrepared: number
}

// ─── Column mapper ────────────────────────────────────────────────────────────

function parseCSV(text: string): { headers: string[]; rows: RawRow[] } {
  const lines = text.split('\n').filter((l) => l.trim())
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''))
  const rows = lines.slice(1).map((line) => {
    const vals = line.split(',').map((v) => v.trim().replace(/"/g, ''))
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']))
  })
  return { headers, rows }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CSVUpload({ open, onClose, onUpload, onImported }: CSVUploadProps) {
  const authedFetch = usePrivyAuthedFetch()
  const [step, setStep] = React.useState<Step>('upload')
  const [dragging, setDragging] = React.useState(false)
  const [headers, setHeaders] = React.useState<string[]>([])
  const [rows, setRows] = React.useState<RawRow[]>([])
  const [mapping, setMapping] = React.useState<Partial<Record<keyof CsvMappedEmployee, string>>>({})
  const [importing, setImporting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [summary, setSummary] = React.useState<BulkImportSummary | null>(null)
  const [mappingWarnings, setMappingWarnings] = React.useState<string[]>([])
  const [mappingConfidence, setMappingConfidence] = React.useState<'low' | 'medium' | 'high' | null>(null)
  const [aiMappingLoading, setAiMappingLoading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  function reset() {
    setStep('upload')
    setDragging(false)
    setHeaders([])
    setRows([])
    setMapping({})
    setImporting(false)
    setError(null)
    setSummary(null)
    setMappingWarnings([])
    setMappingConfidence(null)
    setAiMappingLoading(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function improveMappingWithAi(
    nextHeaders: string[],
    nextRows: RawRow[],
    heuristic: Partial<Record<keyof CsvMappedEmployee, string>>
  ) {
    setAiMappingLoading(true)

    try {
      const res = await authedFetch('/api/ai/parse-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headers: nextHeaders,
          sampleRows: nextRows.slice(0, 3),
        }),
      })

      const data = (await res.json().catch(() => ({}))) as {
        mapping?: Partial<Record<keyof CsvMappedEmployee, string>>
        confidence?: 'low' | 'medium' | 'high'
        warnings?: string[]
      }

      if (!res.ok) return

      setMapping((current) => ({ ...heuristic, ...current, ...(data.mapping ?? {}) }))
      setMappingWarnings(data.warnings ?? [])
      setMappingConfidence(data.confidence ?? null)
    } finally {
      setAiMappingLoading(false)
    }
  }

  function processFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a .csv file.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { headers: h, rows: r } = parseCSV(text)
      if (h.length === 0) {
        setError('Could not parse CSV. Make sure the first row contains headers.')
        return
      }
      const heuristic = autoMapEmployeeHeaders(h)
      setHeaders(h)
      setRows(r)
      setMapping(heuristic)
      setMappingWarnings([])
      setMappingConfidence(null)
      setError(null)
      setStep('map')

      const missingRequired = CSV_EMPLOYEE_FIELDS
        .filter((field) => field.required && !heuristic[field.key])
        .length

      if (missingRequired > 0) {
        void improveMappingWithAi(h, r, heuristic)
      }
    }
    reader.readAsText(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  function mapRow(row: RawRow): CsvMappedEmployee {
    return {
      email: row[mapping.email ?? ''] ?? '',
      first_name: row[mapping.first_name ?? ''] ?? '',
      last_name: row[mapping.last_name ?? ''] ?? '',
      job_title: row[mapping.job_title ?? ''] ?? '',
      department: row[mapping.department ?? ''] ?? '',
      country_code: (row[mapping.country_code ?? ''] ?? '').toUpperCase().slice(0, 2),
      salary_amount: row[mapping.salary_amount ?? ''] ?? '',
      salary_currency: row[mapping.salary_currency ?? ''] ?? 'USD',
      pay_frequency: row[mapping.pay_frequency ?? ''] ?? 'monthly',
    }
  }

  const preview = rows.slice(0, 5).map(mapRow)
  const mappingErrors = CSV_EMPLOYEE_FIELDS
    .filter((f) => f.required && !mapping[f.key])
    .map((f) => f.label)

  async function handleImport() {
    setImporting(true)
    setError(null)
    try {
      const employees = rows.map(mapRow)
      const res = await authedFetch('/api/employees/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employees }),
      })

      const data = await res.json().catch(() => ({})) as {
        error?: string
        row?: number
        rows?: Array<{ row: number; errors: string[] }>
        imported?: number
        created?: number
        existing?: number
        emailSent?: number
        kycPrepared?: number
      }

      if (!res.ok) {
        if (data.rows?.length) {
          const first = data.rows[0]
          throw new Error(`Row ${first.row}: ${first.errors.join(', ')}`)
        }

        if (data.row) {
          throw new Error(`Row ${data.row}: ${data.error ?? 'Import failed'}`)
        }

        throw new Error(data.error ?? 'Import failed')
      }

      setSummary({
        imported: data.imported ?? employees.length,
        created: data.created ?? 0,
        existing: data.existing ?? 0,
        emailSent: data.emailSent ?? 0,
        kycPrepared: data.kycPrepared ?? 0,
      })
      setStep('done')
      onUpload?.(data.imported ?? employees.length)
      onImported?.(data.imported ?? employees.length)
      toast.success(`Imported ${data.imported ?? employees.length} employee${(data.imported ?? employees.length) === 1 ? '' : 's'}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-full max-w-2xl rounded-2xl border border-[var(--border-default)] bg-[var(--bg-overlay)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-default)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Upload CSV</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {step === 'upload' && 'Drag and drop your employee CSV file'}
              {step === 'map' && 'Map your CSV columns to employee fields'}
              {step === 'preview' && 'Review the first 5 rows before importing'}
              {step === 'done' && 'Import complete'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="flex border-b border-[var(--border-default)]">
          {(['upload', 'map', 'preview'] as Step[]).map((s, i) => (
            <div
              key={s}
              className={cn(
                'flex-1 py-2.5 text-center text-xs font-medium transition-colors',
                step === s
                  ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
                  : step === 'done' || (['upload', 'map', 'preview'] as Step[]).indexOf(step) > i
                    ? 'text-[var(--text-muted)]'
                    : 'text-[var(--text-muted)]',
              )}
            >
              {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
            </div>
          ))}
        </div>

        <div className="p-6">
          {aiMappingLoading ? (
            <div className="mb-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              Reviewing ambiguous headers with Claude…
            </div>
          ) : null}

          {mappingConfidence ? (
            <div className="mb-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-subtle)] px-4 py-3 text-sm text-[var(--text-secondary)]">
              Mapping confidence: <span className="font-medium text-[var(--text-primary)]">{mappingConfidence}</span>
              {mappingWarnings.length > 0 ? ` · ${mappingWarnings.join(' ')}` : ''}
            </div>
          ) : null}

          <AnimatePresence mode="wait">
            {/* Step 1: Upload */}
            {step === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.15 }}
              >
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors',
                    dragging
                      ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
                      : 'border-[var(--border-strong)] hover:border-[var(--accent)] hover:bg-[var(--bg-subtle)]',
                  )}
                >
                  <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                  <Upload className="h-10 w-10 mx-auto text-[var(--text-muted)] mb-3" />
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Drop your CSV here, or click to browse
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Supports .csv files with any column names
                  </p>
                </div>
                {error && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-[var(--status-error)]">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {error}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 2: Map */}
            {step === 'map' && (
              <motion.div
                key="map"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.15 }}
                className="space-y-3"
              >
                <p className="text-xs text-[var(--text-muted)]">
                  {rows.length} rows found. Match each field to the correct CSV column.
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {CSV_EMPLOYEE_FIELDS.map((field) => (
                    <div key={field.key} className="grid grid-cols-2 items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm text-[var(--text-primary)]">{field.label}</p>
                        {field.required && (
                          <span className="text-[var(--status-error)] text-xs">*</span>
                        )}
                      </div>
                      <div className="relative">
                        <select
                          value={mapping[field.key] ?? ''}
                          onChange={(e) =>
                            setMapping((prev) => ({ ...prev, [field.key]: e.target.value || undefined }))
                          }
                          className="w-full appearance-none rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 pr-8 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                        >
                          <option value="">— Not mapped —</option>
                          {headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)] pointer-events-none" />
                      </div>
                    </div>
                  ))}
                </div>
                {mappingErrors.length > 0 && (
                  <p className="text-xs text-[var(--status-error)]">
                    Required fields not mapped: {mappingErrors.join(', ')}
                  </p>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setStep('upload')}>Back</Button>
                  <Button
                    size="sm"
                    disabled={mappingErrors.length > 0}
                    onClick={() => setStep('preview')}
                    className="bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
                  >
                    Preview →
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Preview */}
            {step === 'preview' && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.15 }}
                className="space-y-4"
              >
                <p className="text-xs text-[var(--text-muted)]">
                  Preview of first {Math.min(5, rows.length)} of {rows.length} rows:
                </p>
                <div className="rounded-lg border border-[var(--border-default)] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]">
                          {['Email', 'First Name', 'Last Name', 'Title', 'Salary'].map((h) => (
                            <th key={h} className="px-3 py-2.5 text-left font-medium text-[var(--text-muted)]">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-default)]">
                        {preview.map((row, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2.5 text-[var(--text-secondary)] truncate max-w-32">{row.email || '—'}</td>
                            <td className="px-3 py-2.5 text-[var(--text-secondary)]">{row.first_name || '—'}</td>
                            <td className="px-3 py-2.5 text-[var(--text-secondary)]">{row.last_name || '—'}</td>
                            <td className="px-3 py-2.5 text-[var(--text-secondary)]">{row.job_title || '—'}</td>
                            <td className="px-3 py-2.5 font-mono text-[var(--text-secondary)]">
                              {row.salary_amount ? `$${row.salary_amount}` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-xs text-[var(--status-error)]">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {error}
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setStep('map')}>Back</Button>
                  <Button
                    size="sm"
                    disabled={importing}
                    onClick={handleImport}
                    className="bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
                  >
                    {importing ? 'Importing…' : `Import ${rows.length} employees`}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Done */}
            {step === 'done' && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="text-center py-8 space-y-3"
              >
                <CheckCircle className="h-12 w-12 text-[var(--status-success)] mx-auto" />
                <p className="text-base font-semibold text-[var(--text-primary)]">Import complete!</p>
                <p className="text-sm text-[var(--text-muted)]">
                  {summary?.created ?? rows.length} new employees created{summary && summary.existing > 0 ? `, ${summary.existing} already on file` : ''}.
                </p>
                {summary && (
                  <div className="mx-auto grid max-w-md grid-cols-2 gap-2 text-left">
                    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Invite emails</p>
                      <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{summary.emailSent}</p>
                    </div>
                    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-subtle)] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">KYC links</p>
                      <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{summary.kycPrepared}</p>
                    </div>
                  </div>
                )}
                <Button
                  onClick={handleClose}
                  className="mt-4 bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
                >
                  Done
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
