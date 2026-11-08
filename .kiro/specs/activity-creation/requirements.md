# Especificação de Requisitos - activity-creation

## Introdução

Esta especificação define os requisitos para a segunda feature do Amanda's Study Planner: **activity-creation**. Este módulo implementa a criação de três tipos de atividades acadêmicas (Tarefas, Provas e Trabalhos) com validação rigorosa, sincronização automática entre visualizações e integração com Server Actions do Next.js. Esta feature desbloqueia o valor central do aplicativo: permitir que estudantes centralizem todas as suas atividades acadêmicas em um único lugar, com criação rápida (< 30 segundos) e estruturada por tipo.

---

## Glossário

- **Atividade:** Entidade genérica que representa uma tarefa, prova ou trabalho acadêmico
- **Tarefa (Task):** Atividade de estudo pessoal com título, descrição, prazo e prioridade
- **Prova (Exam):** Atividade avaliativa em disciplina específica com data, hora, conteúdos e tipo
- **Trabalho (Assignment):** Atividade de entrega em disciplina específica com descrição, tipo e critérios
- **Disciplina (Subject):** Matéria ou disciplina acadêmica (ex: Cálculo I, História)
- **Prioridade:** Nível de importância da tarefa (Baixa, Média, Alta)
- **Status:** Estado atual da atividade (A fazer, Em progresso, Concluída para Tarefas; Pendente, Entregue, Avaliado para Trabalhos)
- **Modal:** Componente UI sobreposto que captura interação do usuário
- **Zod Schema:** Esquema de validação estruturado para dados em runtime
- **Server Action:** Função Next.js executada no servidor, chamada pelo cliente
- **Sincronização:** Propagação automática de mudanças entre Dashboard, Calendário e Listas
- **RLS (Row-Level Security):** Políticas Supabase que garantem isolamento de dados por usuário
- **UUID:** Identificador único universal (128 bits, formato texto)
- **Timestamp:** Data e hora em formato ISO 8601 (UTC)

---

## Requisitos

### Requisito 1: Modal de Seleção de Tipo de Atividade

**User Story:** Como estudante, quero clicar em "+ Nova Atividade" e ver um modal escolhendo entre 3 tipos (Tarefa, Prova, Trabalho) para iniciar a criação adequada.

#### Critérios de Aceitação

1. WHEN a estudante clica no botão "+ Nova Atividade" no Dashboard, O SISTEMA SHALL exibir modal com título "Novo"
2. WHEN o modal é exibido, O SISTEMA SHALL mostrar 3 opções de tipo:
   - "Tarefa" com ícone de checklist
   - "Prova" com ícone de formulário
   - "Trabalho" com ícone de documento
3. WHEN a estudante clica em uma opção, O SISTEMA SHALL exibir formulário específico para aquele tipo
4. WHEN a estudante clica no botão "Fechar" ou fora do modal, O MODAL SHALL fechar sem criar atividade
5. WHEN o modal está aberto, O BACKGROUND SHALL estar escurecido (overlay)
6. WHERE o modal está acessível, O SISTEMA SHALL incluir atalho de teclado (tecla Escape para fechar)
7. WHEN o formulário é exibido após seleção, O MODAL SHALL transicionar suavemente para novo conteúdo
8. WHEN a estudante navega para outra página, O MODAL SHALL fechar automaticamente

---

### Requisito 2: Formulário de Criação de Tarefa (Task)

**User Story:** Como estudante, quero preencher um formulário estruturado para criar uma tarefa com título, descrição, prazo, prioridade e outros detalhes.

#### Critérios de Aceitação

1. WHEN a estudante seleciona "Tarefa", O SISTEMA SHALL exibir formulário com campos:
   - Título (obrigatório, text input, max 200 caracteres)
   - Descrição (opcional, textarea, max 2000 caracteres)
   - Disciplina (opcional, select dropdown com lista dinâmica)
   - Prazo (opcional, date picker com input hora opcional)
   - Prioridade (obrigatório, radio buttons: Baixa, Média, Alta - padrão: Média)
   - Status (obrigatório, radio buttons: A fazer, Em progresso, Concluída - padrão: A fazer)
   - Tempo Estimado (opcional, number input em minutos, min 0, max 999)
   - Tags (opcional, text input com sugestões autocomplete)

2. WHEN o campo "Título" tem valor, O CONTADOR_CARACTERES SHALL exibir: "X/200"
3. WHEN o campo "Descrição" tem valor, O CONTADOR_CARACTERES SHALL exibir: "X/2000"
4. WHEN o campo "Disciplina" recebe foco, O DROPDOWN SHALL carregar lista de disciplinas do usuário
5. WHEN nenhuma disciplina existe, O DROPDOWN SHALL exibir mensagem: "Nenhuma disciplina cadastrada"
6. WHEN o campo "Prazo" recebe foco, O CALENDAR_PICKER SHALL abrir seletor de data
7. WHEN uma data é selecionada, O CAMPO_HORA SHALL ficar habilitado para seleção de hora (format HH:mm)
8. WHERE campos obrigatórios existem, O SISTEMA SHALL marcar com asterisco vermelho (*)
9. WHEN o campo "Tempo Estimado" recebe valor, O SISTEMA SHALL validar range 0-999
10. WHEN a estudante tenta adicionar tags, O SISTEMA SHALL sugerir tags usadas anteriormente

---

### Requisito 3: Formulário de Criação de Prova (Exam)

**User Story:** Como estudante, quero criar uma prova com disciplina, data, hora, conteúdos abordados, tipo de prova e local para organizar meus compromissos de avaliação.

