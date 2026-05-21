'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'

type Session = { id: string; nombre: string; rol: string }
type Cliente = { id: string; nombre: string; placa: string; whatsapp: string; lavadas_ciclo: number }

const S = {
  screen: { minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column' as const },
  header: { background: '#141414', borderBottom: '1px solid #1e1e1e', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky' as const, top: 0, zIndex: 10 },
  content: { padding: 16, display: 'flex', flexDirection: 'column' as const, gap: 14, flex: 1 },
  card: { background: '#141414', border: '1px solid #1e1e1e', borderRadius: 16, padding: 18 },
  input: { background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#fff', width: '100%' },
  btnPrimary: { width: '100%', background: '#00A651', color: '#fff', border: 'none', padding: '14px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  btnSecondary: { width: '100%', background: 'transparent', color: '#00A651', border: '1px solid #00A65140', padding: '13px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  label: { fontSize: 12, color: '#a0a0a0', fontWeight: 500, marginBottom: 6, display: 'block' as const },
}

export default function EmpleadoPage() {
  const [step, setStep] = useState<'login' | 'panel'>('login')
  const [nombre, setNombre] = useState('')
  const [password, setPassword] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [placa, setPlaca] = useState('')
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [buscarError, setBuscarError] = useState('')
  const [codigoActivo, setCodigoActivo] = useState<string | null>(null)
  const [timerSeg, setTimerSeg] = useState(0)
  const [generando, setGenerando] = useState(false)
  const [waStatus, setWaStatus] = useState('')
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  async function login() {
    if (!nombre.trim() || !password.trim()) { setLoginError('Ingresa tu nombre y contraseña'); return }
    setLoginLoading(true); setLoginError('')

    const { data, error } = await supabase.rpc('verificar_empleado', {
      p_password: password.trim()
    })

    if (error || !data?.ok) {
      setLoginError('Contraseña incorrecta')
      setLoginLoading(false)
      return
    }

    // Verificar que el nombre coincida
    if (data.nombre.toLowerCase() !== nombre.trim().toLowerCase()) {
      setLoginError('Nombre o contraseña incorrectos')
      setLoginLoading(false)
      return
    }

    const emp = { id: data.id, nombre: data.nombre, rol: data.rol }
    setSession(emp)
    if (data.rol === 'admin' && typeof window !== 'undefined') {
      window.location.href = '/admin'
      return
    }
    setStep('panel')
    setLoginLoading(false)
  }

  async function buscarCliente() {
    if (!placa.trim()) return
    setBuscando(true); setBuscarError(''); setCliente(null); setCodigoActivo(null); setWaStatus('')
    const { data } = await supabase.from('clientes').select('id,nombre,placa,whatsapp,lavadas_ciclo').eq('placa', placa.trim().toUpperCase()).single()
    if (!data) setBuscarError('Placa no encontrada. El cliente debe registrarse primero.')
    else setCliente(data)
    setBuscando(false)
  }

  async function generarCodigo(enviarWA: boolean) {
    if (!cliente || !session) return
    setGenerando(true); setWaStatus('')
    const res = await fetch('/api/codigos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente_id: cliente.id, placa: cliente.placa, empleado_id: session.id })
    })
    const data = await res.json()
    if (!data.ok) { setWaStatus('❌ Error: ' + data.error); setGenerando(false); return }
    setCodigoActivo(data.codigo)
    iniciarTimer(600)
    if (enviarWA) {
      setWaStatus('Enviando WhatsApp...')
      const waRes = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp: cliente.whatsapp, codigo: data.codigo, nombre: cliente.nombre, placa: cliente.placa })
      })
      const waData = await waRes.json()
      setWaStatus(waData.ok ? '✅ Código enviado por WhatsApp' : '⚠️ No se pudo enviar WA')
    }
    setGenerando(false)
  }

  function iniciarTimer(s: number) {
    setTimerSeg(s)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimerSeg(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); setCodigoActivo(null); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  function cancelarCodigo() {
    if (timerRef.current) clearInterval(timerRef.current)
    setCodigoActivo(null); setTimerSeg(0); setWaStatus('')
    setCliente(null); setPlaca('')
  }

  function logout() {
    setStep('login'); setSession(null); setNombre(''); setPassword('')
    setCliente(null); cancelarCodigo()
  }

  const min = Math.floor(timerSeg / 60), seg = timerSeg % 60

  if (step === 'login') return (
    <div style={S.screen}>
      <div style={S.header}>
        <Link href="/"><button style={{ background: 'none', border: 'none', color: '#a0a0a0', cursor: 'pointer', fontSize: 20 }}>←</button></Link>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Acceso empleados</span>
      </div>
      <div style={S.content}>
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ width: 120, height: 100, position: 'relative', margin: '0 auto 16px' }}>
            <Image src="/logo.png" alt="Porto Car Wash" fill style={{ objectFit: 'contain', mixBlendMode: 'lighten' }} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Panel de empleados</div>
          <div style={{ fontSize: 13, color: '#a0a0a0', marginTop: 4 }}>Solo personal autorizado</div>
        </div>
        <div style={S.card}>
          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>Tu nombre</label>
            <input
              style={S.input}
              placeholder="Ej: Andres"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Contraseña</label>
            <input
              style={S.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
            />
          </div>
          {loginError && <p style={{ fontSize: 13, color: '#E8002A', textAlign: 'center', marginBottom: 12 }}>{loginError}</p>}
          <button style={S.btnPrimary} onClick={login} disabled={loginLoading}>
            {loginLoading ? 'Verificando...' : 'Entrar al sistema →'}
          </button>
        </div>
        <p style={{ fontSize: 11, color: '#333', textAlign: 'center' }}>La contraseña la facilita la administración</p>
      </div>
    </div>
  )

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={{ background: 'none', border: 'none', color: '#a0a0a0', cursor: 'pointer', fontSize: 20 }} onClick={logout}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Panel empleado</span>
        <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 99, background: '#00A65120', color: '#00A651', border: '1px solid #00A65140' }}>{session?.nombre}</div>
      </div>
      <div style={S.content}>
        {/* Status */}
        <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 14, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: '#a0a0a0' }}>Sesión activa</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{session?.nombre}</div>
          </div>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00A651', boxShadow: '0 0 10px #00A651' }} />
        </div>

        {/* Buscar */}
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#a0a0a0', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14 }}>Registrar lavada</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              style={{ ...S.input, flex: 1, textTransform: 'uppercase' }}
              placeholder="Placa del vehículo"
              value={placa}
              onChange={e => setPlaca(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && buscarCliente()}
            />
            <button onClick={buscarCliente} disabled={buscando} style={{ background: '#00A651', border: 'none', color: '#fff', padding: '0 18px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
              {buscando ? '...' : 'Buscar'}
            </button>
          </div>
          {buscarError && <p style={{ fontSize: 13, color: '#E8002A', marginTop: 10 }}>{buscarError}</p>}
        </div>

        {/* Cliente encontrado */}
        {cliente && !codigoActivo && (
          <div style={{ background: '#0a0a0a', border: '1px solid #00A65130', borderRadius: 16, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{cliente.nombre}</div>
                <div style={{ fontSize: 13, color: '#00A651', fontFamily: 'monospace', fontWeight: 700, marginTop: 2 }}>{cliente.placa}</div>
                <div style={{ fontSize: 12, color: '#a0a0a0', marginTop: 4 }}>WA: {cliente.whatsapp}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#00A651' }}>{cliente.lavadas_ciclo % 10}/10</div>
                <div style={{ fontSize: 11, color: '#a0a0a0' }}>lavadas</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
              <button style={S.btnPrimary} onClick={() => generarCodigo(false)} disabled={generando}>
                {generando ? 'Generando...' : '📋 Mostrar código en pantalla'}
              </button>
              <button style={S.btnSecondary} onClick={() => generarCodigo(true)} disabled={generando}>
                {generando ? 'Enviando...' : '📲 Generar y enviar por WhatsApp'}
              </button>
            </div>
            {waStatus && <p style={{ fontSize: 13, color: waStatus.includes('✅') ? '#00A651' : '#E8002A', marginTop: 10, textAlign: 'center' }}>{waStatus}</p>}
          </div>
        )}

        {/* Código activo */}
        {codigoActivo && (
          <div style={S.card}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#a0a0a0', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14 }}>Código generado</div>
            <div style={{ background: '#0a0a0a', border: '1px solid #00A65130', borderRadius: 16, padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 56, fontWeight: 900, color: '#00A651', letterSpacing: 16, fontFamily: 'monospace' }}>{codigoActivo}</div>
              <div style={{ fontSize: 12, color: '#a0a0a0', marginTop: 8 }}>Expira en {min}:{seg < 10 ? '0' : ''}{seg} · Un solo uso</div>
            </div>
            <div style={{ background: '#E8002A10', border: '1px solid #E8002A30', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, marginTop: 14 }}>
              <span>👁</span>
              <p style={{ fontSize: 13, color: '#E8002A' }}>Muestra este código al cliente o envíalo por WhatsApp.</p>
            </div>
            {waStatus && <p style={{ fontSize: 13, color: waStatus.includes('✅') ? '#00A651' : '#a0a0a0', marginTop: 10, textAlign: 'center' }}>{waStatus}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => generarCodigo(true)} disabled={generando} style={{ flex: 1, background: 'transparent', color: '#00A651', border: '1px solid #00A65140', padding: '12px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                📲 Reenviar WA
              </button>
              <button onClick={cancelarCodigo} style={{ flex: 1, background: 'transparent', color: '#E8002A', border: '1px solid #E8002A30', padding: '12px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
