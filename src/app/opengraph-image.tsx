import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = "Budd's Dashboard - Plumbing & HVAC Operations";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

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
          background: 'linear-gradient(135deg, #7c3aed 0%, #ec4899 50%, #3b82f6 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Glowing backdrop */}
        <div
          style={{
            position: 'absolute',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(236, 72, 153, 0.4) 0%, transparent 70%)',
            filter: 'blur(100px)',
            display: 'flex',
          }}
        />

        {/* Logo/Icon */}
        <div
          style={{
            width: '120px',
            height: '120px',
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            borderRadius: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            marginBottom: '40px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: 'white',
              display: 'flex',
            }}
          >
            B
          </div>
        </div>

        {/* Main Title with Glow */}
        <div
          style={{
            fontSize: '80px',
            fontWeight: 'bold',
            background: 'linear-gradient(to right, #ffffff, #f0e7ff, #ffffff)',
            backgroundClip: 'text',
            color: 'transparent',
            display: 'flex',
            textAlign: 'center',
            textShadow: '0 0 40px rgba(255, 255, 255, 0.8), 0 0 80px rgba(236, 72, 153, 0.6)',
            letterSpacing: '-2px',
          }}
        >
          Budd's Dashboard
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: '32px',
            color: 'rgba(255, 255, 255, 0.95)',
            marginTop: '20px',
            display: 'flex',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
          }}
        >
          Plumbing & HVAC Operations
        </div>

        {/* Live Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: '40px',
            background: 'rgba(255, 255, 255, 0.15)',
            padding: '12px 32px',
            borderRadius: '50px',
            border: '2px solid rgba(255, 255, 255, 0.25)',
          }}
        >
          <div
            style={{
              width: '16px',
              height: '16px',
              background: '#10b981',
              borderRadius: '50%',
              marginRight: '12px',
              display: 'flex',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.8)',
            }}
          />
          <div
            style={{
              fontSize: '24px',
              color: 'white',
              fontWeight: '600',
              display: 'flex',
            }}
          >
            Live AI-Powered Analytics
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
