# Notificações & Lembretes - Requisitos

## Introdução

O Sistema de Notificações & Lembretes é um componente essencial que mantém os estudantes informados sobre seus compromissos acadêmicos através de notificações proativas via Web Push. O sistema envia lembretes automatizados baseados em tipos de atividades (Provas em 24h, Entregas em 24h, Tarefas em 2-3h) e permite customização completa de preferências de notificação. Integrado com a infraestrutura PWA da aplicação, o sistema funciona tanto online quanto offline, usando a API Web Push padrão com chaves VAPID para segurança e autenticação.

## Glossário

- **Notificação:** Mensagem enviada para o dispositivo do usuário via Web Push
- **Lembrete:** Notificação agendada para um horário específico baseada em regras de tempo
- **Web Push:** API padrão de navegador para enviar notificações mesmo com a app fechada
- **Chaves VAPID:** Par de chaves (pública/privada) usadas para autenticar o servidor de push
- **Subscrição Push:** Registro do dispositivo/navegador que permite receber notificações
- **Endpoint:** URL do servidor de push onde as notificações são entregues (fornecida pelo navegador)
- **Service Worker:** Script de background que gerencia notificações e sincronização offline
- **Prova:** Avaliação acadêmica agendada (teste escrito, oral, prático)
- **Entrega:** Tarefa com deadline (ensaio, projeto, apresentação)
- **Tarefa:** Atividade de estudo pessoal (estudar, fazer exercícios, revisar)
- **Preferências de Notificação:** Configurações de usuário para personalizar tipos e horários de lembretes
- **Permissões do Navegador:** Autorização que o navegador solicita para enviar notificações
- **Server Action:** Função Next.js server-side que gerencia dados e lógica de negócio
- **Supabase:** Backend PostgreSQL com capacidades de tempo real e Edge Functions
- **Edge Function:** Função serverless do Supabase que executa lógica agendada (cron)

## Requisitos

### Requisito 1: Solicitar e Gerenciar Permissões do Navegador

**User Story:** Como um estudante, quero que a aplicação me solicite permissão para enviar notificações de forma clara e não-intrusiva, para que eu possa controlar quando e como recebo lembretes.

#### Critérios de Aceitação

1. QUANDO o usuário acessa a aplicação pela primeira vez, THE Sistema SHALL exibir um banner ou modal com pedido de permissão para notificações
2. O pedido de permissão SHALL exibir uma mensagem clara explicando o benefício (e.g., "Receba lembretes de provas e entregas")
3. O usuário SHALL ter a opção "Permitir", "Agora Não" ou "Nunca" no pedido de permissão
4. WHEN o usuário clica "Permitir", THE Sistema SHALL chamar a Notifications API do navegador com `Notification.requestPermission()`
5. WHEN o navegador concede permissão (estado "granted"), THE Sistema SHALL automaticamente subscrever o usuário às notificações push
6. WHEN o navegador nega permissão (estado "denied"), THE Sistema SHALL permitir que o usuário mude de ideia más tarde via Settings
7. WHEN o usuário clica "Agora Não", THE Sistema SHALL perguntar novamente na próxima sessão (após 7 dias)
8. WHEN o usuário clica "Nunca", THE Sistema SHALL não perguntar novamente e desabilitar a UI de notificações
9. THE Sistema SHALL verificar o estado de permissão no carregamento da página e atualizar a UI (exibir status: "Ativo", "Desabilitado", "Bloqueado pelo navegador")
10. WHEN o usuário desabilita notificações no settings do navegador, THE Sistema SHALL sincronizar o estado e desabilitar notificações da app

#### Critérios de Sucesso

- Permissão solicitada exatamente uma vez ao usuário (não repetir se recusado)
- Estado de permissão sincronizado entre app e navegador
- UI reflete estado correto de permissões
- Usuário pode mudar de ideia e reabilitar notificações via Settings
- Segue padrões UX de web browsers (não é intrusivo)

---

### Requisito 2: Registrar Subscrição Push do Usuário

**User Story:** Como um sistema, quero registrar a subscrição de push do usuário de forma segura no banco de dados, para que eu possa enviar notificações ao dispositivo correto.

#### Critérios de Aceitação

1. WHEN o usuário permite notificações, THE Sistema SHALL registrar a subscrição push no Service Worker
2. THE Service Worker SHALL chamar `registration.pushManager.subscribe()` com a chave VAPID pública
3. WHEN a subscrição é criada, THE Sistema SHALL enviar os detalhes da subscrição (endpoint, p256dh, auth) para um API endpoint `/api/notifications/subscribe`
4. THE `/api/notifications/subscribe` Server Action SHALL validar a subscrição e armazenar no banco Supabase
5. THE banco SHALL armazenar cada subscrição com: userId, endpoint, p256dh, auth, isActive=true, createdAt, updatedAt
6. THE banco SHALL usar Row-Level Security para garantir que o usuário só veja suas próprias subscrições
7. WHEN um usuário já tem uma subscrição ativa, THE Sistema SHALL atualizar a subscrição existente (não criar duplicatas)
8. WHEN a subscrição é armazenada, THE Sistema SHALL responder com status 200 e mensagem de confirmação
9. IF a subscrição falha por erro na API, THE Sistema SHALL retornar erro descriptivo (e.g., "Push subscription failed: Invalid VAPID key")
10. THE Sistema SHALL testar a subscrição enviando uma notificação de teste após o registro

