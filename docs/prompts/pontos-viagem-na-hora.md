# Prompt: pontos de viagem e de indicação liberados na hora da aprovação (carência configurável)

1. CONFIGURAÇÃO
- Criar em plano_config: carencia_viagem_horas = 0 e carencia_indicacao_horas = 0. Editáveis no admin (tela de configuração), para depois eu mudar para 24h sem mexer em código.
- Pontos de VIAGEM (emissão aprovada, Free e Prime, manual ou com card): respeitar carencia_viagem_horas. Com 0, creditar direto como disponível (sem pending_points).
- Pontos de INDICAÇÃO (amigo viajou / amigo virou Prime): creditados na hora em que a equipe aprova a emissão do amigo, respeitando carencia_indicacao_horas (hoje 0).
- Missões automáticas ligadas à emissão (1ª viagem, 1ª indicação) seguem a mesma regra.

## 1B. BÔNUS LIGADOS À ASSINATURA PRIME: continuam com 7 dias
- Motivo: o Prime tem direito de arrependimento de 7 dias (compra online). Se a assinatura for cancelada nesse prazo, os bônus não podem ter sido usados.
- Criar em plano_config: carencia_bonus_prime_dias = 7.
- Ficam bloqueados por 7 dias (aparecem como "bloqueados · liberam em DD/MM"):
  - boas-vindas do Prime (+2.000);
  - indicação de quem virou Prime: +3.000 para quem indicou e +1.000 para o amigo.
- Se o Prime for cancelado/reembolsado dentro dos 7 dias: cancelar esses bônus ainda bloqueados (sem afetar pontos de viagem).
- Resumo das regras:
  | Tipo | Libera |
  | Viagem (emissão aprovada) | na hora |
  | Indicação de amigo que comprou passagem | na hora da aprovação |
  | Boas-vindas Prime | 7 dias |
  | Indicação de amigo que virou Prime (+3.000 / +1.000) | 7 dias |
- O chip "bloqueados" continua existindo para esses bônus. Ajustar o item 3 e o item 4 (pending_points de boas-vindas e de indicação Prime continuam bloqueados; só os de viagem e de indicação de compra são liberados agora).

2. ESTORNO
- Se a emissão for cancelada/estornada, estornar os pontos da viagem e o que dependia dela (missão 1ª viagem, indicação paga a quem indicou, missão 1ª indicação), mesmo que o saldo fique NEGATIVO.
- Saldo negativo: bloquear novos resgates até voltar ao positivo; mostrar no app "Saldo negativo por cancelamento de viagem" com a explicação.
- Cada estorno com transação identificada (emissão de origem).

3. TELAS
- O chip "bloqueados · liberam em DD/MM" mostra só o que está realmente bloqueado (hoje: boas-vindas e indicação Prime).
- Notificação ao aprovar a emissão: cliente → "Sua viagem para [destino] rendeu X pontos. Faltam Y para [experiência mais próxima]."; quem indicou → "Seu amigo viajou: +X pontos". (sino + push)
- Textos da landing/FAQ/jornada: "pontos de viagem e de indicação liberados assim que a compra é aprovada; bônus do Prime liberados após 7 dias". Tudo lendo do plano_config.

4. PASSADO
- Em pending_points: liberar agora os de VIAGEM e de INDICAÇÃO DE COMPRA, sem duplicar. Boas-vindas e indicação Prime continuam até completar 7 dias.

5. Testes: assinar Prime → +2.000 bloqueados 7 dias; amigo vira Prime → +3.000/+1.000 bloqueados 7 dias; cancelar Prime em 3 dias → bônus cancelados; aprovar emissão de um indicado → pontos do cliente e de quem indicou disponíveis na hora; estorno após resgate → saldo negativo e resgate bloqueado; mudar carencia_viagem_horas para 24 → nova emissão fica bloqueada 24h (depois voltar para 0). Commit, push, deploy e checklist ✓/✗.
