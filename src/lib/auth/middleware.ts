import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { PUBLIC_ROUTES, AUTH_COOKIE, PROTECTED_ROUTES } from '@/shared/constants/config'
import { isSupabaseConfigured, getSupabaseUrl, getSupabaseAnonKey } from '@/shared/lib/supabase/config'
import { isJwtExpired } from '@/shared/lib/auth/session'
import { verifySessionToken } from '@/shared/lib/auth/session'

const AUTH_ENTRY_ROUTES = ['/login', '/register', '/forgot-password']
const PUBLIC_API_PREFIXES = [
  '/api/auth/me',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/refresh',
  '/api/auth/register',
  '/api/health',
  '/api/version',
  '/api/notifications/send',
]

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}

function isProtectedRoute(pathname: string): boolean {
  return (
    PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`)) ||
    pathname === '/' ||
    pathname.startsWith('/api/')
  )
}

interface SessionState {
  authed: boolean
  response: NextResponse
}

async function getSessionState(request: NextRequest): Promise<SessionState> {
  const token = request.cookies.get(AUTH_COOKIE)?.value

  /*
   * Sem cookie não há sessão possível. Evita criar o cliente Supabase e fazer
   * uma chamada de rede em cada acesso anônimo (login, register, assets, etc.).
   *
   * Em modo Supabase também mantemos o fluxo normal quando existe o cookie de
   * sessão do próprio SDK (`sb-*-auth-token`), pois o `getClaims()` abaixo
   * consegue renovar a sessão mesmo que o nosso `auth-token` tenha expirado.
   */
  const hasSupabaseSessionCookie =
    isSupabaseConfigured() &&
    request.cookies
      .getAll()
      .some((cookie) => cookie.name.startsWith('sb-') && cookie.name.includes('auth-token'))

  if (!token && !hasSupabaseSessionCookie) {
    return { authed: false, response: NextResponse.next({ request }) }
  }

  if (isSupabaseConfigured()) {
    let response = NextResponse.next({ request })
    try {
      const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options: Parameters<typeof response.cookies.set>[2] }[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          },
        },
      })
      // `getClaims()` valida o JWT localmente quando o projeto usa chaves
      // assimétricas (não faz round-trip ao Auth). Com chave simétrica ele
      // ainda consulta o servidor, mas não é pior que `getUser()`.
      const { data } = await supabase.auth.getClaims()
      if (data?.claims?.sub) return { authed: true, response }
    } catch {
      // Falha de rede: usa validação otimista do token abaixo.
    }
    return { authed: Boolean(token && !isJwtExpired(token)), response }
  }

  const payload = await verifySessionToken(token)
  return { authed: Boolean(payload), response: NextResponse.next({ request }) }
}

/**
 * Middleware central de autenticação.
 * - Rotas privadas sem sessão → /login
 * - Rotas de entrada com sessão → /dashboard
 * - APIs privadas sem sessão → 401
 */
export async function authMiddleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api/auth') && !PUBLIC_API_PREFIXES.includes(pathname)) {
    return NextResponse.next()
  }

  const session = await getSessionState(request)
  const authed = session.authed

  if (isPublicRoute(pathname)) {
    const isEntry = AUTH_ENTRY_ROUTES.some((route) => pathname === route)
    if (authed && isEntry) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return session.response
  }

  if (PUBLIC_API_PREFIXES.some((prefix) => pathname === prefix)) {
    return session.response
  }

  if (!authed && isProtectedRoute(pathname)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.url)
    if (pathname !== '/') loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return session.response
}