#### Critérios de Sucesso

- Subscrição armazenada corretamente no banco
- Não há subscrições duplicadas por usuário
- Endpoint está acessível e aceita notificações
- Notificação de teste é recebida dentro de 5 segundos
- Segurança: usuário não acessa subscrições de outros usuários

---

### Requisito 3: Configurar Chaves VAPID

**User Story:** Como um admin/desenvolvedor, quero que as chaves VAPID sejam geradas e configuradas, para que o servidor de push possa autenticar e enviar notificações com segurança.

#### Critérios de Aceitação

1. WHEN a aplicação é deployada, THE Chaves VAPID (pública e privada) SHALL estar configuradas nas variáveis de ambiente
2. THE chave VAPID pública SHALL estar acessível no frontend via `process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY`
3. THE chave VAPID privada SHALL estar armazenada apenas no backend em `process.env.VAPID_PRIVATE_KEY` (nunca exposta no frontend)
4. WHEN o servidor envia uma notificação via Web Push API, THE servidor SHALL usar a chave VAPID privada para assinar o JWT
5. THE chave VAPID SHALL estar no formato base64url
6. THE par de chaves VAPID SHALL ser único por ambiente (dev, staging, production)
7. IF uma chave VAPID não está configurada no carregamento da app, THE Sistema SHALL logar erro e desabilitar notificações (fallback graceful)
8. THE Documentação de Setup SHALL explicar como gerar novo par de chaves VAPID usando biblioteca como `web-push`
9. WHEN a chave VAPID é comprometida, THE Admin SHALL poder rotacionar para um novo par sem perder subscrições existentes
10. THE chave VAPID pública SHALL ser incluída no Web App Manifest para PWA support

#### Critérios de Sucesso

- Chaves VAPID configuradas corretamente em todos os ambientes
- Chave privada nunca aparece em logs ou comunicação ao frontend
- Sistema de push autentica corretamente com chaves
- Setup é documentado para facilitar rotação de chaves
- Sem chave = fallback graceful sem quebrar app

---

### Requisito 4: Implementar Service Worker para Receber Notificações

**User Story:** Como um sistema, quero que o Service Worker receba e processe notificações mesmo com a app fechada, para que os lembretes funcionem em background.

#### Critérios de Aceitação

1. THE Service Worker (`/public/service-worker.js`) SHALL estar registrado e ativo quando a app carrega
2. WHEN o servidor envia uma notificação push, THE Service Worker SHALL receber o evento `push`
3. WHEN o evento push é recebido, THE Service Worker SHALL extrair dados da notificação (title, body, icon, tag, data)
4. WHEN a notificação é processada, THE Service Worker SHALL chamar `self.registration.showNotification()` para exibir a notificação no sistema
5. WHEN um usuário clica na notificação, THE Service Worker SHALL receber o evento `notificationclick`
6. WHEN notificationclick ocorre, THE Service Worker SHALL abrir/focar a app no navegador na página correta (e.g., `/calendar` se for sobre prova)
7. THE notificação SHALL incluir um `tag` único para agregar notificações do mesmo tipo (e.g., "exam-reminder" para que não apareça duplicada)
8. WHEN múltiplas notificações com o mesmo `tag` são enviadas, THE notificação anterior SHALL ser substituída (não aparecer spam)
9. THE Service Worker SHALL tomar no máximo 3 segundos para processar a notificação (Chrome timeout)
10. THE Service Worker SHALL tomar no máximo 1 segundo para processar notificationclick (Chrome timeout)

#### Critérios de Sucesso

- Service Worker registra, atualiza automaticamente
- Notificações recebidas e exibidas corretamente
- Cliques em notificações abrem app na página correta
- Sem duplicações de notificações (tag funciona)
- Funciona com app fechada (não requer app ativa)

---

### Requisito 5: Desinscrever de Notificações Push

**User Story:** Como um estudante, quero ser capaz de desabilitar notificações a qualquer momento, para que eu possa parar de receber lembretes se desejar.

#### Critérios de Aceitação

