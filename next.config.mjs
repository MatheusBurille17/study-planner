/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // O indicador flutuante do Next fica sobre a barra de navegação inferior no
  // mobile durante o desenvolvimento e intercepta cliques nas abas.
  devIndicators: false,
  env: {
    // Identifica o deploy que gerou o bundle em execução no navegador.
    // O VersionGuard compara com /api/version e força atualização se divergir.
    NEXT_PUBLIC_BUILD_ID:
      process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_URL || '',
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Mantém o payload RSC das telas visitadas no cache em memória do cliente.
    // Sem isso o Next 15 usa `dynamic: 0` e refaz a consulta ao servidor a cada
    // troca de aba, tornando a navegação perceptivelmente lenta.
    staleTimes: {
      dynamic: 180,
      static: 300,
    },
  },
  async headers() {
    return [
      {
        source: '/service-worker.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [{ key: 'Content-Type', value: 'application/manifest+json' }],
      },
    ]
  },
}

export default nextConfig
