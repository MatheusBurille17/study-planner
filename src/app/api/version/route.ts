import { NextResponse } from 'next/server'

// Nunca cachear: o objetivo é sempre saber qual deploy está servindo agora.
export const dynamic = 'force-dynamic'

/**
 * Identificador do deploy que está respondendo.
 * Usado pelo VersionGuard para detectar bundles antigos no navegador.
 */
export async function GET() {
  const id =
    process.env.VERCEL_DEPLOYMENT_ID ||
    process.env.VERCEL_URL ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    ''

  return NextResponse.json(
    { id },
    { headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' } },
  )
}
