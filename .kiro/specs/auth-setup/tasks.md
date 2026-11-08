# Tarefas de Implementação - auth-setup

## Visão Geral

Este documento descreve as tarefas concretas para implementar a feature **auth-setup**. Cada tarefa é pequena, testável e sequenciada para permitir progresso iterativo.

**Total estimado:** 2-3 dias | **Dependências:** Nenhuma (feature bloqueadora) | **Teste:** Unit + Integration + E2E

---

## 📚 Skills Relacionadas

Antes de começar, ative as skills correspondentes para referência:

1. **next-js-server-actions** - Padrões para Server Actions e Route Handlers
   - Usar para: Tarefas da Fase 5 (Server Actions + Middleware)
   - Referência em tasks: 5.1, 5.2, 7.1
   - Link: `.kiro/skills/next-js-server-actions/SKILL.md`

2. **pwa-offline-patterns** - Setup PWA, Service Worker, Web App Manifest
   - Usar para: Tarefas da Fase 8 (Setup PWA)
   - Referência em tasks: 8.1, 8.2
   - Link: `.kiro/skills/pwa-offline-patterns/SKILL.md`
   - **Nota:** Nesta spec, usaremos apenas o setup básico do PWA (manifest.json, meta tags, ícones). Service Worker, offline sync e push notifications serão implementados na Spec 7 (notifications-system).

**Como usar as skills:**
- Abra a skill correspondente quando chegar em uma tarefa marcada com a tag
- Use os exemplos e patterns do skill como referência
- Adapte o código para o contexto do projeto Amanda's Study Planner
- Respeite o tech stack do projeto (Next.js 14+, TypeScript, Supabase Auth)

---

## Fase 1: Setup de Base (Dia 1 - Manhã)

### 1.1 Criar estrutura de diretórios e arquivos de configuração

- [x] Criar diretório `/src/features/auth/` com sub-estrutura (domain, application, infrastructure, presentation)
- [x] Criar arquivos vazios de tipos e interfaces base
- [x] Configurar `tsconfig.json` para paths alias `@/features/auth`
- [x] Adicionar variáveis de ambiente em `.env.example`

**Saída esperada:** Estrutura vazia pronta para implementação

**Testes:** Nenhum (setup)

**Skills utilizadas:** `clean-architecture-patterns` - seguir padrão de camadas (domain → application → infrastructure → presentation)

---

### 1.2 Configurar Supabase localmente e criar tabelas

- [x] Inicializar Supabase localmente com `supabase start`
- [x] Criar migrations SQL para tabela `public.users` (com trigger de sync)
- [x] Configurar RLS (Row-Level Security) para `public.users`
- [x] Gerar tipos TypeScript com `supabase gen types typescript`

**Saída esperada:** Supabase funcional com schema correto

**Testes:** Nenhum (infraestrutura)

**Skills utilizadas:** `database-queries` - criar tabelas e configurar RLS; `supabase-setup` - inicialização e migrações

---

### 1.3 Criar domain layer: entidade User e interfaces

- [x] Implementar `/src/features/auth/domain/user.ts` com interface `User`
- [x] Implementar `/src/features/auth/domain/repository.ts` com interface `IAuthRepository`
- [x] Implementar `/src/features/auth/domain/errors.ts` com tipos de erro customizados
- [x] Adicionar comentários descrevendo invariantes

**Saída esperada:** Domain types tipados e comentados

**Testes:**
- [x] Unit test: `domain/user.ts` - validar que User segue invariantes
- [x] Unit test: `domain/errors.ts` - verificar erro types

**Skills utilizadas:** `clean-architecture-patterns` - implementar domain entities e repository interfaces; `testing-setup` - configurar testes unitários

---

## Fase 2: Infrastructure Layer (Dia 1 - Tarde)

### 2.1 Implementar supabaseAuthService

- [x] Criar `/src/features/auth/infrastructure/supabaseAuthService.ts`
- [x] Implementar `login()` - chamar Supabase.signInWithPassword()
- [x] Implementar `register()` - chamar Supabase.signUp()
- [x] Implementar `logout()` - chamar Supabase.signOut()
- [x] Implementar `getSession()` - chamar Supabase.getSession()
- [x] Implementar `resetPassword()` - chamar Supabase.resetPasswordForEmail()
- [x] Implementar `updatePassword()` - chamar Supabase.updateUser()
- [x] Adicionar tratamento de erros e mapeamento de códigos Supabase

