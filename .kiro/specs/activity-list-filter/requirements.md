# Especificação de Requisitos - activity-list-filter

## Introdução

Esta especificação define os requisitos para a terceira feature do Amanda's Study Planner: **activity-list-filter**. Este módulo implementa a listagem e filtragem de três tipos de atividades (Tarefas, Provas e Trabalhos) com suporte a múltiplos filtros, busca, ordenação e sincronização em tempo real. Desbloqueia o valor central do aplicativo: permitir que estudantes consultem, localizem e organizem rapidamente suas atividades acadêmicas através de filtros essenciais e busca, com carregamento rápido (< 500ms para lista de disciplinas) e interface responsiva que funciona perfeitamente em dispositivos móveis, tablets e desktops.

---

## Glossário

- **Atividade:** Entidade genérica que representa tarefa, prova ou trabalho acadêmico
- **Tarefa (Task):** Atividade pessoal de estudo com título, descrição, prazo e prioridade
- **Prova (Exam):** Atividade avaliativa em disciplina específica com data, hora, conteúdos e tipo
- **Trabalho (Assignment):** Atividade de entrega em disciplina específica com descrição, tipo e critérios
- **Disciplina (Subject):** Matéria ou disciplina acadêmica (ex: Cálculo I, História)
- **Filtro:** Critério usado para reduzir conjunto de atividades exibidas
- **Busca/Search:** Pesquisa por texto em campos de título e descrição
- **Ordenação (Sort):** Arranjo de atividades por critério (data, prioridade, status, etc)
- **Paginação:** Divisão de grandes conjuntos em páginas de tamanho definido
- **Cache:** Armazenamento local de dados para reduzir requisições ao servidor
- **Realtime:** Sincronização instantânea de mudanças entre cliente e servidor via Supabase
- **RLS (Row-Level Security):** Políticas Supabase que garantem isolamento de dados por usuário
- **Breakpoint:** Ponto de referência para design responsivo (mobile, tablet, desktop)
- **Card:** Componente visual que exibe informação resumida de uma atividade
- **Empty State:** Tela exibida quando nenhuma atividade corresponde aos filtros
- **Debounce:** Técnica de atraso em execução de função para evitar chamadas excessivas
- **Query String:** Parâmetros na URL que definem estado de filtros e busca
- **Metadata:** Informações sobre atividade incluindo timestamps, contadores, flags
- **React Query:** Biblioteca para gerenciamento de estado de dados remotos
- **Skeleton:** Placeholder animado exibido enquanto dados carregam

---

## Requisitos

### Requisito 1: Tela de Listagem de Tarefas

**User Story:** Como estudante, quero visualizar todas as minhas tarefas em uma lista limpa e organizada para ter visão geral do que preciso fazer.

#### Critérios de Aceitação

1. WHEN a estudante navega para `/activities/tasks`, O SISTEMA SHALL exibir página com título "Tarefas"
2. WHEN a página carrega, O SISTEMA SHALL exibir skeleton loaders enquanto dados são buscados
3. WHEN as tarefas são carregadas, O SISTEMA SHALL exibir lista com cards de tarefas
4. WHEN nenhuma tarefa existe, O SISTEMA SHALL exibir empty state com:
   - Ícone de checklist vazio
   - Mensagem: "Nenhuma tarefa cadastrada"
   - Botão "+ Nova Tarefa" que abre modal de criação
5. WHERE cada card de tarefa é exibido, O CARD SHALL mostrar:
   - Título (truncado em 1 linha com ellipsis se > 50 caracteres)
   - Disciplina (se atribuída) com cor visual
   - Prazo (formato relativo: "em 3 dias", "hoje", "atrasada")
   - Prioridade (ícone visual: vermelho=Alta, laranja=Média, azul=Baixa)
   - Status (indicador visual: ○=A fazer, ◆=Em progresso, ✓=Concluída)
   - Ícone de menu com opções: Ver, Editar, Deletar

6. WHEN o card é clicado, O SISTEMA SHALL navegar para página de detalhes da tarefa
7. WHEN múltiplas tarefas existem, O LISTA SHALL ter altura máxima com scroll vertical
8. WHERE scroll é necessário, O SISTEMA SHALL carregar mais tarefas dinamicamente (infinite scroll) ou exibir paginação

---

### Requisito 2: Tela de Listagem de Provas

**User Story:** Como estudante, quero visualizar todas as minhas provas em uma lista organizada para acompanhar minhas avaliações.

#### Critérios de Aceitação

1. WHEN a estudante navega para `/activities/exams`, O SISTEMA SHALL exibir página com título "Provas"
2. WHEN a página carrega, O SISTEMA SHALL exibir skeleton loaders
3. WHEN as provas são carregadas, O SISTEMA SHALL exibir lista com cards de provas
4. WHEN nenhuma prova existe, O SISTEMA SHALL exibir empty state apropriado
5. WHERE cada card de prova é exibido, O CARD SHALL mostrar:
   - Disciplina (obrigatório, com cor visual)
   - Data e hora (formato: "Terça, 15 jan - 14:00" ou "em 2 dias")
   - Tipo de prova (Escrita, Oral, Prática) com ícone
   - Local/Sala (se disponível) com ícone de mapa
   - Ícone de menu com opções: Ver, Editar, Deletar

