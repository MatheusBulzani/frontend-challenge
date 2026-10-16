import type { HTMLAttributes } from 'react'
import { cn } from '../../ui/cn.ts'

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn('skeleton rounded-xl', className)} aria-hidden="true" />
}
