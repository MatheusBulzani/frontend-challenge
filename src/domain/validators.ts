import type { NetworkId } from './types.ts'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ETH_ADDRESS = /^0x[a-fA-F0-9]{40}$/
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/

export function validateEmail(value: string): string | null {
  if (!value.trim()) return 'Informe o e-mail.'
  if (!EMAIL.test(value.trim())) return 'E-mail inválido.'
  return null
}

export function validatePassword(value: string): string | null {
  if (value.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.'
  if (!/[a-zA-Z]/.test(value) || !/\d/.test(value)) {
    return 'A senha precisa ter letras e números.'
  }
  return null
}

export function validateName(value: string, label: string): string | null {
  if (value.trim().length < 2) return `${label} precisa ter pelo menos 2 caracteres.`
  return null
}

export function validateWalletAddress(address: string, network: NetworkId): string | null {
  if (network === 'solana') {
    return SOLANA_ADDRESS.test(address) ? null : 'Endereço Solana inválido.'
  }
  return ETH_ADDRESS.test(address) ? null : 'Endereço precisa ter 0x e 40 caracteres hexadecimais.'
}

export function fieldErrors(entries: Array<[string, string | null]>): Record<string, string> | null {
  const details: Record<string, string> = {}
  for (const [key, message] of entries) {
    if (message) details[key] = message
  }
  return Object.keys(details).length > 0 ? details : null
}
