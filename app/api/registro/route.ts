import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { nombre, placa, whatsapp, usuario, password } = await req.json()
    if (!nombre || !placa || !whatsapp || !usuario || !password) {
      return NextResponse.json({ ok: false, error: 'Faltan datos' })
    }
    const supabaseAdmin = getSupabaseAdmin()

    // Hashear contraseña via RPC
    const { data: hashData } = await supabaseAdmin.rpc('hash_password', { p_password: password })

    const { data, error } = await supabaseAdmin.from('clientes').insert({
      nombre, placa, whatsapp,
      usuario: usuario.toLowerCase(),
      password_hash: hashData
    }).select().single()

    if (error) {
      if (error.code === '23505') return NextResponse.json({ ok: false, error: 'El usuario o placa ya existe' })
      return NextResponse.json({ ok: false, error: 'Error al crear cuenta' })
    }

    return NextResponse.json({ ok: true, id: data.id })
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
