# Requisitos: Editar & Deletar Atividades (Activity CRUD)

## Introdução

O Editar & Deletar Atividades amplia o gerenciamento do ciclo de vida completo das atividades acadêmicas. Após criar e listar atividades, os usuários precisam poder modificar atividades existentes, marcar como concluídas e deletar registros obsoletos. Este módulo fornece:

- **Edição completa** de Tarefas, Exames e Atribuições com pré-preenchimento de formulário
- **Atualização de campos** com validações equivalentes à criação
- **Deleção com confirmação** e opção de recuperação via lixeira
- **Marcação de conclusão** para Tarefas com ações rápidas
- **Transições de estado** com validação de fluxo de trabalho
- **Sincronização em tempo real** de atualizações entre abas/dispositivos
- **Atualizações otimistas** para feedback imediato ao usuário
- **Operações em lote** (opcional) para deleção e mudança de status em massa
- **Recuperação de undo** para ações recentes
- **Tratamento de conflitos** quando múltiplos usuários/abas editam simultaneamente

## Glossário

- **Atividade (Activity):** Entidade genérica englobando Tarefas, Exames e Atribuições
- **Tarefa (Task):** Atividade de estudo com título, descrição, prioridade e prazo
- **Exame (Exam):** Atividade com disciplina, data/hora, conteúdo e tipo (escrito, oral, prático)
- **Atribuição (Assignment):** Atividade com disciplina, prazo, descrição, tipo e critérios de avaliação
- **Editor (Editor):** Componente UI que permite modificação de campos de atividade
- **Lixeira (Trash):** Local virtual onde atividades deletadas ficam antes de remoção permanente
- **Conflito de Edição (Edit Conflict):** Situação onde múltiplas edições ocorrem simultaneamente
- **Atualização Otimista (Optimistic Update):** Feedback imediato ao usuário antes de confirmação do servidor
- **RLS (Row-Level Security):** Política de Supabase que garante acesso apenas aos dados do usuário
- **Sincronização em Tempo Real:** Atualização automática de dados quando alterações são detectadas
- **Estado (Status):** Posição atual da atividade no fluxo (todo, in-progress, completed)
- **Campo Editável:** Campo que pode ser modificado pelo usuário
- **Campo Somente Leitura (Read-Only):** Campo que não pode ser modificado após criação
- **Timestamp de Atualização (updatedAt):** Data/hora da última modificação
- **Identificador de Usuário (userId):** Chave de segurança para RLS

---

## Requisitos

### Requisito 1: Abrir Editor de Tarefa

**User Story:** Como um aluno, quero abrir o editor de uma Tarefa existente, para que eu possa modificar seus detalhes.

#### Acceptance Criteria

1. WHEN o usuário clica em "Editar" em uma Tarefa na lista, THE Editor SHALL exibir um formulário modal ou página dedicada
2. WHEN o formulário abre, THE Editor SHALL pré-preencher todos os campos com os valores atuais da Tarefa
3. WHEN o formulário abre, THE Editor SHALL exibir o `createdAt` da Tarefa como somente leitura
4. WHEN a Tarefa possui `updatedAt` diferente de `createdAt`, THE Editor SHALL exibir "Editada em [data/hora]" como somente leitura
5. THE Editor SHALL focar no campo de título para melhor acessibilidade

---

### Requisito 2: Abrir Editor de Exame

**User Story:** Como um aluno, quero abrir o editor de um Exame existente, para que eu possa modificar data, hora ou detalhes.

#### Acceptance Criteria

1. WHEN o usuário clica em "Editar" em um Exame, THE Editor SHALL exibir um formulário modal ou página dedicada
2. WHEN o formulário abre, THE Editor SHALL pré-preencher: disciplina, data, hora, conteúdo, tipo, local e notas
3. WHEN o formulário abre, THE Editor SHALL exibir `createdAt` e `updatedAt` como somente leitura
4. THE Editor SHALL preservar a lista de conteúdos (topics) como campo editável
5. WHEN campos de data/hora são modificados, THE Editor SHALL validar que a data não está no passado

