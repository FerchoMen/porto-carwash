import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { nombre, password } = await req.json()
    if (!nombre || !password) return NextResponse.json({ ok: false, error: 'Faltan datos' })

    const supabaseAdmin = getSupabaseAdmin()
    const { data, error } = await supabaseAdmin.rpc('verificar_empleado', { p_password: password })

    if (error || !data?.ok) return NextResponse.json({ ok: false, error: 'Contraseña incorrecta' })
    if (data.nombre.toLowerCase() !== nombre.trim().toLowerCase()) return NextResponse.json({ ok: false, error: 'Nombre o contraseña incorrectos' })

    return NextResponse.json({ ok: true, id: data.id, nombre: data.nombre, rol: data.rol })
  } catch (err) {
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
