# Amanda's Study Planner - Especificação de Produto

## 1. Visão Geral

Um aplicativo web responsivo e instalável como PWA destinado à organização acadêmica pessoal de estudantes universitárias. O objetivo é centralizar tarefas, provas e trabalhos em um único lugar, facilitando o planejamento dos estudos e o acompanhamento de prazos.

**Tipo de usuário:** Estudante universitária  
**Modelo:** Aplicativo de usuário único com autenticação  
**Tecnologia:** PWA (Progressive Web App) - instalável e funciona offline  

---

## 2. Objetivo Principal

Consolidar toda a vida acadêmica da estudante em uma plataforma única, minimizando tempo gasto em organização e maximizando foco nos estudos através de:
- Centralização de todas as atividades acadêmicas
- Rastreamento automático de prazos
- Notificações de lembretes
- Visualização clara do calendário acadêmico

---

## 3. Telas Principais

### 3.1 **Início (Dashboard)**
Tela de boas-vindas que oferece um resumo executivo da semana/mês.

**Componentes:**
- Resumo de tarefas pendentes (quantidade e destaque das prioritárias)
- Próximas provas (listadas por data)
- Próximas entregas de trabalhos
- Card com estatísticas rápidas (% de conclusão do mês, horas de estudo, etc.)
- Atalho para "+ Nova atividade"

**Funcionalidade:** Visão 360º da situação acadêmica atual em um relance

---

### 3.2 **Tarefas**
Atividades pessoais de estudo definidas pela estudante.

**Características:**
- **Tipos:** Estudar conteúdos, revisar matérias, resolver exercícios, etc.
- **Campos obrigatórios:**
  - Título/Descrição
  - Disciplina (opcional)
  
- **Campos opcionais:**
  - Prazo (data e hora)
  - Prioridade (Baixa, Média, Alta)
  - Status (A fazer, Em progresso, Concluída)
  - Notas/Observações
  - Tempo estimado de estudo
  - Tags/Categorias customizadas

**Funcionalidades:**
- Listar tarefas por status
- Filtrar por prioridade, disciplina ou data
- Marcar como concluída (com checkbox interativo)
- Editar e deletar tarefas
- Ordenação por data ou prioridade

---

### 3.3 **Calendário**
Visualização integrada de todas as atividades cadastradas.

**Modos de visualização:**
- **Mensal:** Visão tradicional com atividades marcadas nos dias
- **Semanal:** Detalhamento dia a dia da semana

**Interações:**
- Clicar em um dia para ver todas as atividades do dia
- Cores diferentes para tipos de atividade (tarefas, provas, trabalhos)
- Indicadores visuais para prazos próximos (alerta, urgência)
- Sincronização automática com todas as telas

---

### 3.4 **Provas e Trabalhos**
Gerenciamento específico de avaliações formais.

**Campos por tipo:**

#### **Provas**
- Disciplina
- Data e hora
- Matérias/Conteúdos abordados
- Tipo de prova (escrita, oral, prática)
- Sala/Local
- Observações

#### **Trabalhos**
- Disciplina
- Data de entrega
- Descrição da atividade
- Tipo (trabalho escrito, apresentação, projeto)
- Critérios de avaliação
- Status de entrega

#### **Seminários**
- Disciplina
- Data e hora
- Tema
- Local/Formato (presencial, online)
- Responsáveis

**Funcionalidades:**
- Filtros por disciplina, tipo ou status
- Listagem cronológica
- Indicadores de proximidade de prazo (dias faltando)
- Edição e exclusão
- Integração automática ao calendário e dashboard

---

## 4. Fluxo de Criação - "+ Nova Atividade"

Um botão flutuante ou fixo que centraliza toda a criação de atividades.

**Fluxo:**
1. Clique em "+ Nova atividade"
2. Modal/página com 3 opções:
   - 📝 **Tarefa**
   - 📋 **Prova**
   - 📚 **Trabalho**
   - 📚 **Seminários**
3. Seleção leva a formulário específico com campos correspondentes
4. Submissão salva a atividade e retorna à tela anterior
5. Atividade aparece automaticamente em:
   - Calendário
   - Dashboard (se próxima)
   - Tela específica (Tarefas/Provas e Trabalhos)

---

## 5. Integrações Automáticas

Todos os registros devem se sincronizar automaticamente:

- ✅ Nova tarefa com prazo → aparece no Calendário e no Dashboard
- ✅ Nova prova → aparece em "Provas e Trabalhos" + Calendário + Dashboard
- ✅ Nova trabalho → aparece em "Provas e Trabalhos" + Calendário + Dashboard
- ✅ Mudança de status → reflete em todas as telas
- ✅ Exclusão → remove de todas as visualizações

