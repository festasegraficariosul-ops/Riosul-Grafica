# PRD — Rio Sul Festas & Gráfica

## Original Problem Statement
Sistema web completo de gestão de vendas, pedidos, clientes, funcionários e caixa para a gráfica Rio Sul Festas & Gráfica. Substituir planilha por sistema com catálogo pré-cadastrado, venda rápida no balcão, kanban de pedidos, fechamento de caixa, relatórios, importação de tabela de preços e conversor ZPL→PDF (Shopee).

## Architecture
- **Backend**: FastAPI (single `server.py`), MongoDB via Motor, JWT com bcrypt (cookies + Bearer), roles admin/vendedor com enforcement no backend.
- **Frontend**: React 19 + React Router 7, Tailwind, Shadcn UI, Recharts, Sonner, Lucide.
- **Integrações**: Labelary API pública (ZPL→PNG/PDF), pandas + openpyxl (import CSV/XLSX).

## User Personas
- **Administrador (proprietário)**: catálogo, preços, funcionários, relatórios, caixa, vales, configurações.
- **Vendedor**: nova venda, clientes, consulta catálogo, próprias vendas, kanban pedidos, etiquetas Shopee.

## Implemented (2026-09-23)
- Auth JWT + admin seed (festasegraficariosul@gmail.com) + vendedor demo.
- Categorias, Produtos com variações + tipos de preço (fixo/variável/por m²) + calculadora m² com valor mínimo.
- Nova Venda: grid de categorias/produtos, busca instantânea, carrinho lateral, cliente por telefone, desconto/acréscimo, pagamento dividido, canal/status/prazo.
- Snapshot de preço (venda antiga não muda quando preço oficial é alterado).
- Vendas: lista + detalhe + status + pagamentos parciais + copiar para WhatsApp + cancelar (admin).
- Pedidos: Kanban drag-drop entre status + lista.
- Clientes com histórico, total gasto e pendentes.
- Dashboard: KPIs (vendas, faturamento, ticket médio, a receber, produção, prontos, atrasados) + gráficos (diário, canal, vendedor).
- Fechamento de caixa por data e vendedor com breakdown por forma de pagamento.
- Vales por funcionário.
- Relatórios (dia/mês/vendedor/canal + top produtos) + export CSV.
- Importação CSV/XLSX de produtos com prévia + agrupamento de variações.
- Etiquetas Shopee: ZPL→PNG preview + ZPL→PDF 10x15cm via Labelary.
- Configurações (dados da empresa, canais, formas de pagamento, unidades).

## Test Credentials
- Admin: festasegraficariosul@gmail.com / RioSul@2026
- Vendedor: vendedor@riosul.com / Vendedor@2026

## Backlog (P1)
- Preços por faixa de quantidade (tiered) — modelo backend já preparado, precisa UI na venda.
- Adicionais em apostilas (encadernação/wire-o/capa).
- Export PDF de relatórios e comprovante impresso.
- Auditoria detalhada com diff de campos.
- Filtros do Dashboard (hoje/ontem/semana/mês/anterior/customizado).

## Backlog (P2)
- Notificações WhatsApp automáticas de status.
- Backup automático agendado.
- Modo balcão (touch-friendly full-screen).
