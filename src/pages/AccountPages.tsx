import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { api, readApiError } from '../api/client.ts'
import { authStorage } from '../auth/storage.ts'
import { NftPortrait } from '../components/nft/NftPortrait.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Field, Input, Select } from '../components/ui/Field.tsx'
import { NETWORKS, type NetworkId, type PublicUser, type Wallet, type WalletRole } from '../domain/types.ts'
import { validateEmail, validateName, validateWalletAddress } from '../domain/validators.ts'
import { PageMeta } from '../ui/PageMeta.tsx'
import { defaultCatalogSearch } from '../domain/search.ts'
import { pushNotice } from '../ui/notices.ts'

export function ProfilePage() {
  const profile = useQuery({ queryKey: ['profile'], queryFn: ({ signal }) => api.profile(signal) as Promise<PublicUser> })

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[14rem_minmax(0,36rem)]">
      <nav aria-label="Conta" className="grid gap-2 text-sm text-muted">
        <Link to="/perfil" className="font-semibold text-cream">Meu perfil</Link>
        <Link to="/carteiras">Carteiras</Link>
        <Link to="/fora/$topic" params={{ topic: 'atividade' }}>Atividade</Link>
        <Link to="/fora/$topic" params={{ topic: 'criadores' }}>Estúdio do criador</Link>
        <Link to="/fora/$topic" params={{ topic: 'interesse' }}>Lista de interesse</Link>
      </nav>
      <div className="grid gap-8">
        {profile.data ? <ProfileEditor user={profile.data} /> : <p>Carregando perfil.</p>}
      </div>
    </div>
  )
}

function ProfileEditor({ user }: { user: PublicUser }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: user.name, displayName: user.displayName, email: user.email })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [passwords, setPasswords] = useState({ currentPassword: '', nextPassword: '' })
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})

  const save = useMutation({
    mutationFn: () => api.updateProfile(form),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
      void queryClient.invalidateQueries({ queryKey: ['session'] })
      pushNotice('Perfil atualizado.')
    },
    onError: (error) => setErrors(readApiError(error).details ?? { email: readApiError(error).message }),
  })
  const avatar = useMutation({
    mutationFn: (avatarDataUrl: string) => api.updateProfile({ ...form, avatarDataUrl }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
      pushNotice('Avatar atualizado.')
    },
    onError: (error) => pushNotice(readApiError(error).message),
  })
  const password = useMutation({
    mutationFn: () => api.changePassword(passwords),
    onSuccess: () => {
      setPasswords({ currentPassword: '', nextPassword: '' })
      setPasswordErrors({})
      pushNotice('Senha alterada.')
    },
    onError: (error) => setPasswordErrors(readApiError(error).details ?? { currentPassword: readApiError(error).message }),
  })

  async function onAvatar(file: File) {
    const bitmap = await createImageBitmap(file)
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, 128, 128)
    avatar.mutate(canvas.toDataURL('image/jpeg', 0.8))
  }

  return (
    <>
      <PageMeta title="Perfil do colecionador — Kurio" description="Edite seus dados, avatar e senha." />
      <h1 className="font-display text-4xl">Perfil do colecionador</h1>
      {user.avatarDataUrl ? (
        <img src={user.avatarDataUrl} alt={`Avatar de ${user.displayName}`} className="h-24 w-24 rounded-full object-cover" />
      ) : (
        <NftPortrait seed={user.avatarSeed} label={user.displayName} className="h-24 w-20" />
      )}
      <form className="grid gap-4" onSubmit={(event) => {
        event.preventDefault()
        const next: Record<string, string> = {}
        const nameError = validateName(form.name, 'O nome')
        const displayError = validateName(form.displayName, 'O nome de exibição')
        const emailError = validateEmail(form.email)
        if (nameError) next.name = nameError
        if (displayError) next.displayName = displayError
        if (emailError) next.email = emailError
        setErrors(next)
        if (Object.keys(next).length === 0) save.mutate()
      }}>
        <Field label="Nome" htmlFor="nome" error={errors.name}><Input id="nome" value={form.name} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'nome-error' : undefined} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field>
        <Field label="Nome de exibição" htmlFor="exibicao" error={errors.displayName}><Input id="exibicao" value={form.displayName} aria-invalid={Boolean(errors.displayName)} aria-describedby={errors.displayName ? 'exibicao-error' : undefined} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></Field>
        <Field label="E-mail" htmlFor="email" error={errors.email}><Input id="email" type="email" value={form.email} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} onChange={(event) => setForm({ ...form, email: event.target.value })} /></Field>
        <label htmlFor="avatar" className="text-sm">Avatar</label>
        <input id="avatar" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onAvatar(file) }} />
        <Button type="submit" disabled={save.isPending}>Salvar</Button>
      </form>
      <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); password.mutate() }}>
        <h2 className="font-display text-2xl">Senha</h2>
        <Field label="Senha atual" htmlFor="atual" error={passwordErrors.currentPassword}><Input id="atual" type="password" value={passwords.currentPassword} aria-invalid={Boolean(passwordErrors.currentPassword)} aria-describedby={passwordErrors.currentPassword ? 'atual-error' : undefined} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} /></Field>
        <Field label="Nova senha" htmlFor="nova" error={passwordErrors.nextPassword}><Input id="nova" type="password" value={passwords.nextPassword} aria-invalid={Boolean(passwordErrors.nextPassword)} aria-describedby={passwordErrors.nextPassword ? 'nova-error' : undefined} onChange={(event) => setPasswords({ ...passwords, nextPassword: event.target.value })} /></Field>
        <Button type="submit" variant="ghost" disabled={password.isPending}>Alterar senha</Button>
      </form>
      <Button
        variant="ghost"
        onClick={async () => {
          await api.logout()
          authStorage.setToken(null)
          queryClient.clear()
          void navigate({ to: '/', search: defaultCatalogSearch })
        }}
      >
        Sair
      </Button>
    </>
  )
}

