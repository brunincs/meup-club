# Backup antes do Reset - 2026-11-12

## Instruções para Backup Manual

Antes de aplicar a migration 151 (reset), exporte os dados via Supabase Dashboard:

1. Acesse: https://supabase.com/dashboard/project/[PROJECT_ID]/editor
2. Para cada tabela abaixo, clique em "Export" > "CSV":
   - profiles
   - subscriptions
   - point_transactions
   - referrals
   - notifications
   - viagens
   - viagem_voos
   - viagem_passageiros
   - emissoes
   - resgates
   - tarefa_solicitacoes
   - checkin_history

3. Salve os CSVs nesta pasta

## Storage

Para backup do Storage (fotos, documentos):
1. Acesse: https://supabase.com/dashboard/project/[PROJECT_ID]/storage
2. Baixe os arquivos dos buckets:
   - private_cards
   - public (se houver)

## Após Backup

Execute via CLI:
```bash
npx supabase db push --linked
```

Isso aplicará a migration 151_reset_test_data.sql