**Saída esperada:** Serviço Supabase funcional

**Testes:**
- [x] Integration test: `infrastructure/supabaseAuthService.test.ts`
  - [x] login com credenciais válidas retorna token
  - [x] login com credenciais inválidas retorna erro
  - [x] register cria usuário e retorna sessão
  - [x] register com email existente retorna erro
  - [x] logout invalida token
  - [x] getSession com token válido retorna usuário

**Skills utilizadas:** `error-handling` - mapear erros Supabase; `fetching-data` - integração com Supabase client

---

### 2.2 Implementar user mapper

- [x] Criar `/src/features/auth/infrastructure/mappers/userMapper.ts`
- [x] Implementar `mapSupabaseUserToUser()` - converter user Supabase para domain User
- [x] Testar mapping com dados de exemplo

**Saída esperada:** Mapper funcionando

**Testes:**
- [x] Unit test: converter usuário Supabase para domain User corretamente

**Skills utilizadas:** `clean-architecture-patterns` - implementar data mapper pattern

---

## Fase 3: Application Layer (Dia 1 - Final)

### 3.1 Implementar use cases

- [x] Criar `/src/features/auth/application/useCases/login.ts`
  - [x] Orquestrar validação + chamada ao repository
  - [x] Retornar Result<SessionResponse, AuthError>
- [x] Criar `/src/features/auth/application/useCases/register.ts`
  - [x] Orquestrar validação + chamada ao repository
- [x] Criar `/src/features/auth/application/useCases/logout.ts`
- [x] Criar `/src/features/auth/application/useCases/verifySession.ts`
- [x] Criar `/src/features/auth/application/useCases/resetPassword.ts`
- [x] Criar `/src/features/auth/application/useCases/updatePassword.ts`

**Saída esperada:** Use cases com orquestração correcta

**Testes:**
- [x] Unit test: cada use case com inputs válidos/inválidos
- [x] Integration test: use cases com mock do repository

**Skills utilizadas:** `clean-architecture-patterns` - implementar use cases; `testing-setup` - testes unitários e integração

---

### 3.2 Implementar DTOs

- [x] Criar `/src/features/auth/application/dto/LoginDTO.ts`
- [x] Criar `/src/features/auth/application/dto/RegisterDTO.ts`
- [x] Criar `/src/features/auth/application/dto/UserResponseDTO.ts`
- [x] Criar `/src/features/auth/application/dto/ErrorResponseDTO.ts`
- [x] Adicionar tipos TypeScript com `z.infer`

**Saída esperada:** DTOs tipados

**Testes:** Nenhum (tipos apenas)

**Skills utilizadas:** `clean-architecture-patterns` - implementar DTO pattern

---

## Fase 4: Presentation Layer - Validação (Dia 2 - Manhã)

### 4.1 Implementar schemas Zod

- [x] Criar `/src/features/auth/presentation/schemas/loginSchema.ts`
  - [x] Email: válido, não vazio
  - [x] Senha: min 8 caracteres
- [x] Criar `/src/features/auth/presentation/schemas/registerSchema.ts`
  - [x] Email: válido, não vazio
  - [x] Senha: min 8 caracteres
  - [x] Confirmação: idêntica à senha
- [x] Criar `/src/features/auth/presentation/schemas/resetPasswordSchema.ts`
  - [x] Senha: min 8 caracteres
  - [x] Confirmação: idêntica à senha

**Saída esperada:** Schemas Zod para validação

**Testes:**
- [x] Unit test: schemas validam inputs válidos
- [x] Unit test: schemas rejeitam inputs inválidos (email mal formatado, senhas curtas, mismatch)

**Skills utilizadas:** `form-handling` - criar schemas Zod para validação de formulários

---

## Fase 5: Presentation Layer - Server Actions (Dia 2)

### 5.1 Implementar Server Actions

**Skills relacionadas:** next-js-server-actions

