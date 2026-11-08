# Especificação de Requisitos - auth-setup

## Introdução

Esta especificação define os requisitos para a primeira feature do Amanda's Study Planner: **auth-setup**. Este módulo estabelece as fundações do aplicativo, implementando autenticação segura com Supabase, gerenciamento de sessão, proteção de rotas e configuração inicial do PWA. O módulo é crítico pois desbloqueia todas as demais features e garante que apenas usuários autenticados acessem seus dados pessoais.

---

## Glossário

- **Usuário:** Entidade que representa uma estudante autenticada no sistema
- **Sessão:** Estado de autenticação do usuário, gerenciado por token JWT
- **Supabase Auth:** Serviço de autenticação gerenciado utilizado para validar credenciais
- **Token JWT:** JSON Web Token utilizado para manter a sessão autenticada
- **Rota Protegida:** Página ou endpoint que requer autenticação válida para acesso
- **PWA:** Progressive Web App - aplicativo web que funciona offline e é instalável
- **Manifest.json:** Arquivo de configuração que define metadados e comportamento do PWA
- **Service Worker:** Script executado em background para caching, offline e notificações
- **localStorage:** Armazenamento persistente no navegador (até ~5-10MB)
- **Middleware de Autenticação:** Camada que valida autenticação antes de processar requisições
- **Validação Zod:** Biblioteca TypeScript para validação estruturada de dados em runtime
- **CSRF:** Cross-Site Request Forgery - ataque de requisição forjada entre sites

---

## Requisitos

### Requisito 1: Autenticação por Email e Senha (Login)

**User Story:** Como uma estudante, quero fazer login com email e senha para acessar minha área pessoal do aplicativo.

#### Critérios de Aceitação

1. QUANDO a estudante acessa a rota `/login`, O SISTEMA SHALL exibir um formulário com campos para email e senha
2. QUANDO a estudante insere credenciais válidas e clica "Entrar", O SUPABASE_AUTH SHALL validar as credenciais contra a base de dados
3. QUANDO as credenciais são válidas, O SISTEMA SHALL receber um token JWT do Supabase e armazenar na sessão
4. QUANDO as credenciais são válidas, O SISTEMA SHALL redirecionar a estudante para a rota `/dashboard`
5. IF as credenciais são inválidas, THEN O SISTEMA SHALL exibir mensagem de erro clara: "Email ou senha incorretos"
6. WHEN uma estudante tenta fazer login, O VALIDADOR SHALL validar o email com padrão RFC 5322 simplificado
7. WHEN uma estudante tenta fazer login, O VALIDADOR SHALL validar que a senha contém no mínimo 8 caracteres
8. WHERE o login é realizado via formulário HTML com método POST, O SISTEMA SHALL proteger contra CSRF nativo do Next.js
9. WHEN o servidor Supabase está indisponível, THEN O SISTEMA SHALL retornar erro 503 com mensagem: "Serviço temporariamente indisponível"
10. WHEN o token JWT expira, THEN O SISTEMA SHALL solicitar re-autenticação silenciosamente no background se disponível refresh token

---

### Requisito 2: Registro de Nova Conta (Sign-up)

**User Story:** Como uma estudante nova, quero criar uma conta com email e senha para começar a usar o aplicativo.

#### Critérios de Aceitação

1. WHEN a estudante acessa a rota `/register`, O SISTEMA SHALL exibir um formulário com campos: email, senha e confirmação de senha
2. WHEN a estudante preenche o formulário e clica "Criar Conta", O VALIDADOR SHALL validar:
   - Email é válido (padrão RFC 5322 simplificado)
   - Senha contém no mínimo 8 caracteres
   - Senhas nos campos "Senha" e "Confirmação" são idênticas