#### Critérios de Aceitação

1. WHEN a estudante seleciona "Prova", O SISTEMA SHALL exibir formulário com campos:
   - Disciplina (obrigatório, select dropdown)
   - Data (obrigatório, date picker)
   - Hora (opcional, time input HH:mm)
   - Conteúdos Abordados (opcional, textarea com múltiplas linhas, max 2000 caracteres)
   - Tipo de Prova (obrigatório, radio buttons: Escrita, Oral, Prática)
   - Sala/Local (opcional, text input, max 100 caracteres)
   - Observações (opcional, textarea, max 1000 caracteres)

2. WHEN a Disciplina é selecionada, O SISTEMA SHALL pré-popular cor baseada na disciplina para prévia visual
3. WHEN a Data é selecionada, O SISTEMA SHALL exibir dia da semana em formato legível (ex: "Terça, 15 de janeiro")
4. WHEN Conteúdos Abordados tem valor, O CONTADOR_CARACTERES SHALL exibir "X/2000"
5. WHEN o campo "Sala/Local" tem valor, O SISTEMA SHALL exibir ícone de mapa
6. WHEN Observações tem valor, O CONTADOR_CARACTERES SHALL exibir "X/1000"
7. WHERE a disciplina é obrigatória, O SISTEMA SHALL validar seleção antes de permitir submissão

---

### Requisito 4: Formulário de Criação de Trabalho (Assignment)

**User Story:** Como estudante, quero criar um trabalho com disciplina, descrição, data de entrega, tipo e critérios de avaliação para acompanhar minhas entregas.

#### Critérios de Aceitação

1. WHEN a estudante seleciona "Trabalho", O SISTEMA SHALL exibir formulário com campos:
   - Disciplina (obrigatório, select dropdown)
   - Descrição (obrigatório, textarea, max 3000 caracteres)
   - Data de Entrega (obrigatório, date picker + optional hora)
   - Tipo de Trabalho (obrigatório, radio buttons: Escrito, Apresentação, Projeto)
   - Critérios de Avaliação (opcional, textarea, max 2000 caracteres)
   - Status (obrigatório, radio buttons: Pendente, Entregue, Avaliado - padrão: Pendente)

2. WHEN Descrição tem valor, O CONTADOR_CARACTERES SHALL exibir "X/3000"
3. WHEN Data de Entrega é definida, O SISTEMA SHALL calcular dias restantes e exibir em destaque
4. WHEN tipo é "Apresentação", O SISTEMA SHALL sugerir campos adicionais: "Data da apresentação" e "Local"
5. WHEN Critérios de Avaliação tem valor, O CONTADOR_CARACTERES SHALL exibir "X/2000"
6. WHERE Status é "Entregue", O CAMPO_DATA_ENTREGA SHALL ser automaticamente preenchido com hoje
7. WHERE campos obrigatórios existem, O SISTEMA SHALL marcar com asterisco vermelho (*)

---

### Requisito 5: Validação de Entrada com Zod

**User Story:** Como desenvolvedor, quero validar todos os inputs de criação de atividades com Zod para garantir integridade dos dados antes de salvar no banco.

#### Critérios de Aceitação

1. WHEN um formulário é submetido, O VALIDADOR SHALL executar esquema Zod definido em `/src/features/activities/presentation/schemas/`
2. WHERE esquema de Tarefa existe, O SCHEMA_TASK SHALL validar:
   - `title`: string, min 1, max 200
   - `description`: string optional, max 2000
   - `subjectId`: UUID optional
   - `dueDate`: ISO date optional, não pode ser no passado
   - `priority`: enum (LOW, MEDIUM, HIGH)
   - `status`: enum (TODO, IN_PROGRESS, COMPLETED)
   - `estimatedTimeMinutes`: number optional, min 0, max 999
   - `tags`: array optional, max 10 items, cada item max 50 caracteres

3. WHERE esquema de Prova existe, O SCHEMA_EXAM SHALL validar:
   - `subjectId`: UUID required
   - `date`: ISO date required, não pode ser no passado
   - `time`: string optional, format HH:mm
   - `content`: array optional de strings, max 10 items
   - `type`: enum (WRITTEN, ORAL, PRACTICAL)
   - `location`: string optional, max 100
   - `notes`: string optional, max 1000

4. WHERE esquema de Trabalho existe, O SCHEMA_ASSIGNMENT SHALL validar:
   - `subjectId`: UUID required
   - `title`: string required, min 1, max 200
   - `description`: string required, min 1, max 3000
   - `dueDate`: ISO date required, não pode ser no passado
   - `type`: enum (WRITTEN, PRESENTATION, PROJECT)
   - `criteria`: string optional, max 2000
   - `status`: enum (PENDING, SUBMITTED, GRADED)

5. WHEN validação no cliente passa, O SERVIDOR SHALL validar novamente com mesmo esquema (double validation)
6. IF validação falha, O SISTEMA SHALL retornar array com campo e mensagem de erro em português claro
7. IF dueDate está no passado, THEN O SISTEMA SHALL retornar erro: "Data não pode ser no passado"
8. IF título está vazio, THEN O SISTEMA SHALL retornar erro: "Título é obrigatório"
9. IF disciplina é obrigatória mas não foi selecionada, THEN O SISTEMA SHALL retornar erro: "Selecione uma disciplina"

---

### Requisito 6: Criação de Atividade no Supabase com RLS

**User Story:** Como desenvolvedor, quero que atividades sejam criadas no Supabase com Row-Level Security garantindo que cada estudante veja apenas suas atividades.