6. WHEN o card é clicado, O SISTEMA SHALL navegar para página de detalhes da prova
7. WHEN múltiplas provas existem, O LISTA SHALL manter scroll eficiente

---

### Requisito 3: Tela de Listagem de Trabalhos

**User Story:** Como estudante, quero visualizar todos os meus trabalhos em uma lista para acompanhar minhas entregas.

#### Critérios de Aceitação

1. WHEN a estudante navega para `/activities/assignments`, O SISTEMA SHALL exibir página com título "Trabalhos"
2. WHEN a página carrega, O SISTEMA SHALL exibir skeleton loaders
3. WHEN os trabalhos são carregados, O SISTEMA SHALL exibir lista com cards de trabalhos
4. WHEN nenhum trabalho existe, O SISTEMA SHALL exibir empty state apropriado
5. WHERE cada card de trabalho é exibido, O CARD SHALL mostrar:
   - Disciplina (com cor visual)
   - Título do trabalho
   - Data de entrega (formato relativo: "em 5 dias", "vence hoje", "atrasado")
   - Tipo de trabalho (Escrito, Apresentação, Projeto) com ícone
   - Status de entrega (Pendente, Entregue, Avaliado) com ícone/cor
   - Ícone de menu com opções: Ver, Editar, Deletar

6. WHEN o card é clicado, O SISTEMA SHALL navegar para página de detalhes do trabalho

---

### Requisito 4: Barra de Busca com Debounce

**User Story:** Como estudante, quero pesquisar atividades por título/descrição para localizar rapidamente o que procuro.

#### Critérios de Aceitação

1. WHEN a página de listagem é exibida, O SISTEMA SHALL mostrar input de busca no topo
2. WHEN a estudante digita no input, O SISTEMA SHALL aguardar 300ms (debounce) antes de buscar
3. WHEN a busca é executada, O SISTEMA SHALL filtrar atividades por título e descrição (case-insensitive)
4. WHEN nenhum resultado é encontrado, O SISTEMA SHALL exibir empty state: "Nenhuma atividade encontrada para '{termo}'"
5. WHEN a estudante limpa o input, O SISTEMA SHALL resetar para listagem completa
6. WHEN o usuário pressiona Enter, O SISTEMA SHALL executar busca imediatamente sem esperar debounce
7. WHEN múltiplos resultados são encontrados, O SISTEMA SHALL exibir contagem: "X resultados encontrados"
8. WHERE a busca é realizada, O QUERY_STRING SHALL ser atualizada: `?search=termo` para permitir compartilhamento
9. WHEN a página é recarregada com query string, O INPUT SHALL ser pré-populado e resultados exibidos

---

### Requisito 5: Filtro por Prioridade (Tarefas)

**User Story:** Como estudante, quero filtrar tarefas por prioridade para focar nas mais urgentes.

#### Critérios de Aceitação

1. WHEN a página de Tarefas é exibida, O SISTEMA SHALL mostrar seção "Filtros" com checkboxes:
   - ☐ Baixa
   - ☐ Média
   - ☐ Alta
2. WHEN nenhum filtro é selecionado, O SISTEMA SHALL exibir TODAS as tarefas
3. WHEN um ou mais filtros são selecionados, O SISTEMA SHALL exibir apenas tarefas com prioridades selecionadas
4. WHEN múltiplos filtros são selecionados, O COMPORTAMENTO SHALL ser OU lógico (prioridade=Baixa OU Média OU Alta)
5. WHEN filtros são alterados, O LISTA SHALL atualizar em tempo real (< 100ms)
6. WHERE os filtros são alterados, O QUERY_STRING SHALL ser atualizada: `?priority=low,medium` para referência
7. WHEN a página é recarregada, OS FILTROS_APLICADOS SHALL ser restaurados da query string

---

### Requisito 6: Filtro por Disciplina

**User Story:** Como estudante, quero filtrar atividades por disciplina para organizar por matéria.

#### Critérios de Aceitação

1. WHEN a página de listagem é exibida, O SISTEMA SHALL mostrar filtro "Disciplina" em seção de filtros
2. WHEN o filtro é expandido, O SISTEMA SHALL exibir dropdown/select com lista de disciplinas do usuário
3. WHEN nenhuma disciplina é selecionada, O SISTEMA SHALL exibir TODAS as atividades
4. WHEN uma disciplina é selecionada, O SISTEMA SHALL exibir apenas atividades dessa disciplina
5. WHEN múltiplas disciplinas são selecionadas, O COMPORTAMENTO SHALL ser OU lógico
6. WHEN o dropdown está vazio (nenhuma disciplina cadastrada), O SISTEMA SHALL exibir mensagem: "Crie uma disciplina para filtrar"
7. WHEN disciplinas são criadas em outra aba, O DROPDOWN SHALL atualizar automaticamente via Realtime
8. WHERE disciplinas são listadas, O SISTEMA SHALL recarregar lista com < 500ms (performance target)
9. WHEN o filtro é alterado, O QUERY_STRING SHALL ser atualizada: `?subject=id1,id2`