3. IF alguma validação falha, THEN O SISTEMA SHALL exibir mensagem de erro específica para cada campo
4. WHEN todas as validações passam, O SUPABASE_AUTH SHALL criar nova conta com as credenciais fornecidas
5. IF o email já existe no banco de dados, THEN O SISTEMA SHALL retornar erro: "Este email já está registrado"
6. WHEN a conta é criada com sucesso, O SISTEMA SHALL gerar e armazenar token JWT
7. WHEN a conta é criada com sucesso, O SISTEMA SHALL redirecionar a estudante para `/dashboard`
8. WHEN a estudante envia o formulário, O SISTEMA SHALL registrar log de criação de conta (sem armazenar dados sensíveis)

---

### Requisito 3: Recuperação de Senha (Forgot Password)

**User Story:** Como uma estudante que esqueceu sua senha, quero receber um email de recuperação para redefinir minha senha com segurança.

#### Critérios de Aceitação

1. WHEN a estudante clica "Esqueceu a senha?" na tela de login, O SISTEMA SHALL exibir formulário com campo de email
2. WHEN a estudante insere email válido e clica "Enviar Link", O SUPABASE_AUTH SHALL procurar a conta associada
3. IF a conta existe, THEN O SUPABASE_AUTH SHALL gerar link de recuperação único e enviar por email
4. IF a conta não existe, THEN O SISTEMA SHALL exibir mensagem neutra: "Se este email está registrado, você receberá um email com instruções"
5. WHEN a estudante clica no link recebido por email, O SISTEMA SHALL validar o token de recuperação
6. WHEN o token é válido, O SISTEMA SHALL exibir formulário para redefinir senha com campos "Nova Senha" e "Confirmar Senha"
7. WHEN a estudante submete a nova senha, O VALIDADOR SHALL validar que a senha tem no mínimo 8 caracteres
8. WHEN a senha é válida, O SUPABASE_AUTH SHALL atualizar a senha no banco de dados
9. WHEN a senha é atualizada, O SISTEMA SHALL redirecionar a estudante para `/login` com mensagem: "Senha redefinida com sucesso"
10. IF o token de recuperação expirou (válido por 24 horas), THEN O SISTEMA SHALL exibir erro: "Link expirado, solicite novo link" e redirecionar para `/forgot-password`

---

### Requisito 4: Gerenciamento de Sessão com JWT

**User Story:** Como estudante autenticada, quero que minha sessão persista no navegador para não precisar fazer login novamente, e que a sessão expire automaticamente após inatividade por segurança.

#### Critérios de Aceitação

1. WHEN a estudante faz login com sucesso, O SISTEMA SHALL armazenar o token JWT em cookie seguro (HttpOnly, Secure, SameSite)
2. WHILE a estudante navega no aplicativo, O SISTEMA SHALL validar a presença do token JWT a cada requisição
3. WHEN a estudante recarrega a página, O SISTEMA SHALL restaurar automaticamente a sessão sem novo login (se token válido)
4. WHEN o token JWT está próximo de expirar (últimas 5 minutos de validade), O SISTEMA SHALL tentar renovar silenciosamente usando refresh token
5. IF o refresh token é válido, THEN O SISTEMA SHALL emitir novo token JWT sem interrupção do usuário
6. IF o refresh token expirou ou é inválido, THEN O SISTEMA SHALL realizar logout automático e redirecionar para `/login`
7. WHEN a estudante fica inativa por 30 dias, O TOKEN_REFRESH SHALL expirar e O SISTEMA SHALL fazer logout automático
8. WHEN o token expira, O SISTEMA SHALL limpar todos os dados de sessão do navegador (cookies, localStorage de autenticação)
9. WHERE a sessão é armazenada, O SISTEMA SHALL utilizar cookies com flags HttpOnly, Secure e SameSite=Strict
10. WHEN uma estudante acessa rota autenticada, O MIDDLEWARE_AUTH SHALL validar token antes de renderizar página

---

### Requisito 5: Proteção de Rotas Autenticadas

