import Link from 'next/link'
import { CalendarHeart, GraduationCap, Sparkles } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-lilac/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-peach/30 blur-3xl" />

      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
        <section className="hidden flex-col justify-between overflow-hidden rounded-r-[3rem] bg-gradient-to-br from-primary-700 via-primary-600 to-[#9a6bf0] p-12 text-white lg:flex">
          <Link href="/" className="flex items-center gap-3 text-white/90">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <GraduationCap className="h-6 w-6" />
            </span>
            <div>
              <p className="font-serif text-xl leading-none">Study Planner</p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/60">por Amanda</p>
            </div>
          </Link>

          <div className="relative space-y-6">
            <div className="absolute -right-10 top-0 h-40 w-40 rounded-full border border-white/15" />
            <div className="absolute -right-24 top-16 h-56 w-56 rounded-full border border-white/10" />
            <Sparkles className="h-7 w-7 text-white/70" />
            <h1 className="max-w-sm font-serif text-[42px] leading-[1.08]">
              Sua vida acadêmica, organizada com carinho.
            </h1>
            <p className="max-w-sm text-sm leading-relaxed text-white/70">
              Tarefas, provas e trabalhos em um só lugar — com lembretes no momento certo e um calendário que
              acompanha o seu ritmo.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              {[
                { icon: CalendarHeart, label: 'Calendário integrado' },
                { icon: Sparkles, label: 'Lembretes gentis' },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs text-white/80 backdrop-blur"
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </span>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/50">Feito para estudar com mais leveza.</p>
        </section>

        <section className="flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-14">
          <Link href="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="font-serif text-lg text-ink">Study Planner</span>
          </Link>
          <div className="mx-auto w-full max-w-md">{children}</div>
        </section>
      </div>
    </main>
  )
}
