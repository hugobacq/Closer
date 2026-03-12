import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col px-6 bg-gradient-to-b from-rose-50 via-orange-50 to-amber-50">
      {/* Logo top — centré avec fond blanc flottant */}
      <div className="pt-16 flex justify-center">
        <div className="bg-white/80 backdrop-blur-sm shadow-md shadow-rose-100/60 rounded-3xl px-6 py-4 flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Closer"
            width={36}
            height={36}
            className="object-contain"
          />
          <span className="text-xl font-bold text-stone-800 tracking-tight">Closer</span>
        </div>
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-2 py-12 space-y-5">
        {/* Logo grand format */}
        <div className="w-24 h-24 bg-white/70 backdrop-blur rounded-3xl shadow-lg shadow-rose-100/50 flex items-center justify-center p-4">
          <Image
            src="/logo.png"
            alt="Closer logo"
            width={64}
            height={64}
            className="object-contain"
          />
        </div>

        <div className="space-y-3">
          <h1 className="text-5xl font-bold text-stone-800 tracking-tight leading-tight">
            Closer
          </h1>
          <p className="text-stone-500 text-lg font-medium italic">
            Votre rituel quotidien à deux.
          </p>
          <p className="text-stone-400 text-sm leading-relaxed max-w-xs">
            Un espace privé pour partager vos humeurs, vos pensées et vous retrouver chaque jour — même loin.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="pb-16 space-y-3 w-full">
        <Link
          href="/signup"
          className="block w-full bg-rose-500 text-white text-center py-4 rounded-2xl font-semibold text-base shadow-lg shadow-rose-200 active:scale-[0.98] transition-all"
        >
          Créer un compte
        </Link>
        <Link
          href="/login"
          className="block w-full bg-white/80 backdrop-blur text-center py-4 rounded-2xl font-semibold text-stone-600 border border-white/80 active:scale-[0.98] transition-all shadow-sm"
        >
          Se connecter
        </Link>
        <div className="text-center pt-1">
          <Link
            href="/home?demo=true"
            className="text-stone-400 text-sm underline underline-offset-4 hover:text-stone-600 transition-colors"
          >
            Voir la démo · données fictives
          </Link>
        </div>
      </div>
    </main>
  );
}