- [x] Criar `/src/features/auth/presentation/actions/loginAction.ts` (Server Action)
  - [x] Usar padrão do skill: "use server" directive
  - [x] Validar input com loginSchema (Zod)
  - [x] Chamar login use case
  - [x] Definir cookie com flags HttpOnly, Secure, SameSite=Strict
  - [x] Redirecionar em sucesso via redirect() do Next.js
  - [x] Retornar erro estruturado se falha (não redirectionar)
  - [x] Referência: skill "Server Action with Redirect"
  
- [x] Criar `/src/features/auth/presentation/actions/registerAction.ts`
  - [x] Mesmo padrão do loginAction
  - [x] Validar que senhas conferem (registerSchema)
  - [x] Criar usuário via Supabase Auth
  - [x] Auto-login após sucesso
  
- [x] Criar `/src/features/auth/presentation/actions/logoutAction.ts`
  - [x] Chamar logout use case no Supabase
  - [x] Deletar todos os cookies de autenticação
  - [x] Usar revalidatePath('/dashboard') para limpar cache
  - [x] Redirecionar para /login
  - [x] Referência: skill "Server Action with Revalidation"
  
- [x] Criar `/src/features/auth/presentation/actions/resetPasswordAction.ts`
  - [x] Validar email format
  - [x] Chamar Supabase resetPasswordForEmail()
  - [x] Retornar sucesso mesmo se email não existe (segurança - não divulgar se email registrado)
  - [x] Email será enviado com link contendo token de reset
  
- [x] Criar `/src/features/auth/presentation/actions/updatePasswordAction.ts`
  - [x] Validar token + nova senha (resetPasswordSchema)
  - [x] Verificar que token não expirou
  - [x] Chamar updatePassword use case do Supabase
  - [x] Redirecionar para /login com mensagem de sucesso
  - [x] Tratar erro de token expirado (4xx)

**Saída esperada:** Server Actions funcionando conforme patterns do skill

**Testes:**
- [x] Integration test: loginAction com credenciais válidas/inválidas
- [x] Integration test: registerAction evita duplicação de email
- [x] Integration test: cookies HttpOnly são definidos corretamente
- [x] Integration test: logoutAction limpa cookies
- [x] Integration test: resetPasswordAction funciona mesmo sem email válido (segurança)

**Skills utilizadas:** `next-js-server-actions` - Server Actions com "use server", redirect(), revalidatePath(); `error-handling` - tratamento de erros estruturado

---

### 5.2 Implementar Middleware de Autenticação

**Skills relacionadas:** next-js-server-actions

- [x] Criar `/src/lib/auth/middleware.ts`
  - [x] Usar padrão do skill: NextMiddleware com NextRequest/NextResponse
  - [x] Definir rotas públicas (/login, /register, /forgot-password)
  - [x] Extrair token do cookie de requisição
  - [x] Validar JWT (verificar expiração e signature)
  - [x] Permitir acesso a rotas públicas sem token
  - [x] Bloquear rotas protegidas se sem token válido
  - [x] Tentar renovar token se próximo de expirar (usar refresh token)
  - [x] Redirecionar para /login em erro de autenticação
  - [x] Performance target: overhead < 50ms
  - [x] Referência: skill padrão de middleware, não está explícito mas segue padrão

- [x] Configurar `next.config.js`
  - [x] Adicionar matcher para aplicar middleware:
    ```
    matcher: ['/(main)/:path*', '/api/:path*', '/dashboard/:path*']
    ```
  - [x] Garantir que middleware roda nas rotas protegidas

- [x] Criar `/src/lib/auth/helpers.ts` (funcões utilitárias)
  - [x] `verifyJWT()` - validar e decodificar JWT
  - [x] `extractTokenFromRequest()` - extrair token do cookie
  - [x] `isTokenExpiring()` - verificar se token expira em breve (próximos 5 min)
  - [x] `createAuthenticatedSupabaseClient()` - criar cliente com token
  - [x] Usar padrão de type-safety (TypeScript strict)

**Saída esperada:** Middleware protegendo rotas

**Testes:**
- [x] Integration test: acesso a /dashboard sem token redireciona para /login
- [x] Integration test: acesso a /dashboard com token válido permite acesso
- [x] Integration test: acesso a /login com token válido redireciona para /dashboard
- [x] Integration test: token expirado tenta renovar ou força logout
- [x] Performance test: middleware overhead < 50ms

