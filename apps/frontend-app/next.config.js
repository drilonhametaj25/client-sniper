// Questo file configura Next.js per l'applicazione frontend
// È parte del modulo apps/frontend-app  
// Viene utilizzato da Next.js per la configurazione dell'app
// ⚠️ Aggiornare se si cambiano configurazioni di build o routing

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
  env: {
    CUSTOM_KEY: 'my-value',
  },
  // Fix per Supabase WebSocket in browser
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Fix per moduli Node.js nel browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        buffer: false,
        util: false,
        assert: false,
        os: false,
        path: false,
      }
      
      // Non esternalizzare ws per il browser - lascia che webpack lo gestisca
      config.resolve.alias = {
        ...config.resolve.alias,
        'ws': 'isows',
      }
    }
    return config
  },
  // Transpile Supabase modules
  transpilePackages: ['@supabase/supabase-js', '@supabase/realtime-js'],
  // Headers per CORS
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
}

module.exports = nextConfig
