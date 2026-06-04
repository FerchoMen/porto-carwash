'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

const inp = { background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#fff', width: '100%', outline: 'none' } as React.CSSProperties

export default function RegistroPage() {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [placa, setPlaca] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null)

  async function registrar() {
    if (!nombre.trim() || !placa.trim() || !whatsapp.trim() || !usuario.trim() || !password.trim()) {
      setMsg({ tipo: 'err', texto: 'Completa todos los campos' }); return
    }
    if (password !== password2) {
      setMsg({ tipo: 'err', texto: 'Las contraseñas no coinciden' }); return
    }
    if (password.length < 4) {
      setMsg({ tipo: 'err', texto: 'La contraseña debe tener al menos 4 caracteres' }); return
    }
    setLoading(true); setMsg(null)

    const placaUp = placa.trim().toUpperCase()

    // Verificar si la placa ya existe
    const { data: existePlaca } = await supabase.from('clientes').select('id').eq('placa', placaUp).single()
    if (existePlaca) {
      setMsg({ tipo: 'err', texto: 'Esta placa ya está registrada. Inicia sesión con tu usuario.' })
      setLoading(false); return
    }

    // Verificar si el usuario ya existe
    const { data: existeUsuario } = await supabase.from('clientes').select('id').eq('usuario', usuario.trim().toLowerCase()).single()
    if (existeUsuario) {
      setMsg({ tipo: 'err', texto: 'Este nombre de usuario ya está en uso. Elige otro.' })
      setLoading(false); return
    }

    // Registrar cliente vía API para hashear contraseña en servidor
    const res = await fetch('/api/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombre.trim(), placa: placaUp, whatsapp: whatsapp.trim(), usuario: usuario.trim().toLowerCase(), password: password.trim() })
    })
    const data = await res.json()

    if (!data.ok) {
      setMsg({ tipo: 'err', texto: data.error || 'Error al registrar' })
      setLoading(false); return
    }

    setMsg({ tipo: 'ok', texto: '✓ ¡Cuenta creada! Iniciando sesión...' })
    localStorage.setItem('porto_session', JSON.stringify({ id: data.id, nombre: nombre.trim(), tipo: 'cliente' }))
    setTimeout(() => router.push('/cliente'), 1200)
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#141414', borderBottom: '1px solid #1e1e1e', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: '#a0a0a0', cursor: 'pointer', fontSize: 20 }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>Crear cuenta</span>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <div style={{ width: 100, height: 80, position: 'relative', margin: '0 auto 10px' }}>
            <Image src="/logo.png" alt="Porto Car Wash" fill style={{ objectFit: 'contain', mixBlendMode: 'lighten' }} />
          </div>
          <div style={{ fontSize: 13, color: '#a0a0a0' }}>Regístrate y empieza a acumular puntos</div>
        </div>

        <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#a0a0a0', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 16 }}>Datos del vehículo</div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#a0a0a0', marginBottom: 6, display: 'block' }}>Nombre completo</label>
            <input style={inp} placeholder="Ej: María García" value={nombre} onChange={e => setNombre(e.target.value)} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#a0a0a0', marginBottom: 6, display: 'block' }}>Placa del vehículo</label>
            <input style={{ ...inp, textTransform: 'uppercase' }} placeholder="Ej: PCA-1234" value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())} />
          </div>
          <div style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 12, color: '#a0a0a0', marginBottom: 6, display: 'block' }}>WhatsApp</label>
            <input style={inp} type="tel" placeholder="Ej: 0991234567" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
          </div>
        </div>

        <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#a0a0a0', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 16 }}>Datos de acceso</div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#a0a0a0', marginBottom: 6, display: 'block' }}>Nombre de usuario</label>
            <input style={inp} placeholder="Ej: maria.garcia" value={usuario} onChange={e => setUsuario(e.target.value.toLowerCase())} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: '#a0a0a0', marginBottom: 6, display: 'block' }}>Contraseña</label>
            <input style={inp} type="password" placeholder="Mínimo 4 caracteres" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <div style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 12, color: '#a0a0a0', marginBottom: 6, display: 'block' }}>Confirmar contraseña</label>
            <input style={inp} type="password" placeholder="Repite la contraseña" value={password2} onChange={e => setPassword2(e.target.value)} onKeyDown={e => e.key === 'Enter' && registrar()} />
          </div>
        </div>

        {msg && <p style={{ fontSize: 13, color: msg.tipo === 'ok' ? '#00A651' : '#E8002A', textAlign: 'center' }}>{msg.texto}</p>}

        <button onClick={registrar} disabled={loading} style={{ width: '100%', background: '#00A651', color: '#fff', border: 'none', padding: '14px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Creando cuenta...' : 'Crear cuenta →'}
        </button>

        <button onClick={() => router.push('/')} style={{ width: '100%', background: 'transparent', color: '#a0a0a0', border: '1px solid #2a2a2a', padding: '13px', borderRadius: 12, fontSize: 14, cursor: 'pointer' }}>
          Ya tengo cuenta → Iniciar sesión
        </button>
      </div>
    </div>
  )
}
