# Prompt: missão "Completar perfil" + Free ganha na indicação Prime

## 1. MISSÃO "COMPLETAR PERFIL" NÃO CONCLUI (bug)
- O perfil mostra o selo "Perfil completo ✓", mas a missão continua pendente ("Ir ao Perfil →").
- Diagnosticar e me dizer a causa: provavelmente o selo e a missão usam critérios diferentes (campos diferentes) ou a missão só é checada ao salvar o formulário.
- Corrigir:
  - UMA função única is_perfil_completo(cliente) (mesmos campos para o selo e para a missão), no back.
  - Concluir a missão automaticamente (+50, uma vez, com idempotência) quando a função ficar verdadeira: ao salvar o perfil E ao carregar o dashboard/missões (para quem já estava completo).
  - Rodar agora para todos os clientes com perfil completo e missão pendente, sem pagar em dobro. Me dizer quantos foram corrigidos.
- Card da missão: quando pendente, mostrar quais campos faltam ("Falta: telefone, data de nascimento").

## 2. FREE TAMBÉM GANHA QUANDO O INDICADO VIRA PRIME
- Regra nova (plano_config):
  - indicacao_prime_bonus_free = 2.000 (quem indicou é Free)
  - indicacao_prime_bonus_prime = 3.000 (quem indicou é Prime; já existe)
  - amigo que virou Prime continua +1.000.
- Mesma regra de liberação dos bônus do Prime: bloqueado por 7 dias (carencia_bonus_prime_dias) e cancelado se o Prime do amigo for cancelado nesse prazo.
- Atualizar textos: landing (remover o selo "SÓ PRIME" do "Amigo virou Prime" e mostrar "Free 2.000 · Prime 3.000 · ele +1.000"), jornada, FAQ, notificação ao indicador. Tudo lendo do plano_config.
- Teste: Free indica amigo → amigo assina Prime → Free recebe +2.000 bloqueados 7 dias; mesmo teste com indicador Prime → +3.000.

## 3. Commit, push, deploy e checklist ✓/✗.