1. WHEN o usuário acessa Settings → Notifications, THE Sistema SHALL exibir opção "Desabilitar Notificações"
2. WHEN o usuário clica "Desabilitar Notificações", THE Sistema SHALL chamar o endpoint `/api/notifications/unsubscribe`
3. THE `/api/notifications/unsubscribe` SHALL desinscrever o usuário chamando `registration.pushManager.getSubscription().then(sub => sub.unsubscribe())`
4. WHEN o usuário se desinscreve, THE banco SHALL marcar a subscrição como `isActive=false` (soft delete)
5. THE banco SHALL manter histórico de subscrições mesmo após unsubscribe para auditoria
6. WHEN um usuário se desinscreve, THE Sistema SHALL parar de enviar notificações imediatamente
7. WHEN um usuário se desinscreve e depois quer reabilitar, THE Sistema SHALL permitir reinscrição (não requer nova permissão do navegador se já foi permitida antes)
8. WHEN o usuário faz logout, THE Sistema SHALL marcar a subscrição como `isActive=false` para segurança
9. WHEN um usuário se desinscreve, THE Sistema SHALL exibir mensagem de confirmação "Notificações desabilitadas"
10. IF o unsubscribe falha por erro, THE Sistema SHALL retornar erro claro e permitir retry

#### Critérios de Sucesso

- Unsubscribe marcado corretamente no banco (isActive=false)
- Notificações param imediatamente após unsubscribe
- Usuário pode reinscrever depois
- Histórico de subscrições é mantido para auditoria
- Sem erros ou regressões na app

---

### Requisito 6: Criar Regras de Lembretes Automáticos

**User Story:** Como um sistema, quero que lembretes sejam agendados automaticamente baseados em tipos de atividades com horários pré-definidos, para que estudantes recebam notificações no tempo certo.

#### Critérios de Aceitação

1. THE Sistema SHALL definir três tipos de lembretes automáticos com horários específicos:
   - **Prova (24h antes):** Notificação enviada 24 horas antes da prova
   - **Entrega (24h antes):** Notificação enviada 24 horas antes do deadline
   - **Tarefa (2-3h antes):** Notificação enviada 2-3 horas antes do deadline
2. WHEN uma Prova é criada com data/hora, THE Sistema SHALL agendar automaticamente um lembrete para 24h antes
3. WHEN uma Entrega é criada com deadline, THE Sistema SHALL agendar automaticamente um lembrete para 24h antes
4. WHEN uma Tarefa é criada com deadline, THE Sistema SHALL agendar automaticamente um lembrete para 2-3h antes (por padrão 3h)
5. THE regras de lembretes SHALL estar definidas em um arquivo de configuração constante (e.g., `src/shared/constants/reminders.ts`)
6. THE regras SHALL permitir customização fácil de horários sem alterar código core
7. WHEN a data/hora de uma atividade é modificada, THE Sistema SHALL atualizar automaticamente o horário de agendamento do lembrete
8. WHEN uma atividade é deletada, THE Sistema SHALL cancelar o lembrete correspondente
9. WHEN uma atividade é marcada como "completed", THE Sistema SHALL cancelar o lembrete (não enviar mais)
10. THE regras de lembretes SHALL estar documentadas claramente no README da feature

#### Critérios de Sucesso

- Lembretes agendados corretamente para cada tipo (24h, 24h, 2-3h)
- Horários são configuráveis sem alterar código core
- Modificações de data/hora atualizam lembretes
- Atividades completadas cancelam lembretes
- Documentação clara sobre as regras

---

### Requisito 7: Implementar Agendador de Lembretes (Edge Function com Cron)

**User Story:** Como um sistema, quero que lembretes sejam enviados automaticamente nos horários corretos via um agendador de background job, para que os estudantes recebam notificações pontualmente mesmo sem usar a app.

#### Critérios de Aceitação

1. THE Sistema SHALL usar Supabase Edge Function com trigger CRON para executar agendador de lembretes a cada 5 minutos
2. THE CRON schedule SHALL ser `*/5 * * * *` (a cada 5 minutos)
3. WHEN o CRON trigger dispara, THE Edge Function SHALL:
   - Consultar banco para todas as subscrições ativas
   - Consultar banco para todas as atividades com lembretes agendados para agora (within 5 minutos)
   - Enviar notificações via Web Push API para cada usuário
4. THE Edge Function SHALL usar Web Push library (e.g., `web-push` para Deno) para enviar notificações
5. WHEN uma notificação é enviada com sucesso, THE Edge Function SHALL registrar o envio no banco (audit log)
6. WHEN uma notificação falha (e.g., endpoint inválido), THE Edge Function SHALL marcar a subscrição como inválida e remover
7. THE Edge Function SHALL ter timeout de 30 segundos (limite do Supabase)
8. THE Edge Function SHALL ser implementada em TypeScript/Deno em `supabase/functions/send-reminders/index.ts`
9. THE Edge Function SHALL retornar status JSON (success, failed_count, error_details)
10. IF Edge Function falha completamente, THE Sistema SHALL retornar erro com retry hint

#### Critérios de Sucesso

- Edge Function executa a cada 5 minutos sem erro
- Notificações enviadas pontualmente (within 5 min de tempo agendado)
- Subscrições inválidas removidas automaticamente
- Envios registrados para auditoria
- Performance: processa 1000 notificações em < 25 segundos