---

### Requisito 3: Abrir Editor de Atribuição

**User Story:** Como um aluno, quero abrir o editor de uma Atribuição existente, para que eu possa ajustar prazo ou descrição.

#### Acceptance Criteria

1. WHEN o usuário clica em "Editar" em uma Atribuição, THE Editor SHALL exibir um formulário modal ou página dedicada
2. WHEN o formulário abre, THE Editor SHALL pré-preencher: disciplina, prazo, descrição, tipo, critérios e status
3. WHEN o formulário abre, THE Editor SHALL exibir `createdAt` e `updatedAt` como somente leitura
4. THE Editor SHALL permitir mudança de status entre: pending, submitted, graded
5. WHEN o status muda, THE Editor SHALL registrar a transição de estado com timestamp

---

### Requisito 4: Validação de Campos na Edição

**User Story:** Como um aluno, quero que os campos sejam validados ao editar, para que eu não envie dados inválidos.

#### Acceptance Criteria

1. THE Editor SHALL aplicar as mesmas validações da criação (campo obrigatório, comprimento máximo, formato)
2. WHEN um campo obrigatório fica vazio, THE Editor SHALL exibir erro em tempo real
3. WHEN o usuário digita mais caracteres que o máximo permitido, THE Editor SHALL truncar ou avisar
4. WHEN a validação falha, THE Editor SHALL desabilitar o botão "Salvar"
5. THE Editor SHALL mostrar feedback visual claro (ícone de erro, bordas vermelhas) para campos inválidos

---

### Requisito 5: Campos Editáveis vs. Somente Leitura

**User Story:** Como um aluno, quero saber claramente quais campos posso editar, para evitar confusão.

#### Acceptance Criteria

1. THE Editor SHALL permitir edição de: título, descrição, prioridade, disciplina, datas, status
2. THE Editor SHALL bloquear edição de: id, createdAt, updatedAt, userId
3. WHERE uma Tarefa foi criada há mais de 24 horas, THE Editor SHALL considerar prioridade como editável ainda
4. WHILE um campo é somente leitura, THE Editor SHALL desabilitar o input e indicar visualmente (cor acinzentada)
5. THE Editor SHALL exibir tooltip explicativo ao passar mouse sobre campo somente leitura

---

### Requisito 6: Salvar Alterações

**User Story:** Como um aluno, quero salvar minhas alterações e receber confirmação, para ter certeza de que foi armazenado.

#### Acceptance Criteria

1. WHEN o usuário clica "Salvar", THE Editor SHALL validar todos os campos
2. IF validação passa, THE Editor SHALL enviar dados ao servidor via Server Action
3. WHEN dados são enviados, THE Editor SHALL exibir indicador de carregamento (spinner, "Salvando...")
4. WHEN servidor confirma sucesso, THE Editor SHALL mostrar notificação "Atividade atualizada com sucesso"
5. WHEN servidor retorna erro, THE Editor SHALL exibir mensagem de erro clara e manter os dados no formulário

---

### Requisito 7: Atualização Otimista

**User Story:** Como um aluno, quero ver as alterações instantaneamente, para melhor percepção de performance.

#### Acceptance Criteria

1. WHEN o usuário clica "Salvar", THE Editor SHALL atualizar a UI imediatamente (antes de resposta do servidor)
2. WHEN a resposta do servidor chega com sucesso, THE Editor SHALL manter a mudança
3. IF a resposta do servidor falha, THE Editor SHALL reverter para valores anteriores
4. WHILE a resposta do servidor está pendente, THE Editor SHALL mostrar estado "pendente" (ex: cor diferente)
5. THE Editor SHALL notificar o usuário sobre reversão se ocorrer erro

---

### Requisito 8: Cancelar Edição

**User Story:** Como um aluno, quero cancelar a edição sem perder dados originais, para ter controle total.

#### Acceptance Criteria

