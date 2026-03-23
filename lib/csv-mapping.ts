export interface CsvMappedEmployee {
  email: string
  first_name: string
  last_name: string
  job_title: string
  department: string
  country_code: string
  salary_amount: string
  salary_currency: string
  pay_frequency: string
}

export const CSV_EMPLOYEE_FIELDS: Array<{ key: keyof CsvMappedEmployee; label: string; required: boolean }> = [
  { key: 'email', label: 'Email', required: true },
  { key: 'first_name', label: 'First Name', required: true },
  { key: 'last_name', label: 'Last Name', required: true },
  { key: 'job_title', label: 'Job Title', required: false },
  { key: 'department', label: 'Department', required: false },
  { key: 'country_code', label: 'Country Code (ISO 2)', required: false },
  { key: 'salary_amount', label: 'Salary Amount', required: false },
  { key: 'salary_currency', label: 'Currency', required: false },
  { key: 'pay_frequency', label: 'Pay Frequency', required: false },
]

const HEADER_ALIASES: Record<keyof CsvMappedEmployee, string[]> = {
  email: ['email', 'e-mail', 'email address', 'work email'],
  first_name: ['first name', 'firstname', 'first', 'given name'],
  last_name: ['last name', 'lastname', 'last', 'surname', 'family name'],
  job_title: ['job title', 'title', 'position', 'role'],
  department: ['department', 'dept', 'team', 'business unit'],
  country_code: ['country', 'country code', 'iso', 'nationality', 'location'],
  salary_amount: ['salary', 'amount', 'annual salary', 'salary amount', 'pay', 'compensation'],
  salary_currency: ['currency', 'salary currency', 'ccy'],
  pay_frequency: ['frequency', 'pay frequency', 'payment frequency', 'cadence'],
}

export function autoMapEmployeeHeaders(headers: string[]): Partial<Record<keyof CsvMappedEmployee, string>> {
  const mapping: Partial<Record<keyof CsvMappedEmployee, string>> = {}
  const normalizedHeaders = headers.map((header) => header.toLowerCase())

  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [keyof CsvMappedEmployee, string[]][]) {
    const match = aliases.find((alias) => normalizedHeaders.includes(alias))
    if (!match) continue

    const index = normalizedHeaders.indexOf(match)
    if (index >= 0) {
      mapping[field] = headers[index]
    }
  }

  return mapping
}
