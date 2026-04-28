# Configuração do Supabase - Meup Club

## 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Clique em "New Project"
3. Escolha um nome (ex: meup-club) e uma senha forte
4. Selecione a região mais próxima (São Paulo - sa-east-1)
5. Aguarde a criação do projeto

## 2. Executar o Schema do Banco

1. No dashboard do Supabase, vá em **SQL Editor**
2. Clique em "New query"
3. Copie todo o conteúdo do arquivo `migrations/001_initial_schema.sql`
4. Cole no editor e clique em "Run"
5. Deve aparecer a mensagem: "Schema Meup Club criado com sucesso!"

## 3. Configurar Variáveis de Ambiente

1. No dashboard do Supabase, vá em **Settings > API**
2. Copie os valores:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** (em Project API keys) → `VITE_SUPABASE_ANON_KEY`

3. Edite o arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

4. Reinicie o servidor de desenvolvimento

## 4. Configurar Autenticação (Opcional)

### Email/Senha
Já está habilitado por padrão.

### Google OAuth
1. Vá em **Authentication > Providers > Google**
2. Configure com suas credenciais do Google Cloud Console

### Magic Link
1. Vá em **Authentication > Email Templates**
2. Personalize os templates de email

## 5. Estrutura das Tabelas

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Usuários do sistema (estende auth.users) |
| `referrals` | Indicações de clientes |
| `sales` | Vendas registradas |
| `rewards` | Recompensas disponíveis |
| `redemptions` | Resgates de recompensas |
| `user_tasks` | Tarefas de engajamento |
| `withdrawals` | Solicitações de saque |
| `credit_adjustments` | Ajustes manuais de créditos |
| `audit_logs` | Histórico de ações administrativas |
| `notifications` | Notificações para usuários |
| `system_config` | Configurações do sistema |

## 6. Sistema de Créditos

As configurações do sistema de créditos estão na tabela `system_config`:

```sql
-- Visualizar configurações atuais
SELECT * FROM system_config WHERE key = 'credits_config';

-- Atualizar configurações
UPDATE system_config
SET value = '{
  "referrer_percentage": 1.0,
  "buyer_percentage": 0.30,
  "min_profit_to_generate": 50,
  "monthly_withdrawal_limit": 300,
  "max_extra_bonus_percentage": 0.20,
  "credit_cost_ratio": 0.05
}'
WHERE key = 'credits_config';
```

## 7. Criar Primeiro Admin

Execute no SQL Editor:

```sql
-- Após criar uma conta normal, promova para admin
UPDATE profiles
SET role = 'admin'
WHERE email = 'seu-email@exemplo.com';
```

## 8. Row Level Security (RLS)

Todas as tabelas têm RLS habilitado. As políticas padrão são:

- **Usuários**: Podem ver/editar apenas seus próprios dados
- **Admins**: Podem ver/editar todos os dados
- **Recompensas**: Todos podem ver recompensas ativas

## 9. Monitoramento

- **Logs**: Dashboard > Logs
- **Métricas**: Dashboard > Reports
- **Queries lentas**: Dashboard > Query Performance

## 10. Backup

O Supabase faz backups automáticos diários (plano Pro).
Para exportar manualmente:

```bash
# Via CLI do Supabase
supabase db dump -f backup.sql
```

## Suporte

- [Documentação Supabase](https://supabase.com/docs)
- [Discord Supabase](https://discord.supabase.com)
