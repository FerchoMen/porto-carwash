'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

type Cliente = { id: string; nombre: string; placa: string; whatsapp: string }
type Vehiculo = { id: string; cliente_id: string; placa: string; lavadas_ciclo: number; lavadas_total: number; gratis_disponibles: number }
type Lavada = { id: string; created_at: string; fue_gratis: boolean; empleados: { nombre: string } }

export default function ClientePage() {
  const router = useRouter()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [vehiculoActual, setVehiculoActual] = useState<Vehiculo | null>(null)
  const [historial, setHistorial] = useState<Lavada[]>([])
  const [codigo, setCodigo] = useState(['', '', '', ''])
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null)
  const [registrando, setRegistrando] = useState(false)
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<'lista' | 'tarjeta' | 'nuevo'>('lista')
  const [nuevaPlaca, setNuevaPlaca] = useState('')
  const [agregando, setAgregando] = useState(false)
  const [msgNuevo, setMsgNuevo] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null)

  useEffect(() => {
    const sesion = localStorage.getItem('porto_session')
    if (!sesion) { router.push('/'); return }
    const { id, tipo } = JSON.parse(sesion)
    if (tipo !== 'cliente') { router.push('/'); return }
    cargarCliente(id)
  }, [])

  async function cargarCliente(id: string) {
    const { data: cli } = await supabase.from('clientes').select('*').eq('id', id).single()
    if (!cli) { router.push('/'); return }
    setCliente(cli)
    const { data: vehs } = await supabase.from('vehiculos').select('*').eq('cliente_id', id).order('created_at', { ascending: true })
    setVehiculos(vehs || [])
    setLoading(false)
  }

  async function abrirVehiculo(veh: Vehiculo) {
    setVehiculoActual(veh)
    setCodigo(['', '', '', ''])
    setMsg(null)
    const { data } = await supabase.from('lavadas').select('id,created_at,fue_gratis,empleados(nombre)').eq('cliente_id', cliente!.id).eq('placa', veh.placa).order('created_at', { ascending: false }).limit(8)
    setHistorial((data as any) || [])
    setVista('tarjeta')
  }

  async function agregarVehiculo() {
    if (!nuevaPlaca.trim()) { setMsgNuevo({ tipo: 'err', texto: 'Ingresa la placa' }); return }
    setAgregando(true); setMsgNuevo(null)
    const placaUp = nuevaPlaca.trim().toUpperCase()
    const { data: existe } = await supabase.from('vehiculos').select('id').eq('placa', placaUp).single()
    if (existe) { setMsgNuevo({ tipo: 'err', texto: 'Esta placa ya está registrada en el sistema.' }); setAgregando(false); return }
    const { data, error } = await supabase.from('vehiculos').insert({ cliente_id: cliente!.id, placa: placaUp }).select().single()
    if (error) { setMsgNuevo({ tipo: 'err', texto: 'Error al agregar vehículo.' }); setAgregando(false); return }
    setVehiculos(prev => [...prev, data])
    setNuevaPlaca('')
    setMsgNuevo({ tipo: 'ok', texto: '✓ Vehículo agregado correctamente' })
    setTimeout(() => { setVista('lista'); setMsgNuevo(null) }, 1200)
    setAgregando(false)
  }

  async function validarCodigo() {
    const code = codigo.join('')
    if (code.length < 4) { setMsg({ tipo: 'err', texto: 'Ingresa el código completo' }); return }
    if (!cliente || !vehiculoActual) return
    setRegistrando(true); setMsg(null)
    const res = await fetch('/api/validar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: code, cliente_id: cliente.id }) })
    const data = await res.json()
    if (!data.ok) { setMsg({ tipo: 'err', texto: data.error }) }
    else {
      setMsg({ tipo: 'ok', texto: '✓ ¡Lavada registrada!' })
      setCodigo(['', '', '', ''])
      const { data: updVeh } = await supabase.from('vehiculos').select('*').eq('id', vehiculoActual.id).single()
      if (updVeh) {
        setVehiculoActual(updVeh)
        setVehiculos(prev => prev.map(v => v.id === updVeh.id ? updVeh : v))
      }
      const { data: lavs } = await supabase.from('lavadas').select('id,created_at,fue_gratis,empleados(nombre)').eq('cliente_id', cliente.id).eq('placa', vehiculoActual.placa).order('created_at', { ascending: false }).limit(8)
      setHistorial((lavs as any) || [])
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

  // ===== VISTA: AGREGAR VEHÍCULO =====
  if (vista === 'nuevo') return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: '#141414', borderBottom: '1px solid #1e1e1e', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => setVista('lista')} style={{ background: 'none', border: 'none', color: '#a0a0a0', cursor: 'pointer', fontSize: 20 }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Agregar vehículo</span>
      </div>
      <div style={{ padding: 20 }}>
        <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 16, padding: 20 }}>
          <div style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>Ingresa la placa del nuevo vehículo a registrar a tu nombre.</div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 6 }}>Placa del vehículo</label>
            <input
              style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '12px 14px', fontSize: 16, color: '#fff', width: '100%', outline: 'none', textTransform: 'uppercase', letterSpacing: 2, fontFamily: 'monospace', fontWeight: 700 }}
              placeholder="Ej: PCB-5678"
              value={nuevaPlaca}
              onChange={e => setNuevaPlaca(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && agregarVehiculo()}
            />
          </div>
          {msgNuevo && <p style={{ fontSize: 13, color: msgNuevo.tipo === 'ok' ? '#00A651' : '#E8002A', marginBottom: 12, textAlign: 'center' }}>{msgNuevo.texto}</p>}
          <button onClick={agregarVehiculo} disabled={agregando} style={{ width: '100%', background: '#00A651', color: '#fff', border: 'none', padding: '14px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: agregando ? 0.7 : 1 }}>
            {agregando ? 'Agregando...' : 'Agregar vehículo →'}
          </button>
        </div>
      </div>
    </div>
  )

  // ===== VISTA: TARJETA DE UN VEHÍCULO =====
  if (vista === 'tarjeta' && vehiculoActual) {
    const ciclo = vehiculoActual.lavadas_ciclo
    return (
      <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: 'system-ui,sans-serif' }}>
        <div style={{ background: 'linear-gradient(135deg,#003d20 0%,#00A651 100%)', padding: '28px 20px 24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, border: '2px solid rgba(255,255,255,0.08)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', right: 20, bottom: -30, width: 90, height: 90, border: '2px solid rgba(255,255,255,0.06)', borderRadius: '50%' }} />
          <button onClick={() => setVista('lista')} style={{ background: 'rgba(0,0,0,0.2)', border: 'none', color: '#fff', borderRadius: 99, padding: '6px 14px', fontSize: 12, cursor: 'pointer', marginBottom: 16 }}>← Mis vehículos</button>
          <div style={{ position: 'absolute', right: 20, top: 60 }}>
            <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1, color: '#fff', textAlign: 'right' }}>{ciclo}</div>
            <div style={{ fontSize: 12, opacity: 0.6, textAlign: 'right', marginTop: 2 }}>/ 10</div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 12 }}>⭐ CLIENTE FIEL</div>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{cliente?.nombre}</div>
          <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, background: 'rgba(0,0,0,0.2)', display: 'inline-block', padding: '3px 10px', borderRadius: 6 }}>{vehiculoActual.placa}</div>
          <div style={{ marginTop: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 99, height: 4 }}>
            <div style={{ height: '100%', background: 'rgba(255,255,255,0.8)', borderRadius: 99, width: `${ciclo * 10}%`, transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, opacity: 0.55 }}>
            <span>0 lavadas</span>
            <span style={{ color: ciclo >= 8 ? '#ffeb3b' : 'inherit' }}>{10 - ciclo} para tu lavada gratis 🎁</span>
          </div>
        </div>

        <div style={{ background: '#141414', padding: '18px 20px', borderBottom: '1px solid #1e1e1e' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: i < ciclo ? 13 : 16, fontWeight: 700, border: `1.5px solid ${i < ciclo ? '#00A651' : i === 9 ? '#E8002A' : '#2a2a2a'}`, background: i < ciclo ? '#00A651' : i === 9 ? 'rgba(232,0,42,0.08)' : '#1a1a1a', color: i < ciclo ? '#fff' : i === 9 ? '#E8002A' : '#333', transition: 'all 0.3s' }}>
                {i < ciclo ? '✓' : i === 9 ? '🎁' : '·'}
              </div>
            ))}
          </div>
          {vehiculoActual.gratis_disponibles > 0 && (
            <div style={{ marginTop: 14, background: 'rgba(0,166,81,0.12)', border: '1px solid rgba(0,166,81,0.25)', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 20 }}>🎉</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#00A651' }}>¡Tienes {vehiculoActual.gratis_disponibles} lavada(s) gratis!</div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Dile a la empleada para aplicarla.</div>
              </div>
            </div>
          )}
          {ciclo >= 8 && vehiculoActual.gratis_disponibles === 0 && (
            <div style={{ marginTop: 14, background: 'rgba(255,235,59,0.08)', border: '1px solid rgba(255,235,59,0.2)', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 20 }}>⭐</span>
              <div style={{ fontSize: 13, color: '#ffeb3b' }}>¡Solo te faltan {10 - ciclo} lavadas para la gratis!</div>
            </div>
          )}
        </div>

        <div style={{ padding: 16 }}>
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
              {msg && <div style={{ textAlign: 'center', fontSize: 13, color: msg.tipo === 'ok' ? '#00A651' : '#E8002A', marginBottom: 12, fontWeight: 500 }}>{msg.texto}</div>}
              <button onClick={validarCodigo} disabled={registrando} style={{ width: '100%', background: '#00A651', color: '#fff', border: 'none', padding: '13px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: registrando ? 'not-allowed' : 'pointer', opacity: registrando ? 0.7 : 1 }}>
                {registrando ? 'Validando...' : 'Registrar lavada →'}
              </button>
            </div>
          </div>

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
                    : <span style={{ fontSize: 11, background: 'rgba(0,166,81,0.12)', color: '#00A651', border: '1px solid rgba(0,166,81,0.25)', padding: '3px 8px', borderRadius: 99 }}>✓</span>}
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 11, color: '#333' }}>PORTO CAR WASH · <span style={{ color: '#00A651' }}>Portoviejo</span></div>
            <button onClick={logout} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: 12 }}>Salir</button>
          </div>
        </div>
      </div>
    )
  }

  // ===== VISTA: LISTA DE VEHÍCULOS =====
  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#fff', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ background: 'linear-gradient(135deg,#003d20 0%,#00A651 100%)', padding: '28px 20px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, border: '2px solid rgba(255,255,255,0.08)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', right: 20, top: 20, width: 48, height: 40, opacity: 0.25 }}>
          <Image src="/logo.png" alt="Porto" fill style={{ objectFit: 'contain', mixBlendMode: 'lighten' }} />
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 600, letterSpacing: 1, marginBottom: 14 }}>⭐ CLIENTE FIEL</div>
        <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Hola, {cliente?.nombre?.split(' ')[0]} 👋</div>
        <div style={{ fontSize: 12, opacity: 0.65 }}>{vehiculos.length} vehículo{vehiculos.length !== 1 ? 's' : ''} registrado{vehiculos.length !== 1 ? 's' : ''}</div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 11, color: '#555', letterSpacing: 1, textTransform: 'uppercase' }}>Selecciona un vehículo</div>

        {vehiculos.length === 0 && (
          <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 16, padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🚗</div>
            <div style={{ fontSize: 14, color: '#666' }}>No tienes vehículos registrados aún.</div>
          </div>
        )}

        {vehiculos.map(veh => (
          <button key={veh.id} onClick={() => abrirVehiculo(veh)} style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 16, padding: 16, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#00A651', fontFamily: 'monospace', letterSpacing: 2 }}>{veh.placa}</div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>{veh.lavadas_total} lavadas en total</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#fff' }}>{veh.lavadas_ciclo % 10}<span style={{ fontSize: 13, color: '#555', fontWeight: 400 }}>/10</span></div>
                {veh.gratis_disponibles > 0 && <div style={{ fontSize: 11, color: '#E8002A', fontWeight: 700 }}>🎁 Gratis disponible</div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} style={{ flex: 1, height: 5, borderRadius: 99, background: i < veh.lavadas_ciclo % 10 ? '#00A651' : i === 9 ? 'rgba(232,0,42,0.3)' : '#1e1e1e' }} />
              ))}
            </div>
          </button>
        ))}

        <button onClick={() => { setVista('nuevo'); setMsgNuevo(null); setNuevaPlaca('') }} style={{ background: 'transparent', border: '1.5px dashed #2a2a2a', borderRadius: 16, padding: 16, cursor: 'pointer', color: '#555', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>+</span> Agregar otro vehículo
        </button>

        <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, color: '#333' }}>PORTO CAR WASH · <span style={{ color: '#00A651' }}>Portoviejo</span></div>
          <button onClick={logout} style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: 12 }}>Salir</button>
        </div>
      </div>
    </div>
  )
}