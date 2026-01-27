// Open Graph image generator per TrovaMi
// Genera automaticamente l'immagine di anteprima per social media
// Dimensioni: 1200x630px (standard OG)

import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'TrovaMi - Lead Generation Automatica per Agenzie Web'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 50%, #1e40af 100%)',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Background pattern */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)',
          }}
        />

        {/* Content container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px',
            textAlign: 'center',
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '40px',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '20px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
              }}
            >
              {/* Target icon simplified */}
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="6" />
                <circle cx="12" cy="12" r="2" />
              </svg>
            </div>
            <span
              style={{
                fontSize: '64px',
                fontWeight: 'bold',
                color: 'white',
                textShadow: '0 4px 20px rgba(0,0,0,0.3)',
              }}
            >
              TrovaMi
            </span>
          </div>

          {/* Main headline */}
          <h1
            style={{
              fontSize: '56px',
              fontWeight: 'bold',
              color: 'white',
              margin: '0 0 24px 0',
              lineHeight: 1.2,
              textShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            Trova Lead Qualificati
          </h1>
          <h2
            style={{
              fontSize: '42px',
              fontWeight: '600',
              color: 'rgba(255,255,255,0.9)',
              margin: '0 0 40px 0',
              lineHeight: 1.2,
            }}
          >
            per la Tua Agenzia Web
          </h2>

          {/* Tagline */}
          <p
            style={{
              fontSize: '24px',
              color: 'rgba(255,255,255,0.8)',
              margin: 0,
              maxWidth: '800px',
            }}
          >
            Audit digitali automatizzati | 78+ parametri analizzati | 5 lead gratuiti
          </p>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <span
            style={{
              fontSize: '20px',
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            trovami.pro
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
