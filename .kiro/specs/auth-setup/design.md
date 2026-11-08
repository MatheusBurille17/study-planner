# Design Document - auth-setup

## 1. Visão Geral da Feature

O módulo **auth-setup** estabelece as fundações do Amanda's Study Planner, implementando:
- Autenticação segura com Supabase Auth
- Gerenciamento de sessão com JWT
- Proteção de rotas autenticadas
- Persistência de sessão no navegador
- Setup inicial do PWA (manifest, tema, ícones)

Esta feature é **bloqueadora**: todas as demais features dependem dela, pois garante que apenas usuários autenticados acessem dados pessoais.

---

## 2. Arquitetura de Camadas

Seguindo a estrutura definida em `structure.md`, o módulo está organizado em 4 camadas:

```
auth-setup/
├── domain/                    # Regras de negócio puras
│   ├── user.ts               # Entity: User com invariantes
│   └── repository.ts         # Interface de repositório (contract)
│
├── application/              # Orquestração de casos de uso
│   ├── useCases/
│   │   ├── login.ts
│   │   ├── register.ts
│   │   ├── logout.ts
│   │   ├── resetPassword.ts
│   │   └── verifySession.ts
│   └── dto/
│       ├── LoginDTO.ts
│       ├── UserResponseDTO.ts
│       └── ErrorResponseDTO.ts
│
├── infrastructure/           # Implementações e adaptadores
│   ├── supabaseAuthService.ts
│   ├── authRepository.ts
│   └── mappers/
│       └── userMapper.ts
│
└── presentation/             # UI, validação, Server Actions
    ├── components/
    │   ├── LoginForm.tsx
    │   ├── RegisterForm.tsx
    │   ├── ForgotPasswordForm.tsx
    │   ├── ProtectedRoute.tsx
    │   └── AuthProvider.tsx
    ├── actions/
    │   ├── loginAction.ts
    │   ├── registerAction.ts
    │   ├── logoutAction.ts
    │   └── resetPasswordAction.ts
    ├── hooks/
    │   └── useAuth.ts
    └── schemas/
        ├── loginSchema.ts
        ├── registerSchema.ts
        └── resetPasswordSchema.ts
```

---

## 3. Fluxos Principais

### 3.1 Fluxo de Login

```
Usuário acessa /login
  ↓
LoginForm renderiza (componente cliente)
  ↓
Usuário insere email + senha + clica "Entrar"
  ↓
loginAction.ts (Server Action) executado
  ├─ Validação Zod: email + senha
  ├─ Se inválido: retorna erros
  └─ Se válido: chama Login use case
  
Login use case (application layer)
  ├─ Chama supabaseAuthService.login()
  ├─ Se erro: retorna ErrorResponseDTO
  └─ Se sucesso: retorna UserResponseDTO + token
  
supabaseAuthService.login() (infrastructure)
  ├─ Chama Supabase Auth com credenciais
  ├─ Se credenciais inválidas: erro
  └─ Se válido: retorna sessão com JWT
  
Back no Server Action:
  ├─ Define cookie HttpOnly com token
  ├─ Retorna sucesso ao cliente
  └─ Cliente redireciona para /dashboard via <Redirect>

Middleware intercepta /dashboard:
  ├─ Extrai token do cookie
  ├─ Valida integridade
  └─ Se válido: permite acesso
```

### 3.2 Fluxo de Registro

```
Usuário acessa /register
  ↓
RegisterForm renderiza
  ↓
Usuário preenche email + senha + confirmação + clica "Criar Conta"
  ↓
registerAction.ts (Server Action) executado
  ├─ Validação Zod: email válido, senhas idênticas, min 8 chars
  ├─ Se inválido: retorna erros para cada campo
  └─ Se válido: chama Register use case
  
Register use case (application layer)
  ├─ Valida regras de negócio (ex: email não existente)
  ├─ Chama supabaseAuthService.register()
  └─ Se erro: retorna ErrorResponseDTO
  
supabaseAuthService.register() (infrastructure)
  ├─ Chama Supabase Auth.signUp() com email + senha
  ├─ Se email existe: erro "Email já registrado"
  ├─ Se sucesso: cria auth.user + trigger cria public.user
  └─ Retorna sessão com JWT (auto-login)
  
Back no Server Action:
  ├─ Define cookie HttpOnly com token
  ├─ Registra log da criação
  └─ Cliente redireciona para /dashboard
```

### 3.3 Fluxo de Recuperação de Senha