**Skills utilizadas:** `next-js-server-actions` - middleware com NextMiddleware, NextRequest/NextResponse; `error-handling` - tratamento de erro de autenticação

---

## Fase 6: Presentation Layer - Componentes (Dia 2 - Tarde)

### 6.1 Implementar componentes de formulário

- [x] Criar `/src/features/auth/presentation/components/LoginForm.tsx`
  - [x] Renderizar campos email + senha
  - [x] Usar shadcn/ui Input, Button, Form
  - [x] Exibir loading state ao submeter
  - [x] Exibir erro em campo específico
  - [x] Link para /register
  - [x] Link para /forgot-password
- [x] Criar `/src/features/auth/presentation/components/RegisterForm.tsx`
  - [x] Similar ao LoginForm + campo de confirmação
  - [x] Link para /login
- [x] Criar `/src/features/auth/presentation/components/ForgotPasswordForm.tsx`
  - [x] Campo email apenas
  - [x] Mensagem de sucesso neutra
  - [x] Link para /login
- [x] Criar `/src/features/auth/presentation/components/ResetPasswordForm.tsx`
  - [x] Receber token da URL
  - [x] Campos: nova senha + confirmação
  - [x] Validar token antes de renderizar
  - [x] Mensagem de sucesso após reset

**Saída esperada:** Formulários funcionando

**Testes:**
- [x] Component test: LoginForm renderiza campos corretos
- [x] Component test: botão desabilitado durante submissão
- [x] Component test: erro exibido ao falhar autenticação
- [x] Component test: ResetPasswordForm valida token

**Skills utilizadas:** `form-handling` - React Hook Form + Zod validation; `ui-components` - shadcn/ui Input, Button, Form; `testing-setup` - component tests com React Testing Library

---

### 6.2 Implementar páginas de autenticação

- [x] Criar `/src/app/(auth)/login/page.tsx`
  - [x] Renderizar LoginForm
  - [x] Layout simples (sem header/nav)
  - [x] Redirecionar para /dashboard se já autenticado
- [x] Criar `/src/app/(auth)/register/page.tsx`
  - [x] Similar ao /login
- [x] Criar `/src/app/(auth)/forgot-password/page.tsx`
  - [x] Renderizar ForgotPasswordForm
- [x] Criar `/src/app/(auth)/reset-password/page.tsx`
  - [x] Renderizar ResetPasswordForm
  - [x] Validar token da URL
- [x] Criar `/src/app/(auth)/layout.tsx`
  - [x] Layout compartilhado para rotas de auth
  - [x] Sem header, apenas formulário centralizado
  - [x] Estilos básicos com Tailwind

**Saída esperada:** Rotas de autenticação funcionando

**Testes:**
- [x] E2E: usuário acessa /login e vê formulário
- [x] E2E: usuário acessa /register e vê formulário
- [x] E2E: usuário sem autenticação não pode acessar /dashboard

**Skills utilizadas:** `ui-components` - criar layouts com Tailwind; `testing-setup` - E2E tests com Playwright

---

### 6.3 Implementar Auth Provider (Context)

- [x] Criar `/src/features/auth/presentation/components/AuthProvider.tsx`
  - [x] Context para expor `user` e `isLoading`
  - [x] Verificar sessão no mount (fetch `/api/auth/me`)
  - [x] Sincronizar com estado global
- [x] Criar `/src/features/auth/presentation/hooks/useAuth.ts`
  - [x] Hook para consumir AuthContext
  - [x] Throw error se usado fora do provider

**Saída esperada:** Context e hook funcionando

**Testes:**
- [x] Unit test: useAuth fora do provider throw error
- [x] Component test: AuthProvider renderiza children

**Skills utilizadas:** `fetching-data` - fetch `/api/auth/me` no mount; `testing-setup` - testes com React Testing Library

---

## Fase 7: Rotas da API (Dia 2 - Final)

### 7.1 Implementar rotas de API protegidas

- [x] Criar `/src/app/api/auth/me/route.ts` (GET)
  - [x] Verificar token do cookie
  - [x] Retornar usuário autenticado ou 401
