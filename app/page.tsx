'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const inp = { background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#fff', width: '100%', outline: 'none' } as React.CSSProperties

export default function Home() {
  const router = useRouter()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function login() {
    if (!usuario.trim() || !password.trim()) { setError('Ingresa tu usuario y contraseña'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/verificar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: usuario.trim(), password: password.trim() })
    })
    const data = await res.json()
    if (!data.ok) { setError(data.error || 'Usuario o contraseña incorrectos'); setLoading(false); return }

    const tipo = data.tipo || data.rol
    localStorage.setItem('porto_session', JSON.stringify({ id: data.id, nombre: data.nombre, tipo }))

    if (tipo === 'admin') router.push('/admin')
    else if (tipo === 'empleado') router.push('/empleado')
    else router.push('/cliente')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
      {/* Hero con logo */}
      <div style={{ background: '#141414', borderBottom: '1px solid #1e1e1e', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 24px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, left: -60, width: 200, height: 200, background: '#00A65106', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -40, right: -40, width: 150, height: 150, background: '#E8002A06', borderRadius: '50%' }} />
        <div style={{ width: 170, height: 140, position: 'relative', zIndex: 1 }}>
          <Image src="/logo.png" alt="Porto Car Wash" fill style={{ objectFit: 'contain', mixBlendMode: 'lighten' }} priority />
        </div>
        <p style={{ fontSize: 12, color: '#a0a0a0', letterSpacing: 3, fontStyle: 'italic', marginTop: 4 }}>Mucho más que un lavado</p>
      </div>

      {/* Formulario */}
      <div style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#a0a0a0', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 16 }}>Iniciar sesión</div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#a0a0a0', fontWeight: 500, marginBottom: 6, display: 'block' }}>Usuario</label>
            <input style={inp} placeholder="Tu nombre de usuario" value={usuario} onChange={e => setUsuario(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: '#a0a0a0', fontWeight: 500, marginBottom: 6, display: 'block' }}>Contraseña</label>
            <input style={inp} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} />
          </div>
          {error && <p style={{ fontSize: 13, color: '#E8002A', textAlign: 'center', marginBottom: 12 }}>{error}</p>}
          <button onClick={login} disabled={loading} style={{ width: '100%', background: '#00A651', color: '#fff', border: 'none', padding: '14px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Verificando...' : 'Entrar →'}
          </button>
        </div>

        {/* Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[{ icon: '🚗', label: '10 lavadas', sub: 'llena tu tarjeta' }, { icon: '🎁', label: '1 gratis', sub: 'al completar' }, { icon: '📲', label: 'Código WA', sub: 'seguro y rápido' }, { icon: '🔒', label: 'Anti-fraude', sub: '100% seguro' }].map((item, i) => (
            <div key={i} style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{item.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{item.label}</div>
              <div style={{ fontSize: 11, color: '#a0a0a0', marginTop: 2 }}>{item.sub}</div>
            </div>
          ))}
        </div>

        {/* Botón registro */}
        <button onClick={() => router.push('/registro')} style={{ width: '100%', background: 'transparent', color: '#00A651', border: '1px solid #00A65140', padding: '14px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          ¿No tienes cuenta? Regístrate aquí →
        </button>
      </div>

      <div style={{ textAlign: 'center', padding: 16, borderTop: '1px solid #1a1a1a' }}>
        <p style={{ fontSize: 11, color: '#333', letterSpacing: 1 }}>PORTO CAR WASH · <span style={{ color: '#00A651' }}>Portoviejo, Manabí</span></p>
      </div>
    </div>
  )
}
