'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Cliente = { id: string; nombre: string; placa: string; whatsapp: string; lavadas_ciclo: number; lavadas_total: number; gratis_disponibles: number }
type Lavada = { id: string; created_at: string; fue_gratis: boolean; empleados: { nombre: string } }

const inp = { background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#fff', width: '100%', outline: 'none' } as React.CSSProperties

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
      setMsg({ tipo: 'ok', texto: '✓ ¡Lavada registrada! Tus puntos se actualizaron.' })
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

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a', color: '#a0a0a0' }}>Cargando...</div>

  const ciclo = cliente?.lavadas_ciclo ?? 0

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#141414', borderBottom: '1px solid #1e1e1e', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>Mi tarjeta fiel</span>
        <button onClick={logout} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#a0a0a0', cursor: 'pointer', fontSize: 13 }}>Salir</button>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        {/* Tarjeta */}
        <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 20, padding: 20, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, background: '#00A65108', borderRadius: '50%' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: '#a0a0a0', marginBottom: 4, letterSpacing: 1 }}>CLIENTE FIEL</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: '#fff' }}>{cliente?.nombre}</div>
            </div>
            <div style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', padding: '6px 12px', borderRadius: 8, fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#00A651' }}>{cliente?.placa}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#a0a0a0' }}>Progreso hacia lavada gratis</span>
            <span style={{ fontSize: 12, color: '#00A651', fontWeight: 700 }}>{ciclo}/10</span>
          </div>
          <div style={{ background: '#0a0a0a', borderRadius: 99, height: 6, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ height: '100%', background: '#00A651', borderRadius: 99, width: `${ciclo * 10}%`, transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${i < ciclo ? '#00A651' : i === 9 ? '#E8002A' : '#2a2a2a'}`, background: i < ciclo ? '#00A651' : i === 9 ? '#E8002A15' : '#0a0a0a', color: i < ciclo ? '#fff' : i === 9 ? '#E8002A' : '#333', fontSize: i < ciclo ? 14 : 18 }}>
                {i < ciclo ? '✓' : i === 9 ? '🎁' : '·'}
              </div>
            ))}
          </div>
          {(cliente?.gratis_disponibles ?? 0) > 0 && (
            <div style={{ marginTop: 14, background: '#00A65112', border: '1px solid #00A65130', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10 }}>
              <span>🎉</span><p style={{ fontSize: 13, color: '#00A651' }}>¡Tienes <strong>{cliente?.gratis_disponibles} lavada(s) gratis</strong>! Dile a la empleada.</p>
            </div>
          )}
          {ciclo >= 8 && (cliente?.gratis_disponibles ?? 0) === 0 && (
            <div style={{ marginTop: 14, background: '#E8002A10', border: '1px solid #E8002A30', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10 }}>
              <span>⭐</span><p style={{ fontSize: 13, color: '#E8002A' }}>¡Te faltan {10 - ciclo} para tu lavada gratis!</p>
            </div>
          )}
        </div>

        {/* Ingresar código */}
        <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 16, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#a0a0a0', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14 }}>Registrar lavada</div>
          <div style={{ background: '#0a0a0a', border: '1px solid #00A65130', borderRadius: 14, padding: 18, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#a0a0a0', letterSpacing: 2, marginBottom: 12, textTransform: 'uppercase' }}>Código del empleado</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
              {[0, 1, 2, 3].map(i => (
                <input key={i} id={`cod-${i}`} type="number" inputMode="numeric" maxLength={1}
                  style={{ width: 56, height: 68, textAlign: 'center', fontSize: 28, fontWeight: 800, background: '#141414', border: '1.5px solid #2a2a2a', borderRadius: 12, color: '#fff', fontFamily: 'monospace', outline: 'none' }}
                  value={codigo[i]} onChange={e => handleCodigo(e.target.value, i)} />
              ))}
            </div>
            {msg && <p style={{ fontSize: 13, color: msg.tipo === 'ok' ? '#00A651' : '#E8002A', marginBottom: 10 }}>{msg.texto}</p>}
            <button onClick={validarCodigo} disabled={registrando} style={{ width: '100%', background: '#00A651', color: '#fff', border: 'none', padding: '13px', borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: registrando ? 0.7 : 1 }}>
              {registrando ? 'Validando...' : 'Registrar lavada'}
            </button>
          </div>
        </div>

        {/* Historial */}
        {historial.length > 0 && (
          <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#a0a0a0', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14 }}>Historial</div>
            {historial.map(l => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid #1e1e1e' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{new Date(l.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  <div style={{ fontSize: 11, color: '#a0a0a0', marginTop: 2 }}>por {(l.empleados as any)?.nombre}</div>
                </div>
                {l.fue_gratis && <span style={{ fontSize: 11, background: '#E8002A15', color: '#E8002A', border: '1px solid #E8002A30', padding: '3px 8px', borderRadius: 99 }}>Gratis 🎁</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
