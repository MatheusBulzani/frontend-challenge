const FILES = ['emerald', 'violet', 'ivory', 'sage', 'neon', 'golden'] as const

const NAMED: Record<string, (typeof FILES)[number]> = {
  nft_emerald: 'emerald',
  nft_violet: 'violet',
  nft_ivory: 'ivory',
  nft_sage: 'sage',
  nft_neon: 'neon',
  nft_golden: 'golden',
  brand: 'emerald',
}

function fileFor(seed: string) {
  const named = NAMED[seed] ?? NAMED[seed.split('-')[0] ?? '']
  if (named) return named
  let value = 0
  for (const char of seed) value = (value + char.charCodeAt(0)) % FILES.length
  return FILES[value] ?? 'emerald'
}

export function NftPortrait({
  seed,
  label,
  className,
}: {
  seed: string
  label: string
  className?: string
}) {
  const src = `/portraits/${fileFor(seed)}.jpg`
  if (!label) {
    return <img src={src} alt="" aria-hidden="true" width={640} height={853} className={`object-cover ${className ?? ''}`} />
  }
  return <img src={src} alt={label} width={640} height={853} className={`object-cover ${className ?? ''}`} />
}
