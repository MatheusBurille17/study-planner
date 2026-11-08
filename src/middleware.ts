import { authMiddleware } from '@/lib/auth/middleware'

export async function middleware(request: Parameters<typeof authMiddleware>[0]) {
  return authMiddleware(request)
}

export const config = {
  matcher: [
    /*
     * Aplica a todas as rotas, exceto assets estáticos, imagens, ícones,
     * manifest e service worker.
     */
    '/((?!_next/static|_next/image|favicon.ico|icons|images|manifest.json|service-worker.js|workbox-.*).*)',
  ],
}
