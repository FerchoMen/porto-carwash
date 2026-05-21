'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import Image from 'next/image'

type Cliente = {
  id: string; nombre: string; placa: string; whatsapp: string
  lavadas_ciclo: number; lavadas_total: number; gratis_disponibles: number
}
type Lavada = { id: string; created_at: string; fue_gratis: boolean; empleados: { nombre: string } }

const S = {
  screen: { minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column' as const },
  header: { background: '#141414', borderBottom: '1px solid #1e1e1e', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky' as const, top: 0, zIndex: 10 },
  backBtn: { background: 'none', border: 'none', color: '#a0a0a0', cursor: 'pointer', fontSize: 20, padding: '4px 8px', borderRadius: 8 },
  content: { padding: 16, display: 'flex', flexDirection: 'column' as const, gap: 14, flex: 1 },
  card: { background: '#141414', border: '1px solid #1e1e1e', borderRadius: 16, padding: 18 },
  label: { fontSize: 12, color: '#a0a0a0', fontWeight: 500, marginBottom: 6, display: 'block' as const },
  input: { background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#fff', width: '100%' },
  btnPrimary: { width: '100%', background: '#00A651', color: '#fff', border: 'none', padding: '14px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  btnSecondary: { width: '100%', background: 'transparent', color: '#00A651', border: '1px solid #00A65140', padding: '13px', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 4 },
  tab: (active: boolean) => ({ flex: 1, padding: '12px 4px', fontSize: 13, fontWeight: 600, textAlign: 'center' as const, cursor: 'pointer', border: 'none', background: 'none', borderBottom: active ? '2px solid #00A651' : '2px solid transparent', color: active ? '#00A651' : '#a0a0a0' }),
}

export default function ClientePage() {
  const [tab, setTab] = useState<'registro' | 'misVehiculos'>('registro')
  const [nombre, setNombre] = useState('')
  const [placa, setPlaca] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [waBuscar, setWaBuscar] = useState('')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [clienteActual, setClienteActual] = useState<Cliente | null>(null)
  const [historial, setHistorial] = useState<Lavada[]>([])
  const [vista, setVista] = useState<'form' | 'lista' | 'tarjeta'>('form')
  const [codigo, setCodigo] = useState(['', '', '', ''])
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [registrando, setRegistrando] = useState(false)

  async function registrar() {
    if (!nombre.trim() || !placa.trim() || !whatsapp.trim()) { setMsg({ tipo: 'err', texto: 'Completa todos los campos' }); return }
    setLoading(true); setMsg(null)
    const placaUp = placa.trim().toUpperCase()
    const { data: existing } = await supabase.from('clientes').select('*').eq('placa', placaUp).single()
    if (existing) {
      setMsg({ tipo: 'err', texto: '¡Esta placa ya está registrada! Búscala en "Mis vehículos".' })
      setTimeout(() => { setTab('misVehiculos'); setMsg(null) }, 2000)
      setLoading(false); return
    }
    const { data: nuevo, error } = await supabase.from('clientes').insert({ nombre: nombre.trim(), placa: placaUp, whatsapp: whatsapp.trim() }).select().single()
    if (error) { setMsg({ tipo: 'err', texto: 'Error al registrar. Intenta de nuevo.' }); setLoading(false); return }
    setMsg({ tipo: 'ok', texto: '✓ ¡Vehículo registrado exitosamente!' })
    setTimeout(() => { setClienteActual(nuevo); cargarHistorial(nuevo.id); setVista('tarjeta'); setMsg(null) }, 1200)
    setLoading(false)
  }

  async function buscarVehiculos() {
    if (!waBuscar.trim()) { setMsg({ tipo: 'err', texto: 'Ingresa tu WhatsApp' }); return }
    setLoading(true); setMsg(null)
    const { data } = await supabase.from('clientes').select('*').eq('whatsapp', waBuscar.trim())
    if (!data || data.length === 0) { setMsg({ tipo: 'err', texto: 'No encontramos vehículos con ese WhatsApp.' }); setLoading(false); return }
    setClientes(data); setVista('lista'); setLoading(false)
  }

  async function cargarHistorial(clienteId: string) {
    const { data } = await supabase.from('lavadas').select('id, created_at, fue_gratis, empleados(nombre)').eq('cliente_id', clienteId).order('created_at', { ascending: false }).limit(8)
    setHistorial((data as any) || [])
  }

  async function abrirTarjeta(cli: Cliente) {
    setClienteActual(cli); await cargarHistorial(cli.id); setVista('tarjeta')
  }

  async function validarCodigo() {
    const code = codigo.join('')
    if (code.length < 4) { setMsg({ tipo: 'err', texto: 'Ingresa el código completo' }); return }
    if (!clienteActual) return
    setRegistrando(true); setMsg(null)
    const res = await fetch('/api/validar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo: code, cliente_id: clienteActual.id }) })
    const data = await res.json()
    if (!data.ok) { setMsg({ tipo: 'err', texto: data.error }) }
    else {
      setMsg({ tipo: 'ok', texto: '✓ ¡Lavada registrada! Tus puntos se actualizaron.' })
      setCodigo(['', '', '', ''])
      const { data: updated } = await supabase.from('clientes').select('*').eq('id', clienteActual.id).single()
      if (updated) setClienteActual(updated)
      await cargarHistorial(clienteActual.id)
    }
    setRegistrando(false)
  }

  function handleCodigo(val: string, idx: number) {
    const v = val.replace(/\D/g, '').slice(-1)
    const next = [...codigo]; next[idx] = v; setCodigo(next)
    if (v && idx < 3) (document.getElementById(`cod-${idx + 1}`) as HTMLInputElement)?.focus()
  }

  const ciclo = clienteActual?.lavadas_ciclo ?? 0

  if (vista === 'tarjeta' && clienteActual) return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => setVista(clientes.length > 0 ? 'lista' : 'form')}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Mi tarjeta fiel</span>
      </div>
      <div style={S.content}>
        {/* Tarjeta */}
        <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 20, padding: 20, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, background: '#00A65108', borderRadius: '50%' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: '#a0a0a0', marginBottom: 4, letterSpacing: 1 }}>CLIENTE FIEL</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: '#fff' }}>{clienteActual.nombre}</div>
            </div>
            <div style={{ background: '#0a0a0a', border: '1px solid #2a2a2a', padding: '6px 12px', borderRadius: 8, fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#00A651' }}>{clienteActual.placa}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, color: '#a0a0a0' }}>Progreso hacia lavada gratis</span>
            <span style={{ fontSize: 12, color: '#00A651', fontWeight: 700 }}>{ciclo}/10</span>
          </div>
          <div style={{ background: '#0a0a0a', borderRadius: 99, height: 6, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ height: '100%', background: '#00A651', borderRadius: 99, width: `${ciclo * 10}%`, transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: i < ciclo ? 14 : 18, border: `1.5px solid ${i < ciclo ? '#00A651' : i === 9 ? '#E8002A' : '#2a2a2a'}`, background: i < ciclo ? '#00A651' : i === 9 ? '#E8002A15' : '#0a0a0a', color: i < ciclo ? '#fff' : i === 9 ? '#E8002A' : '#333' }}>
                {i < ciclo ? '✓' : i === 9 ? '🎁' : '·'}
              </div>
            ))}
          </div>
          {clienteActual.gratis_disponibles > 0 && (
            <div style={{ marginTop: 14, background: '#00A65112', border: '1px solid #00A65130', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10 }}>
              <span>🎉</span>
              <p style={{ fontSize: 13, color: '#00A651' }}>¡Tienes <strong>{clienteActual.gratis_disponibles} lavada(s) gratis</strong>! Dile a la empleada.</p>
            </div>
          )}
          {ciclo >= 8 && clienteActual.gratis_disponibles === 0 && (
            <div style={{ marginTop: 14, background: '#E8002A10', border: '1px solid #E8002A30', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10 }}>
              <span>⭐</span>
              <p style={{ fontSize: 13, color: '#E8002A' }}>¡Te faltan {10 - ciclo} para tu lavada gratis!</p>
            </div>
          )}
        </div>

        {/* Código */}
        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#a0a0a0', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14 }}>Registrar lavada</div>
          <div style={{ background: '#0a0a0a', border: '1px solid #00A65130', borderRadius: 14, padding: 18, textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#a0a0a0', letterSpacing: 2, marginBottom: 12, textTransform: 'uppercase' }}>Código del empleado</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
              {[0, 1, 2, 3].map(i => (
                <input key={i} id={`cod-${i}`} type="number" inputMode="numeric" maxLength={1}
                  style={{ width: 56, height: 68, textAlign: 'center', fontSize: 28, fontWeight: 800, background: '#141414', border: '1.5px solid #2a2a2a', borderRadius: 12, color: '#fff', fontFamily: 'monospace' }}
                  value={codigo[i]} onChange={e => handleCodigo(e.target.value, i)} />
              ))}
            </div>
            {msg && <p style={{ fontSize: 13, color: msg.tipo === 'ok' ? '#00A651' : '#E8002A', marginBottom: 10 }}>{msg.texto}</p>}
            <button style={S.btnPrimary} onClick={validarCodigo} disabled={registrando}>
              {registrando ? 'Validando...' : 'Registrar lavada'}
            </button>
          </div>
        </div>

        {/* Historial */}
        {historial.length > 0 && (
          <div style={S.card}>
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
        <button style={S.btnSecondary} onClick={() => { setVista(clientes.length > 0 ? 'lista' : 'form'); setClienteActual(null) }}>← Volver</button>
      </div>
    </div>
  )

  if (vista === 'lista') return (
    <div style={S.screen}>
      <div style={S.header}>
        <button style={S.backBtn} onClick={() => setVista('form')}>←</button>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Mis vehículos</span>
      </div>
      <div style={S.content}>
        <div style={{ fontSize: 13, color: '#a0a0a0' }}>Selecciona un vehículo para ver tu tarjeta</div>
        {clientes.map(cli => (
          <button key={cli.id} onClick={() => abrirTarjeta(cli)} style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 16, padding: 16, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{cli.nombre}</div>
                <div style={{ fontSize: 13, color: '#00A651', fontFamily: 'monospace', fontWeight: 700, marginTop: 2 }}>{cli.placa}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#00A651' }}>{cli.lavadas_ciclo % 10}/10</div>
                {cli.gratis_disponibles > 0 && <div style={{ fontSize: 11, color: '#E8002A', fontWeight: 700 }}>🎁 GRATIS</div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: 10 }, (_, i) => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i < cli.lavadas_ciclo % 10 ? '#00A651' : '#1e1e1e' }} />
              ))}
            </div>
          </button>
        ))}
        <button style={S.btnSecondary} onClick={() => setVista('form')}>← Volver</button>
      </div>
    </div>
  )

  return (
    <div style={S.screen}>
      <div style={S.header}>
        <Link href="/" style={{ textDecoration: 'none' }}><button style={S.backBtn}>←</button></Link>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Mi tarjeta fiel</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', background: '#141414', borderBottom: '1px solid #1e1e1e' }}>
        <button style={S.tab(tab === 'registro')} onClick={() => { setTab('registro'); setMsg(null) }}>🚗 Nuevo vehículo</button>
        <button style={S.tab(tab === 'misVehiculos')} onClick={() => { setTab('misVehiculos'); setMsg(null) }}>📋 Mis vehículos</button>
      </div>

      <div style={S.content}>
        {tab === 'registro' && (
          <>
            <div style={S.card}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#a0a0a0', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14 }}>Registrar nuevo vehículo</div>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Nombre completo</label>
                <input style={S.input} placeholder="Ej: María García" value={nombre} onChange={e => setNombre(e.target.value)} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={S.label}>Placa del vehículo</label>
                <input style={{ ...S.input, textTransform: 'uppercase' }} placeholder="Ej: PCA-1234" value={placa} onChange={e => setPlaca(e.target.value.toUpperCase())} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>WhatsApp</label>
                <input style={S.input} type="tel" placeholder="Ej: 0991234567" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} />
              </div>
              {msg && <p style={{ fontSize: 13, color: msg.tipo === 'ok' ? '#00A651' : '#E8002A', marginBottom: 12, textAlign: 'center' }}>{msg.texto}</p>}
              <button style={S.btnPrimary} onClick={registrar} disabled={loading}>{loading ? 'Registrando...' : 'Registrar vehículo →'}</button>
            </div>
            <div style={{ background: '#E8002A10', border: '1px solid #E8002A30', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10 }}>
              <span>🔒</span>
              <p style={{ fontSize: 13, color: '#E8002A', lineHeight: 1.5 }}>El empleado registra tu lavada con un código seguro de 4 dígitos.</p>
            </div>
          </>
        )}

        {tab === 'misVehiculos' && (
          <>
            <div style={S.card}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#a0a0a0', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14 }}>Buscar mis vehículos</div>
              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>Tu número de WhatsApp</label>
                <input style={S.input} type="tel" placeholder="Ej: 0991234567" value={waBuscar} onChange={e => setWaBuscar(e.target.value)} />
              </div>
              {msg && <p style={{ fontSize: 13, color: msg.tipo === 'ok' ? '#00A651' : '#E8002A', marginBottom: 12, textAlign: 'center' }}>{msg.texto}</p>}
              <button style={S.btnPrimary} onClick={buscarVehiculos} disabled={loading}>{loading ? 'Buscando...' : 'Buscar mis vehículos →'}</button>
            </div>
            <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10 }}>
              <span>💡</span>
              <p style={{ fontSize: 13, color: '#a0a0a0', lineHeight: 1.5 }}>Usa el mismo WhatsApp con el que te registraste para ver todos tus vehículos.</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