---

### Requisito 7: Filtro por Data/Intervalo de Datas

**User Story:** Como estudante, quero filtrar atividades por intervalo de datas para focar no que vence em período específico.

#### Critérios de Aceitação

1. WHEN a página de listagem é exibida, O SISTEMA SHALL mostrar filtro "Data" com 2 date pickers:
   - "De:" (data inicial, padrão: hoje - 30 dias)
   - "Até:" (data final, padrão: hoje + 90 dias)
2. WHEN nenhuma data é selecionada, O SISTEMA SHALL usar range padrão (últimos 30 dias, próximos 90 dias)
3. WHEN um intervalo é selecionado, O SISTEMA SHALL exibir apenas atividades dentro do período
4. WHEN data inicial > data final, O SISTEMA SHALL exibir erro: "Data inicial deve ser antes da data final"
5. WHEN atividades sem data são filtradas, O SISTEMA SHALL:
   - Para Tarefas: incluir tarefas sem prazo definido como "sem data"
   - Para Provas: não aplicar (prova sempre tem data)
   - Para Trabalhos: não aplicar (trabalho sempre tem data de entrega)
6. WHEN filtro é alterado, O QUERY_STRING SHALL ser: `?dateFrom=2024-01-15&dateTo=2024-04-15`
7. WHEN a estudante clica em atalhos de data (ex: "Esta semana", "Este mês", "Próximos 7 dias"), O INTERVALO SHALL ser atualizado
8. WHERE atalhos de data existem, O SISTEMA SHALL oferecer:
   - "Hoje"
   - "Esta semana"
   - "Este mês"
   - "Próximos 7 dias"
   - "Próximos 30 dias"
   - "Customizado"

---

### Requisito 8: Filtro por Status

**User Story:** Como estudante, quero filtrar atividades por status para focar nas que ainda preciso fazer ou já completei.

#### Critérios de Aceitação

1. WHEN a página de listagem é exibida, O SISTEMA SHALL mostrar filtro "Status" com checkboxes:
   - Para Tarefas: ☐ A fazer, ☐ Em progresso, ☐ Concluída
   - Para Provas: (status fixo, sem filtro aplicável ou incluir "Próxima" vs "Passada")
   - Para Trabalhos: ☐ Pendente, ☐ Entregue, ☐ Avaliado

2. WHEN nenhum status é selecionado, O SISTEMA SHALL exibir TODOS os status
3. WHEN um ou mais status são selecionados, O SISTEMA SHALL exibir apenas com esses status
4. QUANDO filtro é alterado, O QUERY_STRING SHALL ser: `?status=todo,in_progress`
5. WHEN a página é recarregada, OS FILTROS SHALL ser restaurados

---

### Requisito 9: Filtro por Tipo de Atividade

**User Story:** Como estudante, quero filtrar para ver apenas Tarefas, Provas ou Trabalhos em uma tela unificada (se aplicável).

#### Critérios de Aceitação

1. WHEN a página `/activities/all` existe (visão unificada), O SISTEMA SHALL mostrar filtro "Tipo" com checkboxes:
   - ☐ Tarefas
   - ☐ Provas
   - ☐ Trabalhos

2. WHEN nenhum tipo é selecionado, O SISTEMA SHALL exibir todos os tipos
3. WHEN tipos são selecionados, O SISTEMA SHALL exibir apenas atividades desses tipos
4. WHEN o filtro é alterado, O LISTA SHALL atualizar em tempo real
5. WHEN múltiplos tipos são selecionados, O SORTING deve considerar tipo (ex: Provas depois Tarefas)

---

### Requisito 10: Combinação de Múltiplos Filtros

**User Story:** Como estudante, quero combinar múltiplos filtros para refinar minha busca (ex: provas de Cálculo no próximo mês com prioridade Alta).

#### Critérios de Aceitação

1. WHEN múltiplos filtros são selecionados, O SISTEMA SHALL combinar com lógica E (AND):
   - Disciplina = Cálculo I E Data está em próximo mês E Prioridade = Alta

2. WHEN todos os filtros estão ativos, O QUERY_STRING SHALL consolidar todos: `?subject=id1&dateFrom=2024-02-01&dateTo=2024-02-29&priority=high`
3. WHEN um filtro é removido, OS_OUTROS_FILTROS devem permanecer ativos
4. WHEN um filtro resulta em zero atividades, O SISTEMA SHALL exibir empty state: "Nenhuma atividade corresponde aos filtros aplicados"
5. WHEN há muitos filtros aplicados, O SISTEMA SHALL exibir chip visual para cada filtro com X para remover
6. WHEN o usuário clica "Limpar Filtros", TODOS os filtros devem ser resetados
7. WHEN filtros são aplicados, O CONTADOR deve exibir: "Exibindo X de Y atividades"

---

### Requisito 11: Ordenação (Sorting)

**User Story:** Como estudante, quero ordenar atividades por critérios diferentes para organização conforme minha necessidade.

#### Critérios de Aceitação

