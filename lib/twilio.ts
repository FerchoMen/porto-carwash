import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export async function enviarCodigoWhatsApp(
  numeroWA: string,
  codigo: string,
  nombreCliente: string,
  placa: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Normalizar número: asegurarse que tenga código de país
    const numero = numeroWA.startsWith('+') ? numeroWA : `+593${numeroWA.replace(/^0/, '')}`

    const mensaje =
      `🚗 *Porto Car Wash*\n\n` +
      `Hola ${nombreCliente}, tu lavada está lista!\n\n` +
      `Tu código de confirmación es:\n\n` +
      `*${codigo}*\n\n` +
      `Placa: ${placa}\n` +
      `⏱ Válido por 10 minutos · Un solo uso\n\n` +
      `Ingresa este código en la app para registrar tu lavada y acumular puntos 🎉`

    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${numero}`,
      body: mensaje,
    })

    return { ok: true }
  } catch (err: any) {
    console.error('Twilio error:', err)
    return { ok: false, error: err.message }
  }
}