---

### Requisito 8: Implementar Pretty Printer para Dados de Notificação

**User Story:** Como um sistema, quero que mensagens de notificação sejam formatadas consistentemente e de forma legível, para que estudantes recebam lembretes claros e informativos.

#### Critérios de Aceitação

1. THE Pretty Printer SHALL formatar mensagens de notificação como: `{ActivityType}: {Subject} - {DueDate}`
   - Exemplo: "Prova: Cálculo I - 15 de Março às 10:00"
   - Exemplo: "Entrega: Trabalho de Física - 20 de Março"
   - Exemplo: "Tarefa: Revisar capítulos 5-7 - Hoje"
2. THE Pretty Printer SHALL formatar datas como: `DD de {MêsPorExtenso}` (e.g., "15 de Março")
3. THE Pretty Printer SHALL formatar horas como: `HH:MM` em formato 24h (e.g., "14:30")
4. THE Pretty Printer SHALL formatar tipo de atividade com primeira letra maiúscula: "Prova", "Entrega", "Tarefa"
5. THE Pretty Printer SHALL truncar subject names com máximo 30 caracteres (adicionar "..." se maior)
6. THE Pretty Printer SHALL usar linguagem em português (BR) para todos os textos de notificação
7. THE Pretty Printer SHALL incluir contexto claro:
   - "24 horas para Prova" vs "Prova em 24 horas" (deixar claro urgência)
   - "Faltam 3 horas" vs "Em 3 horas" (linguagem natural)
8. THE Notification body SHALL incluir subject ou disciplina para contexto adicional
9. WHEN uma notificação é exibida, THE UI SHALL usar formatação consistente com o restante da app (fonts, cores, espaçamento)
10. THE Pretty Printer SHALL ter testes para validar formatação de datas, horas e truncamento

#### Critérios de Sucesso

- Mensagens formatadas de forma consistente
- Mensagens claras e informativas em português
- Datas e horas formatadas corretamente
- Testes validam formatação
- Sem caracteres quebrados ou encoding issues

---

### Requisito 9: Criar Settings/Preferences de Notificação Customizáveis

**User Story:** Como um estudante, quero customizar quais notificações recebo e em quais horários, para que a app se adapte ao meu estilo de vida e preferências pessoais.

#### Critérios de Aceitação

1. WHEN o usuário acessa Settings → Notifications, THE Sistema SHALL exibir página de Preferências de Notificação
2. THE Preferências de Notificação SHALL permitir customizar:
   - **Toggle para cada tipo:** Receber lembretes de Provas (sim/não), Entregas (sim/não), Tarefas (sim/não)
   - **Tempo de antecedência:** Slider para escolher quando receber lembrete de Tarefa (0-6 horas, padrão 3h)
   - **Horário silencioso:** Time picker para escolher período sem notificações (e.g., 22:00-08:00)
   - **Som de notificação:** Toggle para ativar/desativar som (padrão: ativado)
   - **Vibração:** Toggle para ativar/desativar vibração em mobile (padrão: ativado)
3. WHEN o usuário altera uma preferência, THE alteração SHALL ser salva imediatamente no banco (sem botão "Salvar")
4. THE Banco SHALL armazenar preferências por usuário em tabela `notification_preferences` com campos:
   - userId, remindersEnabled, examsEnabled, assignmentsEnabled, tasksEnabled, taskRemindersHours, quietHoursStart, quietHoursEnd, soundEnabled, vibrationEnabled, updatedAt
5. THE Sistema SHALL usar Row-Level Security para que cada usuário veja só suas preferências
6. WHEN uma preferência é atualizada, THE Server Action SHALL validar valores (e.g., taskRemindersHours 0-6, time format HH:MM)
7. IF validação falha, THE Sistema SHALL retornar erro claro (e.g., "Horário de silêncio deve ser antes das 23:00")
8. WHEN um lembrete é agendado, THE Edge Function SHALL respeitar preferências do usuário (verificar se tipo está habilitado, se está no horário silencioso)
9. WHEN um horário silencioso é ativo, THE Sistema SHALL NÃO enviar notificações (manter alerta no banco para enviar depois)
10. THE Sistema SHALL exibir preview das preferências atuais (e.g., "Você receberá lembretes de Provas 24h antes")

#### Critérios de Sucesso

- Todas as preferências salvas corretamente no banco
- Preferências aplicadas ao agendador (lembretes respeita preferências)
- UI responsiva e intuitiva
- Validação garante valores válidos
- Horário silencioso bloqueia notificações
- Sem lag ao salvar preferências

---

### Requisito 10: Criar Página de Settings de Notificações

**User Story:** Como um estudante, quero acessar uma página dedicada de settings de notificações, para que eu possa gerenciar todas as minhas preferências em um único lugar.

