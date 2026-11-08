# Amanda's Study Planner

PWA de organização acadêmica pessoal — tarefas, provas, trabalhos, calendário, dashboard e lembretes em um só lugar. Interface mobile-first em português (BR), com visual off-white quente, detalhes roxo/lilás, cartões arredondados e títulos serifados, seguindo as referências em `docs/referencias-visuais/`.

## ✨ O que está implementado

| Spec | Feature | Principais entregas |
|------|---------|---------------------|
| 1 | `auth-setup` | Login, registro, recuperação/redefinição de senha, sessão em cookie HttpOnly, middleware de rotas, PWA manifest e ícones |
| 2 | `activity-creation` | Modal de tipo, formulários de Tarefa/Prova/Trabalho, validação Zod dupla, lembretes (máx. 3), criação offline e toasts com ações |
| 3 | `activity-list-filter` | Lista de tarefas e provas/trabalhos, busca com debounce 300ms, filtros combinados, ordenação, paginação "Carregar mais", URL state, skeleton e cache |
| 4 | `activity-crud` | Edição polimórfica, soft delete com lixeira de 30 dias, restauração, exclusão permanente, state machines, detecção de conflito (last-write-wins), undo/redo, ações em lote e fila offline |
| 5 | `dashboard-home` | Saudação por horário, "Para hoje", tarefas pendentes, próximas provas/entregas, estatísticas, calendário mini, ações rápidas, alerta de atrasadas, refresh automático e offline |
| 6 | `calendar-view` | Visões mês/semana/dia, navegação, filtros por tipo/disciplina, cores e urgência, detalhes do dia, cache IndexedDB e lazy loading |
| 7 | `notifications-system` | Inscrição push, permissões, preferências, horário de silêncio, notificação de teste, formatação pt-BR, logs/auditoria, CRON local e Edge Function |
| 8 | `pwa-offline` | Manifest, Service Worker (cache-first/stale-while-revalidate/offline), IndexedDB, sync FIFO, resolução de conflitos, indicador offline, instalação e guia iOS |

## 🧱 Stack

- **Next.js 15 (App Router) + React 19 + TypeScript strict**
- **Tailwind CSS** + componentes de UI próprios no estilo shadcn
- **Supabase** (Auth + PostgreSQL + RLS) com **modo demonstração local** automático
- **Zod**, **React Hook Form**, **date-fns**, **Lucide**, **React Day Picker**
- **Dexie/IndexedDB**, **Web Push (web-push)**, **Service Worker**
- **Vitest + fast-check** (89 testes) e **Playwright** (E2E)

## 🚀 Começar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000` e crie uma conta. Sem variáveis de ambiente o app roda em **modo demonstração**: autenticação local segura (scrypt), dados em `.data/db.json` e notificações push simuladas. A conta nova recebe disciplinas e atividades de exemplo para explorar o dashboard.

### Configurar Supabase

1. Copie `.env.example` para `.env.local` e preencha:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   AUTH_SECRET=uma-chave-longa
   ```
2. Aplique as migrations:
   ```bash
   supabase db push
   ```
   Arquivos em `supabase/migrations/`: schema base, perfil de usuário, índices, soft delete e notificações.
3. (Opcional) Gere e configure VAPID para push real:
   ```bash
   npx web-push generate-vapid-keys
   ```
   Preencha `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `VAPID_SUBJECT`.
4. Deploy da Edge Function:
   ```bash
   supabase functions deploy send-reminders
   ```
   Configure o CRON de 5 em 5 minutos (instruções em `supabase/functions/send-reminders/README.md`).

## 🔔 Lembretes

- Provas e entregas: **24h antes**
- Tarefas: **3h antes** (configurável de 0 a 6h)
- Lembretes personalizados por atividade: até **3**, com tipos como 1 dia antes, 2 horas antes ou offset customizado
- Horário de silêncio configurável (suporta atravessar meia-noite)
- Em produção Supabase: Edge Function `send-reminders`; local: `POST /api/notifications/send`
- Sem VAPID configurado, o envio é **simulado** e registrado nos logs

## 📴 Offline & PWA

- Service Worker com:
  - **Cache-First** para `_next/static`, ícones, fontes e imagens
  - **Stale-While-Revalidate** para `/api/*`
  - **Network-First com fallback** para navegação e `/offline`
  - handlers de `push` e `notificationclick` com tracking de clique
- IndexedDB (`amanda_study_planner`) com stores `activities`, `subjects`, `syncQueue`
- Fila FIFO com retry exponencial (30s, 60s, 120s), last-write-wins e sincronização ao reconectar
- Indicador global de offline/fila, prompt de instalação (Android/Desktop) e guia iOS "Adicionar à Tela de Início"
- Cache de atividades (1h), dashboard (1h) e calendário (1h)

## 🧪 Scripts

```bash
npm run dev          # desenvolvimento
npm run build        # build de produção
npm run start        # servidor de produção
npm run type-check   # TypeScript strict
npm test             # Vitest (89 testes)
npm run test:e2e     # Playwright (20 testes: desktop + mobile)
npm run test:db      # instruções pgtap/Supabase
```

## 🗂️ Estrutura

```
src/
├── app/                     # rotas (auth), (main), api
├── features/
│   ├── auth/                # domain → application → infrastructure → presentation
│   ├── activities/          # entidades, regras, filtros, repositórios, formulários
│   ├── calendar/            # regras, formatters, views mês/semana/dia
│   ├── dashboard/           # estatísticas, formatter, componentes
│   ├── notifications/       # formatter, rules, subscription, settings
│   └── subjects/            # gestão de disciplinas
├── lib/auth/                # middleware de autenticação
└── shared/                  # UI, tipos, hooks, IndexedDB, caches, libs
supabase/
├── migrations/
└── functions/send-reminders/
__tests__/                   # Vitest + property-based tests
e2e/                         # Playwright specs
docs/                        # produto, status e referências visuais
```

Cada feature segue camadas **domain → application → infrastructure → presentation**, com repositórios abstraídos e implementações Supabase + demo local.

## 🎨 Referências visuais

As telas seguem `docs/referencias-visuais/`:
- fundo off-white quente e acentos roxo/lilás
- títulos serifados grandes (Playfair Display) e corpo Inter
- cartões arredondados com sombras discretas
- navegação inferior com botão central "+"
- cores pastel por tipo (azul = tarefa, rosa = prova, verde = trabalho)

## 📚 Documentação

- `docs/PRODUCT_SPEC.md` — especificação de produto
- `docs/ordem_specs.md` — ordem de implementação
- `docs/SPECS_STATUS.md` — status dos 8 specs
- `docs/IMPLEMENTATION_STATUS.md` — checklist de implementação e testes
- `.kiro/specs/*` — requirements, design e tasks (todas marcadas)

## ⚠️ Notas

- Sem Supabase, os dados ficam em `.data/db.json` (ignorado pelo Git).
- O envio real de push exige HTTPS (localhost é exceção) e chaves VAPID.
- E2E requer instalar os navegadores do Playwright: `npx playwright install chromium`.
- As migrations usam `pgcrypto`, `pg_cron` (opcional) e RLS por `auth.uid()`.