1. WHEN a página de listagem é exibida, O SISTEMA SHALL mostrar select/botões de ordenação com opções:
   - "Data (próximas primeiro)" - padrão
   - "Data (antigas primeiro)"
   - "Prioridade (Alta → Baixa)"
   - "Prioridade (Baixa → Alta)"
   - "Status (A fazer → Concluída)"
   - "Criação (novas primeiro)"
   - "Criação (antigas primeiro)"
   - "Título (A-Z)"
   - "Título (Z-A)"

2. WHEN nenhuma ordenação é selecionada, O DEFAULT_SORT SHALL ser "Data (próximas primeiro)"
3. WHEN um ordenação é selecionada, O LISTA SHALL ser rearranjada imediatamente
4. WHEN a ordenação é alterada, O QUERY_STRING SHALL ser: `?sort=date_asc`
5. WHEN a página é recarregada, A ORDENAÇÃO_APLICADA SHALL ser restaurada

---

### Requisito 12: Paginação ou Infinite Scroll

**User Story:** Como estudante com muitas atividades, quero que a lista carregue incrementalmente para melhorar performance.

#### Critérios de Aceitação

1. WHEN a lista tem > 20 atividades, O SISTEMA SHALL carregar em páginas de 20 itens
2. WHEN a página é carregada, O SISTEMA SHALL exibir primeiras 20 atividades + botão "Carregar Mais"
3. WHEN o usuário clica "Carregar Mais" (ou scroll chega ao final), O SISTEMA SHALL carregar próximos 20
4. WHEN mais atividades estão carregando, O SISTEMA SHALL exibir loading indicator no botão
5. WHEN todas as atividades foram carregadas, O BOTÃO "Carregar Mais" SHALL desaparecer
6. WHEN a página é carregada, O TOTAL_CONTAGEM deve ser exibido: "Mostrando 20 de 47 atividades"
7. WHERE paginação é usada, O QUERY_STRING SHALL incluir: `?page=1&limit=20`

---

### Requisito 13: Performance: Carregamento de Disciplinas < 500ms

**User Story:** Como desenvolvedor, quero otimizar carregamento de disciplinas para < 500ms conforme requisitos de performance.

#### Critérios de Aceitação

1. WHEN o filtro de Disciplina é expandido, O DROPDOWN_DISCIPLINAS SHALL carregar em < 500ms
2. WHEN disciplinas são carregadas, O SISTEMA SHALL usar cache por 5 minutos
3. WHEN múltiplas abas estão abertas, O CACHE deve ser compartilhado entre abas
4. WHEN novas disciplinas são criadas, O CACHE_DISCIPLINAS SHALL ser invalidado automaticamente
5. WHERE queries são executadas, O SUPABASE_QUERY SHALL usar índices em `(user_id, created_at)` para otimização
6. WHEN dados são buscados, O SISTEMA SHALL usar React Query com `staleTime: 5 * 60 * 1000`

---

### Requisito 14: Performance: Filtros Aplicados < 100ms

**User Story:** Como desenvolvedor, quero que filtros sejam aplicados em < 100ms para UX responsiva.

#### Critérios de Aceitação

1. WHEN um filtro é alterado, O SISTEMA SHALL atualizar lista em < 100ms
2. WHEN filtros são aplicados, O FILTRAGEM deve ocorrer no CLIENTE se dados já carregados
3. WHEN filtragem complexa é necessária, O SISTEMA SHALL fazer server-side filtering via query otimizada
4. WHEN múltiplos filtros são alterados rapidamente, O SISTEMA SHALL fazer debounce e executar apenas última combinação
5. WHERE queries são executadas, O SUPABASE_QUERY_OPTIMIZER deve ser usado para minimizar latência

---

### Requisito 15: Design Responsivo - Mobile (< 768px)

**User Story:** Como estudante usando celular, quero que a interface de listagem seja totalmente responsiva com toque confortável.

#### Critérios de Aceitação

1. WHEN a página é visualizada em mobile (< 768px), O CARDS SHALL ocupar 100% da largura com padding
2. WHEN em mobile, O MENU_FILTROS SHALL estar colapsado com ícone de filtro expandível
3. WHEN o menu de filtros é expandido em mobile, O FILTROS_OVERLAY deve cobrir parte da tela com close button
4. WHEN em mobile, OS_CARDS SHALL ter altura suficiente para toque confortável (min 60px)
5. WHEN em mobile, O INPUT_BUSCA deve ocupar 100% da largura disponível
6. WHEN em mobile, OS_BOTÕES no card deve ter tamanho tátil > 44px de altura
7. WHEN em mobile, OS_ÍCONES no card devem ser legíveis (min 24px)
8. WHEN em mobile com multiple filtros ativos, OS_CHIPS_FILTROS devem wrappear corretamente
9. WHEN scroll é necessário, O COMPORTAMENTO deve ser suave com momentum scrolling

---

### Requisito 16: Design Responsivo - Tablet (768px - 1024px)

**User Story:** Como estudante usando tablet, quero uma interface balanceada com espaço eficiente.

#### Critérios de Aceitação

1. WHEN a página é visualizada em tablet (768px - 1024px), O LAYOUT deve exibir:
   - Menu de filtros em sidebar colapsável (esquerda)
   - Lista de atividades no centro com 2-3 colunas se apropriado
   - Espaço eficiente para toque e leitura