**User Story:** Como desenvolvedor, quero que rotas do aplicativo sejam protegidas para garantir que apenas usuários autenticados as acessem.

#### Critérios de Aceitação

1. WHEN uma estudante não autenticada tenta acessar `/dashboard`, O SISTEMA SHALL redirecionar para `/login`
2. WHEN uma estudante não autenticada tenta acessar `/activities`, O SISTEMA SHALL redirecionar para `/login`
3. WHEN uma estudante não autenticada tenta acessar `/calendar`, O SISTEMA SHALL redirecionar para `/login`
4. WHEN uma estudante não autenticada tenta acessar `/settings`, O SISTEMA SHALL redirecionar para `/login`
5. WHEN uma estudante não autenticada tenta acessar qualquer rota sob `(main)/*`, O MIDDLEWARE_AUTH SHALL verificar token válido
6. WHERE a rota é pública (login, register, forgot-password), O SISTEMA SHALL permitir acesso sem autenticação
7. WHEN uma estudante autenticada tenta acessar `/login`, O SISTEMA SHALL redirecionar para `/dashboard`
8. WHEN uma estudante autenticada tenta acessar `/register`, O SISTEMA SHALL redirecionar para `/dashboard`
9. WHEN uma estudante autenticada tenta acessar `/forgot-password`, O SISTEMA SHALL redirecionar para `/dashboard`
10. WHEN a proteção de rota falha, O MIDDLEWARE_AUTH SHALL retornar erro 401 Unauthorized com resposta apropriada

---

### Requisito 6: Logout e Limpeza de Dados

**User Story:** Como estudante, quero fazer logout do aplicativo e ter certeza de que meus dados sensíveis foram limpos do navegador.

#### Critérios de Aceitação

1. WHEN a estudante clica no botão "Logout" no aplicativo, O SISTEMA SHALL invalidar o token JWT no servidor Supabase
2. WHEN o logout é solicitado, O SISTEMA SHALL deletar o cookie de autenticação do navegador
3. WHEN o logout é solicitado, O SISTEMA SHALL limpar todos os dados do localStorage relacionados à autenticação
4. WHEN o logout é solicitado, O SISTEMA SHALL limpar todos os dados do sessionStorage relacionados a usuário
5. WHEN o logout é concluído, O SISTEMA SHALL redirecionar para `/login` com mensagem: "Logout realizado com sucesso"
6. WHEN o logout é executado, O SISTEMA SHALL também revogar subscriptions do Realtime do Supabase (se houver)
7. IF o logout falha no servidor, THEN O SISTEMA SHALL limpar dados locais mesmo assim e exibir erro: "Erro ao fazer logout, mas sua sessão foi encerrada localmente"
8. WHEN a estudante fecha o navegador, O COOKIE_SESSION SHALL ser mantido (persistente) para próxima sessão se ainda válido
9. WHERE uma estudante faz logout, O SISTEMA SHALL registrar log do logout sem armazenar dados sensíveis

---

### Requisito 7: Persistência de Sessão no Navegador

**User Story:** Como estudante, quero que minha sessão seja lembrada quando volto ao aplicativo, para não precisar fazer login novamente, a menos que tenha feito logout explicitamente.

#### Critérios de Aceitação

1. WHEN a estudante faz login com sucesso, O TOKEN_JWT SHALL ser armazenado em cookie persistente (não é removido ao fechar navegador)
2. WHEN a estudante fecha e reabre o navegador, O SISTEMA SHALL verificar a presença do token JWT
3. IF o token JWT é válido, THEN O SISTEMA SHALL restaurar automaticamente a sessão autenticada
4. WHEN a estudante volta ao aplicativo com sessão restaurada, O SISTEMA SHALL carregar o dashboard sem exigir novo login
5. IF o token JWT expirou mas refresh token é válido, THEN O SISTEMA SHALL renovar o token automaticamente
6. IF ambos token e refresh token expiraram, THEN O SISTEMA SHALL fazer logout automático silencioso
7. WHERE dados sensíveis são armazenados no navegador, O SISTEMA SHALL armazenar apenas em cookies HttpOnly ou sessionStorage encriptado
8. WHEN localStorage é consultado para recuperar sessão, O SISTEMA SHALL validar integridade dos dados

