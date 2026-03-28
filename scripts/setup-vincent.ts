/**
 * Lit Chipotle PKP Setup Script
 *
 * Creates a complete Lit Protocol Chipotle signing setup for the Remlo agent:
 *   1. Create a Lit account (or verify existing via LIT_API_KEY)
 *   2. Mint a PKP wallet
 *   3. Create an action group and add the PKP
 *   4. Create a usage API key with execute permissions
 *   5. Pre-authorize the signing Lit Action CID
 *   6. Print the three env vars to add to .env.local
 *
 * Usage (first time):
 *   npx ts-node scripts/setup-vincent.ts
 *
 * Usage (existing account):
 *   LIT_API_KEY=<your-admin-key> npx ts-node scripts/setup-vincent.ts
 *
 * The script targets api.dev.litprotocol.com (Chipotle dev network).
 * For production, set LIT_API_URL=https://api.litprotocol.com/core/v1 before running.
 */

const LIT_API_URL = process.env.LIT_API_URL ?? 'https://api.dev.litprotocol.com/core/v1'

// The exact signing action code used in lib/vincent-agent.ts.
// Do NOT modify this string — any change produces a different IPFS CID
// and requires re-running this script to authorize the new CID.
const SIGNING_ACTION_CODE =
  'async function main({ pkpId, unsignedTxHex }) { const tx = ethers.utils.parseTransaction(unsignedTxHex); const wallet = new ethers.Wallet(await Lit.Actions.getPrivateKey({ pkpId })); const signedTx = await wallet.signTransaction(tx); return { signedTransaction: signedTx }; }'

