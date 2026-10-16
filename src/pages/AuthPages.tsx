import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { api, readApiError } from '../api/client.ts'
import { loginAndMerge } from '../realtime/bridge.tsx'
import { Button } from '../components/ui/Button.tsx'
import { Field, Input } from '../components/ui/Field.tsx'
import { validateEmail } from '../domain/validators.ts'
import { defaultCatalogSearch } from '../domain/search.ts'
import { PageMeta } from '../ui/PageMeta.tsx'

export function LoginPage() {
  const search = useSearch({ from: '/login' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const login = useMutation({
    mutationFn: () => loginAndMerge(email, password),
    onSuccess: async () => {
      await queryClient.invalidateQueries()
      if (search.redirect) window.location.assign(search.redirect)
      else void navigate({ to: '/', search: defaultCatalogSearch })
    },
    onError: (error) => setErrors(readApiError(error).details ?? { email: readApiError(error).message }),
  })

  return (
    <form
      className="mx-auto grid max-w-md gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        const emailError = validateEmail(email)
        const passwordError = password ? null : 'Informe a senha.'
        if (emailError || passwordError) {
          setErrors({ email: emailError ?? '', password: passwordError ?? '' })
          return
        }
        setErrors({})
        login.mutate()
      }}
    >
      <PageMeta title="Entrar — Kurio" description="Entre para gerenciar sua carteira, coleção e perfil de criador." />
      <h1 className="font-display text-4xl">Entrar</h1>
      <p className="text-muted">Entre para gerenciar sua carteira, coleção e perfil de criador.</p>
      <Field label="E-mail" htmlFor="email" error={errors.email || undefined}>
        <Input id="email" type="email" autoComplete="username" placeholder="contato@email.com" value={email} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} onChange={(event) => setEmail(event.target.value)} />
      </Field>
      <Field label="Senha" htmlFor="senha" error={errors.password || undefined}>
        <Input id="senha" type="password" autoComplete="current-password" value={password} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'senha-error' : undefined} onChange={(event) => setPassword(event.target.value)} />
      </Field>
      <Button type="submit" disabled={login.isPending}>Entrar</Button>
      <p className="text-sm"><Link to="/fora/$topic" params={{ topic: 'senha' }}>Esqueceu a senha?</Link></p>
      <p className="text-center text-sm text-muted">Ou continue com</p>
      <div className="grid gap-2">
        <Button asChild variant="ghost"><Link to="/fora/$topic" params={{ topic: 'google' }}>Continuar com Google</Link></Button>
        <Button asChild variant="ghost"><Link to="/fora/$topic" params={{ topic: 'facebook' }}>Continuar com Facebook</Link></Button>
      </div>
      <p className="text-sm">Novo na Kurio? <Link to="/cadastro" search={{ redirect: search.redirect }}>Crie uma conta</Link></p>
    </form>
  )
}

export function RegisterPage() {
  const search = useSearch({ from: '/cadastro' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ name: '', displayName: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const register = useMutation({
    mutationFn: () => api.register(form).then((result) => loginAndMerge(form.email, form.password).then(() => result)),
    onSuccess: async () => {
      await queryClient.invalidateQueries()
      if (search.redirect) window.location.assign(search.redirect)
      else void navigate({ to: '/', search: defaultCatalogSearch })
    },
    onError: (error) => setErrors(readApiError(error).details ?? { email: readApiError(error).message }),
  })

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  return (
    <form
      className="mx-auto grid max-w-md gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        const next: Record<string, string> = {}
        if (form.name.trim().length < 2) next.name = 'O nome precisa ter pelo menos 2 caracteres.'
        if (form.displayName.trim().length < 2) next.displayName = 'O nome de exibição precisa ter pelo menos 2 caracteres.'
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'E-mail inválido.'
        if (form.password.length < 8 || !/[a-zA-Z]/.test(form.password) || !/\d/.test(form.password)) next.password = 'A senha precisa ter 8 caracteres, letras e números.'
        if (form.password !== form.confirm) next.confirm = 'As senhas não conferem.'
        setErrors(next)
        if (Object.keys(next).length === 0) register.mutate()
      }}
    >
      <PageMeta title="Criar conta — Kurio" description="Crie seu perfil de colecionador e conecte uma carteira quando quiser." />
      <h1 className="font-display text-4xl">Criar conta</h1>
      <p className="text-muted">Crie seu perfil de colecionador e conecte uma carteira quando quiser.</p>
      <Field label="Nome" htmlFor="nome" error={errors.name}><Input id="nome" value={form.name} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? 'nome-error' : undefined} onChange={(event) => set('name', event.target.value)} /></Field>
      <Field label="Nome de exibição" htmlFor="exibicao" error={errors.displayName}><Input id="exibicao" value={form.displayName} aria-invalid={Boolean(errors.displayName)} aria-describedby={errors.displayName ? 'exibicao-error' : undefined} onChange={(event) => set('displayName', event.target.value)} /></Field>
      <Field label="E-mail" htmlFor="email" error={errors.email}><Input id="email" type="email" value={form.email} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? 'email-error' : undefined} onChange={(event) => set('email', event.target.value)} /></Field>
      <Field label="Senha" htmlFor="senha" error={errors.password}><Input id="senha" type="password" value={form.password} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'senha-error' : undefined} onChange={(event) => set('password', event.target.value)} /></Field>
      <Field label="Confirmar senha" htmlFor="confirma" error={errors.confirm}><Input id="confirma" type="password" value={form.confirm} aria-invalid={Boolean(errors.confirm)} aria-describedby={errors.confirm ? 'confirma-error' : undefined} onChange={(event) => set('confirm', event.target.value)} /></Field>
      <Button type="submit" disabled={register.isPending}>Criar perfil</Button>
      <p className="text-sm">Já tem uma conta? <Link to="/login" search={{ redirect: search.redirect }}>Entre</Link></p>
    </form>
  )
}
