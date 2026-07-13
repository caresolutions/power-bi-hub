# Agendamento de Refresh de Datasets

Adicionar agendamentos recorrentes por dashboard para disparar refresh do dataset Power BI automaticamente, sem impactar o refresh manual atual.

## O que muda para o usuário

- Novo botão "Agendar refresh" no header do `DashboardViewer` (somente admin/master_admin, apenas para dashboards `workspace_id` com credencial vinculada).
- Diálogo permite criar/editar/excluir múltiplos agendamentos por dashboard:
  - Frequência: **Diário**, **Semanal** (com dias da semana) ou **Mensal** (dia do mês).
  - Horário (HH:MM) + fuso (default `America/Sao_Paulo`).
  - Toggle ativo/inativo.
  - Lista mostra "próxima execução" e "última execução".
- Cada execução automática entra no histórico existente (`dashboard_refresh_history`) marcada como `triggered_by = 'schedule'` para diferenciar de manuais.

## Banco

Nova tabela `dashboard_refresh_schedules`:
- `id uuid pk`, `dashboard_id uuid fk`, `company_id uuid`, `created_by text`
- `frequency text` (`daily` | `weekly` | `monthly`)
- `time_of_day time` (ex.: `06:00`)
- `timezone text` default `America/Sao_Paulo`
- `days_of_week int[]` (0-6, para weekly)
- `day_of_month int` (1-28, para monthly)
- `is_active boolean` default true
- `last_run_at timestamptz`, `next_run_at timestamptz`
- `created_at`, `updated_at`

RLS + GRANTs seguindo padrão existente:
- Admin da empresa: full CRUD dos próprios dashboards.
- Master admin: full CRUD global (via `is_master_admin`).
- Usuários comuns: sem acesso.

Adicionar coluna `triggered_by text default 'manual'` em `dashboard_refresh_history` (backfill = 'manual').

## Edge Function

Nova função `process-scheduled-refreshes` (verify_jwt=false, chamada só via cron):
1. Busca agendamentos com `is_active=true` e `next_run_at <= now()`.
2. Para cada um: chama internamente a mesma lógica do `refresh-dataset` (extraída para helper compartilhado ou reusada via invoke com service role).
3. Atualiza `last_run_at = now()` e recalcula `next_run_at` com base na frequência/timezone.
4. Grava linha em `dashboard_refresh_history` com `triggered_by='schedule'`.

Cron via pg_cron a cada 5 minutos, chamando a função com `apikey` (mesmo padrão do `sync-refresh-history`).

## Frontend

- `src/components/dashboards/RefreshScheduleDialog.tsx` — novo diálogo (shadcn Dialog, Select, Checkbox, TimePicker simples).
- Botão "Agendar" no header do `DashboardViewer.tsx`, ao lado de "Histórico".
- `RefreshHistoryDialog` mostra badge "Agendado" quando `triggered_by='schedule'`.

## Cuidados de compatibilidade

- Refresh manual, `sync-refresh-history` e permissões existentes ficam intactos.
- Novo campo `triggered_by` tem default `'manual'`, então histórico legado continua correto.
- Cron novo é independente do cron de `sync-refresh-history`.
- Respeita limites de refresh do Power BI (8/dia Pro, 48/dia Premium) — apenas alerta na UI, sem bloqueio rígido.

## Passos de implementação

1. Migration: nova tabela + coluna `triggered_by` + RLS/GRANTs.
2. Edge function `process-scheduled-refreshes`.
3. Cron job (via `supabase--insert`, não migration, por conter anon key).
4. Componentes: `RefreshScheduleDialog` + botão no `DashboardViewer`.
5. Ajuste visual no `RefreshHistoryDialog` para mostrar origem.

Confirmar para prosseguir?