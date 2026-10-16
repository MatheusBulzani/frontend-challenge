import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from '@radix-ui/react-slot'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../ui/cn.ts'

const styles = cva(
  'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-ink hover:bg-accent-2',
        ghost: 'border border-line bg-transparent text-cream hover:bg-panel-2',
        danger: 'bg-danger text-white',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-11 px-5',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

type Props = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof styles> & { asChild?: boolean }

export function Button({ className, variant, size, asChild, ...props }: Props) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(styles({ variant, size }), className)} {...props} />
}