1. WHEN o usuário clica "Cancelar", THE Editor SHALL fechar sem salvar
2. IF há mudanças não salvas, THE Editor SHALL exibir confirmação "Descartar alterações?"
3. WHEN o usuário confirma descarte, THE Editor SHALL fechar sem enviar dados
4. WHEN o usuário cancela confirmação, THE Editor SHALL manter o editor aberto
5. THE Editor SHALL restaurar valores originais se o usuário fez mudanças e clica "Cancelar"

---

### Requisito 9: Deletar Atividade com Confirmação

**User Story:** Como um aluno, quero deletar uma Atividade com confirmação, para evitar deleção acidental.

#### Acceptance Criteria

1. WHEN o usuário clica botão "Deletar" ou ícone de lixeira, THE System SHALL exibir modal de confirmação
2. THE confirmação SHALL exibir nome da atividade e aviso "Esta ação não pode ser desfeita"
3. WHEN o usuário clica "Sim, deletar", THE System SHALL mover atividade para Lixeira (soft delete)
4. IF deleção é bem-sucedida, THE System SHALL fechar modal e mostrar notificação "Atividade movida para lixeira"
5. WHEN o usuário clica "Cancelar" no modal, THE System SHALL fechar sem deletar

---

### Requisito 10: Lixeira (Trash) com Recuperação

**User Story:** Como um aluno, quero recuperar uma Atividade deletada, para não perder dados acidentalmente.

#### Acceptance Criteria

1. WHEN uma atividade é deletada, THE System SHALL mover para Lixeira com timestamp de deleção
2. THE Lixeira SHALL listar atividades deletadas com: nome, data de deleção, tempo até remoção permanente
3. WHEN o usuário clica "Restaurar" em uma atividade na Lixeira, THE System SHALL mover de volta para status anterior
4. WHEN uma atividade fica 30 dias na Lixeira, THE System SHALL deletar permanentemente
5. WHEN o usuário clica "Deletar Permanentemente", THE System SHALL remover imediatamente

---

### Requisito 11: Marcar Tarefa como Concluída

**User Story:** Como um aluno, quero marcar uma Tarefa como concluída, para rastrear meu progresso.

#### Acceptance Criteria

1. WHEN o usuário clica checkbox "Concluída" em uma Tarefa, THE System SHALL atualizar status para "completed"
2. WHEN status muda para "completed", THE System SHALL registrar timestamp de conclusão
3. WHEN status é "completed", THE Tarefa SHALL exibir visualmente como concluída (strikethrough, ícone)
4. WHEN o usuário clica novamente no checkbox, THE System SHALL reabrir a Tarefa (status "todo")
5. WHERE uma Tarefa é marcada concluída, THE System SHALL remover indicador de urgência/prioridade

---

### Requisito 12: Ação Rápida de Conclusão

**User Story:** Como um aluno, quero marcar concluída com um clique na lista, para rápida ação.

#### Acceptance Criteria

1. WHEN o usuário clica ícone de check na linha de Tarefa, THE System SHALL marcar como concluída sem abrir editor
2. WHEN ação é bem-sucedida, THE System SHALL exibir feedback visual (ex: checkbox marcado)
3. WHEN o usuário passa mouse sobre ícone, THE System SHALL exibir tooltip "Marcar como concluída"
4. WHEN a ação falha no servidor, THE System SHALL reverter checkbox e exibir erro
5. WHERE múltiplos cliques ocorrem rapidamente, THE System SHALL desabilitar botão para evitar duplicação

---

### Requisito 13: Transições de Estado Válidas

**User Story:** Como um aluno, quero que transições de estado sejam validadas, para manter integridade de dados.

#### Acceptance Criteria

1. THE System SHALL permitir transição: todo → in-progress, in-progress → completed, completed → todo
2. THE System SHALL permitir Atribuição: pending → submitted → graded (também pode voltar a pending)
3. IF uma transição inválida é solicitada, THE System SHALL rejeitar e exibir erro
4. WHEN uma transição ocorre, THE System SHALL registrar: novo estado, timestamp, quem fez
5. WHERE histórico de transições é consultado, THE System SHALL exibir cronograma de mudanças de estado

---

### Requisito 14: Detectar Conflitos de Edição Concorrente

