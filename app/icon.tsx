import { ImageResponse } from 'next/og';

export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #0284c7 100%)',
          borderRadius: 8,
          padding: 2,
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 6,
            background: '#09090b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {/* Peeking top card line */}
          <div
            style={{
              position: 'absolute',
              top: 3,
              left: 8,
              width: 10,
              height: 3,
              borderRadius: '2px 2px 0 0',
              background: '#38bdf8',
            }}
          />

          {/* Mini Wallet Chassis */}
          <div
            style={{
              width: 22,
              height: 16,
              borderRadius: 3.5,
              border: '1.5px solid #34d399',
              background: 'rgba(5, 150, 105, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              marginTop: 2,
            }}
          >
            {/* Clasp with golden lock dot */}
            <div
              style={{
                position: 'absolute',
                right: -2,
                top: 4,
                width: 6,
                height: 6,
                borderRadius: 2,
                background: '#18181b',
                border: '1px solid #34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 2,
                  height: 2,
                  borderRadius: '50%',
                  background: '#fbbf24',
                }}
              />
            </div>

            {/* SD Monogram */}
            <div
              style={{
                color: '#a7f3d0',
                fontSize: 8.5,
                fontWeight: 900,
                fontFamily: 'sans-serif',
                letterSpacing: '-0.5px',
                marginRight: 2,
              }}
            >
              SD
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