#### Critérios de Aceitação

1. THE Settings página SHALL estar acessível via URL `/app/settings/notifications`
2. THE Settings página SHALL exibir:
   - Status de permissão atual (Ativo, Desabilitado, Bloqueado pelo navegador)
   - Lista de preferências customizáveis (toggles, sliders, time pickers)
   - Botão "Testar Notificação" para enviar notificação de teste
   - Informação sobre quando o último lembrete foi enviado
   - Opção "Desabilitar Notificações" (unsubscribe)
3. WHEN o usuário clica "Testar Notificação", THE Sistema SHALL enviar uma notificação imediata para testar
4. WHEN a notificação de teste é enviada, THE Sistema SHALL exibir mensagem de sucesso "Notificação de teste enviada"
5. IF a notificação de teste falha, THE Sistema SHALL exibir erro claro "Falha ao enviar notificação de teste. Verifique suas permissões."
6. THE Settings página SHALL estar responsiva em mobile, tablet e desktop
7. THE Settings página SHALL ter breadcrumb ou header claro indicando a seção (Settings > Notificações)
8. WHEN o usuário volta à página, THE Settings SHALL carregar com preferências atualizadas
9. THE Settings página SHALL incluir ajuda/documentação sobre cada preferência
10. THE Settings página SHALL usar mesmos componentes UI do resto da app (mantém design consistency)

#### Critérios de Sucesso

- Settings página carrega corretamente
- Todas as preferências são exibidas e editáveis
- Teste de notificação funciona
- Página responsiva em todos devices
- Componentes UI consistentes com rest da app
- Sem erros ou crashes

---

### Requisito 11: Criar Notificação de Teste

**User Story:** Como um estudante, quero testar se notificações estão funcionando antes de confiar no sistema, para que eu tenha certeza que receberei lembretes importantes.

#### Critérios de Aceitação

1. WHEN o usuário clica "Enviar Notificação de Teste" em Settings, THE Sistema SHALL enviar uma notificação com payload de teste
2. THE Notificação de teste SHALL ter:
   - Title: "Notificação de Teste"
   - Body: "Sistema de notificações está funcionando corretamente!"
   - Icon: App icon padrão
   - Tag: "test-notification"
3. WHEN o usuário recebe a notificação de teste, THE sistema SHALL registrar no banco que o teste foi enviado (para auditoria)
4. WHEN o usuário clica na notificação de teste, THE app SHALL abrir na página de Settings > Notifications
5. THE Notificação de teste SHALL ser enviada via mesmo pipeline de outras notificações (não é caso especial)
6. IF a subscrição do usuário não existir ou estiver inválida, THE Sistema SHALL exibir erro "Notificações não estão habilitadas"
7. IF o envio falhar por qualquer razão (rede, servidor), THE Sistema SHALL exibir erro com instruções (e.g., "Tente novamente em alguns segundos")
8. THE Notificação de teste SHALL ser enviada dentro de 2 segundos (immediate)
9. WHEN a notificação de teste é enviada com sucesso, THE UI SHALL exibir feedback visual (toast ou mensagem)
10. THE Sistema SHALL permitir enviar múltiplas notificações de teste sem delay (para facilitar debug)

#### Critérios de Sucesso

- Notificação de teste enviada e recebida corretamente
- Usuário vê confirmação de sucesso
- Clique abre app em Settings correto
- Audit log registra envio
- Funciona em todos navegadores (Chrome, Firefox, Safari)

---

### Requisito 12: Implementar Retreatment de Notificações Falhadas

**User Story:** Como um sistema, quero retentar envio de notificações que falharam, para que mensagens importantes não sejam perdidas por erros temporários.

#### Critérios de Aceitação

1. WHEN uma notificação falha por erro temporário (network timeout, 5xx server error), THE Edge Function SHALL retentar
2. THE Retry strategy SHALL ser exponencial backoff: 1 min, 5 min, 15 min, 1 hora (total 4 tentativas)
3. WHEN uma subscrição retorna erro 410 (Gone) ou 404 (Not Found), THE Sistema SHALL marcar como inválida e remover (não retentar)
4. WHEN uma subscrição retorna erro 429 (Too Many Requests), THE Sistema SHALL retentar com backoff
5. WHEN uma subscrição retorna erro 500 (Server Error), THE Sistema SHALL retentar com backoff
6. THE Tentativas SHALL ser registradas no banco em tabela `notification_delivery_log` com: notificationId, userId, subscriptionId, attempt, status, error, timestamp
7. WHEN máximo de tentativas é atingido (4 falhas), THE Sistema SHALL:
   - Registrar falha permanente no log
   - Enviar email para o usuário notificando que notificações não estão funcionando
   - Marcar subscrição como `needsRevalidation=true`
