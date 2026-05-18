'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Tab = 'resumen' | 'clientes' | 'log' | 'empleados'
type Cliente = {
  id: string; nombre: string; placa: string; whatsapp: string
  lavadas_ciclo: number; lavadas_total: number; gratis_disponibles: number; created_at: string
}
type Lavada = {
  id: string; created_at: string; fue_gratis: boolean; placa: string
  clientes: { nombre: string }; empleados: { nombre: string }
}
type Empleado = { id: string; nombre: string; rol: string; activo: boolean; created_at: string }

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [tab, setTab] = useState<Tab>('resumen')

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [lavadas, setLavadas] = useState<Lavada[]>([])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [stats, setStats] = useState({ totalClientes: 0, lavasHoy: 0, totalLavadas: 0, gratisUsadas: 0 })

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const { data: emp } = await supabase.from('empleados').select('rol').eq('id', data.session.user.id).single()
        if (emp?.rol === 'admin') { setAuthed(true); cargarTodo() }
      }
      setChecking(false)
    })
  }, [])

  async function login() {
    setLoginError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) { setLoginError('Credenciales incorrectas'); return }
    const { data: emp } = await supabase.from('empleados').select('rol').eq('id', data.user.id).single()
    if (emp?.rol !== 'admin') { setLoginError('No tienes acceso de administrador'); await supabase.auth.signOut(); return }
    setAuthed(true)
    cargarTodo()
  }

  async function cargarTodo() {
    const [{ data: cls }, { data: lavs }, { data: emps }] = await Promise.all([
      supabase.from('clientes').select('*').order('created_at', { ascending: false }),
      supabase.from('lavadas').select('id, created_at, fue_gratis, placa, clientes(nombre), empleados(nombre)').order('created_at', { ascending: false }).limit(50),
      supabase.from('empleados').select('*').order('created_at', { ascending: false }),
    ])
    setClientes((cls as Cliente[]) || [])
    setLavadas((lavs as any) || [])
    setEmpleados((emps as Empleado[]) || [])

    const hoy = new Date().toDateString()
    const lavasHoy = lavs?.filter(l => new Date(l.created_at).toDateString() === hoy).length || 0
    const gratisUsadas = lavs?.filter(l => l.fue_gratis).length || 0
    setStats({
      totalClientes: cls?.length || 0,
      lavasHoy,
      totalLavadas: lavs?.length || 0,
      gratisUsadas,
    })
  }

  async function logout() {
    await supabase.auth.signOut()
    setAuthed(false)
  }

  async function anularLavada(id: string) {
    if (!confirm('¿Anular esta lavada? Se descontará del cliente.')) return
    // Obtener lavada
    const { data: lav } = await supabase.from('lavadas').select('cliente_id').eq('id', id).single()
    if (!lav) return
    await supabase.from('lavadas').delete().eq('id', id)
    // Descontar punto
    await supabase.rpc('descontar_lavada', { p_cliente_id: lav.cliente_id })
    cargarTodo()
  }

  if (checking) return <div className="flex items-center justify-center min-h-screen text-gray-400">Cargando...</div>

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="bg-[#1a1a2e] text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/" className="text-gray-300 hover:text-white text-xl">←</Link>
        <span className="font-semibold">Panel administrador</span>
        {authed && (
          <button onClick={logout} className="ml-auto text-xs text-gray-400 hover:text-white">Salir</button>
        )}
      </div>

      {!authed ? (
        <div className="flex flex-col gap-4 p-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">👑</span>
              <h2 className="font-semibold text-gray-800">Acceso administrador</h2>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email</label>
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a1a2e]" type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Contraseña</label>
                <input className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a1a2e]" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} />
              </div>
              {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
              <button className="w-full bg-[#1a1a2e] text-white py-3 rounded-xl font-semibold active:scale-95 transition-transform" onClick={login}>Entrar</button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="flex bg-white border-b border-gray-200 sticky top-[52px] z-10">
            {(['resumen', 'clientes', 'log', 'empleados'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-3 text-xs font-medium capitalize border-b-2 transition-colors
                  ${tab === t ? 'border-[#1a1a2e] text-[#1a1a2e]' : 'border-transparent text-gray-400'}`}>
                {t === 'resumen' ? '📊 Resumen' : t === 'clientes' ? '👥 Clientes' : t === 'log' ? '📋 Log' : '👔 Empleados'}
              </button>
            ))}
          </div>

          {/* Resumen */}
          {tab === 'resumen' && (
            <div className="flex flex-col gap-4 p-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Clientes', value: stats.totalClientes, icon: '👥' },
                  { label: 'Lavadas hoy', value: stats.lavasHoy, icon: '🚗' },
                  { label: 'Total lavadas', value: stats.totalLavadas, icon: '📊' },
                  { label: 'Gratis dadas', value: stats.gratisUsadas, icon: '🎁' },
                ].map(s => (
                  <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <p className="text-2xl mb-1">{s.icon}</p>
                    <p className="text-2xl font-bold text-[#1a1a2e]">{s.value}</p>
                    <p className="text-xs text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Clientes con lavada gratis */}
              {clientes.filter(c => c.gratis_disponibles > 0).length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                  <h3 className="font-semibold text-yellow-800 mb-3">🎁 Clientes con lavada gratis</h3>
                  {clientes.filter(c => c.gratis_disponibles > 0).map(c => (
                    <div key={c.id} className="flex justify-between items-center py-2 border-b border-yellow-100 last:border-0">
                      <div>
                        <p className="font-medium text-sm text-gray-800">{c.nombre}</p>
                        <p className="text-xs text-gray-500 font-mono">{c.placa}</p>
                      </div>
                      <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full font-medium">
                        {c.gratis_disponibles} gratis
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Top clientes */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-800 mb-3">🏆 Top clientes</h3>
                {[...clientes].sort((a, b) => b.lavadas_total - a.lavadas_total).slice(0, 5).map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                    <span className="text-lg">{['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i]}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{c.nombre}</p>
                      <p className="text-xs text-gray-400 font-mono">{c.placa}</p>
                    </div>
                    <span className="text-sm font-bold text-[#1a1a2e]">{c.lavadas_total} lavadas</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clientes */}
          {tab === 'clientes' && (
            <div className="flex flex-col gap-3 p-4">
              {clientes.map(c => (
                <div key={c.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-800">{c.nombre}</p>
                      <p className="text-xs text-gray-500 font-mono">{c.placa}</p>
                      <p className="text-xs text-gray-400">WA: {c.whatsapp}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-[#1a1a2e]">{c.lavadas_ciclo}/10</p>
                      <p className="text-xs text-gray-400">{c.lavadas_total} totales</p>
                      {c.gratis_disponibles > 0 && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">🎁 Gratis</span>
                      )}
                    </div>
                  </div>
                  {/* Mini progress */}
                  <div className="mt-3 flex gap-1">
                    {Array.from({ length: 10 }, (_, i) => (
                      <div key={i} className={`flex-1 h-1.5 rounded-full ${i < c.lavadas_ciclo ? 'bg-[#f0c040]' : 'bg-gray-100'}`} />
                    ))}
                  </div>
                </div>
              ))}
              {clientes.length === 0 && <p className="text-center text-gray-400 py-8">No hay clientes registrados</p>}
            </div>
          )}

          {/* Log */}
          {tab === 'log' && (
            <div className="flex flex-col gap-3 p-4">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                {lavadas.map(l => (
                  <div key={l.id} className="p-4 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{(l.clientes as any)?.nombre}</p>
                      <p className="text-xs text-gray-500 font-mono">{l.placa}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(l.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        {' · '}{(l.empleados as any)?.nombre}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {l.fue_gratis && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Gratis</span>}
                      <button onClick={() => anularLavada(l.id)} className="text-xs text-red-400 hover:text-red-600">Anular</button>
                    </div>
                  </div>
                ))}
                {lavadas.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">Sin registros</p>}
              </div>
            </div>
          )}

          {/* Empleados */}
          {tab === 'empleados' && (
            <div className="flex flex-col gap-3 p-4">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
                ℹ️ Los empleados se crean desde el panel de Supabase → Authentication → Users, y luego se agrega su rol en la tabla <code className="font-mono bg-amber-100 px-1 rounded">empleados</code>.
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                {empleados.map(e => (
                  <div key={e.id} className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-800">{e.nombre}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(e.created_at).toLocaleDateString('es-EC')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${e.rol === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {e.rol}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${e.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {e.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
