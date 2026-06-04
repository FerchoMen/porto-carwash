'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

type Session = { id: string; nombre: string; tipo: string }
type Cliente = { id: string; nombre: string; placa: string; whatsapp: string; lavadas_ciclo: number }

const inp = { background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#fff', width: '100%', outline: 'none' } as React.CSSProperties

export default function EmpleadoPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [placa, setPlaca] = useState('')
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [buscarError, setBuscarError] = useState('')
  const [codigoActivo, setCodigoActivo] = useState<string | null>(null)
  const [timerSeg, setTimerSeg] = useState(0)
  const [generando, setGenerando] = useState(false)
  const [waStatus, setWaStatus] = useState('')
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const sesion = localStorage.getItem('porto_session')
    if (!sesion) { router.push('/'); return }
    const parsed = JSON.parse(sesion)
    if (parsed.tipo !== 'empleado') { router.push('/'); return }
    setSession(parsed)
  }, [])

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
    const res = await fetch('/api/codigos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cliente_id: cliente.id, placa: cliente.placa, empleado_id: session.id }) })
    const data = await res.json()
    if (!data.ok) { setWaStatus('❌ Error: ' + data.error); setGenerando(false); return }
    setCodigoActivo(data.codigo); iniciarTimer(600)
    if (enviarWA) {
      setWaStatus('Enviando WhatsApp...')
      const waRes = await fetch('/api/whatsapp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ whatsapp: cliente.whatsapp, codigo: data.codigo, nombre: cliente.nombre, placa: cliente.placa }) })
      const waData = await waRes.json()
      setWaStatus(waData.ok ? '✅ Código enviado por WhatsApp' : '⚠️ No se pudo enviar WA')
    }
    setGenerando(false)
  }

  function iniciarTimer(s: number) {
    setTimerSeg(s)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimerSeg(prev => { if (prev <= 1) { clearInterval(timerRef.current!); setCodigoActivo(null); return 0 } return prev - 1 })
    }, 1000)
  }

  function cancelarCodigo() {
    if (timerRef.current) clearInterval(timerRef.current)
    setCodigoActivo(null); setTimerSeg(0); setWaStatus(''); setCliente(null); setPlaca('')
  }

  function logout() { localStorage.removeItem('porto_session'); router.push('/') }

  const min = Math.floor(timerSeg / 60), seg = timerSeg % 60

  if (!session) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a', color: '#a0a0a0' }}>Cargando...</div>

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#141414', borderBottom: '1px solid #1e1e1e', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>Panel empleado</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 99, background: '#00A65120', color: '#00A651', border: '1px solid #00A65140' }}>{session.nombre}</span>
          <button onClick={logout} style={{ background: 'none', border: 'none', color: '#a0a0a0', cursor: 'pointer', fontSize: 13 }}>Salir</button>
        </div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 14, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: '#a0a0a0' }}>Sesión activa</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{session.nombre}</div>
          </div>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00A651', boxShadow: '0 0 10px #00A651' }} />
        </div>

        <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#a0a0a0', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14 }}>Registrar lavada</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input style={{ ...inp, flex: 1, textTransform: 'uppercase' }} placeholder="Placa del vehículo" value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && buscarCliente()} />
            <button onClick={buscarCliente} disabled={buscando} style={{ background: '#00A651', border: 'none', color: '#fff', padding: '0 18px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>{buscando ? '...' : 'Buscar'}</button>
          </div>
          {buscarError && <p style={{ fontSize: 13, color: '#E8002A', marginTop: 10 }}>{buscarError}</p>}
        </div>

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
              <button onClick={() => generarCodigo(false)} disabled={generando} style={{ width: '100%', background: '#00A651', color: '#fff', border: 'none', padding: '14px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>{generando ? 'Generando...' : '📋 Mostrar código en pantalla'}</button>
              <button onClick={() => generarCodigo(true)} disabled={generando} style={{ width: '100%', background: 'transparent', color: '#00A651', border: '1px solid #00A65140', padding: '13px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{generando ? 'Enviando...' : '📲 Generar y enviar por WhatsApp'}</button>
            </div>
            {waStatus && <p style={{ fontSize: 13, color: waStatus.includes('✅') ? '#00A651' : '#E8002A', marginTop: 10, textAlign: 'center' }}>{waStatus}</p>}
          </div>
        )}

        {codigoActivo && (
          <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#a0a0a0', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14 }}>Código generado</div>
            <div style={{ background: '#0a0a0a', border: '1px solid #00A65130', borderRadius: 16, padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 56, fontWeight: 900, color: '#00A651', letterSpacing: 16, fontFamily: 'monospace' }}>{codigoActivo}</div>
              <div style={{ fontSize: 12, color: '#a0a0a0', marginTop: 8 }}>Expira en {min}:{seg < 10 ? '0' : ''}{seg} · Un solo uso</div>
            </div>
            <div style={{ background: '#E8002A10', border: '1px solid #E8002A30', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, marginTop: 14 }}>
              <span>👁</span><p style={{ fontSize: 13, color: '#E8002A' }}>Muestra este código al cliente o envíalo por WhatsApp.</p>
            </div>
            {waStatus && <p style={{ fontSize: 13, color: waStatus.includes('✅') ? '#00A651' : '#a0a0a0', marginTop: 10, textAlign: 'center' }}>{waStatus}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => generarCodigo(true)} disabled={generando} style={{ flex: 1, background: 'transparent', color: '#00A651', border: '1px solid #00A65140', padding: '12px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>📲 Reenviar WA</button>
              <button onClick={cancelarCodigo} style={{ flex: 1, background: 'transparent', color: '#E8002A', border: '1px solid #E8002A30', padding: '12px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