#### Critérios de Aceitação

1. WHEN uma atividade é submetida, O SERVER_ACTION SHALL:
   - Validar inputs com Zod
   - Extrair `userId` da sessão autenticada
   - Inserir registro na tabela apropriada (tasks, exams, ou assignments)
   - Retornar nova atividade com todos os campos incluindo `id`

2. WHEN a atividade é inserida, O CAMPO_USERID SHALL ser automaticamente preenchido (não vem do cliente)
3. WHEN a atividade é inserida, O CAMPO_CREATED_AT SHALL ser timestamp UTC atual
4. WHEN a atividade é inserida, O CAMPO_UPDATED_AT SHALL ser timestamp UTC atual
5. WHEN o Supabase insere o registro, AS_POLITICAS_RLS SHALL validar que `userId` corresponde ao usuário autenticado
6. IF `userId` não corresponder, THEN O SUPABASE SHALL retornar erro 403 Forbidden
7. WHEN múltiplas atividades são criadas, O SISTEMA SHALL atribuir UUIDs únicos automaticamente
8. IF a inserção falha (network, quota, etc), THEN O SERVIDOR SHALL retornar erro com `error.code` específico
9. WHERE tabelas existem, O SUPABASE SHALL manter índices em `(userId, createdAt)` para queries rápidas

---

### Requisito 7: Sincronização Automática entre Visualizações

**User Story:** Como estudante, quero que uma atividade criada apareça imediatamente no Dashboard, Calendário e Listas sem precisar recarregar manualmente.

#### Critérios de Aceitação

1. WHEN uma atividade é criada, O SISTEMA SHALL notificar componentes subscritos (Dashboard, Calendar, Lists)
2. WHEN o servidor retorna a atividade criada, O CLIENTE SHALL atualizar cache/state localmente
3. WHEN o componente Dashboard é subscrito ao Realtime, O ATIVIDADE_NOVA SHALL aparecer na lista dentro de 100ms
4. WHEN o componente Calendar é subscrito ao Realtime, O ATIVIDADE_NOVA SHALL aparecer na data correspondente
5. WHEN a atividade tem prazo, O EVENTO SHALL ser visível no calendário na data correta
6. WHEN a atividade tem hora, O EVENTO SHALL ser posicionado corretamente na timeline
7. WHEN múltiplas abas estão abertas no navegador (mesma sessão), O REALTIME SHALL sincronizar entre abas
8. WHERE Realtime é usado, O SISTEMA SHALL usar Supabase Realtime com canal `activities:user_id={userId}`
9. IF a conexão Realtime é perdida, THEN O SISTEMA SHALL fazer polling a cada 30 segundos até reconectar
10. WHEN a sincronização ocorre, O COMPONENTE NÃO SHALL piscar/rerender desnecessariamente

---

### Requisito 8: Server Actions para Criação de Atividades

**User Story:** Como desenvolvedor, quero usar Server Actions do Next.js para criar atividades, reduzindo latência de rede e melhorando segurança.

#### Critérios de Aceitação

1. WHEN um formulário é submetido, O ACTION SHALL ser uma Server Action em `/src/features/activities/presentation/actions/createActivity.ts`
2. WHEN O ACTION_CREATE_ACTIVITY é executado, O SISTEMA SHALL:
   - Validar inputs com Zod
   - Extrair `userId` do contexto autenticado
   - Chamar use case da camada application
   - Retornar atividade criada com `id` e `createdAt`
   - Redirecionar ou fechar modal conforme estratégia

3. WHEN o ACTION_CREATE_ACTIVITY recebe input inválido, O AÇÃO SHALL retornar objeto: `{ error: string, field?: string }`
4. WHEN o ACTION_CREATE_ACTIVITY é bem-sucedido, O AÇÃO SHALL retornar: `{ success: true, activity: Activity }`
5. WHEN a ação é executada, O SISTEMA SHALL usar `"use server"` directive no topo do arquivo
6. WHERE a ação é chamada, O CLIENTE SHALL usar `startTransition()` para manter UI responsiva
7. WHEN o cliente recebe resposta de sucesso, O MODAL SHALL fechar automaticamente com notificação "Atividade criada"
8. IF a ação falha, THEN O CLIENTE SHALL exibir mensagem de erro e manter modal aberto
9. WHEN o modal fecha após sucesso, O DASHBOARD SHALL atualizar lista automaticamente

---

### Requisito 9: Estados de Carregamento e Feedback do Usuário

**User Story:** Como estudante, quero feedback visual claro enquanto minha atividade está sendo criada, com estados de carregamento e confirmação.

#### Critérios de Aceitação

1. WHEN a estudante clica "Salvar", O BOTÃO SHALL mostrar loading spinner (animação de rotação)
2. WHEN o carregamento está em progresso, O BOTÃO SHALL estar desabilitado com texto "Salvando..."
3. WHEN o carregamento está em progresso, O FORMULÁRIO SHALL estar desabilitado (campos não editáveis)
4. WHEN a atividade é criada com sucesso, O SISTEMA SHALL exibir notificação toast:
   - "Atividade criada com sucesso" em cor verde
   - Ícone de check
   - Auto-dismiss após 3 segundos

5. IF a criação falha, THEN O SISTEMA SHALL exibir toast de erro em cor vermelha com mensagem específica
6. WHEN a criação falha, O MODAL SHALL permanecer aberto com dados preservados
7. WHEN há timeout (> 30 segundos), O SISTEMA SHALL exibir erro: "Tempo limite excedido, tente novamente"
8. WHEN a requisição é bem-sucedida, O MODAL SHALL fechar com transição suave (fade out 300ms)

