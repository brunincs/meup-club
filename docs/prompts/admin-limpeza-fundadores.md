# Admin: limpar Fundadores (sem sorteio), botão Excluir visível e aba Lista de Espera enxuta

## 1. AdminFundadores.jsx: tirar a "Ação Fundadores" (não existe mais sorteio)
- Título: "Fundadores Prime". Subtítulo: "Os {vagasTotal} primeiros assinantes Prime anuais" (hoje diz "100 primeiros"; usar o total de `contar_vagas()`, 30).
- Remover: card "Prêmio (sorteio) 200.000 pts", card "Ganhadores", coluna "Número da sorte", status "Participando", botão "Registrar ganhador", modal de confirmação e qualquer bloco explicando o sorteio.
- Novos cards: "Fundadores" (x/30), "Vagas restantes", "Receita" (soma do valor pago, se houver o dado; senão omitir).
- Tabela: Vaga #, Cliente (nome + e-mail), Data de ativação, Status da assinatura (ativa/cancelada), Pontos, Ações (Ver usuário / Excluir conta, reaproveitando o modal de exclusão de AdminUsers).
- Remover do `fundadoresService` (e do regulamento, se houver texto) as funções de sorteio que ficarem sem uso. Não apagar colunas do banco.

## 2. Botão Excluir conta mais visível
- Em AdminUsers, trocar o ícone 🗑️ sozinho por um botão com texto "Excluir" (vermelho discreto).
- Adicionar o mesmo botão (mesmo modal, digitar EXCLUIR) em: Admin > Acesso > Lista de Espera, Admin > Acesso > Base de Clientes (quando o cliente tem conta) e Fundadores.
- Extrair o modal para `components/admin/ExcluirContaModal.jsx` para reaproveitar.

## 3. Admin > Acesso
- Aba "Lista de Espera" (antiga Solicitações): manter, porque é onde vai cair quem chegar depois das 70 vagas. Mensagem vazia: "Ninguém na lista de espera. Todas as contas novas entram automaticamente enquanto houver vagas." Ações: Aprovar (se tiver vaga) e Excluir.
- Conferir que o card "Convites 0/2" e a aba "Convites" saíram mesmo (o commit 6302d47 deveria ter tirado).

`npm run build`, commit `chore: admin sem sorteio de fundadores e botão excluir em todas as listas` e push.
