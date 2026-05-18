'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

type Cliente = {
  id: string
  nombre: string
  placa: string
  whatsapp: string
  lavadas_ciclo: number
  lavadas_total: number
  gratis_disponibles: number
}

type Lavada = {
  id: string
  created_at: string
  fue_gratis: boolean
  empleados: { nombre: string }
}

export default function ClientePage() {
  const [step, setStep] = useState<'form' | 'tarjeta'>('form')
  const [nombre, setNombre] = useState('')
  const [placa, setPlaca] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [historial, setHistorial] = useState<Lavada[]>([])
  const [codigo, setCodigo] = useState(['', '', '', ''])
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [registrando, setRegistrando] = useState(false)

  async function entrar() {
    if (!nombre.trim() || !placa.trim() || !whatsapp.trim()) {
      setMsg({ tipo: 'error', texto: 'Completa todos los campos' })
      return
    }
    setLoading(true)
    setMsg(null)
    const placaUp = placa.trim().toUpperCase()

    // Buscar cliente por placa
    let { data: existing } = await supabase
      .from('clientes')
      .select('*')
      .eq('placa', placaUp)
      .single()

    if (!existing) {
      // Registrar nuevo cliente
      const { data: nuevo, error } = await supabase
        .from('clientes')
        .insert({ nombre: nombre.trim(), placa: placaUp, whatsapp: whatsapp.trim() })
        .select()
        .single()
      if (error) {
        setMsg({ tipo: 'error', texto: 'Error al registrarse. Intenta de nuevo.' })
        setLoading(false)
        return
      }
      existing = nuevo
    }

    setCliente(existing)
    await cargarHistorial(existing.id)
    setStep('tarjeta')
    setLoading(false)
  }

  async function cargarHistorial(clienteId: string) {
    const { data } = await supabase
      .from('lavadas')
      .select('id, created_at, fue_gratis, empleados(nombre)')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false })
      .limit(10)
    setHistorial((data as any) || [])
  }

  async function validarCodigo() {
    const code = codigo.join('')
    if (code.length < 4) {
      setMsg({ tipo: 'error', texto: 'Ingresa el código completo' })
      return
    }
    if (!cliente) return
    setRegistrando(true)
    setMsg(null)

    const res = await fetch('/api/validar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo: code, cliente_id: cliente.id }),
    })
    const data = await res.json()

    if (!data.ok) {
      setMsg({ tipo: 'error', texto: data.error })
    } else {
      setMsg({ tipo: 'ok', texto: '✓ ¡Lavada registrada! Tus puntos se actualizaron.' })
      setCodigo(['', '', '', ''])
      // Recargar cliente actualizado
      const { data: updated } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', cliente.id)
        .single()
      if (updated) setCliente(updated)
      await cargarHistorial(cliente.id)
    }
    setRegistrando(false)
  }

  function handleCodigo(val: string, idx: number) {
    const v = val.replace(/\D/g, '').slice(-1)
    const next = [...codigo]
    next[idx] = v
    setCodigo(next)
    if (v && idx < 3) {
      document.getElementById(`cod-${idx + 1}`)?.focus()
    }
  }

  const ciclo = cliente?.lavadas_ciclo ?? 0

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#1a1a2e] text-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link href="/" className="text-gray-300 hover:text-white text-xl">←</Link>
        <span className="font-semibold">Mi tarjeta fiel</span>
      </div>

      {step === 'form' && (
        <div className="flex flex-col gap-4 p-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-800 mb-4">Busca tu cuenta o regístrate</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Nombre completo</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a1a2e]"
                  placeholder="Ej: María García"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Placa del vehículo</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm uppercase focus:outline-none focus:border-[#1a1a2e]"
                  placeholder="Ej: PCA-1234"
                  value={placa}
                  onChange={e => setPlaca(e.target.value.toUpperCase())}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">WhatsApp (con código de país)</label>
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1a1a2e]"
                  placeholder="Ej: 0991234567"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  type="tel"
                />
              </div>
              {msg && (
                <p className={`text-sm text-center ${msg.tipo === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                  {msg.texto}
                </p>
              )}
              <button
                className="w-full bg-[#1a1a2e] text-white py-3 rounded-xl font-semibold mt-1 active:scale-95 transition-transform disabled:opacity-60"
                onClick={entrar}
                disabled={loading}
              >
                {loading ? 'Buscando...' : 'Ver mi tarjeta →'}
              </button>
            </div>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 flex gap-2">
            <span>ℹ️</span>
            <span>El registro de lavadas lo hace el empleado al terminar. Tú solo ves tu progreso e ingresas el código que te dan.</span>
          </div>
        </div>
      )}

      {step === 'tarjeta' && cliente && (
        <div className="flex flex-col gap-4 p-4">
          {/* Tarjeta de puntos */}
          <div className="bg-[#1a1a2e] rounded-2xl p-5 text-white shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-gray-400 text-xs">Hola,</p>
                <p className="font-bold text-lg">{cliente.nombre}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-xs">Placa</p>
                <p className="font-mono font-semibold">{cliente.placa}</p>
              </div>
            </div>

            {/* Dots */}
            <div className="flex gap-2 flex-wrap mb-3">
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-lg border-2 transition-all
                    ${i < ciclo
                      ? 'bg-[#f0c040] border-[#f0c040] text-[#1a1a2e]'
                      : i === 9
                      ? 'border-[#f0c040] border-dashed text-[#f0c040]'
                      : 'border-white/20 text-white/30'}`}
                >
                  {i < ciclo ? '✓' : i === 9 ? '🎁' : '·'}
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">{ciclo}/10 lavadas</span>
              <span className="text-[#f0c040] text-sm font-semibold">
                {ciclo >= 9 ? '¡Una más para gratis!' : `${10 - ciclo} para tu lavada gratis`}
              </span>
            </div>

            {/* Barra de progreso */}
            <div className="mt-2 bg-white/10 rounded-full h-1.5">
              <div
                className="bg-[#f0c040] h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${ciclo * 10}%` }}
              />
            </div>
          </div>

          {/* Lavada gratis disponible */}
          {cliente.gratis_disponibles > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-3 items-center">
              <span className="text-3xl">🎉</span>
              <div>
                <p className="font-bold text-green-800">¡Tienes {cliente.gratis_disponibles} lavada(s) gratis!</p>
                <p className="text-green-700 text-sm">Dile a la empleada para que te la aplique.</p>
              </div>
            </div>
          )}

          {/* Ingresar código */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-600 mb-3 font-medium">¿Terminaron tu lavada? Ingresa el código que te dio el empleado:</p>
            <div className="flex gap-3 justify-center mb-4">
              {[0, 1, 2, 3].map(i => (
                <input
                  key={i}
                  id={`cod-${i}`}
                  type="number"
                  inputMode="numeric"
                  maxLength={1}
                  className="w-14 h-16 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-[#1a1a2e] focus:outline-none"
                  value={codigo[i]}
                  onChange={e => handleCodigo(e.target.value, i)}
                />
              ))}
            </div>
            {msg && (
              <p className={`text-sm text-center mb-3 ${msg.tipo === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                {msg.texto}
              </p>
            )}
            <button
              className="w-full bg-[#1a1a2e] text-white py-3 rounded-xl font-semibold active:scale-95 transition-transform disabled:opacity-60"
              onClick={validarCodigo}
              disabled={registrando}
            >
              {registrando ? 'Validando...' : 'Registrar lavada'}
            </button>
          </div>

          {/* Historial */}
          {historial.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-3">Historial de lavadas</h3>
              <div className="flex flex-col divide-y divide-gray-100">
                {historial.map(l => (
                  <div key={l.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {new Date(l.created_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs text-gray-400">por {(l.empleados as any)?.nombre}</p>
                    </div>
                    {l.fue_gratis && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">Gratis 🎁</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            className="text-center text-sm text-gray-400 py-2"
            onClick={() => { setStep('form'); setCliente(null); setHistorial([]); setMsg(null) }}
          >
            ← Cambiar cuenta
          </button>
        </div>
      )}
    </div>
  )
}
