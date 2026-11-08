# 🎯 Separação Ideal: MVP-First por Fluxo de Usuário

## Spec 1: Setup Inicial & Autenticação

Feature: auth-setup

Login/Registro com Supabase Auth
Sessão e proteção de rotas
Tema PWA (manifest, ícones, colors)
Valor: Essencial, desbloqueia tudo
Tamanho: Médio (sem notificações ainda)
Duração: 2-3 dias

## Spec 2: Criar Atividade (Universal)

Feature: activity-creation

Modal "+ Nova Atividade" com 3 tipos (Tarefa, Prova, Trabalho)
Formulários específicos com campos por tipo
Salvar no Supabase
Valor: Core feature, usuário consegue entrar dados
Tamanho: Médio
Depende: Spec 1
Duração: 2-3 dias

 ## Spec 3: Listar & Filtrar Atividades

Feature: activity-list-filter

Tela de Tarefas com listagem
Tela de Provas e Trabalhos com listagem
Filtros (prioridade, disciplina, data, status, tipo)
Busca rápida
Valor: Usuário consegue ver e organizar dados
Tamanho: Médio-Grande
Depende: Spec 2
Duração: 2-3 dias

## Spec 4: Editar & Deletar Atividades

Feature: activity-crud

Editar tarefas, provas, trabalhos
Deletar com confirmação
Marcar como concluída (checkbox)
Atualizar status
Valor: Gerenciamento completo
Tamanho: Pequeno
Depende: Spec 3
Duração: 1-2 dias

## Spec 5: Dashboard (Visão 360°)

Feature: dashboard-home

Resumo de tarefas pendentes
Próximas provas
Próximas entregas
Estatísticas rápidas (% conclusão, horas estimadas)
Links rápidos para criar atividade
Valor: Visão executiva, homescreen atrativa
Tamanho: Médio
Depende: Spec 3 (dados precisam existir)
Duração: 2-3 dias

## Spec 6: Calendário (Visualização Integrada)

Feature: calendar-view

Modo mensal com dias clicáveis
Modo semanal com detalhamento
Cores por tipo (tarefa, prova, trabalho)
Indicadores de urgência (badges, cores)
Click para ver dia completo
Valor: Visualização poderosa, sincronização automática
Tamanho: Grande (React Day Picker + lógica)
Depende: Spec 3
Duração: 3-4 dias

## Spec 7: Notificações & Lembretes

Feature: notifications-system

Web Push setup (VAPID keys)
Tipos: Prova 24h, Entrega 24h, Tarefa 2-3h
Settings para customizar
Permissões do navegador
Valor: Prioridade alta, usuário não perde prazos
Tamanho: Médio
Depende: Spec 2, 3
Duração: 2-3 dias

## Spec 8: PWA & Offline-First

Feature: pwa-offline

Service Worker (caching estratégico)
Sincronização ao voltar online
Instalabilidade (home screen)
IndexedDB para cache local
Valor: App funciona sem internet
Tamanho: Grande (transversal)
Depende: Todas as specs anteriores
Duração: 2-3 dias