---

## 6. Autenticação e Segurança

**Modelo:** Usuário único com autenticação pessoal

**Fluxo de autenticação:**
- Login inicial com email/senha ou autenticação social
- Geração de sessão com token JWT ou similar
- Persistência de sessão no navegador
- Logout com limpeza de dados locais

**Segurança:**
- Criptografia de dados sensíveis em repouso (localStorage)
- Validação de entrada em todos os formulários
- HTTPS obrigatório
- Proteção contra CSRF

---

## 7. Notificações e Lembretes

**Tipos de notificação:**
- ⏰ **Prova em 24h:** Notificação 1 dia antes
- ⏰ **Entrega em 24h:** Notificação 1 dia antes
- ⏰ **Tarefa com prazo próximo:** Notificação 2-3 horas antes
- 🔔 **Customizável:** Estudante define horários de notificação

**Canais:**
- Notificações do navegador (web push)
- Notificação na tela do app
- Email (opcional)

**Funcionalidade offline:**
- Notificações funcionam mesmo com app offline (Service Worker)

---

## 8. Design e UX

### Princípios de Design
- **Minimalista:** Foco no essencial, sem clutter
- **Moderno:** Design limpo, cores neutras com acentos sutis
- **Intuitivo:** Navegação lógica, ícones claros, textos concisos
- **Responsivo:** Funciona perfeitamente em celular, tablet e desktop

### Paleta de Cores (Sugerida)
- Cor primária: Azul ou Roxo (calma, concentração)
- Cor secundária: Verde (progresso, conclusão)
- Cores de alerta: Laranja/Vermelho (urgência)
- Fundo: Branco ou cinza muito claro
- Texto: Cinza escuro/Preto

### Tipografia
- Fonte sans-serif moderna (Roboto, Inter, Poppins)
- Hierarquia clara: títulos, subtítulos, corpo

### Layout
- **Mobile First:** Desenvolvido para celular primeiro
- Navegação por abas ou menu inferior (mobile)
- Menu lateral ou horizontal (desktop)
- Espaçamento generoso para toque confortável

---

## 9. Funcionalidades Complementares (MVP+)

**Fase 1 (MVP):**
- Criação, edição, exclusão de atividades
- Visualização em calendário e dashboard
- Notificações básicas

**Fase 2:**
- Estatísticas e relatórios de produtividade
- Exportação de calendário (iCal, PDF)
- Integração com Google Calendar
- Temas claro/escuro

**Fase 3:**
- Metas de estudo semanal
- Histórico e análise de conclusão
- Sugestões de planejamento por IA
- Compartilhamento de horários com colegas (opcional)

---

## 10. Requisitos Técnicos

### Stack Sugerido
- **Frontend:** React/Vue.js + TypeScript
- **Armazenamento:** IndexedDB (offline) + Backend Sync
- **Backend:** Node.js/Python + Banco de dados
- **PWA:** Service Worker, Web App Manifest
- **Notificações:** Web Push API

### Checklist PWA
- ✅ Manifest.json com ícones e cores
- ✅ Service Worker funcional
- ✅ HTTPS
- ✅ Responsivo
- ✅ Rápido e offline-first
- ✅ Instalável em home screen

---

## 11. Roadmap

| Fase | Duração | Funcionalidades |
|------|---------|---|
| **Planejamento** | 1 semana | Wireframes, Design, Arquitetura |
| **MVP** | 3-4 semanas | Core features (criar, listar, calendário) |
| **Beta** | 2 semanas | Testes, Notificações, Refinamento |
| **Launch** | 1 semana | Deploy, Documentação, Divulgação |
| **Fase 2** | Contínuo | Melhorias, Estatísticas, Integrações |

---

## 12. Métricas de Sucesso

- ✅ Tempo médio para criar nova atividade < 30 segundos
- ✅ Taxa de retenção semanal > 70%
- ✅ Carregamento inicial < 3 segundos
- ✅ Funcionalidade offline 100%
- ✅ Taxa de notificações visualizadas > 60%
- ✅ NPS (Net Promoter Score) > 50

---

## Conclusão

Amanda's Study Planner é uma solução focada na simplificação da vida acadêmica, oferecendo um espaço centralizado e intuitivo para gerenciar estudos. Com design minimalista e funcionalidades essenciais bem integradas, o app busca ser o companheiro perfeito para estudantes universitárias que desejam otimizar seu tempo e produtividade.
