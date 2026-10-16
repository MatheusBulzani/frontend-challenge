import { addEth, compareEth, mulEth, percentEth, subEth } from './eth.ts'
import { NETWORKS, type NetworkId, type PriceSummary } from './types.ts'

export function networkFee(network: NetworkId): string {
  return NETWORKS.find((item) => item.id === network)?.feeEth ?? '0.021'
}

export function summarize(
  lines: Array<{ unitPriceEth: string; quantity: number }>,
  coupon: string | null,
  network: NetworkId,
): PriceSummary {
  const subtotalEth = lines.reduce((total, line) => addEth(total, mulEth(line.unitPriceEth, line.quantity)), '0.00')
  const rawDiscount = coupon === 'LANCAMENTO10' ? percentEth(subtotalEth, 10) : '0.00'
  const discountEth = compareEth(rawDiscount, subtotalEth) > 0 ? subtotalEth : rawDiscount
  const feeEth = networkFee(network)
  const totalEth = addEth(subEth(subtotalEth, discountEth), feeEth)
  return { subtotalEth, discountEth, feeEth, totalEth, network, coupon }
}