- [x] Criar `/src/app/api/auth/logout/route.ts` (POST)
  - [x] Deletar cookies
  - [x] Retornar 200 OK
- [x] Criar `/src/app/api/auth/refresh/route.ts` (POST)
  - [x] Renovar token usando refresh token
  - [x] Retornar novo JWT ou 401

**Saída esperada:** Rotas de API funcionando

**Testes:**
- [x] Integration test: GET /api/auth/me com token válido retorna usuário
- [x] Integration test: GET /api/auth/me sem token retorna 401
- [x] Integration test: POST /api/auth/logout deleta cookies

**Skills utilizadas:** `fetching-data` - Route Handlers com Next.js; `error-handling` - tratamento de erros HTTP (401, 403)

---

## Fase 8: Setup do PWA (Dia 3 - Manhã)

**Skills relacionadas:** pwa-offline-patterns

### 8.1 Criar arquivos PWA

- [x] Criar `/public/manifest.json` (usar skill como template)
  - [x] Name: "Amanda's Study Planner"
  - [x] short_name: "Study Planner"
  - [x] start_url: "/"
  - [x] display: "standalone"
  - [x] scope: "/"
  - [x] theme_color: "#7c3aed" (roxo primário)
  - [x] background_color: "#ffffff"
  - [x] Icons array com 2 entradas:
    - [x] 192x192.png (purpose: "any")
    - [x] 512x512.png (purpose: "any")
  - [x] Adicionar fields opcionais do skill: orientation, categories
  - [x] Validar com https://www.pwabuilder.com/ no final
  - [x] Referência: skill "Web App Manifest"

