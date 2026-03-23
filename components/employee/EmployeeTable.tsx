'use client'

import * as React from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, ArrowUpDown } from 'lucide-react'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ComplianceBadge } from '@/components/employee/ComplianceBadge'
import { WalletStatus } from '@/components/employee/WalletStatus'
import type { Employee } from '@/lib/queries/employees'

// Country code → emoji flag
function flagEmoji(countryCode: string | null): string {
  if (!countryCode || countryCode.length !== 2) return '🌐'
  return countryCode
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(0x1f1e0 - 65 + c.charCodeAt(0)))
}

function formatSalary(amount: number | null, currency: string | null): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency ?? 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso))
}

function getWalletState(employee: Employee): 'connected' | 'pending' | 'none' {
  if (employee.wallet_address) return 'connected'
  if (employee.invited_at) return 'pending'
  return 'none'
}

function getKycStatus(employee: Employee): 'approved' | 'pending' | 'rejected' | 'expired' {
  const s = employee.kyc_status
  if (s === 'approved' || s === 'rejected' || s === 'expired') return s
  return 'pending'
}

function getOperationalStatus(employee: Employee): 'active' | 'pending' | 'needs_attention' {
  if (employee.kyc_status === 'rejected' || employee.kyc_status === 'expired') {
    return 'needs_attention'
  }
  if (!employee.wallet_address || employee.kyc_status !== 'approved') {
    return 'pending'
  }
  return 'active'
}

interface EmployeeTableProps {
  data?: Employee[]
  employees?: Employee[]
  onSelect?: (id: string) => void
  onEdit?: (id: string) => void
  onView?: (id: string) => void
  onEditSalary?: (id: string) => void
  onPausePayments?: (id: string) => void
  onRemove?: (id: string) => void
  onSendInvite?: (id: string) => void
}

export function EmployeeTable({
  data,
  employees,
  onSelect,
  onEdit,
  onView,
  onEditSalary,
  onPausePayments,
  onRemove,
}: EmployeeTableProps) {
  const router = useRouter()
  const rows = data ?? employees ?? []
  const [departmentFilter, setDepartmentFilter] = React.useState<string>('all')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [walletFilter, setWalletFilter] = React.useState<string>('all')

  const departments = React.useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .map((employee) => employee.department?.trim())
            .filter((value): value is string => Boolean(value))
        )
      ).sort((left, right) => left.localeCompare(right)),
    [rows],
  )

  const filteredRows = React.useMemo(
    () =>
      rows.filter((employee) => {
        const departmentValue = employee.department?.trim() || 'Unassigned'
        const matchesDepartment =
          departmentFilter === 'all' ||
          (departmentFilter === 'unassigned' ? !employee.department?.trim() : departmentValue === departmentFilter)
        const matchesStatus =
          statusFilter === 'all' || getOperationalStatus(employee) === statusFilter
        const matchesWallet =
          walletFilter === 'all' || getWalletState(employee) === walletFilter

        return matchesDepartment && matchesStatus && matchesWallet
      }),
    [rows, departmentFilter, statusFilter, walletFilter],
  )

  const columns = React.useMemo<ColumnDef<Employee>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            className="rounded border-border accent-[var(--accent)]"
            checked={table.getIsAllPageRowsSelected()}
            onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="rounded border-border accent-[var(--accent)]"
            checked={row.getIsSelected()}
            onChange={(e) => row.toggleSelected(e.target.checked)}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        size: 40,
      },
      {
        id: 'name',
        accessorFn: (row) => `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim(),
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            onClick={() => column.toggleSorting()}
          >
            Employee
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => {
          const first = row.original.first_name ?? ''
          const last = row.original.last_name ?? ''
          const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || '?'
          const fullName = `${first} ${last}`.trim() || 'Unnamed'
          return (
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-[var(--accent)]">{initials}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{fullName}</p>
                <p className="text-xs text-[var(--text-muted)] truncate">{row.original.email}</p>
              </div>
            </div>
          )
        },
      },
      {
        id: 'country',
        accessorKey: 'country_code',
        header: () => <span className="text-xs font-medium text-[var(--text-muted)]">Country</span>,
        cell: ({ row }) => (
          <span className="text-base" title={row.original.country_code ?? undefined}>
            {flagEmoji(row.original.country_code)}
          </span>
        ),
        enableSorting: false,
        size: 60,
      },
      {
        id: 'job_title',
        accessorKey: 'job_title',
        header: () => <span className="text-xs font-medium text-[var(--text-muted)]">Role</span>,
        cell: ({ row }) => (
          <span className="text-sm text-[var(--text-secondary)]">
            {row.original.job_title ?? '—'}
          </span>
        ),
      },
      {
        id: 'salary',
        accessorKey: 'salary_amount',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            onClick={() => column.toggleSorting()}
          >
            Salary
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        cell: ({ row }) => (
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {formatSalary(row.original.salary_amount, row.original.salary_currency)}
          </span>
        ),
      },
      {
        id: 'wallet',
        header: () => <span className="text-xs font-medium text-[var(--text-muted)]">Account</span>,
        cell: ({ row }) => (
          <WalletStatus
            address={row.original.wallet_address}
            status={getWalletState(row.original)}
          />
        ),
        enableSorting: false,
      },
      {
        id: 'compliance',
        header: () => <span className="text-xs font-medium text-[var(--text-muted)]">KYC</span>,
        cell: ({ row }) => <ComplianceBadge status={getKycStatus(row.original)} />,
        enableSorting: false,
      },
      {
        id: 'last_paid',
        header: () => <span className="text-xs font-medium text-[var(--text-muted)]">Last paid</span>,
        cell: ({ row }) => (
          <span className="text-sm text-[var(--text-muted)]">
            {formatDate(row.original.onboarded_at)}
          </span>
        ),
        enableSorting: false,
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => (onView ?? onEdit)?.(row.original.id)}>
                View details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditSalary?.(row.original.id)}>
                Edit salary
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPausePayments?.(row.original.id)}>
                Pause payments
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-[var(--status-error)]"
                onClick={() => onRemove?.(row.original.id)}
              >
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        enableSorting: false,
        enableHiding: false,
        size: 48,
      },
    ],
    [onEdit, onEditSalary, onPausePayments, onRemove, onView],
  )

  const toolbarContent = (
    <>
      <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
        <SelectTrigger className="w-full min-[460px]:w-[180px]">
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All departments</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {departments.map((department) => (
            <SelectItem key={department} value={department}>
              {department}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-full min-[460px]:w-[170px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="needs_attention">Needs attention</SelectItem>
        </SelectContent>
      </Select>

      <Select value={walletFilter} onValueChange={setWalletFilter}>
        <SelectTrigger className="w-full min-[460px]:w-[170px]">
          <SelectValue placeholder="Wallet" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All wallet states</SelectItem>
          <SelectItem value="connected">Wallet connected</SelectItem>
          <SelectItem value="pending">Invite pending</SelectItem>
          <SelectItem value="none">No wallet</SelectItem>
        </SelectContent>
      </Select>
    </>
  )

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
      <DataTable
        columns={columns}
        data={filteredRows}
        searchKey="name"
        searchPlaceholder="Search employees..."
        toolbarContent={toolbarContent}
        onRowClick={(row) => {
          onSelect?.(row.id)
          if (!onSelect) {
            router.push(`/dashboard/team/${row.id}`)
          }
        }}
      />
    </div>
  )
}
