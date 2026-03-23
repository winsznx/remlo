import type { User } from '@privy-io/react-auth'

type PrivyLinkedAccount = User['linkedAccounts'][number]

function isEthereumWalletAccount(
  account: PrivyLinkedAccount
): account is PrivyLinkedAccount & { type: 'wallet'; chainType: 'ethereum'; address: string } {
  return (
    account.type === 'wallet' &&
    'address' in account &&
    typeof account.address === 'string' &&
    account.chainType === 'ethereum'
  )
}

export function getPrimaryPrivyEthereumWallet(user: Pick<User, 'wallet' | 'linkedAccounts'> | null | undefined) {
  if (!user) return null

  if (user.wallet?.chainType === 'ethereum' && user.wallet.address) {
    return user.wallet.address
  }

  const linkedWallet = user.linkedAccounts.find(isEthereumWalletAccount)

  return linkedWallet?.address ?? null
}