**User Story:** Como um aluno, quero ser notificado se outra aba ou dispositivo editar a mesma Atividade, para evitar sobrescrita.

#### Acceptance Criteria

1. WHEN o usuário abre um editor, THE System SHALL armazenar versão original com `updatedAt` timestamp
2. WHILE o editor está aberto, THE System SHALL verificar periodicamente se versão do servidor mudou
3. IF `updatedAt` do servidor é posterior ao da versão armazenada, THE System SHALL detectar conflito
4. WHEN conflito é detectado, THE System SHALL exibir modal "Atividade foi modificada em outro lugar"
5. THE modal SHALL oferecer opções: "Recarregar dados", "Descartar minhas mudanças", "Manter minhas mudanças"

---

### Requisito 15: Resolver Conflitos de Edição

**User Story:** Como um aluno, quero resolver conflitos de forma clara, para manter dados consistentes.

#### Acceptance Criteria

1. IF usuário clica "Recarregar dados", THE System SHALL carregar versão atual do servidor
2. IF usuário clica "Manter minhas mudanças", THE System SHALL tentar salvar (pode falhar se houver conflito)
3. WHEN "Manter minhas mudanças" é salvo com sucesso, THE System SHALL exibir notificação de sucesso
4. WHEN "Manter minhas mudanças" falha, THE System SHALL exibir: versão do servidor vs minhas mudanças lado a lado
5. THE System SHALL permitir manual merge ou descartar minhas mudanças

---

### Requisito 16: Sincronização em Tempo Real

**User Story:** Como um aluno, quero que mudanças em outro dispositivo apareçam automaticamente, para sempre ter dados atualizados.

#### Acceptance Criteria

1. THE System SHALL usar Supabase real-time subscriptions para atualizar lista automaticamente
2. WHEN uma atividade é editada em outro dispositivo, THE lista SHALL atualizar em < 2 segundos
3. WHEN uma atividade é deletada em outro dispositivo, THE lista SHALL remover em < 2 segundos
4. IF a lista está aberta enquanto novo dado chega, THE System SHALL atualizar sem recarregar
5. WHERE indicador "Atualizado em outro lugar" é exibido, THE System SHALL mostrar timestamp/usuário

---

### Requisito 17: Indicador de Atualização Remota

**User Story:** Como um aluno, quero saber quando dados foram atualizados em outro lugar, para contexto.

#### Acceptance Criteria

1. WHEN uma atividade é atualizada em tempo real, THE System SHALL exibir ícone/badge "Atualizado"
2. THE indicador SHALL mostrar informação: "Atualizado em [dispositivo/aba]" com timestamp
3. WHILE o usuário visualiza lista, THE indicador SHALL permanecer visível por 5 segundos
4. WHEN o usuário clica no indicador, THE System SHALL exibir detalhes da mudança
5. WHERE o usuário edita a atividade, THE indicador SHALL desaparecer

---

### Requisito 18: Sincronização Offline e Fila de Pendências

**User Story:** Como um aluno, quero que edições offline sejam sincronizadas quando voltar online, para manter continuidade.

#### Acceptance Criteria

1. WHEN o usuário edita offline, THE System SHALL armazenar no IndexedDB com flag "pending"
2. WHEN conexão volta, THE System SHALL detectar automaticamente
3. WHEN conexão é restaurada, THE System SHALL enviar edições pendentes ao servidor
4. IF edição pendente entrar em conflito no servidor, THE System SHALL alertar o usuário
5. WHEN sincronização é bem-sucedida, THE Sistema SHALL limpar flag "pending"

---

### Requisito 19: Operação em Lote - Deletar Múltiplas

**User Story:** Como um aluno, quero deletar várias Atividades ao mesmo tempo (opcional), para melhor eficiência.

#### Acceptance Criteria

