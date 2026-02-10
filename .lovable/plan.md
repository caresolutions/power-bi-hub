

# Novo Tipo de Integracao: App

## Objetivo
Adicionar "App" como um novo tipo de integracao (`embed_type`) na criacao de dashboards, ao lado dos existentes (Workspace ID, Link Publico, Slider). Dashboards do tipo "App" funcionam como um container que agrupa outros dashboards e exibe uma sidebar de navegacao no viewer.

## Como vai funcionar

1. Ao criar/editar um dashboard, o admin seleciona o tipo "App"
2. O formulario exibe uma lista de dashboards existentes da mesma empresa para o admin selecionar quais farao parte do App
3. No viewer, quando um dashboard do tipo "App" e aberto, aparece uma sidebar lateral com a lista dos dashboards vinculados
4. O usuario navega entre os dashboards clicando na sidebar, sem sair da tela

## Modelo de Dados

### Nova tabela: `dashboard_app_items`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| app_dashboard_id | uuid | FK para dashboards (o dashboard tipo "app") |
| child_dashboard_id | uuid | FK para dashboards (o dashboard vinculado) |
| display_order | int | Ordem na sidebar |
| created_at | timestamptz | Auto |

- RLS baseada na company_id do dashboard pai (via join)
- Constraint unique em (app_dashboard_id, child_dashboard_id)

Nao precisa de nova tabela para o App em si -- o proprio registro na tabela `dashboards` com `embed_type = 'app'` representa o App.

## Alteracoes

### 1. Migracao de banco
- Criar tabela `dashboard_app_items` com RLS
- Politicas: leitura para usuarios autenticados da mesma empresa, escrita para admins

### 2. `DashboardForm.tsx`
- Adicionar opcao "App" no seletor de tipo de integracao
- Quando tipo "App" selecionado, exibir lista de dashboards da empresa (checkbox + drag para ordenar) -- similar ao `SliderSlidesManager`
- Salvar/atualizar os itens na tabela `dashboard_app_items` ao submeter

### 3. Novo componente: `DashboardAppSidebar.tsx`
- Sidebar colapsavel que lista os dashboards do App
- Destaca o dashboard ativo
- Clique navega para `/dashboard/{id}` mantendo contexto do App (via query param `?app={appId}`)
- Botao para recolher/expandir (estado salvo em localStorage)
- Filtra apenas dashboards que o usuario tem acesso

### 4. `DashboardViewer.tsx`
- Detectar se o dashboard atual faz parte de um App (via query param `?app={appId}` ou busca na tabela `dashboard_app_items`)
- Se sim, buscar os itens do App e renderizar a `DashboardAppSidebar`
- Layout com sidebar + area do dashboard usando flexbox
- O dashboard embeddado funciona normalmente (workspace_id, public_link, etc) dentro da area principal

### 5. `Dashboards.tsx`
- Exibir badge "App" para dashboards do tipo app
- Ao clicar em um dashboard tipo "app", navegar para o primeiro item do app com o parametro `?app={id}`

## Layout do Viewer com App

```text
+-------------------+------------------------------------------+
| Nome do App       |  Header (voltar, fav, pages, refresh...) |
|                   |------------------------------------------|
| > Dashboard A  *  |                                          |
|   Dashboard B     |         Dashboard Embeddado              |
|   Dashboard C     |         (workspace_id / public_link)     |
|   Dashboard D     |                                          |
|                   |                                          |
| [< Recolher]      |                                          |
+-------------------+------------------------------------------+
```

## Fluxo de navegacao

1. Usuario abre catalogo de dashboards
2. Clica em um dashboard tipo "App"
3. Redireciona para `/dashboard/{primeiro_item_id}?app={app_id}`
4. Viewer carrega com sidebar mostrando todos os itens do App
5. Ao clicar em outro item na sidebar, navega para `/dashboard/{outro_id}?app={app_id}`
6. Sidebar permanece visivel durante a navegacao

## Arquivos afetados
- **Novo**: `src/components/dashboards/DashboardAppSidebar.tsx`
- **Novo**: `src/components/dashboards/DashboardAppItemsManager.tsx` (seletor de dashboards para o form)
- **Editado**: `src/components/dashboards/DashboardForm.tsx` -- adicionar tipo "App" e gerenciador de itens
- **Editado**: `src/pages/DashboardViewer.tsx` -- detectar App e renderizar sidebar
- **Editado**: `src/pages/Dashboards.tsx` -- badge e navegacao para Apps
- **Migracao**: Nova tabela `dashboard_app_items`

