import * as Dialog from '@radix-ui/react-dialog'
import { useState, type ReactNode } from 'react'
import { cn } from '../../ui/cn.ts'

export function Modal({
  trigger,
  title,
  children,
  open,
  onOpenChange,
}: {
  trigger?: ReactNode
  title: string
  children: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70" />
        <Dialog.Content
          className={cn(
            'fixed z-50 w-[min(100%-2rem,32rem)] rounded-2xl border border-line bg-panel p-5 text-cream shadow-2xl',
            'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          )}
        >
          <Dialog.Title className="font-display text-2xl">{title}</Dialog.Title>
          <div className="mt-4">{children}</div>
          <Dialog.Close className="absolute top-4 right-4 rounded-full px-2 py-1 text-sm text-muted">
            Fechar
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function Drawer({
  trigger,
  title,
  children,
}: {
  trigger: ReactNode
  title: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70" />
        <Dialog.Content className="fixed top-0 left-0 z-50 h-full w-[min(100%,22rem)] overflow-y-auto border-r border-line bg-panel p-5 text-cream">
          <Dialog.Title className="font-display text-2xl">{title}</Dialog.Title>
          <div className="mt-4" onClick={() => setOpen(false)}>{children}</div>
          <Dialog.Close className="mt-6 text-sm text-muted">Fechar</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
