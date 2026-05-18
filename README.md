# 🚗 Porto Car Wash - Sistema de Fidelidad

Sistema web completo para gestión de clientes fieles con:
- Registro de clientes (nombre, placa, WhatsApp)
- Código de confirmación de 4 dígitos (expira en 10 min, un solo uso)
- Envío automático por WhatsApp (Twilio)
- Panel de empleados con login
- Panel de administrador (jefa) con estadísticas
- 10 lavadas = 1 lavada gratis

---

## Stack
- **Next.js 14** (App Router)
- **Supabase** (PostgreSQL + Auth)
- **Twilio** (WhatsApp API)
- **Tailwind CSS**
- **Vercel** (hosting)

---

## Paso a paso para subir el sistema

### 1. Crear cuenta en Supabase

1. Ve a https://supabase.com y créate una cuenta (gratis)
2. Crea un nuevo proyecto (anota la contraseña)
3. Ve a **SQL Editor** y pega todo el contenido de `supabase/schema.sql`
4. Ejecuta el SQL (botón Run)
5. Ve a **Settings → API** y copia:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

### 2. Crear empleados en Supabase

1. Ve a **Authentication → Users → Invite user**
2. Ingresa el email de la jefa y de cada empleado
3. Ellos recibirán un email para poner su contraseña
4. Luego ve a **Table Editor → empleados** y agrega una fila por cada usuario:
   - `id`: el UUID del usuario (lo ves en Authentication → Users)
   - `nombre`: nombre del empleado
   - `rol`: `empleado` o `admin`
   - `activo`: `true`

### 3. Configurar Twilio para WhatsApp

1. Crea cuenta en https://twilio.com (gratis)
2. Ve a **Messaging → Try it out → Send a WhatsApp message**
3. Sigue las instrucciones del Sandbox (el cliente debe enviar un mensaje de activación una vez)
4. Copia tu `Account SID` y `Auth Token`
5. El número del sandbox es: `+14155238886`

> Para producción (sin sandbox): compra un número con WhatsApp en Twilio (~$1/mes)

### 4. Instalar y correr localmente

```bash
npm install
cp .env.example .env.local
# Llena .env.local con tus credenciales
npm run dev
# Abre http://localhost:3000
```

### 5. Subir a Vercel (hosting gratis)

1. Crea cuenta en https://vercel.com
2. Conecta tu repositorio de GitHub (sube este proyecto a GitHub primero)
3. En Vercel, importa el proyecto
4. Ve a **Settings → Environment Variables** y agrega todas las variables de `.env.example`
5. Haz Deploy

### 6. Generar el QR

Una vez desplegado, tu URL será algo como `https://porto-carwash.vercel.app`

Para generar el QR:
1. Ve a https://qr.io o https://www.qrcode-monkey.com
2. Pega tu URL
3. Personalízalo con colores (azul oscuro #1a1a2e y dorado #f0c040)
4. Descarga en alta resolución e imprímelo

---

## Estructura del proyecto

```
porto-carwash/
├── app/
│   ├── page.tsx              → Home (QR apunta aquí)
│   ├── cliente/page.tsx      → Registro + tarjeta fiel del cliente
│   ├── empleado/page.tsx     → Login empleado + generar código + WA
│   ├── admin/page.tsx        → Dashboard de la jefa
│   └── api/
│       ├── codigos/route.ts  → Genera código seguro
│       ├── validar/route.ts  → Valida código del cliente
│       └── whatsapp/route.ts → Envía WA por Twilio
├── lib/
│   ├── supabase.ts           → Cliente de base de datos
│   └── twilio.ts             → Cliente WhatsApp
├── supabase/
│   └── schema.sql            → Toda la base de datos + función atómica
└── .env.example              → Variables de entorno necesarias
```

---

## Seguridad implementada

| Amenaza | Solución |
|---------|---------|
| Cliente registra desde casa | Sin código del empleado no puede registrar nada |
| Cliente adivina el código | Expira en 10 minutos, completamente aleatorio |
| Código reutilizado | Un solo uso, se marca `usado=true` en DB |
| Código para otra placa | El código está vinculado a la placa específica |
| Empleado desactivado | Se puede marcar `activo=false` en tabla empleados |
| Empleado se va | La jefa desactiva su cuenta desde Supabase Auth |
| Condición de carrera | Función PostgreSQL atómica con `FOR UPDATE` |

---

## Costos estimados

| Servicio | Plan | Costo |
|----------|------|-------|
| Supabase | Free | $0 |
| Vercel | Hobby | $0 |
| Twilio Sandbox | Pruebas | $0 |
| Twilio WhatsApp | ~500 msg/mes | ~$2.50/mes |
| Twilio número WA | Producción | ~$1/mes |

**Total para empezar: $0. Para producción completa: ~$3.50/mes**