---

### Requisito 10: Dados Obrigatórios vs Opcionais por Tipo

**User Story:** Como estudante, quero que o formulário valide corretamente que campos obrigatórios devem ser preenchidos e campos opcionais possam ser deixados em branco.

#### Critérios de Aceitação

1. WHEN uma Tarefa é criada, O CAMPO_TITULO SHALL ser obrigatório
2. WHEN uma Tarefa é criada, O CAMPO_DESCRICAO SHALL ser opcional
3. WHEN uma Tarefa é criada, O CAMPO_DISCIPLINA SHALL ser opcional
4. WHEN uma Prova é criada, OS_CAMPOS_OBRIGATORIOS SHALL ser: Disciplina, Data, Tipo
5. WHEN uma Prova é criada, OS_CAMPOS_OPCIONAIS SHALL ser: Hora, Conteúdos, Local, Observações
6. WHEN um Trabalho é criado, OS_CAMPOS_OBRIGATORIOS SHALL ser: Disciplina, Data de Entrega, Descrição, Tipo
7. WHEN um Trabalho é criado, OS_CAMPOS_OPCIONAIS SHALL ser: Critérios, Status customizado
8. WHEN o formulário valida, O SISTEMA SHALL exibir erro em vermelho para campos obrigatórios vazios
9. WHEN o usuário tenta enviar com campo obrigatório vazio, O BOTÃO_SALVAR SHALL permanecer desabilitado
10. WHEN todos os campos obrigatórios estão preenchidos, O BOTÃO_SALVAR SHALL estar habilitado

---

### Requisito 11: Notificações de Sucesso com Actions Rápidas

**User Story:** Como estudante, quero uma notificação de sucesso que permita ações rápidas como editar ou criar outra atividade.

#### Critérios de Aceitação

1. WHEN uma atividade é criada, O TOAST_NOTIFICACAO SHALL exibir:
   - Mensagem: "Atividade criada com sucesso"
   - Botão "Abrir" (abre detalhes da atividade)
   - Botão "Nova" (abre modal de novo tipo)
   - Ícone de check em verde

2. WHEN a estudante clica "Abrir", O SISTEMA SHALL navegar para página de detalhes da atividade
3. WHEN a estudante clica "Nova", O SISTEMA SHALL abrir modal de seleção de tipo novamente
4. WHEN o toast está exibido, O DISMISS_AUTOMÁTICO SHALL ocorrer em 5 segundos se não interagir
5. WHEN a estudante clica X no toast, O NOTIFICACAO SHALL ser removida imediatamente

---

### Requisito 12: Criação Rápida sem Disciplina

**User Story:** Como estudante, quero poder criar uma atividade rapidamente sem selecionar disciplina quando não tenho tempo de configurar.

#### Critérios de Aceitação

1. WHEN uma Tarefa é criada sem disciplina, O SISTEMA SHALL permitir e armazenar `subjectId: null`
2. WHEN uma Prova é criada, O CAMPO_DISCIPLINA SHALL ser obrigatório (não permite null)
3. WHEN um Trabalho é criado, O CAMPO_DISCIPLINA SHALL ser obrigatório (não permite null)
4. WHEN uma atividade sem disciplina é exibida, O DASHBOARD SHALL mostrar sem ícone de cor
5. WHEN o usuário edita atividade sem disciplina, THEN pode adicionar disciplina posteriormente

---

### Requisito 13: Histórico de Atividades Criadas na Sessão

**User Story:** Como estudante, quero ver um histórico das atividades que criei na sessão atual para referência rápida.

#### Critérios de Aceitação

1. WHEN a estudante cria uma atividade, O HISTÓRICO_LOCAL SHALL armazenar em sessionStorage
2. WHEN a página é recarregada na mesma sessão, O HISTÓRICO SHALL persistir
3. WHEN a estudante fecha navegador, O HISTÓRICO_SESSAO SHALL ser limpo
4. WHEN a estudante clica em ícone de "Histórico" no modal de novo, O SISTEMA SHALL exibir últimas 5 atividades criadas
5. WHEN a estudante clica em uma atividade no histórico, O FORMULÁRIO SHALL ser pré-populado com dados daquela atividade
6. ONDE o histórico tem mais de 5 itens, O SISTEMA SHALL manter apenas os 5 mais recentes

---

### Requisito 14: Validação de Limites de Tempo e Data

**User Story:** Como sistema, quero validar que prazos e datas não estejam no passado para evitar atividades retroativas.

#### Critérios de Aceitação

1. WHEN um prazo é selecionado, O CALENDAR_PICKER SHALL desabilitar datas no passado (anteriores a hoje)
2. WHEN um formulário tenta submeter com data no passado, O VALIDADOR SHALL retornar erro: "Data não pode ser no passado"
3. WHEN uma data é hoje, O SISTEMA SHALL permitir (hoje é válido)
4. WHEN uma hora é definida, O SISTEMA SHALL usar timezone local do usuário
5. IF a hora de uma prova/trabalho hoje é no passado (ex: 8:00 AM mas agora são 14:00), O SISTEMA SHALL permitir inserção mas avisar: "Horário já passou hoje"
6. WHEN datas são comparadas, O SISTEMA SHALL usar UTC internamente com timezone local na exibição

---

### Requisito 15: Proteção contra Criação Duplicada

**User Story:** Como sistema, quero evitar que cliques duplos no botão "Salvar" criem múltiplas atividades.

