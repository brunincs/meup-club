# Prompt: corrigir os lotes de fundador (estão 5 lotes de 20 vagas)

1. REGRA CORRETA (3 lotes, 100 vagas no total):
   | Lote | Vagas | Preço |
   | Lote 1 | 20 | R$ 497 |
   | Lote 2 | 40 | R$ 597 |
   | Lote 3 | 40 | R$ 697 |
   Depois das 100 vagas: Prime normal R$ 997 (sem mais lotes de fundador).
2. Achar onde os lotes estão definidos (tabela de lotes, plano_config, seed/migration ou código fixo) e corrigir NA FONTE. Remover os lotes 4 (R$ 797) e 5 (R$ 897). Me dizer onde estava.
3. Garantir que TODO o app usa essa mesma fonte: landing (card de preço, Ação Fundadores, CTA final), checkout/Asaas, troca automática de lote, admin (Ação Fundadores e Métricas), guia de escassez (escassez-fundadores.md).
4. Admin "Ação Fundadores": mostrar 3 cards (x/20, x/40, x/40); "vagas restantes" = 100 − vendidas; receita = soma real dos pagamentos.
5. Conferir por que o total vendido está 0 se a minha conta tem número da sorte de fundador: se foi atribuição manual/teste, marcar como teste e não contar nas vendas (ou me perguntar).
6. Trocar o emoji 🏆 por ícone de linha do projeto.
7. Teste: simular a venda da 20ª vaga → abre o Lote 2 a R$ 597; simular a 60ª → Lote 3 a R$ 697; a 100ª → fecha a Ação e o preço volta a R$ 997. Desfazer as simulações. Commit, push, deploy e print.