- [x] Criar/otimizar ícones em `/public/icons/`
  - [x] icon-192x192.png (192x192 px)
  - [x] icon-512x512.png (512x512 px)
  - [x] favicon.ico (32x32 px, formato .ico)
  - [x] Requisitos: PNG ou ICO, fundo sólido ou transparente
  - [x] Otimizar com ferramentas (TinyPNG, ImageOptim)
  - [x] Cada ícone < 50KB
  - [x] Usar cores do design: roxo (#7c3aed) como cor primária

**Saída esperada:** Manifest válido, ícones otimizados

**Testes:** Nenhum (validação manual com PWA Builder)

**Skills utilizadas:** `pwa-setup` - criar Web App Manifest, ícones para PWA

---

### 8.2 Configurar meta tags no root layout

**Skills relacionadas:** pwa-offline-patterns

- [x] Editar `/src/app/layout.tsx`
  - [x] Adicionar `Metadata` do Next.js:
    - [x] `manifest: '/manifest.json'`
    - [x] `themeColor: '#7c3aed'`
    - [x] `appleWebApp.capable: true`
    - [x] `appleWebApp.statusBarStyle: 'black-translucent'`
    - [x] `appleWebApp.title: 'Study Planner'`
  - [x] Adicionar meta tags no `<head>`:
    - [x] `<link rel="manifest" href="/manifest.json">`
    - [x] `<meta name="theme-color" content="#7c3aed">`
    - [x] `<meta name="apple-mobile-web-app-capable" content="yes">`
    - [x] `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`
    - [x] `<meta name="apple-mobile-web-app-title" content="Study Planner">`
    - [x] `<meta name="mobile-web-app-capable" content="yes">`
    - [x] `<link rel="apple-touch-icon" href="/icons/icon-192x192.png">`
  - [x] Adicionar Viewport via `Viewport` export:
    - [x] width: "device-width"
    - [x] initialScale: 1
    - [x] minimumScale: 1
    - [x] userScalable: true
    - [x] viewportFit: "cover"
  - [x] Referência: skill "Root Layout Configuration"

- [x] Testar em Chrome DevTools
  - [x] Abrir Application > Manifest
  - [x] Verificar que manifest.json é carregado corretamente
  - [x] Verificar que ícones aparecem
  - [x] Testar prompt "Add to home screen" (Chrome Mobile)
  - [x] Verificar que app abre em modo "standalone"

**Saída esperada:** PWA installável em desktop/mobile

**Testes:** Nenhum (manual verification em Chrome/Firefox/Safari)

**Skills utilizadas:** `pwa-setup` - configurar meta tags e viewport para PWA; `ui-components` - layout root com Tailwind

---

## Fase 9: Testes Completos (Dia 3)

### 9.1 Testes unitários

- [x] Unit tests para todos os schemas Zod
- [x] Unit tests para domain layer (User, errors)
- [x] Unit tests para mappers
- [x] Coverage target: 85%+

**Comando:** `npm run test`

**Saída esperada:** Todos os testes passando

**Skills utilizadas:** `testing-setup` - Vitest para unit tests

---

### 9.2 Testes de integração

- [x] Integration tests para supabaseAuthService
- [x] Integration tests para use cases
- [x] Integration tests para Server Actions (com mock)
- [x] Integration tests para Middleware
- [x] Coverage target: 75%+

**Comando:** `npm run test`

**Saída esperada:** Todos os testes passando

**Skills utilizadas:** `testing-setup` - Vitest para integration tests; `error-handling` - testes de erro scenarios

---

### 9.3 Testes E2E (Playwright)

- [x] E2E: usuário faz login com credenciais válidas
- [x] E2E: usuário tenta login com credenciais inválidas e vê erro
- [x] E2E: usuário faz registro com email novo
- [x] E2E: usuário não pode registrar com email existente
- [x] E2E: usuário faz logout e é redirecionado para /login
- [x] E2E: sessão persiste após reload de página
- [x] E2E: usuário sem autenticação não pode acessar /dashboard
- [x] Coverage: todos os fluxos críticos cobertos

**Comando:** `npm run test:e2e`

**Saída esperada:** Todos os testes passando

**Skills utilizadas:** `testing-setup` - Playwright para E2E tests

---

## Fase 10: Verificação Final (Dia 3 - Tarde)

### 10.1 Security checklist

- [x] Validar que tokens são armazenados em cookies HttpOnly
- [x] Validar que senha nunca é exibida em console/devtools
- [x] Validar que CSRF protection está ativa (cookies SameSite)
- [x] Validar que erro de login não revela se email existe
- [x] Testar com OWASP ZAP ou similar (opcional)

**Saída esperada:** ✅ Sem vulnerabilidades críticas

---

### 10.2 Performance checklist

- [x] Login completo < 2 segundos
- [x] Register completo < 2 segundos
- [x] Middleware overhead < 50ms
- [x] Session restore (reload) < 500ms
- [x] Medir com Chrome DevTools Lighthouse

**Saída esperada:** ✅ Performance aceitável

---

### 10.3 Compatibility checklist

- [x] Testar em Chrome Desktop
- [x] Testar em Firefox Desktop
- [x] Testar em Safari Desktop
- [x] Testar em Chrome Mobile
- [x] Testar em Safari iOS
- [x] Validar PWA install prompt (Chrome Mobile)

**Saída esperada:** ✅ Funcional em todos os browsers

---

## Resumo de Progresso

| Fase | Tarefa | Status |
|------|--------|--------|
| 1 | Setup de base | ✅ |
| 1 | Supabase setup | ✅ |
| 1 | Domain layer | ✅ |
| 2 | supabaseAuthService | ✅ |
| 2 | User mapper | ✅ |
| 3 | Use cases | ✅ |
| 3 | DTOs | ✅ |
| 4 | Zod schemas | ✅ |
| 5 | Server Actions | ✅ |
| 5 | Middleware | ✅ |
| 6 | Componentes | ✅ |
| 6 | Páginas | ✅ |
| 6 | AuthProvider | ✅ |
| 7 | API routes | ✅ |
| 8 | PWA manifest | ✅ |
| 8 | Meta tags | ✅ |
| 9 | Unit tests | ✅ |
| 9 | Integration tests | ✅ |
| 9 | E2E tests | ✅ |
| 10 | Security review | ✅ |
| 10 | Performance review | ✅ |
| 10 | Compatibility | ✅ |

---

## Critério de Conclusão

A feature **auth-setup** está concluída quando:

✅ Todas as 22 tarefas estão marcadas como concluídas
✅ 100% dos testes unitários, integração e E2E passam
✅ Nenhuma vulnerabilidade OWASP identificada
✅ Performance atende requisitos (< 2s login)
✅ PWA installável e funcional
✅ Code review aprovado
✅ Deploy realizado em staging