```
Usuário em /login clica "Esqueceu a senha?"
  ↓
ForgotPasswordForm renderiza (step 1: enviar email)
  ↓
Usuário insere email + clica "Enviar Link"
  ↓
forgotPasswordAction.ts executado
  ├─ Valida email com Zod
  └─ Chama Supabase resetPassword() com email
  
Supabase:
  ├─ Procura conta com esse email
  ├─ Se não existe: retorna sucesso mesmo assim (segurança)
  └─ Se existe: gera token de reset + envia email
  
Usuário recebe email com link:
  └─ Link contém token: /reset-password?token=XXX
  
Usuário clica link, chega em /reset-password?token=XXX
  ↓
ResetPasswordForm renderiza (step 2: nova senha)
  ↓
Usuário insere nova senha + confirmação + clica "Redefinir"
  ↓
resetPasswordAction.ts executado
  ├─ Extrai token da URL query params
  ├─ Valida nova senha com Zod
  ├─ Chama Supabase updatePassword(token, newPassword)
  └─ Se sucesso: redireciona para /login com mensagem
```

### 3.4 Fluxo de Proteção de Rotas

```
Usuário não autenticado tenta acessar /dashboard
  ↓
Middleware intercepta requisição
  ├─ Extrai cookie de autenticação
  ├─ Se vazio: redireciona para /login
  ├─ Se presente: valida token JWT
  │   ├─ Se expirado: tenta renovar com refresh token
  │   │   ├─ Se refresh válido: emite novo JWT
  │   │   └─ Se refresh inválido: redireciona para /login
  │   └─ Se válido: permite acesso
  └─ Se inválido: redireciona para /login

Rota protegida renderiza com dados autenticados
```

### 3.5 Fluxo de Logout

```
Usuário clica botão "Logout"
  ↓
logoutAction.ts (Server Action) executado
  ├─ Obtém sessão atual
  ├─ Chama supabaseAuthService.logout()
  ├─ Supabase invalida token no servidor
  ├─ Deleta cookie de autenticação
  ├─ Limpa sessionStorage
  └─ Retorna redirecionamento para /login
  
Cliente recebe resposta:
  └─ Redireciona para /login com mensagem de sucesso
```

### 3.6 Fluxo de Persistência de Sessão

```
Usuário faz login com sucesso
  ├─ Token JWT armazenado em cookie persistente (HttpOnly, Secure, SameSite)
  └─ Refresh token armazenado seguramente (se aplicável)

Usuário fecha navegador

Usuário reabre aplicativo, chega em /
  ↓
Root layout (app/layout.tsx) renderiza
  ├─ Chama verifySessionAction (Server Action)
  ├─ verifySessionAction: Supabase.getSession()
  │   ├─ Se token válido: retorna usuário autenticado
  │   ├─ Se token expirado, refresh válido: renova token
  │   └─ Se ambos inválidos: retorna null
  └─ Root layout recebe resposta
  
Se autenticado:
  └─ Redireciona para /dashboard

Se não autenticado:
  └─ Redireciona para /login
```

---

## 4. Modelos de Dados (Domain Layer)

### 4.1 Entity: User

```typescript
// src/features/auth/domain/user.ts

interface User {
  id: string                    // UUID do Supabase auth.users.id
  email: string                 // Email único validado
  createdAt: Date              // Timestamp de criação
  lastSignInAt?: Date          // Último login
}

// Invariantes:
// - email nunca é vazio
// - email segue padrão RFC 5322 simplificado
// - id é UUID válido
// - createdAt é anterior ou igual a now()
```

### 4.2 Repository Interface

```typescript
// src/features/auth/domain/repository.ts

interface IAuthRepository {
  login(email: string, password: string): Promise<SessionResponse>
  register(email: string, password: string): Promise<SessionResponse>
  logout(token: string): Promise<void>
  getSession(token: string): Promise<User | null>
  refreshToken(refreshToken: string): Promise<SessionResponse>
  resetPassword(email: string): Promise<void>
  updatePassword(token: string, newPassword: string): Promise<void>
}

interface SessionResponse {
  user: User
  token: string
  refreshToken?: string
  expiresIn: number  // segundos
}
```

---

## 5. Casos de Uso (Application Layer)

### 5.1 Login Use Case

