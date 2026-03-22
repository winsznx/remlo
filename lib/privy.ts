import type { PrivyClientConfig } from '@privy-io/react-auth'

export const tempoChain = {
  id: 42431,
  name: 'Tempo Moderato',
  network: 'tempo-moderato',
  nativeCurrency: { name: 'USD', symbol: 'USD', decimals: 6 },
  rpcUrls: {
    default: { http: ['https://rpc.moderato.tempo.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Tempo Explorer', url: 'https://explore.tempo.xyz' },
  },
} as const

export const privyConfig: PrivyClientConfig = {
  defaultChain: tempoChain,
  supportedChains: [tempoChain],
  loginMethods: ['email', 'sms', 'wallet'],
  ...(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
    ? { walletConnectCloudProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID }
    : {}),
  appearance: {
    theme: 'dark',
    accentColor: '#059669',
    landingHeader: 'Choose how to continue',
    loginMessage: 'Use email, SMS, or a wallet connection to access Remlo.',
  },
  embeddedWallets: {
    createOnLogin: 'users-without-wallets',
    requireUserPasswordOnCreate: false,
  },
}