export function WalletsPage() {
  const queryClient = useQueryClient()
  const wallets = useQuery({ queryKey: ['wallets'], queryFn: ({ signal }) => api.wallets(signal) as Promise<{ items: Wallet[] }> })
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState({ role: 'primary' as WalletRole, label: '', address: '', network: 'ethereum' as NetworkId })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const save = useMutation({
    mutationFn: () => (editing ? api.updateWallet(editing, form) : api.createWallet(form)),
    onSuccess: () => {
      setEditing(null)
      setForm({ role: 'secondary', label: '', address: '', network: 'ethereum' })
      setErrors({})
      void queryClient.invalidateQueries({ queryKey: ['wallets'] })
      pushNotice('Carteira salva.')
    },
    onError: (error) => setErrors(readApiError(error).details ?? { address: readApiError(error).message }),
  })

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <PageMeta title="Carteiras — Kurio" description="Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados." />
      <section>
        <h1 className="font-display text-4xl">Carteiras</h1>
        <p className="mt-2 text-muted">Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados.</p>
        <ul className="mt-4 grid gap-3">
          {wallets.data?.items.map((wallet) => (
            <li key={wallet.id} className="rounded-2xl border border-line p-4">
              <h2 className="font-semibold">{wallet.label}</h2>
              <p className="text-sm text-muted">{wallet.role === 'primary' ? 'Principal' : 'Secundária'} · {wallet.network}</p>
              <p className="mt-1 break-all text-sm">{wallet.address}</p>
              <p className="text-sm" role="status">{wallet.connected ? 'Conectada' : 'Desconectada'}</p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(wallet.id); setForm({ role: wallet.role, label: wallet.label, address: wallet.address, network: wallet.network }) }}>Editar</Button>
                <Button size="sm" variant="ghost" onClick={() => api.connectWallet(wallet.id).then(() => queryClient.invalidateQueries({ queryKey: ['wallets'] })).catch((error) => pushNotice(readApiError(error).message))}>Conectar</Button>
                <Button size="sm" variant="ghost" onClick={() => api.disconnectWallet(wallet.id).then(() => queryClient.invalidateQueries({ queryKey: ['wallets'] }))}>Desconectar</Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <form
        className="grid h-fit gap-4 rounded-2xl border border-line p-5"
        onSubmit={(event) => {
          event.preventDefault()
          const address = validateWalletAddress(form.address.trim(), form.network)
          const label = form.label.trim().length < 2 ? 'O nome da carteira precisa ter pelo menos 2 caracteres.' : null
          if (address || label) {
            setErrors({ address: address ?? '', label: label ?? '' })
            return
          }
          save.mutate()
        }}
      >
        <h2 className="font-display text-2xl">{editing ? 'Editar carteira' : 'Adicionar'}</h2>
        <Field label="Apelido da carteira" htmlFor="wallet-label" error={errors.label || undefined}><Input id="wallet-label" value={form.label} aria-invalid={Boolean(errors.label)} aria-describedby={errors.label ? 'wallet-label-error' : undefined} onChange={(event) => setForm({ ...form, label: event.target.value })} /></Field>
        <Field label="Papel" htmlFor="wallet-role">
          <Select id="wallet-role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as WalletRole })}>
            <option value="primary">Principal</option>
            <option value="secondary">Secundária</option>
          </Select>
        </Field>
        <Field label="Rede" htmlFor="wallet-network">
          <Select id="wallet-network" value={form.network} onChange={(event) => setForm({ ...form, network: event.target.value as NetworkId })}>
            {NETWORKS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </Select>
        </Field>
        <Field label="Endereço" htmlFor="wallet-address" error={errors.address || undefined}><Input id="wallet-address" value={form.address} aria-invalid={Boolean(errors.address)} aria-describedby={errors.address ? 'wallet-address-error' : undefined} onChange={(event) => setForm({ ...form, address: event.target.value })} /></Field>
        <Button type="submit" disabled={save.isPending}>Salvar carteira</Button>
      </form>
    </div>
  )
}
