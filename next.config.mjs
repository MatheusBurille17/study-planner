/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
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