2. WHEN em tablet, O CARDS podem ser exibidos em grid com 2 colunas
3. WHEN sidebar está colapsada, O ÍCONE de menu deve ser visible
4. WHEN sidebar é expandida, O CONTEÚDO deve slide in suavemente

---

### Requisito 17: Design Responsivo - Desktop (> 1024px)

**User Story:** Como estudante usando desktop, quero interface com layout compacto que maximize espaço de trabalho.

#### Critérios de Aceitação

1. WHEN a página é visualizada em desktop (> 1024px), O LAYOUT deve exibir:
   - Menu de filtros em sidebar esquerdo (sempre visível)
   - Lista de atividades em coluna centro/direita
   - Espaço horizontal eficiente

2. WHEN em desktop, O CARDS podem ser exibidos em coluna única ou grid conforme design
3. WHEN em desktop, OS_FILTROS estão sempre visíveis na sidebar
4. WHEN hover sobre card, O CARD deve exibir ações rápidas (editar, deletar, detalhes)

---

### Requisito 18: Sincronização em Tempo Real com Realtime

**User Story:** Como estudante, quero que a lista se atualize automaticamente quando atividades são criadas, editadas ou deletadas em outra aba/dispositivo.

#### Critérios de Aceitação

1. WHEN a página está aberta e uma atividade é criada em outra aba, O LISTA SHALL atualizar automaticamente < 500ms
2. WHEN uma atividade é editada, O CARD correspondente SHALL ser atualizado com novos dados
3. WHEN uma atividade é deletada, O CARD SHALL desaparecer da lista com animação suave
4. WHEN múltiplas abas estão abertas (mesma sessão), O REALTIME_SYNC deve sincronizar entre abas instantaneamente
5. WHEN a conexão Realtime é perdida, O SISTEMA SHALL fazer polling a cada 30 segundos
6. WHEN a conexão Realtime é retomada, O SISTEMA SHALL sincronizar dados imediatamente
7. WHERE Realtime é implementado, O CANAL deve usar Supabase Realtime com política de RLS
8. WHEN a lista é atualizada via Realtime, O COMPONENTE NÃO SHALL piscar/rerender toda a lista (atualizar apenas card afetado)
9. WHEN múltiplas mudanças ocorrem rapidamente, O SISTEMA SHALL fazer batch updates para evitar flickering

---

### Requisito 19: Cache Local com IndexedDB

**User Story:** Como desenvolvedor, quero cache local para melhorar performance e suportar offline-first.

#### Critérios de Aceitação

1. WHEN dados são carregados, O SISTEMA SHALL armazenar em IndexedDB local
2. WHEN o usuário está offline, O SISTEMA SHALL exibir dados cached
3. WHEN o usuário volta online, O SISTEMA SHALL sincronizar dados remotos com cache
4. WHEN há conflitos entre cache local e servidor, O SERVIDOR ganha (último estado é verdade)
5. WHEN o cache expira (> 1 hora), O SISTEMA SHALL revalidar com servidor
6. WHERE cache é armazenado, O ESTRUTURA shall ser: `activities: { key: id, value: { ...activity, cachedAt, version } }`
7. WHEN o usuário limpa storage, O CACHE deve ser limpo

---

### Requisito 20: Empty States com Mensagens Claras

**User Story:** Como estudante, quero mensagens claras quando não há atividades para entender o que fazer.

#### Critérios de Aceitação

1. WHEN nenhuma atividade existe, O EMPTY_STATE SHALL exibir:
   - Ícone apropriado (ex: checklist vazio)
   - Mensagem amigável: "Nenhuma atividade cadastrada"
   - Botão de ação: "+ Nova Atividade"

2. WHEN filtros são aplicados mas nenhum resultado é encontrado, O EMPTY_STATE SHALL exibir:
   - Ícone de busca sem resultado
   - Mensagem: "Nenhuma atividade corresponde aos filtros aplicados"
   - Botão: "Limpar Filtros" ou "Criar Nova"

3. WHEN há erro ao carregar dados, O ERROR_STATE SHALL exibir:
   - Ícone de erro
   - Mensagem: "Erro ao carregar atividades. Tente recarregar"
   - Botão: "Recarregar"

4. WHERE empty states são exibidos, O CENTRALIZACAO vertical e horizontal deve ser mantida

---

### Requisito 21: Card Visual com Indicadores de Urgência

**User Story:** Como estudante, quero indicadores visuais que mostrem urgência de atividades para identificar prioridades rapidamente.

#### Critérios de Aceitação

1. WHEN uma tarefa vence hoje, O CARD deve exibir:
   - Badge vermelha: "Vence hoje"
   - Ícone de alerta

2. WHEN uma tarefa está atrasada, O CARD deve exibir:
   - Badge vermelho escuro: "Atrasada"
   - Ícone de alerta em vermelho

3. WHEN uma tarefa vence em 1-3 dias, O CARD deve exibir:
   - Badge laranja: "Vence em X dias"

4. WHEN uma tarefa tem prazo distante (> 7 dias), O CARD deve exibir:
   - Badge cinza: "Vence em X dias"