8. WHEN uma subscrição é marcada como `needsRevalidation=true`, THE app SHALL solicitar ao usuário para reautorizar notificações
9. THE Retry logic SHALL ser implementada em Edge Function com queue ou delayed execution
10. THE Sistema SHALL ter métricas de sucesso/falha de notificações para monitoramento

#### Critérios de Sucesso

- Falhas temporárias retentadas corretamente
- Subscrições inválidas removidas (não retry infinito)
- Log detalhado de tentativas
- Usuário notificado após falha permanente
- Métricas disponíveis para monitoramento
- Sem perda de dados ou notificações

---

### Requisito 13: Implementar Sincronização de Subscrições Entre Dispositivos

**User Story:** Como um estudante com múltiplos dispositivos, quero que meus settings de notificação sejam sincronizados, para que eu receba notificações em todos meus dispositivos e não tenha que configurar em cada um.

#### Critérios de Aceitação

1. WHEN um usuário se loga em múltiplos dispositivos, THE Sistema SHALL permitir que todos recebam notificações
2. WHEN um usuário cria subscrição em novo dispositivo, THE Sistema SHALL armazenar como nova subscrição (não substituir a anterior)
3. THE Banco SHALL permitir múltiplas subscrições por usuário (um por dispositivo/navegador)
4. WHEN um usuário altera preferences em um dispositivo, THE alteração SHALL ser refletida em todos os dispositivos
5. WHEN um usuário desabilita notificações em um dispositivo, THE outros dispositivos ainda podem receber
6. WHEN um usuário desabilita notificações globalmente (unsubscribe), THE todos os dispositivos param de receber
7. THE Sistema SHALL sincronizar preferences em tempo real (usando Supabase real-time ou polling)
8. WHEN um novo dispositivo se conecta, THE Sistema SHALL carregar preferences globais do usuário
9. WHEN um dispositivo fica offline, THE preferences descidas do último sync válido até reconectar
10. THE Sistema SHALL permitir view/gerenciar todas as subscrições ativas em Settings (listar dispositivos)

#### Critérios de Sucesso

- Notificações funcionam em múltiplos dispositivos simultaneamente
- Preferences sincronizadas entre dispositivos
- Sem duplicação de notificações (enviada uma vez por dispositivo)
- Desabilitar em um dispositivo não afeta outro
- Dispositivos listados corretamente em Settings

---

### Requisito 14: Implementar Compatibilidade e Fallback para Navegadores

**User Story:** Como um desenvolvedor, quero que o sistema funcione gracefully em navegadores que não suportam Web Push, para que nenhum usuário fique excluído.

#### Critérios de Aceitação

1. WHEN um navegador não suporta Web Push (e.g., Safari < 16, navegadores antigos), THE app SHALL exibir mensagem clara explicando limitação
2. WHEN Web Push não é suportado, THE app SHALL:
   - Desabilitar UI de notificações (toggle ficará desabilitado)
   - Exibir mensagem "Seu navegador não suporta notificações push. Atualize para a versão mais recente."
   - Não quebrar app ou gerar erros
3. WHEN Web Push é suportado mas permissão foi bloqueada permanentemente, THE app SHALL exibir instruções para reabilitar em settings do navegador
4. WHEN um navegador não tem Service Worker support, THE app SHALL skiptar registration e exibir mensagem não-intrusiva
5. WHEN Notification API não está disponível, THE app SHALL gracefully fallback (não tentar call undefined APIs)
6. THE App SHALL verificar features e exibir UI apropriada baseada no que é suportado
7. WHEN um navegador não suporta uma feature específica (e.g., vibração), THE Sistema SHALL desabilitar esse toggle específico
8. THE Fallback messages SHALL ser claras e helpful (não técnicas)
9. QUANDO suporte é adicionado (e.g., navegador atualiza), THE app SHALL detectar automaticamente e reabilitar features
10. THE Testes SHALL validar comportamento em navegadores com e sem suporte

#### Critérios de Sucesso

- App funciona em todos navegadores (com ou sem Web Push)
- Mensagens de fallback claras
- Sem console errors ou crashes
- Features desabilitadas gracefully
- Suporte detectado automaticamente

---

### Requisito 15: Implementar Logging e Auditoria de Notificações

**User Story:** Como um admin/desenvolvedor, quero ter logs detalhados de todas as notificações enviadas, para que eu possa monitorar, debugar e auditar o sistema.

#### Critérios de Aceitação

1. THE Sistema SHALL logar TODAS as notificações enviadas em tabela `notification_logs` com:
   - notificationId (UUID)
   - userId
   - subscriptionId
   - activityId (relacionado à atividade que disparou lembrete)
   - activityType (Task, Exam, Assignment)
   - title, body (mensagem)
   - sentAt (timestamp)
   - status (success, failed, retrying)
   - error (se falhou)
   - deviceInfo (navegador, OS - opcional)
2. THE Sistema SHALL logar quando notificações são clicadas (evento notificationclick) em tabela `notification_clicks` com:
   - notificationId
   - userId
   - clickedAt (timestamp)
   - referrer (página de origem)