#### Critérios de Aceitação

1. WHEN a estudante clica "Salvar", O BOTÃO SHALL ser desabilitado imediatamente
2. WHEN uma atividade é criada, O CLIENTE SHALL desabilitar o botão por no mínimo 1 segundo
3. WHEN uma requisição está em andamento, CLIQUES_ADICIONAIS SHALL ser ignorados (debounce)
4. IF o servidor recebe 2 requisições idênticas em < 2 segundos, THEN O SERVIDOR SHALL retornar erro de duplicação
5. WHEN o servidor detecta duplicação, O CLIENTE SHALL exibir mensagem: "Atividade já foi criada"

---

### Requisito 16: Tratamento de Erros e Fallback Offline

**User Story:** Como desenvolvedor, quero que atividades criadas offline sejam sincronizadas automaticamente quando conexão retornar.

#### Critérios de Aceitação

1. WHEN a estudante está offline e tenta criar atividade, O SISTEMA SHALL exibir aviso: "Você está offline. A atividade será sincronizada quando conectar"
2. WHEN offline, O SISTEMA SHALL armazenar atividade em IndexedDB local
3. WHEN conexão é retomada, O SISTEMA SHALL sincronizar atividades locais com Supabase automaticamente
4. IF a sincronização falha após 3 tentativas, O SISTEMA SHALL notificar usuário com opção de retentar
5. WHEN a sincronização ocorre, O HISTÓRICO_LOCAL SHALL ser atualizado com `id` do servidor

---

### Requisito 17: Componentes de UI para Formulários de Atividades

**User Story:** Como desenvolvedor, quero componentes React reutilizáveis para formulários de atividades com validação integrada.

#### Critérios de Aceitação

1. WHERE componentes existem, O SISTEMA SHALL ter componentes:
   - `ActivityTypeSelector` - modal de seleção de tipo
   - `TaskForm` - formulário de tarefa
   - `ExamForm` - formulário de prova
   - `AssignmentForm` - formulário de trabalho
   - `FormField` - componente reutilizável para input + label + erro

2. WHEN um FormField renderiza, O COMPONENTE SHALL exibir:
   - Label com (opcional) ou * (obrigatório)
   - Input/Select/Textarea conforme type
   - Mensagem de erro em vermelho se houver
   - Contador de caracteres se aplicável

3. WHEN um formulário renderiza, O SISTEMA SHALL usar React Hook Form para gerenciamento
4. WHEN validação falha, O CAMPO_ERROR SHALL exibir mensagem específica
5. WHERE componentes reutilizáveis existem, O SISTEMA SHALL aceitar props para customização

---

### Requisito 18: Testes de Validação com Coverage > 85%

**User Story:** Como desenvolvedor, quero testes automatizados abrangentes para validação de inputs garantindo confiabilidade.

#### Critérios de Aceitação

1. WHERE testes unitários existem, O SISTEMA SHALL testar:
   - Schema Zod para cada tipo (Task, Exam, Assignment)
   - Validação de limites (min/max length, range numérico)
   - Validação de datas no passado
   - Validação de campos obrigatórios
   - Coverage > 85% dos schemas

2. WHERE testes de integração existem, O SISTEMA SHALL testar:
   - Fluxo completo de criação de Tarefa
   - Fluxo completo de criação de Prova
   - Fluxo completo de criação de Trabalho
   - Sincronização após criação

3. WHERE testes E2E existem, O SISTEMA SHALL testar:
   - Usuário cria Tarefa do início ao fim
   - Usuário cria Prova do início ao fim
   - Usuário cria Trabalho do início ao fim
   - Atividade aparece no Dashboard/Calendário
   - Erro é exibido para inputs inválidos

4. WHEN testes são executados, O COMANDO `npm run test` SHALL rodar com Vitest
5. WHEN testes E2E são executados, O COMANDO `npm run test:e2e` SHALL rodar com Playwright
6. WHEN coverage < 85%, O CI/CD SHALL alertar mas permitir merge
7. WHEN testes falham, O CI/CD SHALL bloquear merge para main

---

### Requisito 19: Tratamento de Erros Específicos do Supabase

**User Story:** Como desenvolvedor, quero gerenciar erros específicos do Supabase com mensagens claras para o usuário.

#### Critérios de Aceitação

1. IF quota de usuário foi excedida, THEN O SISTEMA SHALL exibir: "Limite de atividades atingido. Considere arquivar antigas"
2. IF conexão com banco falha, THEN O SISTEMA SHALL exibir: "Erro ao conectar com servidor. Tente novamente"
3. IF RLS policy nega acesso, THEN O SISTEMA SHALL exibir: "Você não tem permissão para criar esta atividade"
4. IF campos inválidos são enviados, THEN O SISTEMA SHALL exibir: "Dados inválidos, revise o formulário"
5. WHERE erros são capturados, O SISTEMA SHALL fazer logging em console apenas em desenvolvimento

---

### Requisito 20: Integração com Lista de Disciplinas Dinâmica

**User Story:** Como estudante, quero que o dropdown de disciplinas carregue automaticamente as disciplinas cadastradas e atualize quando novas disciplinas forem criadas.

#### Critérios de Aceitação

1. WHEN o formulário de Prova/Trabalho é aberto, O DROPDOWN_DISCIPLINAS SHALL carregar lista via Server Action
2. WHEN a lista de disciplinas retorna vazia, O DROPDOWN SHALL exibir: "Nenhuma disciplina. Crie uma em Configurações"
3. WHEN a estudante cria uma nova disciplina em outra aba, O DROPDOWN SHALL atualizar automaticamente
4. WHERE disciplinas são carregadas, O CACHE SHALL armazenar por 5 minutos (revalidateTag em Next.js)
5. WHEN uma disciplina tem cor, O DROPDOWN_ITEM SHALL mostrar cor em bolinha visual

