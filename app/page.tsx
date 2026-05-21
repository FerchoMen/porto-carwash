import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>

      {/* Hero */}
      <div style={{
        background: '#141414', borderBottom: '1px solid #1e1e1e',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '40px 24px 32px', position: 'relative', overflow: 'hidden'
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -60, left: -60, width: 200, height: 200, background: '#00A65106', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -40, right: -40, width: 150, height: 150, background: '#E8002A06', borderRadius: '50%' }} />

        {/* Logo con fondo transparente via mix-blend-mode */}
        <div style={{
          width: 160, height: 140, position: 'relative', marginBottom: 8,
          borderRadius: 20, overflow: 'hidden',
        }}>
          <Image
            src="/logo.png"
            alt="Porto Car Wash"
            fill
            style={{ objectFit: 'contain', mixBlendMode: 'lighten' }}
            priority
          />
        </div>

        <p style={{ fontSize: 12, color: '#a0a0a0', letterSpacing: 3, fontStyle: 'italic' }}>
          Mucho más que un lavado
        </p>
      </div>

      {/* Buttons */}
      <div style={{ padding: '28px 16px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>

        <Link href="/cliente" style={{ textDecoration: 'none' }}>
          <div style={{
            background: '#00A651', borderRadius: 18, padding: '20px 20px',
            display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
            border: '1px solid #00A651',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, background: '#ffffff20',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0
            }}>🎁</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Soy cliente</div>
              <div style={{ fontSize: 12, color: '#ffffff99', marginTop: 2 }}>Ver mi tarjeta de puntos</div>
            </div>
            <div style={{ color: '#ffffff60', fontSize: 20 }}>→</div>
          </div>
        </Link>

        <Link href="/empleado" style={{ textDecoration: 'none' }}>
          <div style={{
            background: '#141414', borderRadius: 18, padding: '20px 20px',
            display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
            border: '1px solid #2a2a2a',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, background: '#00A65115',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0
            }}>🔐</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Empleado / Admin</div>
              <div style={{ fontSize: 12, color: '#a0a0a0', marginTop: 2 }}>Acceso con credenciales</div>
            </div>
            <div style={{ color: '#ffffff30', fontSize: 20 }}>→</div>
          </div>
        </Link>

        {/* Info cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
          {[
            { icon: '🚗', label: '10 lavadas', sub: 'llena tu tarjeta' },
            { icon: '🎁', label: '1 gratis', sub: 'al completar' },
            { icon: '📲', label: 'Código WA', sub: 'seguro y rápido' },
            { icon: '🔒', label: 'Anti-fraude', sub: '100% seguro' },
          ].map((item, i) => (
            <div key={i} style={{
              background: '#141414', border: '1px solid #1e1e1e',
              borderRadius: 14, padding: '14px 12px', textAlign: 'center'
            }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{item.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{item.label}</div>
              <div style={{ fontSize: 11, color: '#a0a0a0', marginTop: 2 }}>{item.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '16px', borderTop: '1px solid #1a1a1a' }}>
        <p style={{ fontSize: 11, color: '#333', letterSpacing: 1 }}>
          PORTO CAR WASH · <span style={{ color: '#00A651' }}>Portoviejo, Manabí</span>
        </p>
      </div>
    </div>
  )
}