```typescript
// src/features/auth/application/useCases/login.ts

async function login(
  email: string,
  password: string,
  repository: IAuthRepository
): Promise<Result<SessionResponse, AuthError>> {
  // Validação de entrada (já feita no presentation layer, mas repetida aqui)
  if (!email || !password) {
    return Err(new AuthError('Email e senha são obrigatórios'))
  }
  
  // Chamar repository
  try {
    const session = await repository.login(email, password)
    return Ok(session)
  } catch (error) {
    if (error.code === 'invalid_credentials') {
      return Err(new AuthError('Email ou senha incorretos'))
    }
    return Err(new AuthError('Erro ao fazer login'))
  }
}
```

### 5.2 Register Use Case

```typescript
// src/features/auth/application/useCases/register.ts

async function register(
  email: string,
  password: string,
  repository: IAuthRepository
): Promise<Result<SessionResponse, AuthError>> {
  // Validação
  if (!email || !password) {
    return Err(new AuthError('Email e senha são obrigatórios'))
  }
  
  // Chamar repository
  try {
    const session = await repository.register(email, password)
    return Ok(session)
  } catch (error) {
    if (error.code === 'user_already_exists') {
      return Err(new AuthError('Este email já está registrado'))
    }
    return Err(new AuthError('Erro ao registrar'))
  }
}
```

### 5.3 Logout Use Case

```typescript
// src/features/auth/application/useCases/logout.ts

async function logout(
  token: string,
  repository: IAuthRepository
): Promise<Result<void, AuthError>> {
  try {
    await repository.logout(token)
    return Ok(void)
  } catch (error) {
    // Logout deve limpar dados locais mesmo se falhar no servidor
    return Ok(void)
  }
}
```

### 5.4 Verify Session Use Case

```typescript
// src/features/auth/application/useCases/verifySession.ts

async function verifySession(
  token: string | undefined,
  repository: IAuthRepository
): Promise<Result<User | null, AuthError>> {
  if (!token) {
    return Ok(null)
  }
  
  try {
    const user = await repository.getSession(token)
    return Ok(user)
  } catch (error) {
    // Token inválido
    return Ok(null)
  }
}
```

---

## 6. Camada de Infraestrutura

### 6.1 Supabase Auth Service

```typescript
// src/features/auth/infrastructure/supabaseAuthService.ts

import { createClient } from '@supabase/supabase-js'

export class SupabaseAuthService implements IAuthRepository {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  
  async login(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    
    return {
      user: mapSupabaseUserToUser(data.user),
      token: data.session?.access_token!,
      refreshToken: data.session?.refresh_token,
      expiresIn: data.session?.expires_in || 3600,
    }
  }
  
  async register(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
    })
    
    if (error) throw error
    
    return {
      user: mapSupabaseUserToUser(data.user),
      token: data.session?.access_token!,
      refreshToken: data.session?.refresh_token,
      expiresIn: data.session?.expires_in || 3600,
    }
  }
  
  async logout(token: string) {
    const { error } = await this.supabase.auth.signOut()
    if (error) throw error
  }
  
  async getSession(token: string) {
    const { data, error } = await this.supabase.auth.getSession()
    if (error || !data.session) return null
    return mapSupabaseUserToUser(data.session.user)
  }
}
```

### 6.2 Mapper

```typescript
// src/features/auth/infrastructure/mappers/userMapper.ts

export function mapSupabaseUserToUser(supabaseUser: any): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email!,
    createdAt: new Date(supabaseUser.created_at),
    lastSignInAt: supabaseUser.last_sign_in_at
      ? new Date(supabaseUser.last_sign_in_at)
      : undefined,
  }
}
```

---

## 7. Camada de Apresentação

### 7.1 Schemas Zod para Validação

```typescript
// src/features/auth/presentation/schemas/loginSchema.ts

import { z } from 'zod'

export const loginSchema = z.object({
  email: z
    .string('Email é obrigatório')
    .email('Email inválido'),
  password: z
    .string('Senha é obrigatória')
    .min(8, 'Senha deve ter no mínimo 8 caracteres'),
})

export type LoginFormData = z.infer<typeof loginSchema>
```

```typescript
// src/features/auth/presentation/schemas/registerSchema.ts

export const registerSchema = z.object({
  email: z
    .string('Email é obrigatório')
    .email('Email inválido'),
  password: z
    .string('Senha é obrigatória')
    .min(8, 'Senha deve ter no mínimo 8 caracteres'),
  passwordConfirm: z
    .string('Confirmação é obrigatória'),
}).refine((data) => data.password === data.passwordConfirm, {
  message: 'As senhas não conferem',
  path: ['passwordConfirm'],
})

export type RegisterFormData = z.infer<typeof registerSchema>
```

