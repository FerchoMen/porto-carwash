'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

type Cliente = { id: string; nombre: string; placa: string; whatsapp: string; lavadas_ciclo: number; lavadas_total: number; gratis_disponibles: number }
type Lavada = { id: string; created_at: string; fue_gratis: boolean; empleados: { nombre: string } }

export default function ClientePage() {
  const router = useRouter()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [historial, setHistorial] = useState<Lavada[]>([])
  const [codigo, setCodigo] = useState(['', '', '', ''])
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null)
  const [registrando, setRegistrando] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sesion = localStorage.getItem('porto_session')
    if (!sesion) { router.push('/'); return }
    const { id, tipo } = JSON.parse(sesion)
    if (tipo !== 'cliente') { router.push('/'); return }
    cargarCliente(id)
  }, [])

  async function cargarCliente(id: string) {
    const { data } = await supabase.from('clientes').select('*').eq('id', id).single()
    if (!data) { router.push('/'); return }
    setCliente(data)
    await cargarHistorial(id)
    setLoading(false)
  }

  async function cargarHistorial(clienteId: string) {
    const { data } = await supabase.from('lavadas').select('id,created_at,fue_gratis,empleados(nombre)').eq('cliente_id', clienteId).order('created_at', { ascending: false }).limit(8)
    setHistorial((data as any) || [])
  }

  async function validarCodigo() {
    const code = codigo.join('')
    if (code.length < 4) { setMsg({ tipo: 'err', texto: 'Ingresa el código completo' }); return }
    if (!cliente) return
    setRegistrando(true); setMsg(null)
    const res = await fetch('/api/validar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: code, cliente_id: cliente.id }) })
    const data = await res.json()
    if (!data.ok) { setMsg({ tipo: 'err', texto: data.error }) }
    else {
      setMsg({ tipo: 'ok', texto: '✓ ¡Lavada registrada!' })
      setCodigo(['', '', '', ''])
      const { data: updated } = await supabase.from('clientes').select('*').eq('id', cliente.id).single()
      if (updated) setCliente(updated)
      await cargarHistorial(cliente.id)
    }
    setRegistrando(false)
  }

  function handleCodigo(val: string, idx: number) {
    const v = val.replace(/\D/g, '').slice(-1)
    const next = [...codigo]; next[idx] = v; setCodigo(next)
    if (v && idx < 3) (document.getElementById(`cod-${idx + 1}`) as HTMLInputElement)?.focus()
  }

  function logout() { localStorage.removeItem('porto_session'); router.push('/') }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f0f0f' }}>
      <div style={{ color: '#00A651', fontSize: 14 }}>Cargando...</div>
    </div>
  )

  const ciclo = cliente?.lavadas_ciclo ?? 0

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>

      {/* HERO - Tarjeta membresía */}
      <div style={{ background: 'linear-gradient(135deg, #003d20 0%, #00A651 100%)', padding: '28px 20px 24px', position: 'relative', overflow: 'hidden' }}>
        {/* Círculos decorativos */}
        <div style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, border: '2px solid rgba(255,255,255,0.08)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', right: 20, bottom: -30, width: 90, height: 90, border: '2px solid rgba(255,255,255,0.06)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', left: -20, bottom: -20, width: 80, height: 80, border: '2px solid rgba(255,255,255,0.05)', borderRadius: '50%' }} />

        {/* Logo pequeño */}
        <div style={{ position: 'absolute', right: 16, top: 16, width: 48, height: 40, opacity: 0.3 }}>
          <Image src="/logo.png" alt="Porto" fill style={{ objectFit: 'contain', mixBlendMode: 'lighten' }} />
        </div>

        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 16 }}>
          ⭐ CLIENTE FIEL
        </div>

        {/* Contador grande */}
        <div style={{ position: 'absolute', right: 20, top: 70 }}>
          <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1, color: '#fff' }}>{ciclo}</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2, textAlign: 'right' }}>/ 10</div>
        </div>

        {/* Info cliente */}
        <div style={{ fontSize: 21, fontWeight: 700, marginBottom: 4 }}>{cliente?.nombre}</div>
        <div style={{ fontSize: 12, fontFamily: 'monospace', opacity: 0.65 }}>{cliente?.placa}</div>

        {/* Barra de progreso */}
        <div style={{ marginTop: 20, background: 'rgba(0,0,0,0.2)', borderRadius: 99, height: 4 }}>
          <div style={{ height: '100%', background: 'rgba(255,255,255,0.8)', borderRadius: 99, width: `${ciclo * 10}%`, transition: 'width 0.6s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, opacity: 0.55 }}>
          <span>0 lavadas</span>
          <span style={{ color: ciclo >= 8 ? '#ffeb3b' : 'inherit' }}>{10 - ciclo} para tu lavada gratis 🎁</span>
        </div>
      </div>

      {/* DOTS */}
      <div style={{ background: '#141414', padding: '18px 20px', borderBottom: '1px solid #1e1e1e' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} style={{
              width: 34, height: 34, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: i < ciclo ? 13 : 16,
              fontWeight: 700,
              border: `1.5px solid ${i < ciclo ? '#00A651' : i === 9 ? '#E8002A' : '#2a2a2a'}`,
              background: i < ciclo ? '#00A651' : i === 9 ? 'rgba(232,0,42,0.08)' : '#1a1a1a',
              color: i < ciclo ? '#fff' : i === 9 ? '#E8002A' : '#333',
              transition: 'all 0.3s ease'
            }}>
              {i < ciclo ? '✓' : i === 9 ? '🎁' : '·'}
            </div>
          ))}
        </div>

        {/* Alertas */}
        {(cliente?.gratis_disponibles ?? 0) > 0 && (
          <div style={{ marginTop: 14, background: 'rgba(0,166,81,0.12)', border: '1px solid rgba(0,166,81,0.25)', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 20 }}>🎉</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#00A651' }}>¡Tienes {cliente?.gratis_disponibles} lavada(s) gratis!</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Dile a la empleada para aplicarla.</div>
            </div>
          </div>
        )}
        {ciclo >= 8 && (cliente?.gratis_disponibles ?? 0) === 0 && (
          <div style={{ marginTop: 14, background: 'rgba(255,235,59,0.08)', border: '1px solid rgba(255,235,59,0.2)', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 20 }}>⭐</span>
            <div style={{ fontSize: 13, color: '#ffeb3b' }}>¡Solo te faltan {10 - ciclo} lavadas para la gratis!</div>
          </div>
        )}
      </div>

      {/* CÓDIGO */}
      <div style={{ padding: '16px' }}>
        <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 11, color: '#666', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>Registrar lavada</div>
          <div style={{ background: '#0f0f0f', border: '1px solid #1e1e1e', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 12, color: '#555', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12, textAlign: 'center' }}>Código del empleado</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 14 }}>
              {[0, 1, 2, 3].map(i => (
                <input key={i} id={`cod-${i}`} type="number" inputMode="numeric" maxLength={1}
                  style={{ width: 54, height: 64, textAlign: 'center', fontSize: 26, fontWeight: 800, background: '#1a1a1a', border: `1.5px solid ${codigo[i] ? '#00A651' : '#2a2a2a'}`, borderRadius: 12, color: '#fff', fontFamily: 'monospace', outline: 'none', transition: 'border-color 0.2s' }}
                  value={codigo[i]} onChange={e => handleCodigo(e.target.value, i)} />
              ))}
            </div>
            {msg && (
              <div style={{ textAlign: 'center', fontSize: 13, color: msg.tipo === 'ok' ? '#00A651' : '#E8002A', marginBottom: 12, fontWeight: 500 }}>{msg.texto}</div>
            )}
            <button onClick={validarCodigo} disabled={registrando} style={{ width: '100%', background: '#00A651', color: '#fff', border: 'none', padding: '13px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: registrando ? 'not-allowed' : 'pointer', opacity: registrando ? 0.7 : 1, transition: 'opacity 0.2s' }}>
              {registrando ? 'Validando...' : 'Registrar lavada →'}
            </button>
          </div>
        </div>

        {/* HISTORIAL */}
        {historial.length > 0 && (
          <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 16, padding: 18, marginTop: 14 }}>
            <div style={{ fontSize: 11, color: '#666', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>Historial</div>
            {historial.map((l, idx) => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: idx < historial.length - 1 ? '1px solid #1e1e1e' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#00A65120', border: '1px solid #00A65130', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🚗</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#fff' }}>{new Date(l.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>por {(l.empleados as any)?.nombre}</div>
                  </div>
                </div>
                {l.fue_gratis
                  ? <span style={{ fontSize: 11, background: 'rgba(232,0,42,0.12)', color: '#E8002A', border: '1px solid rgba(232,0,42,0.25)', padding: '3px 8px', borderRadius: 99, fontWeight: 500 }}>Gratis 🎁</span>
                  : <span style={{ fontSize: 11, background: 'rgba(0,166,81,0.12)', color: '#00A651', border: '1px solid rgba(0,166,81,0.25)', padding: '3px 8px', borderRadius: 99 }}>✓</span>
                }
              </div>
            ))}
          </div>
        )}

        {/* FOOTER */}
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 11, color: '#333' }}>PORTO CAR WASH · <span style={{ color: '#00A651' }}>Portoviejo</span></div>
          <button onClick={logout} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: 12 }}>Salir</button>
        </div>
      </div>
    </div>
  )
}
