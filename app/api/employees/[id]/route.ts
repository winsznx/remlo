import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { getAuthorizedEmployee } from '@/lib/auth'

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id: employeeId } = await ctx.params
  const employee = await getAuthorizedEmployee(req, employeeId)

  if (!employee) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as {
    firstName?: string
    lastName?: string
    countryCode?: string
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('employees')
    .update({
      first_name: body.firstName?.trim() || null,
      last_name: body.lastName?.trim() || null,
      country_code: body.countryCode?.trim().toUpperCase() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', employeeId)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ employee: data })
}

export const dynamic = 'force-dynamic'