3. WHEN um usuário clica em notificação, THE app SHALL rastrear que evento e registrar em analytics
4. THE Logs SHALL ser acessíveis apenas por admin via dashboard de auditoria
5. THE Logs SHALL ser mantidos por mínimo 90 dias (período de retenção configurável)
6. THE Logs podem ser exportados em CSV/JSON para auditoria externa
7. THE Sistema SHALL ter métricas agregadas (dashboard):
   - Total notificações enviadas (today, week, month)
   - Taxa de sucesso vs falha
   - Tempo médio de entrega
   - Taxa de click
   - Dispositivos únicos
8. WHEN um erro ocorre no agendador ou Edge Function, THE erro SHALL ser registrado com stack trace completo
9. THE Logging não deve impactar performance (usar background jobs se necessário)
10. THE Logs devem ter rotação automática (arquivamento de logs antigos)

#### Critérios de Sucesso

- Todos os envios registrados em log
- Cliques rastreados
- Dashboard de métricas funcional
- Logs acessíveis por admin
- Sem impacto de performance
- Conformidade com retenção de dados

---

### Requisito 16: Implementar Otimização de Performance para Notificações

**User Story:** Como um sistema, quero que notificações sejam processadas e entregues com alta performance, para que os estudantes recebam lembretes pontualmente sem delay.

#### Critérios de Aceitação

1. THE Edge Function para enviar lembretes SHALL processar 1000+ notificações em < 25 segundos (timeout Supabase)
2. WHEN uma notificação é enviada, THE latência de entrega SHALL ser < 5 segundos (desde agendamento até chegada no dispositivo)
3. THE Query para buscar lembretes agendados SHALL ter índice no banco em (userId, scheduledTime, activityId)
4. THE Query para buscar subscrições ativas SHALL ter índice em userId e isActive
5. THE Edge Function SHALL usar batch requests para Web Push API (enviar múltiplas notificações em paralelo)
6. WHEN múltiplas notificações estão pendentes, THE Sistema SHALL priorizar por urgência (Prova 24h > Entrega 24h > Tarefa)
7. THE Sistema SHALL ter circuit breaker para o serviço de push (se falha > 10%, para tentar por 5 min)
8. THE Subscrições expiradas (10+ falhas) SHALL ser limpas automaticamente para não sobrecarregar queries
9. THE Frontend registo de Service Worker SHALL usar lazy loading (não bloqueia page load)
10. THE Push payload SHALL ser mantido pequeno (< 2KB) para performance em conexões lentes

#### Critérios de Sucesso

- Edge Function processa rápido (< 25 seg)
- Latência de entrega < 5 seg
- Database queries eficientes com índices
- Batch processing de notificações
- Sem impacto no page load
- Circuit breaker protege contra cascata de falhas

---

### Requisito 17: Implementar Testes para Sistema de Notificações

**User Story:** Como um desenvolvedor, quero que o sistema de notificações tenha testes abrangentes, para que eu tenha confiança que funciona corretamente.

#### Critérios de Aceitação

1. THE Sistema SHALL ter testes unitários para:
   - Pretty Printer (formatação de mensagens) - 100% coverage
   - Rules (cálculo de tempos de lembrete) - 100% coverage
   - Validators (validação de subscrições, preferences) - 100% coverage
2. THE Sistema SHALL ter testes de integração para:
   - Subscribe flow (solicitar permissão → registrar subscrição)
   - Unsubscribe flow
   - Preferences update flow
3. THE Sistema SHALL ter testes E2E para:
   - Usuário recebe notificação quando atividade é criada
   - Clique em notificação abre app corretamente
   - Settings de notificação persistem
4. THE Testes de push SHALL usar mock de Web Push API (não enviar notificações reais em testes)
5. THE Testes SHALL usar test database limpo a cada run
6. THE Testes de Edge Function SHALL ser implementados em pgtap (SQL tests) para validar lógica
7. WHEN testes rodam, THE Coverage deve ser > 80% para código critical
8. THE Testes devem executar em < 5 minutos (CI/CD fast feedback)
9. THE Sistema SHALL ter testes de acessibilidade para Settings página
10. THE Testes devem validar edge cases:
   - Subscrição duplicada
   - Usuário com múltiplos dispositivos
   - Lembrete para atividade deletada
   - Timezone handling para horário silencioso

#### Critérios de Sucesso

- > 80% code coverage para critical paths
- Testes rodam em < 5 min
- Todos testes passam em CI/CD
- E2E testes validam fluxos reais
- Edge cases cobertos

---

### Requisito 18: Implementar Retenção de Dados de Notificação

**User Story:** Como um sistema, quero que dados de notificações sejam retidos e limpados apropriadamente, para que o banco não cresça indefinidamente.

#### Critérios de Aceitação

