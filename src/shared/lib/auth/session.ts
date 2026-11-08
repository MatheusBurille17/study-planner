import type { User } from '@/shared/types/user'

const encoder = new TextEncoder()
const SECRET = process.env.AUTH_SECRET ?? 'amanda-study-planner-dev-secret-change-me'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 dias

export interface SessionPayload {
  sub: string
  email: string
  name?: string
  createdAt: string
  lastSignInAt?: string
  exp: number
  iat: number
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

async function getKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ])
}

export async function signSessionToken(user: User, maxAgeSeconds = SESSION_MAX_AGE_SECONDS): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload: SessionPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    lastSignInAt: user.lastSignInAt?.toISOString(),
    iat: now,
    exp: now + maxAgeSeconds,
  }
  const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify(payload)))
  const signature = await crypto.subtle.sign('HMAC', await getKey(), encoder.encode(encodedPayload))
  return `${encodedPayload}.${base64UrlEncode(new Uint8Array(signature))}`
}

export async function verifySessionToken(token?: string | null): Promise<SessionPayload | null> {
  if (!token) return null
  const [encodedPayload, signature] = token.split('.')
  if (!encodedPayload || !signature) return null

  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await getKey(),
      base64UrlDecode(signature) as unknown as BufferSource,
      encoder.encode(encodedPayload),
    )
    if (!valid) return null

    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedPayload))) as SessionPayload
    if (!payload?.sub || !payload?.exp) return null
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export function sessionPayloadToUser(payload: SessionPayload): User {
  return {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    createdAt: new Date(payload.createdAt),
    lastSignInAt: payload.lastSignInAt ? new Date(payload.lastSignInAt) : undefined,
  }
}

/** Decodifica um JWT do Supabase apenas para leitura de expiração (sem verificar assinatura). */
export function readJwtPayload(token?: string | null): { exp?: number; sub?: string; email?: string } | null {
  if (!token) return null
  try {
    const [, payload] = token.split('.')
    if (!payload) return null
    return JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)))
  } catch {
    return null
  }
}

export function isJwtExpired(token?: string | null, skewSeconds = 60): boolean {
  const payload = readJwtPayload(token)
  if (!payload?.exp) return true
  return payload.exp - skewSeconds < Math.floor(Date.now() / 1000)
}
