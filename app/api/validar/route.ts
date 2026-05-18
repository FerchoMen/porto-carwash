import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { codigo, cliente_id } = await req.json()

    if (!codigo || !cliente_id) {
      return NextResponse.json({ ok: false, error: 'Faltan parámetros' }, { status: 400 })
    }

    if (!/^\d{4}$/.test(codigo)) {
      return NextResponse.json({ ok: false, error: 'Código inválido' }, { status: 400 })
    }

    // Llamar a la función atómica de PostgreSQL
    // Ella valida, marca como usado, registra la lavada y actualiza los puntos
    const { data, error } = await supabaseAdmin.rpc('registrar_lavada', {
      p_codigo: codigo,
      p_cliente_id: cliente_id,
    })

    if (error) {
      console.error('Error RPC registrar_lavada:', error)
      return NextResponse.json({ ok: false, error: 'Error interno al registrar' }, { status: 500 })
    }

    if (!data?.ok) {
      return NextResponse.json({ ok: false, error: data?.error || 'Código inválido o expirado' })
    }

    return NextResponse.json({ ok: true, lavadas_ciclo: data.lavadas_ciclo })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