---

### Requisito 8: Setup Inicial do Tema PWA

**User Story:** Como administrador da aplicação, quero configurar os metadados do PWA para que o aplicativo seja instalável e funcione como um app nativo no celular da estudante.

#### Critérios de Aceitação

1. WHEN o aplicativo é acessado em um navegador PWA-compatível, O MANIFEST_JSON SHALL estar acessível em `/public/manifest.json`
2. WHEN o aplicativo é carregado, O SISTEMA SHALL incluir link no `<head>`: `<link rel="manifest" href="/manifest.json">`
3. WHEN o manifest é lido, O SISTEMA SHALL conter os seguintes campos obrigatórios:
   - `name`: "Amanda's Study Planner"
   - `short_name`: "Study Planner"
   - `start_url`: "/"
   - `display`: "standalone"
   - `icons`: Array com ícones 192x192 e 512x512 em formato PNG
   - `theme_color`: "#7c3aed" (roxo primário)
   - `background_color`: "#ffffff" (branco)
4. WHEN o navegador analisa o manifest, O SISTEMA SHALL exibir prompt "Instalar no início" em dispositivos mobile
5. WHEN a estudante clica "Instalar", O NAVEGADOR SHALL criar atalho na home screen com ícone do app
6. WHEN a estudante abre o app instalado, O APP SHALL aparecer em modo "standalone" (sem barra de endereço)
7. WHEN a estudante abre o app instalado, O STATUS_BAR SHALL aparecer com cor theme_color (#7c3aed)
8. WHERE ícones são especificados, O SISTEMA SHALL incluir:
   - Ícone 192x192px para home screen
   - Ícone 512x512px para splash screen
   - Formato recomendado: PNG com fundo transparente ou sólido
9. WHEN o app é instalado via PWA, O SISTEMA SHALL incluir `<meta name="theme-color" content="#7c3aed">`
10. WHEN o app é instalado via PWA, O SISTEMA SHALL incluir `<meta name="apple-mobile-web-app-capable" content="yes">` para suporte iOS

---

### Requisito 9: Integração com Supabase Auth

**User Story:** Como desenvolvedor, quero que a autenticação esteja integrada com Supabase Auth para gerenciar usuários com segurança e confiabilidade.

#### Critérios de Aceitação

1. WHEN o aplicativo inicia, O SUPABASE_CLIENT SHALL conectar à instância Supabase configurada via variáveis de ambiente
2. WHEN credenciais de login são enviadas, O SUPABASE_AUTH SHALL comunicar com servidor Supabase via HTTPS
3. WHEN a autenticação é bem-sucedida, O SUPABASE_AUTH SHALL retornar token JWT válido
4. WHEN a autenticação falha, O SUPABASE_AUTH SHALL retornar código de erro específico (invalid_credentials, user_not_found)
5. WHEN um novo usuário é registrado, O SUPABASE_AUTH SHALL criar entrada em tabela `auth.users`
6. WHEN um usuário é criado, O SISTEMA SHALL criar automaticamente registro na tabela `public.users` (via Supabase Trigger ou aplicação)
7. WHEN a senha é recuperada, O SUPABASE_AUTH SHALL enviar email com link de reset assinado e com token seguro
8. WHEN token é renovado, O SUPABASE_AUTH SHALL validar refresh token antes de emitir novo JWT
9. WHEN a sessão é verificada, O MIDDLEWARE_AUTH SHALL chamar `getSession()` do Supabase para validar token atual
10. WHEN há mudanças nas configurações de Supabase (variáveis de ambiente), O APLICATIVO SHALL ser redeploy automaticamente

---

### Requisito 10: Validação de Entrada com Zod

**User Story:** Como desenvolvedor, quero que todas as entradas de formulário sejam validadas estruturadamente com Zod para garantir dados consistentes e prevenir erros.

#### Critérios de Aceitação

1. WHEN um formulário é submetido, O VALIDADOR SHALL usar esquemas Zod definidos em `/src/features/auth/presentation/schemas/`
2. WHERE a validação de login existe, O SCHEMA_LOGIN SHALL exigir:
   - `email`: string válido, não vazio
   - `password`: string com mínimo 8 caracteres
3. WHERE a validação de registro existe, O SCHEMA_REGISTER SHALL exigir:
   - `email`: string válido, não vazio
   - `password`: string com mínimo 8 caracteres
   - `passwordConfirm`: string idêntico a `password`
4. WHERE a validação de reset de senha existe, O SCHEMA_RESET SHALL exigir:
   - `newPassword`: string com mínimo 8 caracteres
   - `newPasswordConfirm`: string idêntico a `newPassword`
5. WHEN validação falha, O SISTEMA SHALL retornar array de erros com campo e mensagem em português claro
6. WHEN validação passa no cliente, O SERVIDOR SHALL validar novamente com mesmo esquema (validação dupla)
7. WHERE esquemas Zod existem, O SISTEMA SHALL manter sincronização com tipos TypeScript via `z.infer<typeof schema>`
8. WHEN dados inválidos são recebidos, O SERVIDOR SHALL retornar erro 400 Bad Request com detalhes do erro

---

### Requisito 11: Componentes de UI para Autenticação

**User Story:** Como desenvolvedor, quero componentes React reutilizáveis para formulários de autenticação que sejam acessíveis e consistentes com design do aplicativo.

#### Critérios de Aceitação

1. WHEN a rota `/login` é renderizada, O COMPONENTE_LOGINFORM SHALL exibir campos de email, senha e botão "Entrar"
2. WHEN a rota `/register` é renderizada, O COMPONENTE_REGISTERFORM SHALL exibir campos de email, senha, confirmação e botão "Criar Conta"
3. WHERE componentes de formulário existem, O SISTEMA SHALL usar componentes shadcn/ui base (Input, Button, Form, etc.)
4. WHEN um campo de entrada tem erro, O FORMULÁRIO SHALL exibir mensagem de erro em vermelho abaixo do campo
5. WHERE um formulário é submetido, O BOTÃO SHALL mostrar loading spinner enquanto requisição está em progresso
6. WHEN a requisição está em andamento, O BOTÃO SHALL estar desabilitado para prevenir submissões duplicadas
7. WHERE links de navegação existem (ex: "Não tem conta? Registre-se"), O SISTEMA SHALL usar `<Link>` do Next.js para navegação rápida
8. WHEN um formulário está em estado de carregamento, O FORMULÁRIO SHALL exibir skeleton loaders ou estado disabled
9. WHERE componentes de formulário são reutilizáveis, O SISTEMA SHALL aceitar props para customização (placeholder, label, error, onChange)

---

### Requisito 12: Server Actions para Autenticação

**User Story:** Como desenvolvedor, quero usar Server Actions do Next.js para autenticação, reduzindo requisições de rede e melhorando segurança.

#### Critérios de Aceitação

1. WHEN um formulário de login é submetido, O ACTION_LOGIN SHALL ser uma Server Action em `/src/features/auth/presentation/actions/loginAction.ts`
2. WHEN O ACTION_LOGIN é executado, O SISTEMA SHALL:
   - Validar inputs com esquema Zod
   - Chamar `login()` use case da camada application
   - Definir cookie de autenticação no servidor
   - Redirecionar para `/dashboard` em sucesso
3. WHEN um formulário de registro é submetido, O ACTION_REGISTER SHALL ser uma Server Action em `/src/features/auth/presentation/actions/registerAction.ts`
4. WHEN O ACTION_REGISTER é executado, O SISTEMA SHALL:
   - Validar inputs com esquema Zod
   - Chamar `register()` use case da camada application
   - Definir cookie de autenticação no servidor
   - Redirecionar para `/dashboard` em sucesso
5. WHEN um logout é solicitado, O ACTION_LOGOUT SHALL ser uma Server Action em `/src/features/auth/presentation/actions/logoutAction.ts`
6. WHEN O ACTION_LOGOUT é executado, O SISTEMA SHALL:
   - Limpar cookie de autenticação
   - Chamar logout do Supabase Auth
   - Redirecionar para `/login`
7. WHEN uma Server Action é executada, O SISTEMA SHALL usar `"use server"` directive no topo do arquivo
8. WHERE Server Actions são chamadas, O CLIENTE SHALL usar `startTransition()` para manter UI responsiva durante requisição
9. IF uma Server Action falha, THEN O SISTEMA SHALL retornar erro com campo `error` para exibição no cliente

---

### Requisito 13: Middleware de Autenticação

**User Story:** Como desenvolvedor, quero um middleware centralizado que valide autenticação em todas as rotas protegidas do aplicativo.

#### Critérios de Aceitação

1. WHEN uma requisição é feita a qualquer rota, O MIDDLEWARE_AUTH SHALL interceptar antes de processar
2. WHERE o middleware existe, O ARQUIVO SHALL estar em `/src/lib/auth/middleware.ts`
3. WHEN uma rota protegida é acessada, O MIDDLEWARE SHALL:
   - Extrair token JWT do cookie
   - Validar integridade e validade do token
   - Se válido: permitir acesso
   - Se inválido: redirecionar para `/login`
4. WHEN o token JWT está ausente, THEN O MIDDLEWARE SHALL redirecionar para `/login`
5. WHEN o token JWT está expirado, THEN O MIDDLEWARE SHALL tentar renovar com refresh token
6. IF refresh token também está expirado, THEN O MIDDLEWARE SHALL redirecionar para `/login`
7. WHERE o middleware é aplicado, O SISTEMA SHALL incluir na `next.config.js`:
   ```
   matcher: ['/(main)/:path*', '/api/:path*']
   ```
8. WHEN middleware é executado, O SISTEMA SHALL ter overhead mínimo (< 50ms)

---

### Requisito 14: Gerenciamento de Erros de Autenticação

**User Story:** Como usuário final, quero mensagens de erro claras e acionáveis quando algo der errado na autenticação.

#### Critérios de Aceitação

1. IF email ou senha estão incorretos, THEN O SISTEMA SHALL exibir: "Email ou senha incorretos"
2. IF o email já está registrado no registro, THEN O SISTEMA SHALL exibir: "Este email já está registrado"
3. IF as senhas não coincidem, THEN O SISTEMA SHALL exibir: "As senhas não conferem"
4. IF a senha é muito curta, THEN O SISTEMA SHALL exibir: "Senha deve ter no mínimo 8 caracteres"
5. IF o email é inválido, THEN O SISTEMA SHALL exibir: "Email inválido"
6. IF o servidor Supabase está indisponível, THEN O SISTEMA SHALL exibir: "Serviço temporariamente indisponível, tente novamente em alguns momentos"
7. IF há erro de conexão de rede, THEN O SISTEMA SHALL exibir: "Erro de conexão, verifique sua internet"
8. IF o link de recuperação de senha expirou, THEN O SISTEMA SHALL exibir: "Link expirou, solicite um novo"
9. WHEN um erro é exibido, O SISTEMA SHALL manter dados do formulário no caso de retentar (exceto senha)
10. WHERE erros são exibidos, O COMPONENTE SHALL usar cores padronizadas (vermelho para erro #ef4444)

---

### Requisito 15: Testes de Autenticação

**User Story:** Como desenvolvedor, quero testes automatizados que validem todos os fluxos de autenticação para garantir confiabilidade.

#### Critérios de Aceitação

1. WHERE testes de unidade existem, O SISTEMA SHALL ter testes para:
   - Validação de email válido/inválido
   - Validação de senha válida/inválida
   - Schemas Zod para login, registro, reset
2. WHERE testes de integração existem, O SISTEMA SHALL ter testes para:
   - Fluxo completo de login
   - Fluxo completo de registro
   - Fluxo completo de recuperação de senha
   - Fluxo de logout
3. WHERE testes E2E existem, O SISTEMA SHALL ter testes para:
   - Usuário faz login com credenciais válidas e é redirecionado
   - Usuário tenta login com credenciais inválidas e vê erro
   - Usuário faz registro com dados novos e está autenticado
   - Usuário clica logout e é redirecionado para login
4. WHEN testes são executados, O COMANDO `npm run test` SHALL rodar testes com Vitest
5. WHEN testes E2E são executados, O COMANDO `npm run test:e2e` SHALL rodar com Playwright
6. WHEN testes falharem, O CI/CD SHALL bloquear merge para main branch

---

## Propiedades de Correção (Correctness Properties)

Estas propriedades devem ser garantidas através de testes automatizados:

### 1. Invariante: Autenticação Válida após Login
- **Propriedade:** Após um login bem-sucedido, `getSession()` deve retornar sessão válida
- **Teste:** PBT - gerar múltiplas credenciais válidas, fazer login, verificar `getSession()`
- **Padrão:** Invariant

### 2. Invariante: Limpeza Completa após Logout
- **Propriedade:** Após logout, não deve haver cookie de autenticação, localStorage deve estar limpo
- **Teste:** Fazer logout, verificar ausência de dados sensíveis no navegador
- **Padrão:** Invariant

### 3. Round-Trip: Parse/Print de Token JWT
- **Propriedade:** `decode(encode(payload)) == payload` para tokens JWT
- **Teste:** Gerar token, decodificar, verificar campos
- **Padrão:** Round-Trip

### 4. Metamórfico: Sessão Persiste Através de Recargas
- **Propriedade:** `len(sessao_antes) < len(sessao_depois_reload)` - sessão não piora
- **Teste:** Fazer login, recarregar página, verificar sessão restaurada
- **Padrão:** Metamorphic

### 5. Idempotência: Múltiplos Logouts
- **Propriedade:** `logout() = logout() = logout()` - segundo logout não quebra sistema
- **Teste:** Fazer logout 2x, sistema deve ser resiliente
- **Padrão:** Idempotence

### 6. Confluência: Ordem de Operações
- **Propriedade:** Token refresh antes vs durante logout não deve causar race conditions
- **Teste:** Simular refresh e logout simultâneos, verificar consistência
- **Padrão:** Confluence

### 7. Validação de Erros: Credenciais Inválidas
- **Propriedade:** Qualquer credencial mal formatada gera erro apropriado
- **Teste:** Enviar emails inválidos, senhas curtas, etc., verificar erros
- **Padrão:** Error Conditions

---

## Critérios de Sucesso

- ✅ Todos os 15 requisitos implementados e testados
- ✅ 100% das rotas autenticadas protegidas
- ✅ Todos os testes de unidade, integração e E2E passando
- ✅ Zero vulnerabilidades OWASP Top 10 relacionadas a autenticação (CWE-352 CSRF, CWE-384 Session Fixation, etc.)
- ✅ Tempo de login < 2 segundos em conexão normal
- ✅ Manifest.json válido (validável em https://www.pwabuilder.com/)
- ✅ Ícones PWA 192x192 e 512x512 em formato otimizado
- ✅ Sessão restaurada corretamente após recarregamento de página
- ✅ Logout remove completamente dados do navegador