5. WHEN uma tarefa não tem prazo, O CARD deve exibir:
   - Badge cinza: "Sem prazo"

6. WHERE cards estão organizados, O DEFAULT_ORDER deve colocar atrasadas primeiro, depois próximas, depois futuras

---

### Requisito 22: Ações Rápidas no Card (Editar, Deletar, Detalhes)

**User Story:** Como estudante, quero ações rápidas no card para editar, deletar ou ver detalhes rapidamente.

#### Critérios de Aceitação

1. WHEN um card é exibido, O SISTEMA SHALL mostrar ícone de menu (⋮) no canto superior direito
2. WHEN o menu é clicado, O SISTEMA SHALL exibir dropdown com opções:
   - "Ver Detalhes" (ícone: eye)
   - "Editar" (ícone: pencil)
   - "Deletar" (ícone: trash, cor vermelha)

3. WHEN "Ver Detalhes" é clicado, O SISTEMA SHALL navegar para página de detalhes
4. WHEN "Editar" é clicado, O SISTEMA SHALL abrir modal/página de edição pré-populada
5. WHEN "Deletar" é clicado, O SISTEMA SHALL exibir confirmação: "Tem certeza que deseja deletar?"
6. WHEN a estudante confirma deleção, A ATIVIDADE SHALL ser deletada e removida da lista com animação
7. WHEN em desktop com hover, OS_BOTÕES de ação podem ser exibidos diretamente no card

---

### Requisito 23: Carregamento Progressivo com Skeleton Loaders

**User Story:** Como estudante, quero feedback visual enquanto dados carregam para saber que o app está processando.

#### Critérios de Aceitação

1. WHEN a página é carregada, O SISTEMA SHALL exibir skeleton loaders no lugar dos cards
2. WHEN dados começam a chegar, OS_SKELETONS serão substituídos gradualmente pelos cards reais
3. WHEN todos os dados chegaram, OS_SKELETONS desaparecem completamente
4. WHERE skeletons são exibidos, A_ANIMACAO deve ser suave (fade in dos cards)
5. WHEN novos dados são carregados (infinite scroll), NOVOS_SKELETONS devem aparecer no final

---

### Requisito 24: Tratamento de Erros com Retry

**User Story:** Como desenvolvedor, quero tratamento robusto de erros com opção de retry automático ou manual.

#### Critérios de Aceitação

1. IF uma query falha, O SISTEMA SHALL:
   - Fazer retry automático com backoff exponencial (1s, 2s, 4s)
   - Após 3 tentativas, exibir erro ao usuário
   - Oferecer botão "Recarregar" para retry manual

2. WHEN um erro ocorre, O TOAST/ERROR_BOUNDARY SHALL exibir mensagem apropriada:
   - "Erro de conexão. Tente novamente"
   - "Erro ao carregar atividades. Recarregue a página"
   - "Erro de autenticação. Faça login novamente"

3. WHERE erros são capturados, O SISTEMA SHALL fazer logging para debug
4. WHEN o usuário clica "Recarregar", A_OPERACAO deve ser repetida

---

### Requisito 25: Estado da URL com Query Strings

**User Story:** Como desenvolvedor, quero que filtros, busca e ordenação sejam refletidos na URL para permitir compartilhamento e deep linking.

#### Critérios de Aceitação

1. WHEN filtros são aplicados, A_URL deve ser atualizada: `/activities/tasks?priority=high&subject=id1&dateFrom=2024-01-01&sort=date_asc&search=termo`
2. WHEN a página é recarregada com query strings, OS_FILTROS devem ser restaurados
3. WHEN um usuário compartilha a URL, O DESTINO deve abrir com mesmos filtros aplicados
4. WHEN filtros são alterados, A_URL deve ser updated via `window.history.pushState()` (sem recarregar)
5. WHERE query strings são usadas, O FORMATO deve ser compatível com URL encoding

---

### Requisito 26: Acessibilidade WCAG 2.1 AA

**User Story:** Como desenvolvedor, quero que a interface de listagem seja acessível para todos, incluindo usuários com deficiências.

#### Critérios de Aceitação

1. WHEN elementos interativos são exibidos, TODOS_OS_BOTOES devem ter `aria-label` descriptivo
2. WHEN inputs existem, LABELS devem estar associados via `for` attribute
3. WHEN cards são exibidos, A_ESTRUTURA deve usar semantic HTML (article, heading hierarchy)
4. WHEN ícones são usados, OS_ÍCONES devem ter `aria-hidden="true"` se decorativos
5. WHEN cores são usadas para comunicar status, TAMBÉM deve haver texto ou ícone alternativo
6. WHEN selects/dropdowns existem, DEVEM ser navegáveis com teclado (Tab, Enter, Escape)
7. WHEN a página é navegada com screen reader, O_CONTEÚDO deve fazer sentido em ordem linear
8. WHEN contraste é verificado, O_RATIO deve ser >= 4.5:1 para texto normal, >= 3:1 para texto grande
9. WHEN modal/overlay é exibido, O_FOCO deve ser capturado e retornado ao fechar
10. WHEN links são usados, O_TEXTO deve ser descritivo (não "clique aqui")