1. WHEN o usuário seleciona múltiplas atividades (checkboxes), THE list SHALL exibir barra de ações em lote
2. THE barra de ações SHALL exibir: "Deletar X selecionadas", "Mudar status", "Atribuir a disciplina"
3. WHEN o usuário clica "Deletar X", THE System SHALL exibir confirmação com lista de nomes
4. WHEN o usuário confirma, THE System SHALL deletar (mover para lixeira) em paralelo
5. WHEN operação completa, THE System SHALL exibir: "X atividades movidas para lixeira"

---

### Requisito 20: Operação em Lote - Mudar Status

**User Story:** Como um aluno, quero mudar status de várias Atividades (opcional), para operações rápidas.

#### Acceptance Criteria

1. WHEN múltiplas atividades são selecionadas, THE barra de ações SHALL exibir dropdown "Novo Status"
2. THE dropdown SHALL listar status válidos para tipo de atividade selecionado
3. WHEN usuário seleciona novo status, THE System SHALL atualizar todas selecionadas
4. WHEN operação completa, THE System SHALL exibir notificação de sucesso com contagem
5. IF alguma atividade falha transição, THE System SHALL exibir: "5 de 10 alteradas. 5 falharam por restrição"

---

### Requisito 21: Undo (Desfazer) para Ações Recentes

**User Story:** Como um aluno, quero desfazer ações recentes, para corrigir erros rapidamente.

#### Acceptance Criteria

1. WHEN o usuário edita/deleta atividade, THE System SHALL registrar ação em pilha "undo" local
2. WHEN o usuário pressiona Ctrl+Z (ou clica "Desfazer"), THE System SHALL reverter ação mais recente
3. WHEN undo é executado, THE System SHALL restaurar estado anterior com animação
4. WHEN o usuário faz nova ação após undo, THE pilha "redo" SHALL ser limpa
5. THE pilha undo SHALL armazenar máximo 10 ações recentes

---

### Requisito 22: Redo (Refazer) para Ações Desfeitas

**User Story:** Como um aluno, quero refazer ações que desfiz, para maior flexibilidade.

#### Acceptance Criteria

1. WHEN o usuário pressiona Ctrl+Y (ou clica "Refazer"), THE System SHALL aplicar novamente ação desfeita
2. WHEN redo é executado, THE System SHALL restaurar estado com animação
3. WHEN o usuário faz nova ação, THE pilha "redo" SHALL ser limpa
4. WHILE não há ações para refazer, THE botão "Refazer" SHALL estar desabilidado
5. THE pilha redo SHALL ter mesmo tamanho máximo que undo (10)

---

### Requisito 23: Tratamento de Erros na Edição

**User Story:** Como um aluno, quero receber mensagens de erro claras, para entender o que deu errado.

#### Acceptance Criteria

1. WHEN validação no cliente falha, THE System SHALL exibir erro específico: "Título é obrigatório"
2. WHEN validação no servidor falha, THE System SHALL exibir: "Disciplina não existe"
3. WHEN erro de rede ocorre, THE System SHALL exibir: "Sem conexão. Tente novamente"
4. WHEN erro 409 (conflito) ocorre, THE System SHALL oferecer opção de resolver conflito (Req 14-15)
5. WHEN erro 403 (acesso negado) ocorre, THE System SHALL exibir: "Você não tem permissão para editar"

---

### Requisito 24: Design Responsivo - Modal/Página de Edição

**User Story:** Como um aluno, quero que o editor funcione bem em mobile e desktop, para editar em qualquer dispositivo.

#### Acceptance Criteria

1. ON mobile (< 768px), THE Editor SHALL exibir como modal em tela cheia (full-screen)
2. ON mobile, THE modal SHALL ter botões em ordem: "Cancelar" (esquerda), "Salvar" (direita)
3. ON mobile, THE campos SHALL ocupar 100% da largura
4. ON desktop (≥ 768px), THE Editor SHALL exibir como modal centrada com 600px de largura
5. ON desktop, THE inputs SHALL ter tamanho confortável com labels visíveis

---

### Requisito 25: Navegação com Teclado

**User Story:** Como um aluno, quero navegar e usar o editor com teclado, para melhor acessibilidade.

#### Acceptance Criteria

