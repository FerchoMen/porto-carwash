import { NextRequest, NextResponse } from 'next/server'
import { enviarCodigoWhatsApp } from '@/lib/twilio'

export async function POST(req: NextRequest) {
  try {
    const { whatsapp, codigo, nombre, placa } = await req.json()

    if (!whatsapp || !codigo || !nombre || !placa) {
      return NextResponse.json({ ok: false, error: 'Faltan parámetros' }, { status: 400 })
    }

    const result = await enviarCodigoWhatsApp(whatsapp, codigo, nombre, placa)
    return NextResponse.json(result)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ ok: false, error: 'Error interno' }, { status: 500 })
  }
}
