import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { nombre, password } = await req.json()
    if (!nombre || !password) return NextResponse.json({ ok: false, error: 'Faltan datos' })

    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin.rpc('login_universal', {
      p_usuario: nombre.trim(),
      p_password: password.trim()
    })

    if (error) {
      console.error('Error login_universal:', error)
      return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
    }

    if (!data?.ok) return NextResponse.json({ ok: false, error: data?.error || 'Usuario o contraseña incorrectos' })

    return NextResponse.json({ ok: true, id: data.id, nombre: data.nombre, tipo: data.tipo, rol: data.rol })
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
