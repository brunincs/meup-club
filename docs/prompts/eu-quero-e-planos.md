# Ajustes: formulário /eu-quero + página de Planos

Não altere a landing page. Faça commit e deploy no final.

## 1. Formulário /eu-quero (erro ao enviar)

Erro atual: `new row for relation "lista_espera" violates check constraint "lista_espera_origem_check"`.
Causa: `EuQuero.jsx` envia `origin="pagina_eu_quero"`, mas a constraint da migration 189 só aceita
('site','whatsapp','convite','admin').

- Nova migration: recriar `lista_espera_origem_check` incluindo 'pagina_eu_quero' (e manter as atuais).
- Remover o campo CPF do `WaitlistForm` (form e validação). A coluna `cpf` continua no banco, só fica nula.
- Mensagem de sucesso: "Prontinho! Você está na lista. Vamos te chamar no WhatsApp. 💜"
- Erros do banco nunca aparecem crus para o usuário. Duplicado (índice único do whatsapp) →
  "Esse WhatsApp já está na lista 💜". Qualquer outro → "Não foi possível enviar agora. Tente de novo ou chame a gente no WhatsApp."
- Confirmar que os cadastros aparecem no admin (aba Lista de espera), com origem, data e botão de exportar CSV
  (nome, whatsapp, email, perfil, origem, data) para eu importar no Kommo.
- Testar: enviar um cadastro real pela /eu-quero e ver no admin. Depois apagar o teste.

## 2. Página de Planos (`src/pages/Plans.jsx`) igual à landing

A fonte da verdade é a oferta da landing (`PrimeOfferAlternada.jsx`) e `plano_config`. Os dois devem mostrar exatamente
os mesmos valores e benefícios. Se possível, extrair os textos para uma constante/config compartilhada usada pelos dois.

Corrigir:
- Selo "40% OFF · Lote 1" → "Fundador · 30 vagas". Não existe mais lote. Remover `loteAtual` do texto.
- Fallback de preço 497 → 597 (linhas `preco: 497` e `|| 497`).
- Abaixo do preço: "ou 6x de R$ 99,50". Manter R$997 riscado e "Economize R$400".
- Free: REMOVER "Indicação: 3.000 pts". Free não tem indicação.
- Prime: trocar "Indicação: 5.000 pts" por "2 convites exclusivos para amigos".
- Remover o bloco "Exclusivo no plano Anual" inteiro (o "2 meses grátis / 12 pelo preço de 10" está errado; só existe plano anual).
- Rodapé "30 vagas no Lote 1 · Preço de lançamento limitado" → "30 vagas de Fundador · Preço de lançamento".
- Lista de benefícios, usando os valores de `plano_config` (não hardcoded):
  - Free: Pontos por viagem 1 pt/R$ · Check-in 10 pts/dia · Lançamento manual da viagem
  - Prime Fundador: Pontos por viagem 1,5 pt/R$ · Resgate mais vantajoso · Check-in 30 pts/dia ·
    Bônus de boas-vindas 2.000 pts · Bônus aniversário 5.000 pts · 2 convites exclusivos ·
    Participação no sorteio de 200.000 pts dos Fundadores · Viagem lançada pela equipe
  - NÃO mostrar o fator de conversão (125/150) nem valor do ponto em R$. "Resgate mais vantajoso" basta.
- Cores: trocar laranja/amber (`amber-500/600`, gradiente laranja) pelo dourado da marca #a27937
  (botão, selos, estrelas). Botão: fundo #a27937, texto #32113f.
- Usuário já Prime: badge "Você é Prime Fundador" (não "Prime Anual").

## 3. Checagem final
Abrir /planos e a landing lado a lado (desktop e mobile 390px) e confirmar: mesmo preço, mesmos benefícios,
mesmas palavras. Listar qualquer diferença que restar.