---

### Requisito 21: Personalização de Lembretes por Atividade

**User Story:** Como estudante, quero personalizar quando receber lembretes para cada atividade (ex: 1 dia antes às 17h, 1 hora antes, no dia da prova), para receber notificações no momento ideal para mim.

#### Critérios de Aceitação

1. WHEN um formulário de Tarefa/Prova/Trabalho é exibido, O SISTEMA SHALL incluir seção "Lembretes" (opcional)
2. WHEN o usuário expande "Lembretes", O SISTEMA SHALL exibir:
   - Toggle: "Receber lembrete?" (on/off)
   - Se ON: opções de configuração de lembretes
   - Botão "+ Adicionar Lembrete" para múltiplos lembretes

3. WHEN o usuário clica "+ Adicionar Lembrete", O FORMULÁRIO SHALL exibir 2 campos:
   - Campo 1: "Quando?" com opções predefinidas:
     - [ ] "No dia do evento" (com seleção de hora)
     - [ ] "1 hora antes" (com seleção de hora)
     - [ ] "2 horas antes" (com seleção de hora)
     - [ ] "3 horas antes" (com seleção de hora)
     - [ ] "1 dia antes" (com seleção de hora)
     - [ ] "2 dias antes" (com seleção de hora)
     - [ ] "Personalizado" (permite entrada customizada)
   
   - Campo 2: "Que horas?" com time picker (HH:mm format)
     - Validar que a hora é em timezone do usuário
     - Se "No dia do evento", validar que hora do lembrete < hora do evento

4. WHERE "Personalizado" é selecionado, O SISTEMA SHALL exibir:
   - Input numérico: "Quantas unidades?" (min 1, max 30)
   - Select: "Unidade de tempo?" (Minutos, Horas, Dias)
   - Exemplo: "45 minutos antes" ou "5 dias antes"

5. WHEN um lembrete é configurado, O SISTEMA SHALL calcular e exibir timestamp:
   - Exibir em formato legível: "Você receberá lembrete em 15 de janeiro às 17:00"
   - Atualizar preview enquanto usuário edita

6. WHEN múltiplos lembretes são adicionados, O SISTEMA SHALL:
   - Permitir até 3 lembretes por atividade
   - Evitar lembretes duplicados (mesmo horário)
   - Evitar lembrete DEPOIS do evento (validação)
   - Exibir lista de lembretes já adicionados com opção de deletar

7. WHEN o formulário é validado, O VALIDADOR SHALL garantir:
   - Se "Lembrete ON", ENTÃO PELO MENOS 1 lembrete deve estar configurado
   - Se múltiplos lembretes: ordem cronológica (mais cedo primeiro)
   - Nenhum lembrete no passado (comparado com data/hora da atividade)
   - Tempo do lembrete é válido (00:00 - 23:59)

8. WHEN a atividade é criada, OS_LEMBRETES SHALL ser armazenados na tabela `activity_reminders` com:
   - `id`: UUID único
   - `activity_id`: FK para atividade
   - `reminder_type`: enum (ON_DAY, ONE_HOUR_BEFORE, TWO_HOURS_BEFORE, etc, CUSTOM)
   - `reminder_offset_minutes`: número de minutos antes do evento (calculado)
   - `reminder_time`: hora específica em HH:mm (ex: "17:00")
   - `reminder_timestamp`: ISO datetime calculado (data + hora)
   - `is_active`: booleano (padrão true)
   - `created_at`: timestamp

9. WHEN a atividade tem data/hora definida, O SISTEMA SHALL calcular `reminder_timestamp`:
   - Exemplo: Prova em 15 jan 14:00, lembrete "1 dia antes às 17h"
   - `reminder_timestamp = 14 jan 17:00` (1 dia antes, mas no horário 17:00)
   - Se resultado fica no passado, O SISTEMA SHALL avisar: "Este lembrete já passou"

10. WHEN a atividade não tem hora definida (só data), O LEMBRETE SHALL usar:
    - Se "No dia do evento", hora padrão 09:00 ou hora customizada
    - Se "N dias antes", calcular conforme offset em dias

11. WHEN o usuário edita atividade, O SISTEMA SHALL permitir editar lembretes:
    - Deletar lembretes existentes
    - Adicionar novos lembretes
    - Modificar hora/tipo de lembrete existente

12. WHEN a atividade é próxima (dentro de 7 dias), O DASHBOARD SHALL exibir:
    - Ícone de sino/alarme próximo ao evento
    - Tooltip: "Lembrete em 2 dias às 17h"

13. WHERE os lembretes são persistidos, O SUPABASE_RLS SHALL proteger:
    - Usuário só vê seus próprios lembretes
    - Usuário pode criar/editar/deletar apenas seus lembretes

---

### Requisito 22: Armazenamento e Sincronização de Lembretes

**User Story:** Como desenvolvedor, quero que lembretes sejam armazenados no banco e sincronizados com Realtime para cálculos confiáveis.

#### Critérios de Aceitação

