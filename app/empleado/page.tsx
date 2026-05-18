'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Session = { id: string; nombre: string; rol: string }
type Cliente = { id: string; nombre: string; placa: string; whatsapp: string; lavadas_ciclo: number }
type CodigoActivo = { codigo: string; placa: string; expiraEn: number }

export default function EmpleadoPage() {
  const [step, setStep] = useState<'login' | 'panel'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const [placa, setPlaca] = useState('')
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [buscarError, setBuscarError] = useState('')

  const [codigoActivo, setCodigoActivo] = useState<CodigoActivo | null>(null)
  const [timerSeg, setTimerSeg] = useState(0)
  const [generando, setGenerando] = useState(false)
  const [waStatus, setWaStatus] = useState<string>('')
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Verificar sesión activa al montar
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) await cargarEmpleado(data.session.user.id)
    })
  }, [])

  async function cargarEmpleado(uid: string) {
    const { data } = await supabase.from('empleados').select('*').eq('id', uid).single()
    if (data) {
      setSession({ id: uid, nombre: data.nombre, rol: data.rol })
      setStep('panel')
    }
  }

  async function login() {
    setLoginLoading(true)
    setLoginError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      setLoginError('Email o contraseña incorrectos')
      setLoginLoading(false)
      return
    }
    await cargarEmpleado(data.user.id)
    setLoginLoading(false)
  }

  async function logout() {
    await supabase.auth.signOut()
    setStep('login')
    setSession(null)
    setCliente(null)
    cancelarCodigo()
  }

  async function buscarCliente() {
    if (!placa.trim()) return
    setBuscando(true)
    setBuscarError('')
    setCliente(null)
    setCodigoActivo(null)
    setWaStatus('')

    const { data } = await supabase
      .from('clientes')
      .select('id, nombre, placa, whatsapp, lavadas_ciclo')
      .eq('placa', placa.trim().toUpperCase())
      .single()

    if (!data) {
      setBuscarError('Placa no encontrada. El cliente debe registrarse primero en la app.')
    } else {
      setCliente(data)
    }
    setBuscando(false)
  }

  async function generarCodigo(enviarWA: boolean) {
    if (!cliente || !session) return
    setGenerando(true)
    setWaStatus('')

    const res = await fetch('/api/codigos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente_id: cliente.id, placa: cliente.placa, empleado_id: session.id }),
    })
    const data = await res.json()

    if (!data.ok) {
      setWaStatus('❌ Error generando código: ' + data.error)
      setGenerando(false)
      return
    }

    setCodigoActivo({ codigo: data.codigo, placa: cliente.placa, expiraEn: Date.now() + 600_000 })
    iniciarTimer(600)

    if (enviarWA) {
      setWaStatus('Enviando WhatsApp...')
      const waRes = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsapp: cliente.whatsapp,
          codigo: data.codigo,
          nombre: cliente.nombre,
          placa: cliente.placa,
        }),
      })
      const waData = await waRes.json()
      setWaStatus(waData.ok ? '✅ Código enviado por WhatsApp' : '⚠️ No se pudo enviar WA: ' + waData.error)
    }

    setGenerando(false)
  }

  function iniciarTimer(segundos: number) {
    setTimerSeg(segundos)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimerSeg(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          setCodigoActivo(null)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function cancelarCodigo() {
    if (timerRef.current) clearInterval(timerRef.current)
    setCodigoActivo(null)
    setTimerSeg(0)
    setWaStatus('')
  }

  const minutos = Math.floor(timerSeg / 60)
  const segundos = timerSeg % 60

  // Redirigir admin al panel de admin
  if (session?.rol === 'admin') {
    if (typeof window !== 'undefined') window.location.href = '/admin'
    return null
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="bg-[#1a1a2e] text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/" className="text-gray-300 hover:text-white text-xl">←</Link>
        <span className="font-semibold">Panel empleado</span>
        {session && (
          <button onClick={logout} className="ml-auto text-xs text-gray-400 hover:text-white">
            Salir
          </button>
        )}
      </div>

      {step === 'login' && (
        <div className="flex flex-col gap-4 p-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-4">Iniciar sesión</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Email</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a1a2e]"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Contraseña</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a1a2e]"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && login()}
                />
              </div>
              {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
              <button
                className="w-full bg-[#1a1a2e] text-white py-3 rounded-xl font-semibold active:scale-95 transition-transform disabled:opacity-60"
                onClick={login}
                disabled={loginLoading}
              >
                {loginLoading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center">
            Las cuentas las crea la administración
          </p>
        </div>
      )}

      {step === 'panel' && session && (
        <div className="flex flex-col gap-4 p-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-400">Sesión activa</p>
              <p className="font-semibold text-gray-800">{session.nombre}</p>
            </div>
            <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">Empleado</span>
          </div>

          {/* Buscar placa */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-800 mb-3">Registrar lavada</h3>
            <div className="flex gap-2">
              <input
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm uppercase focus:outline-none focus:border-[#1a1a2e]"
                placeholder="Placa del vehículo"
                value={placa}
                onChange={e => setPlaca(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && buscarCliente()}
              />
              <button
                className="bg-[#1a1a2e] text-white px-4 rounded-xl text-sm font-medium active:scale-95 transition-transform disabled:opacity-60"
                onClick={buscarCliente}
                disabled={buscando}
              >
                {buscando ? '...' : 'Buscar'}
              </button>
            </div>
            {buscarError && <p className="text-red-500 text-sm mt-2">{buscarError}</p>}
          </div>

          {/* Info cliente */}
          {cliente && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-bold text-gray-800">{cliente.nombre}</p>
                  <p className="text-sm text-gray-500 font-mono">{cliente.placa}</p>
                  <p className="text-xs text-gray-400 mt-1">WA: {cliente.whatsapp}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#1a1a2e]">{cliente.lavadas_ciclo}/10</p>
                  <p className="text-xs text-gray-400">lavadas</p>
                </div>
              </div>

              {/* Código activo */}
              {codigoActivo ? (
                <div>
                  <div className="bg-[#1a1a2e] rounded-2xl p-5 text-center mb-3">
                    <p className="text-gray-400 text-xs mb-1">Código de confirmación</p>
                    <p className="text-5xl font-bold text-[#f0c040] tracking-widest font-mono">
                      {codigoActivo.codigo}
                    </p>
                    <p className="text-gray-400 text-xs mt-2">
                      Expira en {minutos}:{segundos < 10 ? '0' : ''}{segundos} · Un solo uso
                    </p>
                  </div>
                  {waStatus && (
                    <p className="text-sm text-center mb-3 text-gray-600">{waStatus}</p>
                  )}
                  <button
                    className="w-full border border-red-200 text-red-500 py-2.5 rounded-xl text-sm font-medium"
                    onClick={cancelarCodigo}
                  >
                    Cancelar código
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    className="w-full bg-[#1a1a2e] text-white py-3 rounded-xl font-semibold active:scale-95 transition-transform disabled:opacity-60"
                    onClick={() => generarCodigo(false)}
                    disabled={generando}
                  >
                    {generando ? 'Generando...' : '📋 Mostrar código en pantalla'}
                  </button>
                  <button
                    className="w-full bg-[#f0c040] text-[#1a1a2e] py-3 rounded-xl font-bold active:scale-95 transition-transform disabled:opacity-60"
                    onClick={() => generarCodigo(true)}
                    disabled={generando}
                  >
                    {generando ? 'Enviando...' : '📲 Enviar código por WhatsApp'}
                  </button>
                  {waStatus && <p className="text-sm text-center text-gray-600">{waStatus}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