### 7.2 Server Actions

```typescript
// src/features/auth/presentation/actions/loginAction.ts

'use server'

import { redirect } from 'next/navigation'
import { loginSchema } from '../schemas/loginSchema'
import { Login useCase } from '../../application/useCases/login'
import { supabaseAuthService } from '../../infrastructure/supabaseAuthService'
import { cookies } from 'next/headers'

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get('email')
  const password = formData.get('password')
  
  // Validação
  const validation = loginSchema.safeParse({ email, password })
  if (!validation.success) {
    return { error: validation.error.flatten().fieldErrors }
  }
  
  // Executar use case
  const result = await Login(
    validation.data.email,
    validation.data.password,
    supabaseAuthService
  )
  
  if (result.isErr()) {
    return { error: result.error.message }
  }
  
  // Definir cookie
  const cookieStore = await cookies()
  cookieStore.set('auth-token', result.value.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: result.value.expiresIn,
  })
  
  // Redirecionar
  redirect('/dashboard')
}
```

```typescript
// src/features/auth/presentation/actions/logoutAction.ts

'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export async function logoutAction() {
  const cookieStore = await cookies()
  
  // Limpar cookies
  cookieStore.delete('auth-token')
  cookieStore.delete('auth-refresh-token')
  
  // Limpar dados de sessão (nota: localStorage não é acessível no server)
  // O cliente deve limpar localStorage em callback
  
  // Redirecionar
  redirect('/login?message=Logout%20realizado%20com%20sucesso')
}
```

### 7.3 Componentes React

```typescript
// src/features/auth/presentation/components/LoginForm.tsx

'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { loginAction } from '../actions/loginAction'

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const { pending } = useFormStatus()
  
  async function handleSubmit(formData: FormData) {
    setError(null)
    const result = await loginAction(null, formData)
    
    if (result?.error) {
      setError(result.error)
    }
  }
  
  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          required
          disabled={pending}
        />
      </div>
      
      <div>
        <label htmlFor="password">Senha</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          disabled={pending}
        />
      </div>
      
      {error && <div className="text-red-500">{error}</div>}
      
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-purple-600 text-white py-2 rounded"
      >
        {pending ? 'Entrando...' : 'Entrar'}
      </button>
    </form>
  )
}
```

### 7.4 Hook useAuth

```typescript
// src/features/auth/presentation/hooks/useAuth.ts

'use client'

import { useContext } from 'react'
import { AuthContext } from '../components/AuthProvider'

export function useAuth() {
  const context = useContext(AuthContext)
  
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  
  return context
}
```

### 7.5 Auth Provider

```typescript
// src/features/auth/presentation/components/AuthProvider.tsx

'use client'

import { createContext, useEffect, useState } from 'react'
import type { User } from '../../domain/user'

export const AuthContext = createContext<{
  user: User | null
  isLoading: boolean
} | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    // Verificar sessão ao montar
    async function checkAuth() {
      try {
        const response = await fetch('/api/auth/me')
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        }
      } finally {
        setIsLoading(false)
      }
    }
    
    checkAuth()
  }, [])
  
  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}
```

---

## 8. Middleware de Autenticação

```typescript
// src/lib/auth/middleware.ts

import { NextResponse, type NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Rotas públicas
  const publicRoutes = ['/login', '/register', '/forgot-password']
  
  if (publicRoutes.includes(request.nextUrl.pathname)) {
    return NextResponse.next()
  }
  
  // Verificar token
  const token = request.cookies.get('auth-token')?.value
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // Validar token (simplificado)
  try {
    // Implementação real validaria JWT signature
    const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
    
    if (decoded.exp < Date.now() / 1000) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/(main)/:path*', '/api/:path*', '/dashboard/:path*'],
}
```

---

## 9. Estrutura de Rotas (Next.js App Router)

```
src/app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx           # LoginForm + layout
│   ├── register/
│   │   └── page.tsx           # RegisterForm + layout
│   ├── forgot-password/
│   │   └── page.tsx           # ForgotPasswordForm + layout
│   ├── reset-password/
│   │   └── page.tsx           # ResetPasswordForm com token validado
│   └── layout.tsx             # Layout compartilhado (sem header/nav)
│
└── (main)/
    ├── dashboard/
    │   └── page.tsx           # Dashboard principal (protegido)
    ├── layout.tsx             # Layout com header/nav (protegido)
    └── ...
```