1. WHEN o usuário pressiona Tab, THE foco SHALL se mover entre campos em ordem lógica
2. WHEN o usuário pressiona Shift+Tab, THE foco SHALL se mover para trás
3. WHEN o usuário está em textarea, THE Ctrl+Enter (ou Cmd+Enter) SHALL salvar
4. WHEN o usuário pressiona Escape, THE modal SHALL fechar
5. WHEN o usuário pressiona Enter em button, THE ação SHALL ser executada

---

### Requisito 26: Labels e ARIA para Acessibilidade

**User Story:** Como um usuário com leitor de tela, quero que formulário seja acessível, para usar normalmente.

#### Acceptance Criteria

1. EVERY input SHALL ter `<label>` associado com `htmlFor`
2. EVERY input obrigatório SHALL ter aria-required="true"
3. WHEN há erro em campo, THE input SHALL ter aria-invalid="true" e aria-describedby="error-id"
4. THE modal SHALL ter `role="dialog"` e aria-labelledby com título
5. EVERY botão SHALL ter texto descritivo ou aria-label

---

### Requisito 27: Indicador de Progresso de Salvamento

**User Story:** Como um aluno, quero ver claramente se dados estão sendo salvos, para evitar fechar cedo.

#### Acceptance Criteria

1. WHEN "Salvar" é clicado, THE botão SHALL exibir spinner + "Salvando..."
2. WHILE salvamento está em progresso, THE botão SHALL estar desabilidado
3. WHEN salvamento completa, THE botão SHALL exibir checkmark + "Salvo"
4. AFTER 2 segundos, THE botão SHALL voltar ao estado "Salvar"
5. IF salvamento falha, THE botão SHALL exibir ícone de erro + "Erro. Tente novamente"

---

### Requisito 28: Dados Não Salvos - Aviso ao Sair

**User Story:** Como um aluno, quero ser alertado antes de sair com dados não salvos, para não perder trabalho.

#### Acceptance Criteria

1. WHEN o usuário tem mudanças não salvas e tenta fechar editor, THE Sistema SHALL exibir: "Descartar alterações?"
2. WHEN o usuário tenta navegar para outra página com mudanças pendentes, THE window SHALL exibir confirmação
3. WHEN o usuário fecha aba do navegador, THE beforeunload SHALL avisar se há mudanças
4. IF o usuário clica "Continuar", THE mudanças SHALL ser descartadas
5. IF o usuário clica "Cancelar", THE ação SHALL ser abortada

---

### Requisito 29: Propriedade: Round-Trip para Serialização

**User Story:** Como desenvolvedor, quero verificar que dados não se corrompem ao salvar/carregar.

#### Acceptance Criteria

1. FOR ALL campos editáveis de atividade, parse(serialize(value)) SHALL retornar valor equivalente
2. WHEN uma Atividade é salva e recarregada, THE dados SHALL ser idênticos exceto timestamps
3. FOR strings com caracteres especiais, THE serialização SHALL preservar exatamente
4. FOR arrays (tags, conteúdo), THE ordem e valores SHALL ser preservados
5. FOR datas, THE serialização SHALL preservar timezone e precisão

---

### Requisito 30: Propriedade: Idempotência em Atualizar

**User Story:** Como desenvolvedor, quero que múltiplas atualizações do mesmo dado resultem no mesmo estado.

#### Acceptance Criteria

1. WHEN o mesmo valor é salvo 2x, THE estado final SHALL ser idêntico
2. WHEN update(x) é chamado com mesmos dados, THE resultado SHALL ser estado estável
3. FOR campos somente leitura, THE atualizações SHALL ignorá-los
4. WHEN timestamp updatedAt é gerado pelo servidor, THE múltiplas atualizações com dados idênticos SHALL ter timestamps diferentes mas estado igual
5. THE idempotência SHALL ser preservada mesmo em operações de conflito resolvidas

---

## Conclusão

Este documento de requisitos estabelece as funcionalidades completas para edição, atualização e deleção de atividades acadêmicas. Seguindo os padrões EARS e qualidade INCOSE, cada requisito é testável, claro e solução-agnóstico, pronto para fase de design.
