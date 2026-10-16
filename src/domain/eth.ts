const SCALE = 8n
const BASE = 10n ** SCALE

export function parseEth(value: string): bigint {
  const trimmed = value.trim()
  const match = /^(\d+)(?:\.(\d{1,8}))?$/.exec(trimmed)
  if (!match) {
    throw new Error(`Valor ETH inválido: ${value}`)
  }
  const whole = BigInt(match[1] ?? '0')
  const fraction = (match[2] ?? '').padEnd(Number(SCALE), '0')
  return whole * BASE + BigInt(fraction || '0')
}

export function formatEth(units: bigint): string {
  const negative = units < 0n
  const value = negative ? -units : units
  const whole = value / BASE
  const fraction = (value % BASE).toString().padStart(Number(SCALE), '0').replace(/0+$/, '')
  const padded = fraction.length < 2 ? fraction.padEnd(2, '0') : fraction
  return `${negative ? '-' : ''}${whole.toString()}.${padded}`
}

export function addEth(left: string, right: string): string {
  return formatEth(parseEth(left) + parseEth(right))
}

export function subEth(left: string, right: string): string {
  return formatEth(parseEth(left) - parseEth(right))
}

export function mulEth(price: string, quantity: number): string {
  return formatEth(parseEth(price) * BigInt(quantity))
}

export function percentEth(amount: string, percent: number): string {
  return formatEth((parseEth(amount) * BigInt(percent)) / 100n)
}

export function compareEth(left: string, right: string): number {
  const delta = parseEth(left) - parseEth(right)
  if (delta === 0n) return 0
  return delta > 0n ? 1 : -1
}