1. WHEN um lembrete é criado, O SUPABASE SHALL inserir em tabela `activity_reminders`
2. WHERE a tabela existe, DEVE_CONTER campos:
   - `id` (UUID, primary key)
   - `activity_id` (UUID, foreign key → activities)
   - `user_id` (UUID, foreign key → users, para RLS)
   - `reminder_type` (enum)
   - `reminder_offset_minutes` (integer)
   - `reminder_time` (time HH:mm)
   - `reminder_timestamp` (timestamp com timezone)
   - `is_active` (boolean)
   - `created_at` (timestamp)
   - `updated_at` (timestamp)

3. WHEN a atividade é atualizada, OS_LEMBRETES_TIMESTAMP SHALL ser recalculados:
   - Se data/hora da atividade muda, ENTÃO recalcular `reminder_timestamp`
   - Atualizar status (ex: se passou do lembrete, marcar como "disparado")

4. WHEN lembretes são listados, O SUPABASE_QUERY SHALL ordenar por `reminder_timestamp` ASC
5. WHERE múltiplos lembretes existem, O SISTEMA SHALL usar Realtime para sincronizar instantaneamente
6. WHEN um lembrete é deletado, O SUPABASE SHALL fazer soft-delete (marcar `is_deleted = true` ou apenas delete)

---

### Requisito 23: Schemas Zod para Validação de Lembretes

**User Story:** Como desenvolvedor, quero validar lembretes com Zod para garantir dados consistentes.

#### Critérios de Aceitação

1. WHEN lembretes são validados, O SCHEMA SHALL estar em `/src/features/activities/presentation/schemas/reminderSchema.ts`
2. WHERE o schema existe, DEVE validar:
   - `reminder_type`: enum válido
   - `reminder_offset_minutes`: número >= 0 e <= 43200 (30 dias em minutos)
   - `reminder_time`: string format HH:mm válido
   - `reminder_timestamp`: ISO datetime válido, não no passado

3. WHEN validação no cliente falha, O SISTEMA SHALL retornar erro específico:
   - "Hora do lembrete deve estar entre 00:00 e 23:59"
   - "Lembrete não pode ser no passado"
   - "Máximo 3 lembretes por atividade"

4. WHEN servidor valida, DEVE fazer validação dupla (cliente + servidor)

---

### Requisito 24: Componente UI para Configuração de Lembretes

**User Story:** Como desenvolvedor, quero componente React reutilizável para configuração de lembretes integrado aos formulários.

#### Critérios de Aceitação

1. WHEN um formulário renderiza, O COMPONENTE `ReminderConfigurator` SHALL estar disponível
2. WHERE o componente existe, DEVE incluir:
   - Toggle: "Receber lembrete?"
   - Select: "Quando?" com opções predefinidas + personalizado
   - TimePicker: "Que horas?"
   - Button: "+ Adicionar Lembrete"
   - List: lembretes já configurados com delete button
   - Preview: texto legível do lembrete

3. WHEN usuário interage, O COMPONENTE SHALL:
   - Validar em tempo real (hour 00-23, minute 00-59)
   - Desabilitar opções inválidas (ex: lembrete depois do evento)
   - Atualizar preview automaticamente
   - Mostrar contador "1/3 lembretes" se múltiplo

4. WHEN o componente renderiza, O COMPONENTE SHALL usar shadcn/ui:
   - `Tabs` para diferentes tipos de lembrete
   - `Select` para opções predefinidas
   - `Input` type time para hora
   - `Button` para adicionar/remover
   - `Badge` para exibir lembretes adicionados

---

### Requisito 25: Testes de Lembretes com Coverage > 85%

**User Story:** Como desenvolvedor, quero testes abrangentes para lógica de lembretes garantindo confiabilidade.

#### Critérios de Aceitação

1. WHEN testes unitários são escritos, DEVEM cobrir:
   - Schemas Zod para validação de lembretes (coverage > 85%)
   - Cálculo de `reminder_timestamp` (múltiplas datas/horas)
   - Validação de horários (00:00-23:59)
   - Validação de offsets (minutos, horas, dias)
   - Detecção de lembretes duplicados
   - Detecção de lembretes no passado

2. WHEN testes de integração são escritos, DEVEM cobrir:
   - Criação de atividade com múltiplos lembretes
   - Edição de atividade (atualizar lembretes)
   - Deleção de atividade (cascade delete de lembretes)
   - Cálculo correto de timestamp com timezone

3. WHEN testes E2E são escritos, DEVEM cobrir:
   - Usuário cria tarefa com 2 lembretes diferentes
   - Preview de lembrete atualiza conforme usuário edita
   - Validação em tempo real (hora inválida mostra erro)
   - Lembrete "no dia do evento" e "1 dia antes às 17h" ambos funcionam

---

## Propriedades de Correção (Correctness Properties)

Estas propriedades devem ser garantidas através de testes automatizados:

### 1. Invariante: Atividade Criada tem Timestamp Válido
- **Propriedade:** Após criação, `createdAt <= now()` e `updatedAt == createdAt`
- **Teste:** PBT - gerar múltiplas atividades, verificar timestamps
- **Padrão:** Invariant

### 2. Invariante: ID Único para Cada Atividade
- **Propriedade:** Cada atividade tem UUID único, sem duplicatas no banco
- **Teste:** Criar 100 atividades em paralelo, verificar IDs únicos
- **Padrão:** Invariant

### 3. Invariante: Atividade Pertence ao Usuário Criador
- **Propriedade:** `activity.userId == session.user.id` (RLS garantido)
- **Teste:** Tentar acessar atividade criada por outro usuário, deve falhar
- **Padrão:** Invariant

### 4. Invariante: Prazos Nunca no Passado
- **Propriedade:** Se `dueDate` é definido, `dueDate >= today()`
- **Teste:** PBT - gerar datas, verificar validação
- **Padrão:** Invariant

