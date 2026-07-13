## Objetivo
Gerar um PDF com screenshots de todas as telas do sistema (públicas, autenticadas admin, master admin e viewer de dashboard), uma tela por página com título.

## Como vou executar

1. **Preparar diretório de trabalho** em `/tmp/browser/screenshots/` com um script Playwright.
2. **Autenticar** usando a sessão Supabase injetada no sandbox (`LOVABLE_BROWSER_SUPABASE_*`) para acessar rotas protegidas em `http://localhost:8080`.
3. **Navegar e capturar** cada rota (viewport 1280x1800), salvando um PNG por tela.
4. **Montar o PDF** com ReportLab: capa + uma imagem por página com título da tela, ajustada à largura útil (Letter, 1" de margem).
5. **QA visual**: converter o PDF em imagens e inspecionar todas as páginas antes de entregar; recapturar telas que vierem em branco/loading.
6. **Entregar** em `/mnt/documents/care-bi-telas.pdf` via `<presentation-artifact>`.

## Rotas planejadas

**Públicas**
- `/` (Landing), `/saiba-mais`, `/auth`, `/privacy-policy`, `/cancellation-policy`, `/apresentacao`

**Autenticadas (admin/master admin)**
- `/home`, `/dashboards`, `/credentials`, `/users`, `/groups`, `/subscription`, `/add-users`, `/settings`, `/access-logs`, `/onboarding`, `/select-plan`

**Master Admin**
- `/master-admin` (com abas principais: empresas, planos, moedas — uma captura por aba visível)

**Viewer Power BI**
- `/dashboard/:id` do primeiro dashboard disponível (pode aparecer com mensagem de erro/loading se as credenciais Azure ainda estiverem inválidas — capturo o estado atual da tela)

## Observações
- Modais/dialogs (ex.: convidar usuário, permissões de página) não entram por padrão — se quiser, listo depois quais abrir.
- A qualidade do viewer depende de credenciais válidas no momento; capturo o que renderizar.
- Sessão restaurada é a sua conta atual (master admin) — o PDF reflete o que essa conta vê.

## Detalhes técnicos
- Playwright Chromium headless, `viewport 1280x1800`, `waitUntil="networkidle"` + pequeno delay para animações.
- Screenshots como PNG (não full_page, para respeitar limite do ambiente); páginas longas capturadas em altura fixa do viewport.
- PDF gerado com `reportlab.platypus` (SimpleDocTemplate, Image redimensionada proporcionalmente).
- Se alguma rota redirecionar (ex.: `/select-plan` quando já há plano), registro o redirect no PDF.