---

### Requisito 27: Validação com Zod para Inputs de Filtro

**User Story:** Como desenvolvedor, quero validar inputs de filtro com Zod para garantir integridade dos parâmetros.

#### Critérios de Aceitação

1. WHEN filtros são selecionados, O SCHEMA_ZOD SHALL validar:
   - `priority`: array opcional de enums (LOW, MEDIUM, HIGH)
   - `subjectId`: array opcional de UUIDs
   - `dateFrom`: ISO date opcional, não pode ser > dateTo
   - `dateTo`: ISO date opcional, não pode ser < dateFrom
   - `status`: array opcional de enums
   - `search`: string opcional, max 100 caracteres
   - `sort`: enum opcional (date_asc, date_desc, priority_asc, etc)
   - `page`: number opcional, min 1
   - `limit`: number opcional, min 5, max 100

2. WHEN validação falha, O SISTEMA SHALL resetar para valores padrão
3. WHEN query string contém parâmetros inválidos, OS_PARAMETROS_INVALIDOS devem ser ignorados

---

### Requisito 28: Testes com Coverage > 85% para Listagem e Filtros

**User Story:** Como desenvolvedor, quero testes automatizados abrangentes para garantir confiabilidade da listagem e filtros.

#### Critérios de Aceitação

1. WHERE testes unitários existem, O SISTEMA SHALL testar:
   - Filtragem de atividades por cada tipo de filtro
   - Combinação de múltiplos filtros
   - Busca (debounce, case-insensitive)
   - Ordenação de atividades
   - Paginação e infinite scroll
   - Cache logic
   - Coverage > 85%

2. WHERE testes de integração existem, O SISTEMA SHALL testar:
   - Fluxo completo: carregar página, aplicar filtros, buscar
   - Realtime sync após criação/edição/deleção
   - Restore de filtros após reload
   - Error handling e retry

3. WHERE testes E2E existem, O SISTEMA SHALL testar:
   - Usuário navega para Tarefas e vê lista completa
   - Usuário filtra por prioridade Alta
   - Usuário busca por termo
   - Usuário combina múltiplos filtros
   - Usuário edita/deleta atividade do card
   - Nova atividade criada em outra aba aparece instantaneamente

4. WHEN testes são executados, O COMANDO `npm run test` SHALL rodar com Vitest
5. WHEN testes E2E são executados, O COMANDO `npm run test:e2e` SHALL rodar com Playwright

---

### Requisito 29: Server Action para Busca e Filtros

**User Story:** Como desenvolvedor, quero usar Server Actions para busca/filtros, reduzindo latência e melhorando segurança.

#### Critérios de Aceitação

1. WHEN filtros são aplicados, O SERVER_ACTION `getActivities` será chamado em `/src/features/activities/presentation/actions/getActivities.ts`
2. WHEN a ação é executada, O SISTEMA SHALL:
   - Validar inputs com Zod
   - Extrair `userId` do contexto autenticado
   - Construir query otimizada para Supabase
   - Retornar atividades com metadados (total count, página)
   - Usar cache com React Query

3. WHEN a ação retorna resultado, O FORMATO SHALL ser: `{ success: true, data: Activity[], total: number, page: number }`
4. WHEN a ação falha, O FORMATO SHALL ser: `{ error: string, code?: string }`
5. WHERE a ação é chamada, O CLIENTE SHALL usar `useTransition()` para manter UI responsiva

---

### Requisito 30: Integração com React Query para State Management

**User Story:** Como desenvolvedor, quero usar React Query para gerenciar estado de dados remotos com cache e sincronização automática.

#### Critérios de Aceitação

1. WHEN a página é carregada, O HOOK `useActivities()` SHALL:
   - Usar `useQuery()` com chave única: `['activities', { filters, sort, page }]`
   - Chamar Server Action `getActivities`
   - Retornar `{ data, isLoading, error, refetch }`

2. WHEN filtros são alterados, A_QUERY_KEY deve ser invalidada para recarregar dados
3. WHERE dados são cacheados, O `staleTime` deve ser 5 minutos (300s)
4. WHEN o usuário volta para a página, OS_DADOS cached devem ser usados (sem reload)
5. WHEN dados expiram, O BACKGROUND_REFETCH deve atualizar automaticamente
6. WHERE Realtime é implementado, O REALTIME_SUBSCRIPTION deve invalidar query ao detectar mudanças
7. WHEN uma atividade é criada/editada/deletada, O CACHE deve ser invalidado e recarregado

---

### Requisito 31: Componentes React Reutilizáveis para Listagem

**User Story:** Como desenvolvedor, quero componentes React reutilizáveis para listagem, filtragem e busca.

#### Critérios de Aceitação

1. WHERE componentes existem, O SISTEMA SHALL ter:
   - `ActivityList` - componente principal que exibe lista
   - `ActivityCard` - card individual de atividade
   - `ActivityFilters` - container de filtros
   - `FilterGroup` - grupo de filtros (ex: Prioridade)
   - `SearchBar` - input de busca com debounce
   - `SortSelector` - select de ordenação
   - `PaginationControl` - paginação ou botão "Carregar Mais"
   - `EmptyState` - tela vazia com mensagem
   - `ErrorBoundary` - tratamento de erros