async function litApi(path: string, opts: RequestInit = {}, apiKey?: string): Promise<unknown> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey) headers['X-Api-Key'] = apiKey
  const res = await fetch(`${LIT_API_URL}${path}`, { ...opts, headers: { ...headers, ...(opts.headers as Record<string, string> | undefined) } })
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function main() {
  let adminKey = process.env.LIT_API_KEY

  // Step 1 — create or reuse account
  if (!adminKey) {
    console.log('Creating new Lit Chipotle account...')
    const account = (await litApi('/new_account', {
      method: 'POST',
      body: JSON.stringify({
        account_name: 'Remlo Payroll Agent',
        account_description: 'Non-custodial PKP signing for Remlo automated payroll on Tempo L1',
      }),
    })) as { api_key: string; wallet_address: string }
    adminKey = account.api_key
    console.log('Account wallet:', account.wallet_address)
    console.log('Admin API key:', adminKey)
  } else {
    console.log('Using existing account (LIT_API_KEY provided)')
  }

  // Step 2 — mint PKP wallet
  let pkpAddress = process.env.VINCENT_PKP_ETH_ADDRESS
  if (!pkpAddress) {
    console.log('\nMinting PKP wallet...')
    const wallet = (await litApi('/create_wallet', {}, adminKey)) as { wallet_address: string }
    pkpAddress = wallet.wallet_address
    console.log('PKP address:', pkpAddress)
  } else {
    console.log('\nUsing existing PKP wallet:', pkpAddress)
  }

  // Step 3 — create action group
  let groupId = 1
  const existingGroups = (await litApi('/list_groups?page_number=1&page_size=10', {}, adminKey)) as Array<{ id: string; name: string }>
  const remloGroup = existingGroups.find((g) => g.name === 'remlo-payroll-signers')

  if (!remloGroup) {
    console.log('\nCreating signing group...')
    await litApi(
      '/add_group',
      {
        method: 'POST',
        body: JSON.stringify({
          group_name: 'remlo-payroll-signers',
          group_description: 'Remlo autonomous payroll agent signing group',
          pkp_ids_permitted: [pkpAddress],
          cid_hashes_permitted: [],
        }),
      },
      adminKey,
    )
    const groups = (await litApi('/list_groups?page_number=1&page_size=10', {}, adminKey)) as Array<{ id: string; name: string }>
    const created = groups.find((g) => g.name === 'remlo-payroll-signers')
    groupId = created ? parseInt(created.id, 16) : 1
    console.log('Group created, id:', groupId)
  } else {
    groupId = parseInt(remloGroup.id, 16)
    console.log('\nUsing existing group, id:', groupId)
  }

  // Step 4 — create usage key with execute permissions
  let usageKey = process.env.LIT_USAGE_KEY
  if (!usageKey) {
    console.log('\nCreating usage key...')
    const usage = (await litApi(
      '/add_usage_api_key',
      {
        method: 'POST',
        body: JSON.stringify({
          name: 'remlo-agent-execute',
          description: 'Execution key for Remlo payroll agent signing',
          can_create_groups: false,
          can_delete_groups: false,
          can_create_pkps: false,
          manage_ipfs_ids_in_groups: [],
          add_pkp_to_groups: [],
          remove_pkp_from_groups: [],
          execute_in_groups: [groupId],
        }),
      },
      adminKey,
    )) as { success: boolean; usage_api_key: string }
    usageKey = usage.usage_api_key
    console.log('Usage key created')
  } else {
    console.log('\nUsing existing usage key (LIT_USAGE_KEY provided)')
  }

  // Step 5 — pre-authorize the signing action CID
  console.log('\nPre-authorizing signing action...')
  // Try to execute first to discover the CID
  const probeResult = (await litApi(
    '/lit_action',
    {
      method: 'POST',
      body: JSON.stringify({
        code: SIGNING_ACTION_CODE,
        js_params: { pkpId: pkpAddress, unsignedTxHex: '0x' },
      }),
    },
    usageKey,
  )) as string | { has_error: boolean }

  if (typeof probeResult === 'string' && probeResult.includes('not authorized to execute')) {
    // Parse CID from error: "...not authorized to execute the specified action (CID/hash)"
    const match = probeResult.match(/\(([A-Za-z0-9]+)\//)
    if (match) {
      const actionCid = match[1]
      console.log('Authorizing action CID:', actionCid)
      await litApi(
        '/add_action_to_group',
        {
          method: 'POST',
          body: JSON.stringify({ group_id: groupId, action_ipfs_cid: actionCid }),
        },
        adminKey,
      )
      console.log('Action authorized')
    }
  } else {
    console.log('Action already authorized or executed successfully')
  }

  // Step 6 — verify signing works
  console.log('\nVerifying signing...')
  const { ethers } = await import('ethers')
  const testTxHex = ethers.utils.serializeTransaction({
    type: 2,
    chainId: 42431,
    nonce: 0,
    to: '0x90657d3F18abaB8B1b105779601644dF7ce4ee65',
    value: ethers.BigNumber.from(0),
    data: '0x',
    gasLimit: ethers.BigNumber.from(21000),
    maxFeePerGas: ethers.utils.parseUnits('1', 'gwei'),
    maxPriorityFeePerGas: ethers.utils.parseUnits('1', 'gwei'),
  })

  const verifyResult = (await litApi(
    '/lit_action',
    {
      method: 'POST',
      body: JSON.stringify({
        code: SIGNING_ACTION_CODE,
        js_params: { pkpId: pkpAddress, unsignedTxHex: testTxHex },
      }),
    },
    usageKey,
  )) as { response?: { signedTransaction: string }; has_error: boolean; logs: string }

  if (verifyResult.has_error || !verifyResult.response?.signedTransaction) {
    console.error('Signing verification FAILED:', verifyResult.logs)
    process.exit(1)
  }

  const signedTx = verifyResult.response.signedTransaction
  const parsed = ethers.utils.parseTransaction(signedTx)
  console.log('Signing verified — PKP signed from address:', parsed.from)
  if (parsed.from?.toLowerCase() !== pkpAddress.toLowerCase()) {
    console.error(`Address mismatch: expected ${pkpAddress}, got ${parsed.from}`)
    process.exit(1)
  }
  console.log('Address matches PKP wallet')

  // Print env vars
  console.log('\n=== Add these to .env.local ===\n')
  console.log(`LIT_API_KEY=${adminKey}`)
  console.log(`LIT_USAGE_KEY=${usageKey}`)
  console.log(`VINCENT_PKP_ETH_ADDRESS=${pkpAddress}`)
  console.log()
  console.log('These credentials target the dev network (api.dev.litprotocol.com).')
  console.log('For production, re-run with LIT_API_URL=https://api.litprotocol.com/core/v1')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
