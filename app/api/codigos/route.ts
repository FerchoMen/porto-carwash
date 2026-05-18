import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { cliente_id, placa, empleado_id } = await req.json()

    if (!cliente_id || !placa || !empleado_id) {
      return NextResponse.json({ ok: false, error: 'Faltan parámetros' }, { status: 400 })
    }

    // Anular códigos anteriores activos para esta placa
    await supabaseAdmin
      .from('codigos')
      .update({ usado: true })
      .eq('placa', placa)
      .eq('usado', false)

    // Generar código aleatorio de 4 dígitos
    const codigo = String(Math.floor(1000 + Math.random() * 9000))

    // Calcular expiración: 10 minutos
    const expira_at = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Insertar en DB
    const { error } = await supabaseAdmin.from('codigos').insert({
      codigo,
      cliente_id,
      empleado_id,
      placa,
      expira_at,
    })

    if (error) {
      console.error('Error insertando código:', error)
      return NextResponse.json({ ok: false, error: 'Error generando código' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, codigo })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
