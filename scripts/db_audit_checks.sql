-- Remlo DB audit checks
-- Read-only queries to measure schema/data drift before the next migration batch.

-- 1. Duplicate active employers by owner DID
select owner_user_id, count(*) as active_employer_count
from employers
where active = true
group by owner_user_id
having count(*) > 1
order by active_employer_count desc;

-- 2. Active employers missing canonical on-chain wallet
select id, company_name, owner_user_id, employer_admin_wallet
from employers
where active = true
  and employer_admin_wallet is null
order by created_at desc;

-- 3. Duplicate active employees by employer + normalized email
select employer_id, lower(email) as normalized_email, count(*) as active_employee_count
from employees
where active = true
group by employer_id, lower(email)
having count(*) > 1
order by active_employee_count desc, normalized_email asc;

-- 4. Duplicate active employees by claimed Privy user
select user_id, count(*) as active_employee_count
from employees
where active = true
  and user_id is not null
group by user_id
having count(*) > 1
order by active_employee_count desc;

-- 5. Claimed employees missing wallet or onboarding timestamp
select id, employer_id, email, user_id, wallet_address, onboarded_at
from employees
where active = true
  and user_id is not null
  and (wallet_address is null or onboarded_at is null)
order by created_at desc;

-- 6. Null ownership foreign keys that the app treats as required
select 'employees.employer_id' as check_name, count(*) as affected_rows
from employees
where employer_id is null
union all
select 'payroll_runs.employer_id' as check_name, count(*) as affected_rows
from payroll_runs
where employer_id is null
union all
select 'payment_items.payroll_run_id' as check_name, count(*) as affected_rows
from payment_items
where payroll_run_id is null
union all
select 'payment_items.employee_id' as check_name, count(*) as affected_rows
from payment_items
where employee_id is null;

-- 7. Duplicate payroll items for the same run + employee
select payroll_run_id, employee_id, count(*) as duplicate_count
from payment_items
group by payroll_run_id, employee_id
having count(*) > 1
order by duplicate_count desc;

-- 8. Payroll runs with no payment items
select pr.id, pr.employer_id, pr.status, pr.created_at
from payroll_runs pr
left join payment_items pi on pi.payroll_run_id = pr.id
group by pr.id, pr.employer_id, pr.status, pr.created_at
having count(pi.id) = 0
order by pr.created_at desc;

-- 9. Duplicate non-null Bridge employee identifiers
select 'employees.bridge_customer_id' as key_name, bridge_customer_id as key_value, count(*) as duplicate_count
from employees
where bridge_customer_id is not null
group by bridge_customer_id
having count(*) > 1
union all
select 'employees.bridge_card_id' as key_name, bridge_card_id as key_value, count(*) as duplicate_count
from employees
where bridge_card_id is not null
group by bridge_card_id
having count(*) > 1
union all
select 'employees.bridge_bank_account_id' as key_name, bridge_bank_account_id as key_value, count(*) as duplicate_count
from employees
where bridge_bank_account_id is not null
group by bridge_bank_account_id
having count(*) > 1;

-- 10. Duplicate non-null Bridge employer identifiers
select 'employers.bridge_customer_id' as key_name, bridge_customer_id as key_value, count(*) as duplicate_count
from employers
where bridge_customer_id is not null
group by bridge_customer_id
having count(*) > 1
union all
select 'employers.bridge_virtual_account_id' as key_name, bridge_virtual_account_id as key_value, count(*) as duplicate_count
from employers
where bridge_virtual_account_id is not null
group by bridge_virtual_account_id
having count(*) > 1;

-- 11. Duplicate non-null payroll transaction hashes
select tx_hash, count(*) as duplicate_count
from payroll_runs
where tx_hash is not null
group by tx_hash
having count(*) > 1
order by duplicate_count desc;

-- 12. Compliance events that suggest repeated hold stacking
select employer_id, employee_id, count(*) as pause_event_count
from compliance_events
where event_type = 'payments_paused'
group by employer_id, employee_id
having count(*) > 1
order by pause_event_count desc;

-- 13. Unknown status values that would violate proposed check constraints
select 'employees.kyc_status' as field_name, kyc_status as bad_value, count(*) as affected_rows
from employees
where kyc_status not in ('approved', 'pending', 'rejected', 'expired')
group by kyc_status
union all
select 'employees.pay_frequency' as field_name, pay_frequency as bad_value, count(*) as affected_rows
from employees
where pay_frequency not in ('monthly', 'biweekly', 'weekly', 'stream')
group by pay_frequency
union all
select 'payroll_runs.status' as field_name, status as bad_value, count(*) as affected_rows
from payroll_runs
where status not in ('draft', 'pending', 'submitted', 'processing', 'completed', 'failed')
group by status
union all
select 'payment_items.status' as field_name, status as bad_value, count(*) as affected_rows
from payment_items
where status not in ('pending', 'confirming', 'confirmed', 'failed')
group by status
union all
select 'mpp_sessions.status' as field_name, status as bad_value, count(*) as affected_rows
from mpp_sessions
where status not in ('open', 'closed', 'expired')
group by status;

-- 14. Active employees missing employer rows because of nullable FK history
select e.id, e.email, e.employer_id
from employees e
left join employers em on em.id = e.employer_id
where e.active = true
  and (e.employer_id is null or em.id is null)
order by e.created_at desc;
