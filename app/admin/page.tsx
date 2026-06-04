'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Tab = 'resumen' | 'clientes' | 'log' | 'empleados'
type Cliente = { id: string; nombre: string; placa: string; whatsapp: string; lavadas_ciclo: number; lavadas_total: number; gratis_disponibles: number; created_at: string }
type Lavada = { id: string; created_at: string; fue_gratis: boolean; placa: string; clientes: { nombre: string }; empleados: { nombre: string } }
type Empleado = { id: string; nombre: string; rol: string; activo: boolean; created_at: string }

const inp = { background: '#0a0a0a', border: '1px solid #2a2a2a', borderRadius: 10, padding: '12px 14px', fontSize: 14, color: '#fff', width: '100%', outline: 'none' } as React.CSSProperties

export default function AdminPage() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [tab, setTab] = useState<Tab>('resumen')
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [lavadas, setLavadas] = useState<Lavada[]>([])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [stats, setStats] = useState({ totalClientes: 0, lavasHoy: 0, totalLavadas: 0, gratisUsadas: 0 })
  const [codigoActivo, setCodigoActivo] = useState<string | null>(null)
  const [timerSeg, setTimerSeg] = useState(0)
  const [placaCodigo, setPlacaCodigo] = useState('')
  const [clienteCodigo, setClienteCodigo] = useState<Cliente | null>(null)
  const [buscarError, setBuscarError] = useState('')
  const [waStatus, setWaStatus] = useState('')

  useEffect(() => {
    const sesion = localStorage.getItem('porto_session')
    if (!sesion) { router.push('/'); return }
    const parsed = JSON.parse(sesion)
    if (parsed.tipo !== 'admin') { router.push('/'); return }
    setSession(parsed)
    cargarTodo()
  }, [])

  async function cargarTodo() {
    const [{ data: cls }, { data: lavs }, { data: emps }] = await Promise.all([
      supabase.from('clientes').select('*').order('created_at', { ascending: false }),
      supabase.from('lavadas').select('id,created_at,fue_gratis,placa,clientes(nombre),empleados(nombre)').order('created_at', { ascending: false }).limit(50),
      supabase.from('empleados').select('*').order('created_at', { ascending: false }),
    ])
    setClientes((cls as Cliente[]) || [])
    setLavadas((lavs as any) || [])
    setEmpleados((emps as Empleado[]) || [])
    const hoy = new Date().toDateString()
    setStats({ totalClientes: cls?.length || 0, lavasHoy: lavs?.filter(l => new Date(l.created_at).toDateString() === hoy).length || 0, totalLavadas: lavs?.length || 0, gratisUsadas: lavs?.filter(l => l.fue_gratis).length || 0 })
  }

  async function buscarClienteCodigo() {
    if (!placaCodigo.trim()) return
    setBuscarError(''); setClienteCodigo(null)
    const { data } = await supabase.from('clientes').select('*').eq('placa', placaCodigo.trim().toUpperCase()).single()
    if (!data) setBuscarError('Placa no encontrada')
    else setClienteCodigo(data)
  }

  async function generarCodigoAdmin(enviarWA: boolean) {
    if (!clienteCodigo || !session) return
    setWaStatus('')
    const res = await fetch('/api/codigos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cliente_id: clienteCodigo.id, placa: clienteCodigo.placa, empleado_id: session.id }) })
    const data = await res.json()
    if (!data.ok) { setWaStatus('❌ ' + data.error); return }
    setCodigoActivo(data.codigo); iniciarTimer(600)
    if (enviarWA) {
      const waRes = await fetch('/api/whatsapp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ whatsapp: clienteCodigo.whatsapp, codigo: data.codigo, nombre: clienteCodigo.nombre, placa: clienteCodigo.placa }) })
      const waData = await waRes.json()
      setWaStatus(waData.ok ? '✅ WA enviado' : '⚠️ No se pudo enviar WA')
    }
  }

  function iniciarTimer(s: number) {
    setTimerSeg(s)
    const t = setInterval(() => setTimerSeg(p => { if (p <= 1) { clearInterval(t); setCodigoActivo(null); return 0 } return p - 1 }), 1000)
  }

  function logout() { localStorage.removeItem('porto_session'); router.push('/') }

  if (!session) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a', color: '#a0a0a0' }}>Cargando...</div>

  const min = Math.floor(timerSeg / 60), seg = timerSeg % 60
  const gratisClientes = clientes.filter(c => c.gratis_disponibles > 0)
  const proximosGratis = clientes.filter(c => c.lavadas_ciclo % 10 >= 8 && c.gratis_disponibles === 0)
  const lavasHoy = lavadas.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString())

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#141414', borderBottom: '1px solid #1e1e1e', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>Panel admin</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 99, background: '#E8002A20', color: '#E8002A', border: '1px solid #E8002A40' }}>👑 Jefa</span>
          <button onClick={logout} style={{ background: 'none', border: 'none', color: '#a0a0a0', cursor: 'pointer', fontSize: 13 }}>Salir</button>
        </div>
      </div>

      <div style={{ display: 'flex', background: '#141414', borderBottom: '1px solid #1e1e1e', position: 'sticky', top: 52, zIndex: 9 }}>
        {(['resumen', 'clientes', 'log', 'empleados'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '11px 2px', fontSize: 11, fontWeight: 600, textAlign: 'center', cursor: 'pointer', border: 'none', background: 'none', borderBottom: tab === t ? '2px solid #00A651' : '2px solid transparent', color: tab === t ? '#00A651' : '#a0a0a0' }}>
            {t === 'resumen' ? '📊' : t === 'clientes' ? '👥' : t === 'log' ? '📋' : '👔'}<br />{t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'resumen' && (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[{ icon: '👥', v: stats.totalClientes, l: 'Clientes' }, { icon: '🚗', v: stats.lavasHoy, l: 'Lavadas hoy' }, { icon: '📊', v: stats.totalLavadas, l: 'Total lavadas' }, { icon: '🎁', v: stats.gratisUsadas, l: 'Gratis dadas' }].map(s => (
              <div key={s.l} style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 14, padding: 16 }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>{s.v}</div>
                <div style={{ fontSize: 11, color: '#a0a0a0', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.l}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#a0a0a0', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14 }}>Registrar lavada</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input style={{ ...inp, flex: 1, textTransform: 'uppercase' }} placeholder="Placa" value={placaCodigo} onChange={e => setPlacaCodigo(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && buscarClienteCodigo()} />
              <button onClick={buscarClienteCodigo} style={{ background: '#00A651', border: 'none', color: '#fff', padding: '0 16px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Buscar</button>
            </div>
            {buscarError && <p style={{ fontSize: 13, color: '#E8002A', marginBottom: 8 }}>{buscarError}</p>}
            {clienteCodigo && !codigoActivo && (
              <div>
                <div style={{ background: '#0a0a0a', border: '1px solid #00A65120', borderRadius: 12, padding: 12, marginBottom: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{clienteCodigo.nombre}</div>
                  <div style={{ fontSize: 12, color: '#00A651', fontFamily: 'monospace' }}>{clienteCodigo.placa} · {clienteCodigo.lavadas_ciclo % 10}/10</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => generarCodigoAdmin(false)} style={{ flex: 1, background: '#00A651', color: '#fff', border: 'none', padding: '11px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>📋 En pantalla</button>
                  <button onClick={() => generarCodigoAdmin(true)} style={{ flex: 1, background: 'transparent', color: '#00A651', border: '1px solid #00A65140', padding: '11px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>📲 Por WA</button>
                </div>
              </div>
            )}
            {codigoActivo && (
              <div style={{ background: '#0a0a0a', border: '1px solid #00A65130', borderRadius: 14, padding: 20, textAlign: 'center', marginTop: 8 }}>
                <div style={{ fontSize: 48, fontWeight: 900, color: '#00A651', letterSpacing: 16, fontFamily: 'monospace' }}>{codigoActivo}</div>
                <div style={{ fontSize: 12, color: '#a0a0a0', marginTop: 6 }}>Expira en {min}:{seg < 10 ? '0' : ''}{seg}</div>
                {waStatus && <p style={{ fontSize: 13, color: '#00A651', marginTop: 8 }}>{waStatus}</p>}
              </div>
            )}
          </div>

          {gratisClientes.length > 0 && (
            <div style={{ background: '#E8002A10', border: '1px solid #E8002A30', borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#E8002A', marginBottom: 10 }}>🎁 Lavadas gratis disponibles</div>
              {gratisClientes.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #E8002A15' }}>
                  <div><div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{c.nombre}</div><div style={{ fontSize: 12, color: '#a0a0a0', fontFamily: 'monospace' }}>{c.placa}</div></div>
                  <span style={{ fontSize: 11, background: '#E8002A20', color: '#E8002A', border: '1px solid #E8002A40', padding: '4px 10px', borderRadius: 99, fontWeight: 600 }}>{c.gratis_disponibles} gratis</span>
                </div>
              ))}
            </div>
          )}

          {proximosGratis.length > 0 && (
            <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 16, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 10 }}>⭐ Próximos a lavada gratis</div>
              {proximosGratis.map(c => (
                <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1e1e1e' }}>
                  <div><div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{c.nombre}</div><div style={{ fontSize: 12, color: '#a0a0a0', fontFamily: 'monospace' }}>{c.placa}</div></div>
                  <span style={{ fontSize: 12, color: '#00A651', fontWeight: 700 }}>{c.lavadas_ciclo % 10}/10</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#a0a0a0', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14 }}>🏆 Top clientes</div>
            {[...clientes].sort((a, b) => b.lavadas_total - a.lavadas_total).slice(0, 5).map((c, i) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #1e1e1e' }}>
                <span style={{ fontSize: 20 }}>{['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i]}</span>
                <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{c.nombre}</div><div style={{ fontSize: 12, color: '#a0a0a0', fontFamily: 'monospace' }}>{c.placa}</div></div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#00A651' }}>{c.lavadas_total}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'clientes' && (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {clientes.map(c => (
            <div key={c.id} style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 16, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div><div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{c.nombre}</div><div style={{ fontSize: 12, color: '#00A651', fontFamily: 'monospace', fontWeight: 700, marginTop: 2 }}>{c.placa}</div><div style={{ fontSize: 11, color: '#a0a0a0', marginTop: 2 }}>WA: {c.whatsapp}</div></div>
                <div style={{ textAlign: 'right' }}><div style={{ fontSize: 22, fontWeight: 900, color: '#00A651' }}>{c.lavadas_ciclo % 10}/10</div><div style={{ fontSize: 11, color: '#a0a0a0' }}>{c.lavadas_total} total</div>{c.gratis_disponibles > 0 && <div style={{ fontSize: 11, color: '#E8002A', fontWeight: 700 }}>🎁 GRATIS</div>}</div>
              </div>
              <div style={{ display: 'flex', gap: 3 }}>
                {Array.from({ length: 10 }, (_, i) => <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i < c.lavadas_ciclo % 10 ? '#00A651' : '#1e1e1e' }} />)}
              </div>
            </div>
          ))}
          {clientes.length === 0 && <p style={{ textAlign: 'center', color: '#a0a0a0', padding: '32px 0' }}>No hay clientes</p>}
        </div>
      )}

      {tab === 'log' && (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#a0a0a0', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14 }}>Lavadas de hoy ({lavasHoy.length})</div>
            {lavasHoy.length === 0 ? <p style={{ fontSize: 13, color: '#a0a0a0' }}>Sin lavadas hoy</p> : lavasHoy.map(l => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #1e1e1e' }}>
                <div><div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{(l.clientes as any)?.nombre}</div><div style={{ fontSize: 12, color: '#a0a0a0', fontFamily: 'monospace' }}>{l.placa} · {new Date(l.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</div></div>
                <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, background: '#00A65115', color: '#00A651', border: '1px solid #00A65130', padding: '2px 8px', borderRadius: 99 }}>{(l.empleados as any)?.nombre}</div>{l.fue_gratis && <div style={{ fontSize: 11, color: '#E8002A', marginTop: 4 }}>Gratis 🎁</div>}</div>
              </div>
            ))}
          </div>
          <div style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 16, padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#a0a0a0', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14 }}>Historial completo</div>
            {lavadas.slice(0, 20).map(l => (
              <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #1e1e1e' }}>
                <div><div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{(l.clientes as any)?.nombre}</div><div style={{ fontSize: 12, color: '#a0a0a0', fontFamily: 'monospace' }}>{l.placa}</div></div>
                <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: '#a0a0a0' }}>{new Date(l.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div><div style={{ fontSize: 11, background: '#00A65115', color: '#00A651', border: '1px solid #00A65130', padding: '2px 8px', borderRadius: 99, marginTop: 4, display: 'inline-block' }}>{(l.empleados as any)?.nombre}</div></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'empleados' && (
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: '#E8002A10', border: '1px solid #E8002A30', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10 }}>
            <span>ℹ️</span>
            <p style={{ fontSize: 13, color: '#E8002A', lineHeight: 1.5 }}>Para cambiar contraseñas usa el SQL Editor en Supabase.</p>
          </div>
          {empleados.map(e => (
            <div key={e.id} style={{ background: '#141414', border: '1px solid #1e1e1e', borderRadius: 14, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div><div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{e.nombre}</div><div style={{ fontSize: 12, color: '#a0a0a0', marginTop: 2 }}>{new Date(e.created_at).toLocaleDateString('es-EC')}</div></div>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, fontWeight: 600, background: e.rol === 'admin' ? '#E8002A20' : '#00A65120', color: e.rol === 'admin' ? '#E8002A' : '#00A651', border: `1px solid ${e.rol === 'admin' ? '#E8002A40' : '#00A65140'}` }}>{e.rol}</span>
                <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, fontWeight: 600, background: e.activo ? '#00A65115' : '#1e1e1e', color: e.activo ? '#00A651' : '#a0a0a0', border: '1px solid #2a2a2a' }}>{e.activo ? 'Activo' : 'Inactivo'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