### 5. Round-Trip: Parse/Serialize de Atividade
- **Propriedade:** `JSON.parse(JSON.stringify(activity)) == activity`
- **Teste:** Serializar atividade, deserializar, comparar
- **Padrão:** Round-Trip

### 6. Metamórfico: Atividade Aparece em Todas as Visualizações
- **Propriedade:** Se atividade é criada, aparece em Dashboard AND Calendar AND Lists
- **Teste:** Criar atividade, verificar 3 visualizações
- **Padrão:** Metamorphic

### 7. Idempotência: Criação com Mesmo Payload
- **Propriedade:** Enviar mesma atividade 2x deve falhar na 2ª (ou ser idempotente com dedup)
- **Teste:** Enviar atividade 2x, verificar erro ou idempotência
- **Padrão:** Idempotence

### 8. Confluência: Ordem de Campos Não Importa
- **Propriedade:** Submeter formulário com campos em ordem diferente gera mesmo resultado
- **Teste:** PBT - gerar diferentes ordens de preenchimento, resultado idêntico
- **Padrão:** Confluence

### 9. Validação de Erros: Inputs Inválidos
- **Propriedade:** Qualquer input inválido gera erro apropriado (não silencioso)
- **Teste:** PBT - gerar inputs inválidos, verificar erros específicos
- **Padrão:** Error Conditions

### 10. Sincronização: Atividade Aparece < 100ms após Criação
- **Propriedade:** Tempo entre criação e aparição em Dashboard < 100ms
- **Teste:** Medir tempo de sincronização, verificar SLA
- **Padrão:** Performance Invariant

### 11. Invariante: Lembretes Sempre Antes do Evento
- **Propriedade:** Para qualquer lembrete, `reminder_timestamp < event_timestamp`
- **Teste:** PBT - gerar combinações de datas/horas, verificar ordem
- **Padrão:** Invariant

### 12. Invariante: Timestamp do Lembrete Válido
- **Propriedade:** `reminder_timestamp` é sempre >= hoje (não no passado)
- **Teste:** Criar atividades futuras com lembretes, validar timestamps
- **Padrão:** Invariant

### 13. Invariante: Máximo 3 Lembretes por Atividade
- **Propriedade:** `COUNT(reminders for activity) <= 3`
- **Teste:** Tentar adicionar 4º lembrete, deve falhar
- **Padrão:** Invariant

## Critérios de Sucesso

- ✅ Todos os 25 requisitos implementados e testados
- ✅ Criação de Tarefa < 30 segundos (métrica do produto)
- ✅ Criação de Prova < 30 segundos
- ✅ Criação de Trabalho < 30 segundos
- ✅ Validação coverage > 85% com Zod (incluindo schemas de lembretes)
- ✅ E2E: todos os 3 tipos testados end-to-end com lembretes
- ✅ Sincronização Realtime: atividade aparece em Dashboard/Calendar/Lists < 100ms
- ✅ Lembretes: armazenados corretamente com timestamp calculado
- ✅ Offline: criação local com sync automático quando conectar
- ✅ Zero validações duplicadas (cliente + servidor, não triplicadas)
- ✅ RLS policies bloqueiam acesso a atividades e lembretes de outros usuários
- ✅ Timestamps em UTC, display em timezone local
- ✅ Proteção contra criação duplicada por clique duplo
- ✅ Testes de unidade, integração e E2E passando com CI/CD
- ✅ Notificações claras de sucesso e erro
- ✅ Modal de seleção de tipo acessível e intuitivo
- ✅ Lembretes personalizáveis (múltiplos, diferentes horários/dias)
- ✅ Preview de lembrete atualiza em tempo real
- ✅ Máximo 3 lembretes por atividade (validado)
- ✅ Lembretes nunca no passado (validação de datas)

---

## Mapeamento para Camadas de Arquitetura

### Domain Layer (`/src/features/activities/domain/`)
- `activity.ts` - Entidades Task, Exam, Assignment com invariantes
- `reminder.ts` - Entidade Reminder com invariantes (sempre antes do evento, max 3)
- `rules.ts` - Regras de negócio (validação de prazos, lembretes, prioridades, etc)
- `repository.ts` - Interface de repositório (contrato)

### Application Layer (`/src/features/activities/application/`)
- `useCases/createActivity.ts` - Orquestração de criação com lembretes
- `useCases/updateReminders.ts` - Orquestração de atualização de lembretes
- `dto/CreateActivityDTO.ts` - DTOs de entrada/saída com lembretes
- `dto/ReminderDTO.ts` - DTO específico para lembretes

### Infrastructure Layer (`/src/features/activities/infrastructure/`)
- `supabaseActivityRepository.ts` - Implementação Supabase com RLS (activities + reminders)
- `reminderCalculator.ts` - Lógica de cálculo de reminder_timestamp

### Presentation Layer (`/src/features/activities/presentation/`)
- `components/ActivityTypeSelector.tsx` - Modal de seleção
- `components/TaskForm.tsx` - Formulário de tarefa com ReminderConfigurator
- `components/ExamForm.tsx` - Formulário de prova com ReminderConfigurator
- `components/AssignmentForm.tsx` - Formulário de trabalho com ReminderConfigurator
- `components/ReminderConfigurator.tsx` - Componente reutilizável para lembretes
- `actions/createActivity.ts` - Server Action com suporte a lembretes
- `schemas/createActivitySchema.ts` - Validações Zod (com reminderSchema)
- `schemas/reminderSchema.ts` - Validações específicas para lembretes