1. THE Notification logs (`notification_logs`) SHALL ser retidos por 90 dias (período configurável)
2. THE Notification clicks (`notification_clicks`) SHALL ser retidos por 180 dias
3. AFTER retenção expira, THE dados SHALL ser automaticamente deletados via job nightly
4. BEFORE deletar dados, THE Sistema SHALL arquivar em backup (para compliance)
5. THE Deleted notification subscriptions (`isActive=false`) SHALL ser retidos por 30 dias antes de hard delete
6. THE Sistema SHALL ter view de "Retenção de Dados" em Settings mostrando quando dados serão deletados
7. IF um usuário deleta sua conta, THE todas as notificações/subscrições/preferences SHALL ser deletadas imediatamente (GDPR)
8. THE Limpeza de dados não deve impactar performance (rodar em off-peak hours, usar batch delete)
9. THE Sistema SHALL ter alertas se retenção ficar muito grande (e.g., > 1GB de logs)
10. THE Política de retenção SHALL ser documentada no README da feature

#### Critérios de Sucesso

- Dados antigos automaticamente deletados
- Backup arquivado antes de delete
- Sem impacto de performance
- GDPR compliant (delete ao deletar conta)
- Política clara e documentada

---

### Requisito 19: Implementar Dependências e Pré-Requisitos

**User Story:** Como um desenvolvedor, quero que o sistema de notificações funcione corretamente com as features que já existem, para que não haja conflitos ou dados inconsistentes.

#### Critérios de Aceitação

1. THE Sistema de Notificações DEPENDS ON:
   - **Autenticação (Auth Setup):** Usuários devem estar logados para receber notificações
   - **Activities (CRUD):** Notificações são agendadas quando atividades são criadas/modificadas
   - **Calendar (View):** Notificações quando clicadas abrem Calendar
   - **Dashboard:** Notificações referem-se a atividades mostradas no Dashboard
2. WHEN uma atividade é criada, THE lembrete é automaticamente agendado (dependência: Activities)
3. WHEN uma atividade é deletada, THE lembrete correspondente é cancelado (sync com Activities)
4. WHEN um usuário faz logout, THE subscrições são marcadas como inactive (sync com Auth)
5. WHEN um usuário faz login, THE subscrições são reativadas se ainda válidas
6. THE Schema do banco deve ser migração separada mas deve ser executada APÓS migrações de Activities
7. THE Edge Function deve rodar SÓ APÓS todas as activities estão criadas no banco (depende da feature Activities)
8. THE Notificação deve incluir link/contexto que funciona com as outras features (Calendar, Dashboard)
9. IF uma feature dependência falha, THE notificações devem falhar gracefully (não quebrar app)
10. THE Documentação deve deixar claro a ordem de dependencies (Spec 7 depends on Specs 1-6)

#### Critérios de Sucesso

- Sem ciclos de dependência
- Atividades e notificações sincronizadas
- Login/logout sincroniza subscrições
- Cliques em notificações abrem contexto correto
- Documentação clara sobre dependencies

---

### Requisito 20: Implementar Métricas de Sucesso e Monitoramento

**User Story:** Como um product manager, quero ter visibilidade sobre adoção e efetividade do sistema de notificações, para que eu possa tomar decisões baseadas em dados.

#### Critérios de Aceitação

1. THE Sistema SHALL rastrear essas métricas (via analytics ou dashboard):
   - **Adoption:** % de usuários que habilitaram notificações (alvo: 70%+)
   - **Engagement:** % de notificações que foram clicadas (alvo: 60%+)
   - **Delivery Rate:** % de notificações entregues com sucesso (alvo: 99%+)
   - **Timing Accuracy:** % de notificações entregues within 5 seg do agendado (alvo: 95%+)
   - **Device Coverage:** Média de dispositivos subscritos por usuário (alvo: 1.5+)
2. WHEN métricas são coletadas, THE dados devem ser exportados para analytics backend (e.g., Mixpanel, Amplitude)
3. THE Dashboard admin deve exibir essas métricas com gráficos time-series
4. WHEN uma métrica fica abaixo do alvo, THE Sistema SHALL gerar alertas para revisar
5. THE Eventos rastreados devem incluir: subscription created, notification sent, notification clicked, preferences updated
6. WHEN um evento é rastreado, THE payload deve incluir user context (userId, timestamp, device info)
7. THE Analytics não deve rastrear dados sensíveis (nunca conteúdo de notificação, apenas metadata)
8. THE Métricas devem ser acessíveis em dashboard via admin panel ou exportáveis em CSV
9. THE Sistema deve ter alertas configuráveis (se delivery < 95%, alertar)
10. SUCCESS da feature será medida por: adoption > 70%, engagement > 60%, delivery > 99%

#### Critérios de Sucesso

- Todos as métricas rastreadas e visíveis
- Dashboard mostra trend e comparativos
- Alertas funcionam para anomalias
- Sem dados sensíveis em analytics
- Alvo de sucesso > 70% adoption