2. WHEN componentes são usados, DEVEM aceitar props para customização
3. WHEN componentes renderizam, A_ESTRUTURA deve usar composição e ser totalmente testável
4. WHERE componentes existem, DEVEM estar documentados com JSDoc

---

### Requisito 32: Teste de Propriedades (Property-Based Testing) para Filtros

**User Story:** Como desenvolvedor, quero testes baseados em propriedades para garantir que filtros funcionam corretamente em cenários variados.

#### Critérios de Aceitação

1. WHEN atividades são filtradas por prioridade, A_PROPRIEDADE deve ser verificada:
   - "Todas as atividades retornadas têm prioridade dentro do filtro selecionado"
   - PBT: `forAll(priorities, (p) => filterByPriority([...activities], [p]).every(a => a.priority === p))`

2. WHEN atividades são filtradas por data, A_PROPRIEDADE deve ser verificada:
   - "Todas as atividades retornadas têm dueDate dentro do intervalo [dateFrom, dateTo]"
   - PBT: `forAll(dateRanges, ([from, to]) => filterByDate([...activities], from, to).every(a => a.dueDate >= from && a.dueDate <= to))`

3. WHEN atividades são combinadas com filtros múltiplos, A_PROPRIEDADE deve ser verificada:
   - "Aplicar filtros em qualquer ordem produz o mesmo resultado (comutatividade)"
   - PBT: `forAll(filterOrders, (order) => applyFilters([...activities], order) === applyFilters([...activities], shuffle(order)))`

4. WHEN busca é realizada, A_PROPRIEDADE deve ser verificada:
   - "Busca é case-insensitive: buscar 'Cálculo' retorna mesmo que 'CÁLCULO' ou 'cálculo'"
   - PBT: `forAll(terms, (t) => search([...activities], t) === search([...activities], t.toUpperCase()))`

5. WHEN paginação é aplicada, A_PROPRIEDADE deve ser verificada:
   - "Página 1 + Página 2 + Página 3... = Lista completa (sem gaps ou duplicatas)"
   - PBT: `forAll(datasets, (data) => concat(paginate(data, 1), paginate(data, 2), ...) === data`

6. WHEN ordenação é aplicada, A_PROPRIEDADE deve ser verificada:
   - "Ordenar por data ascendente: a.date <= b.date para qualquer a antes de b"
   - PBT: `forAll([...activities], (sorted) => sortByDate(sorted).every((a, i, arr) => i === 0 || a.date >= arr[i-1].date))`

7. WHEN filtros são resetados, A_PROPRIEDADE deve ser verificada:
   - "Resetar filtros = exibir todas as atividades (count original)"
   - PBT: `forAll(filterCombos, (filters) => clearFilters(applyFilters([...activities], filters)) === activities`

---

### Requisito 33: Otimização de Query com Índices de Banco de Dados

**User Story:** Como desenvolvedor, quero queries otimizadas com índices apropriados para garantir performance mesmo com muitas atividades.

#### Critérios de Aceitação

1. WHEN queries são executadas, O SUPABASE deve ter índices em:
   - `(user_id, created_at DESC)` - para listagem rápida por usuário
   - `(user_id, due_date ASC)` - para filtro por data
   - `(user_id, priority)` - para filtro por prioridade
   - `(user_id, subject_id)` - para filtro por disciplina
   - `(user_id, status)` - para filtro por status

2. WHEN uma query de listagem é executada, O TEMPO_EXECUÇÃO deve ser < 100ms (sem cache)
3. WHEN múltiplos filtros são combinados, O SUPABASE_OPTIMIZER deve usar índices compostos
4. WHERE índices são criados, DEVEM ser mantidos com migrações versionadas em `/supabase/migrations/`

---

### Requisito 34: Integração com Sistema de Notificações para Lembrete de Sincronização

**User Story:** Como estudante, quero ser notificado quando há mudanças em minhas atividades em outra aba/dispositivo.

#### Critérios de Aceitação

1. WHEN uma atividade é modificada em outro dispositivo/aba, O SISTEMA SHALL notificar via Realtime
2. WHEN a notificação chega, O USUARIO pode ver pequeno badge indicando "Atualizações disponíveis"
3. WHEN o usuário clica, A_LISTA deve atualizar instantaneamente com dados mais recentes

---

### Requisito 35: Documentação e Comentários de Código

**User Story:** Como desenvolvedor, quero código bem documentado para facilitar manutenção e onboarding.

#### Critérios de Aceitação

1. WHERE funções de filtro/busca existem, DEVEM ter JSDoc com:
   - Descrição clara do propósito
   - @param com tipos e descrição
   - @returns com tipo e descrição
   - Exemplos de uso

2. WHEN componentes complexos são criados, DEVEM ter comentário explicando:
   - Propósito do componente
   - Props esperadas
   - Comportamentos importantes (ex: debounce, cache)

3. WHERE Server Actions existem, DEVEM ter comentário explicando:
   - O que a ação faz
   - Validações realizadas
   - Possíveis erros e como são tratados

