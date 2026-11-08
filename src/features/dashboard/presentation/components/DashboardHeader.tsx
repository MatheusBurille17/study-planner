import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { getGreeting } from '../../domain/dashboardRules'

export function DashboardHeader({ userName, now = new Date() }: { userName?: string; now?: Date }) {
  return (
    <header className="mb-6">
      <p className="text-xs capitalize text-muted">
        {format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}
      </p>
      <h1 className="mt-1 font-serif text-[38px] leading-[1.05] text-ink sm:text-5xl">
        {getGreeting(now)}, {userName ?? 'Amanda'}!
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        Aqui está o seu panorama acadêmico. Um passo de cada vez — você está indo bem.
      </p>
    </header>
  )
}