---

## 10. Setup do PWA

### 10.1 manifest.json

```json
// public/manifest.json

{
  "name": "Amanda's Study Planner",
  "short_name": "Study Planner",
  "description": "Aplicativo para organização acadêmica pessoal",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#7c3aed",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/screenshot-540x720.png",
      "sizes": "540x720",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ]
}
```

### 10.2 Root Layout com Meta Tags

```typescript
// src/app/layout.tsx

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Amanda's Study Planner",
  description: 'Organize sua vida acadêmica',
  manifest: '/manifest.json',
  themeColor: '#7c3aed',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: "Study Planner",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          rel="icon"
          href="/icons/favicon.ico"
        />
        <link
          rel="apple-touch-icon"
          href="/icons/icon-192x192.png"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta
          name="mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="theme-color" content="#7c3aed" />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

---

## 11. Tratamento de Erros

### 11.1 Custom Error Types

```typescript
// src/features/auth/domain/errors.ts

export class AuthError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

export const AuthErrors = {
  INVALID_CREDENTIALS: new AuthError('Email ou senha incorretos', 'INVALID_CREDENTIALS', 401),
  EMAIL_EXISTS: new AuthError('Este email já está registrado', 'EMAIL_EXISTS', 409),
  USER_NOT_FOUND: new AuthError('Usuário não encontrado', 'USER_NOT_FOUND', 404),
  TOKEN_EXPIRED: new AuthError('Sessão expirada', 'TOKEN_EXPIRED', 401),
  INVALID_TOKEN: new AuthError('Token inválido', 'INVALID_TOKEN', 401),
}
```

### 11.2 Error Response

```typescript
// src/features/auth/application/dto/ErrorResponseDTO.ts

export interface ErrorResponseDTO {
  error: string
  code?: string
  statusCode: number
  details?: Record<string, string[]>
}
```

---

## 12. Tipos TypeScript

```typescript
// src/shared/types/auth.ts

export interface Session {
  user: User
  token: string
  expiresAt: Date
}

export interface User {
  id: string
  email: string
  createdAt: Date
  lastSignInAt?: Date
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
}
```

---

## 13. Variáveis de Ambiente

```
// .env.local (não commitado)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyxxxx...
SUPABASE_SERVICE_ROLE_KEY=eyxxxx...

# Auth
NEXT_PUBLIC_AUTH_REDIRECT_URL=http://localhost:3000
NODE_ENV=development
```

---

## 14. Security Considerations

1. **Cookies HttpOnly:** Token JWT armazenado em cookie HttpOnly, Secure, SameSite=Strict
2. **CSRF Protection:** Nativa do Next.js com cookies SameSite
3. **Validação dupla:** Zod no cliente e servidor
4. **Token Rotation:** Renovação automática de token antes da expiração
5. **Rate Limiting:** Implementar em `/api/auth/*` (próxima fase)
6. **HTTPS:** Obrigatório em produção (Vercel)
7. **Secrets:** Variáveis sensíveis nunca commitadas, usadas via `.env.local`

---

## 15. Performance Targets

- Login: < 2 segundos (incluindo validação + API call)
- Register: < 2 segundos
- Route protection: < 50ms overhead por requisição
- Session restore: < 500ms após página reload
- PWA install prompt: aparece em < 3 segundos

---

## 16. Decisões Arquiteturais

| Decisão | Racional |
|---------|----------|
| **Server Actions** | Reduz requisições HTTP, dados sensíveis não viajam pelo cliente, melhor segurança |
| **Cookies HttpOnly** | Token não acessível via JavaScript, proteção contra XSS |
| **Middleware** | Proteção centralizada de rotas, consistent com Next.js patterns |
| **Clean Architecture** | Facilita testes, manutenção, e evolução independente de camadas |
| **Zod dupla validação** | Cliente otimiza UX, servidor garante segurança |
| **Result types (Ok/Err)** | Manejo explícito de erros, evita try/catch aninhado |

---

## 17. Próximos Passos

1. ✅ Requisitos aprovados
2. ✅ Design finalizado
3. ⏳ **Criar arquivo de tarefas (tasks.md)**
4. ⏳ Implementar cada tarefa conforme order (prioridade)
5. ⏳ Testes (unit, integration, E2E)
6. ⏳ Code review e refinamento
7. ⏳ Deploy para produção

