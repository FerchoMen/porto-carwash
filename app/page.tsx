'use client'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[#1a1a2e]">
      {/* Logo */}
      <div className="flex flex-col items-center justify-center flex-1 px-6 gap-6">
        <div className="text-center">
          <div className="text-7xl mb-4">🚗</div>
          <h1 className="text-3xl font-bold text-[#f0c040] tracking-widest">PORTO</h1>
          <h2 className="text-xl font-semibold text-white tracking-widest">CAR WASH</h2>
          <p className="text-gray-400 text-sm mt-2 tracking-wider uppercase">Cliente Fiel · Portoviejo</p>
        </div>

        <div className="w-full max-w-xs flex flex-col gap-3 mt-6">
          <Link
            href="/cliente"
            className="w-full bg-[#f0c040] text-[#1a1a2e] font-bold py-4 rounded-2xl text-center text-lg shadow-lg active:scale-95 transition-transform"
          >
            🎁 Soy cliente
          </Link>
          <Link
            href="/empleado"
            className="w-full bg-white/10 text-white font-medium py-4 rounded-2xl text-center text-lg border border-white/20 active:scale-95 transition-transform"
          >
            🔑 Empleado / Admin
          </Link>
        </div>
      </div>

      <p className="text-center text-gray-600 text-xs py-4">
        Porto Car Wash © {new Date().getFullYear()}
      </p>
    </div>
  )
}
