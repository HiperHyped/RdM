# IA DOS ROBOS

## Escopo

Esta documentacao cobre a IA das versoes:

- `game-ai-ui`
- `robots-ai-ui`

Ela nao descreve a logica antiga de:

- `game-ui`
- `robots-ui`

As fontes principais desta IA estao em:

- `app/static/js/ai-profiles.js`
- `app/static/js/ai-policy-engine.js`
- `app/static/js/game-ai-ui.js`
- `app/static/js/robots-ai-ui.js`

## Visao Geral

Cada robo e montado a partir de quatro camadas:

1. `Negociacao`
2. `Visao`
3. `Personalidade`
4. `Skill`

Essas camadas sao combinadas em `perfis prontos`.

Separadamente, a mesa pode aplicar um `mercado`, que atua como clima geral das negociacoes.

## Camadas Do Perfil

### Negociacao

Controla como o robo compra, vende, protege ativos e reage a pressao de caixa.

Parametros:

- `buy_openness`
- `sell_openness`
- `premium_tolerance`
- `discount_tolerance`
- `strategic_lock`
- `desperation_discount`
- `buy_blocked`
- `sell_blocked`
- `trade_locked`
- `force_buy`
- `force_sell`
- `trade_forced`

### Visao

Controla em que o robo quer investir.

Parametros:

- `weight_port`
- `weight_permission`
- `weight_toll`
- `weight_monopoly`
- `weight_origin_bonus`
- `planning_horizon_turns`

### Personalidade

Controla risco, caixa minimo, impulso e apego aos ativos.

Parametros:

- `cash_reserve_ratio`
- `risk_tolerance`
- `impulsiveness`
- `coupon_patience`
- `asset_attachment`

### Skill

Controla a qualidade da leitura e da execucao.

Parametros:

- `foresight`
- `evaluation_noise`
- `liquidity_discipline`
- `combo_awareness`
- `timing_quality`

## Presets Existentes

### Mercados

Os mercados vivem em `ai-profiles.js` e hoje servem para configurar o ambiente geral da mesa.

Os principais presets ativos sao:

- `legacy_open_market`
- `stage4_robot_dynamic_market`
- `stage5_human_dynamic_market`
- `stage6_profile_market`

Observacao:

- `dynamic_pricing` funciona de fato.
- `human_negotiation_enabled` funciona de fato.
- `negotiation_enabled`, `negotiation_phases` e `default_markup_mode` existem, mas hoje sao mais descritivos do que motores reais do fluxo.

### Presets De Negociacao

- `open_market`
- `acquisitive_market`
- `balanced_market`
- `selective_market`

### Presets De Visao

- `legacy_accumulator`
- `balanced_growth`
- `port_sprint`
- `cargo_network`
- `toll_investor`
- `monopoly_drive`

### Presets De Personalidade

- `legacy_aggressive`
- `bold_operator`
- `balanced_operator`
- `cautious_operator`
- `opportunistic_operator`

### Presets De Skill

- `legacy_normal`
- `ai_easy`
- `ai_normal`
- `ai_hard`
- `ai_expert`
- `stage6_standard`
- `stage6_sharp`

### Perfis Prontos

Os perfis prontos atuais sao:

- `Equilibrado`
- `Perfil aberto`
- `Perfil fechado`
- `Foco em portos`
- `Foco em permissoes`
- `Foco em pedagios`
- `Foco em monopolios`

Composicao real:

- `Equilibrado` = `balanced_market + balanced_growth + balanced_operator + stage6_standard`
- `Perfil aberto` = `open_market + balanced_growth + balanced_operator + stage6_standard + overrides de abertura`
- `Perfil fechado` = `balanced_market + balanced_growth + cautious_operator + stage6_standard + overrides de fechamento`
- `Foco em portos` = `acquisitive_market + port_sprint + bold_operator + stage6_standard`
- `Foco em permissoes` = `balanced_market + cargo_network + opportunistic_operator + stage6_standard`
- `Foco em pedagios` = `balanced_market + toll_investor + balanced_operator + stage6_standard`
- `Foco em monopolios` = `selective_market + monopoly_drive + cautious_operator + stage6_sharp`

## Matematica Real Da IA

Esta secao descreve as equacoes que realmente entram nas decisoes.

### 1. Reserva De Caixa

Esta e a base de varias outras contas.

Equacao:

```text
horizonte_normalizado = clamp(horizonte / 10, 0, 1.2)

multiplicador_reserva =
  0.18
  + 1.15 * reserva_de_caixa
  + 0.26 * horizonte_normalizado
  + 0.24 * disciplina_de_caixa
  + ajustes_do_contexto

alvo_de_reserva =
  min(caixa, valor * max(0.08, multiplicador_reserva))
```

Ajustes do contexto:

- compra de porto de origem: `-0.06`
- compra de porto apos entrega: `-0.06`
- compra de pedagio ao parar: `+0.05`
- quando o robo gosta muito de pedagio e aceita mais risco, esse peso pode ser aliviado

Uso:

- compra de porto
- compra de pedagio
- compra de permissao
- uso de cupom
- resgate de hipoteca

### 2. Compra De Porto Ou Pedagio Do Banco

Antes da conta principal:

```text
caixa_pos_compra = caixa - preco
pressao_reserva = clamp((alvo_de_reserva - caixa_pos_compra) / preco, 0, 1.8)
pressao_preco = clamp(preco / caixa, 0, 1.6)
rendimento_relativo = clamp(frete_potencial / preco, 0, 1.35)
```

#### 2.1. Score De Porto

```text
score_porto =
  0.62 * peso_portos
  + 1.05 * rendimento_relativo
  + peso_origem * bonus_origem
  + peso_permissoes * sinergia_com_permissoes
  + peso_monopolio * bonus_monopolio
  + 0.16 * leitura_de_combo
  - penalidade_excesso_de_portos
  + 0.18 * risco
  + 0.08 * impulso
  + 0.08 * previsao
  + bonus_permissoes_disponiveis
  - peso_reserva * pressao_reserva
  - peso_preco * pressao_preco
```

Subcontas:

```text
bonus_origem =
  clamp(
    0.22 * (multiplicador - 1)
    + 0.18 * rendimento_relativo
    + bonus_contextual,
    0, 0.95
  )

sinergia_com_permissoes =
  clamp(max(0, numero_de_permissoes - 1) / 4, 0, 1) * 0.38

bonus_monopolio =
  clamp(
    0.42 * fracao_da_regiao_ja_dominada
    + (completa_monopolio ? 0.82 : 0),
    0, 1.2
  )
```

Limiar:

```text
threshold_porto =
  0.90
  - 0.12 * risco
  - 0.08 * impulso
  - 0.08 * leitura_de_combo
  + 0.18 * reserva_de_caixa
```

O robo so compra se:

```text
score_porto >= threshold_porto
e caixa_pos_compra >= piso_de_caixa
```

#### 2.2. Score De Pedagio

```text
score_pedagio =
  0.86 * peso_pedagios
  + 1.04 * rendimento_relativo
  + 0.34 * horizonte_normalizado * peso_pedagios
  + valor_de_rede
  + 0.16 * leitura_de_combo
  + bonus_foco_pedagio
  + bonus_risco
  - penalidade_excesso_de_pedagios
  + 0.18 * risco
  + 0.08 * impulso
  + 0.08 * previsao
  - peso_reserva * pressao_reserva
  - peso_preco * pressao_preco
```

Observacao importante:

- o codigo ainda usa um trecho parecido com `max(0, peso_pedagios - 1)`
- como a UI atual limita os pesos de `0` a `1`, esse bonus ficou praticamente sem efeito
- entao este ponto existe, mas perdeu impacto depois da normalizacao da UI

### 3. Compra De Permissao

```text
taxa_de_melhoria =
  clamp(
    (melhor_frete_novo - melhor_frete_atual) / melhor_frete_atual,
    -0.3, 1.4
  )

score_permissao =
  0.72 * peso_permissoes
  + sinergia_com_portos
  + sinergia_com_pedagios
  + max(0, taxa_de_melhoria) * (0.46 + 0.14 * leitura_de_combo)
  + 0.05 * permissoes_disponiveis
  + 0.08 * risco
  + 0.08 * previsao
  - 0.72 * cobertura_atual
  - 1.02 * pressao_reserva
  - pressao_de_preco
```

Limiar:

```text
threshold_permissao =
  0.84
  - 0.10 * leitura_de_combo
  - 0.08 * risco
  + 0.16 * reserva_de_caixa
```

### 4. Escolha Da Permissao Ativa

Se o robo tem o porto de origem:

```text
score =
  frete_projetado * (0.84 + 0.24 * peso_origem)
  + frete_base * (0.18 + 0.06 * peso_permissoes)
  + (multiplicador - 1) * 34 * (0.34 + 0.12 * peso_origem + 0.08 * combo)
```

Se nao tem o porto de origem:

```text
score =
  frete_base * (0.88 + 0.18 * peso_permissoes + 0.08 * previsao)
  + (multiplicador - 1) * 12 * (0.22 + 0.10 * combo + 0.06 * risco)
```

Bonus fixo:

```text
score += 6 * peso_permissoes
```

Se a permissao ja era a atual:

```text
score += 10 + 18 * apego_a_ativo + 7 * (1 - impulso)
```

### 5. Uso De Cupons

Base:

```text
pressao = clamp((alvo_de_reserva - caixa) / alvo_de_reserva, -1, 1.4)

score_inicial = 0.52 se uso_automatico
score_inicial = 0.22 se nao

threshold_inicial =
  0.56
  + 0.14 * paciencia_com_cupom
  - 0.08 * impulso
  - 0.18 * pressao_positiva
```

Depois cada cupom ajusta esse score:

- `Gasolina Livre`: aumenta com valor do combustivel e pressao de caixa
- `Porto Livre`: aumenta com valor da estadia e pressao de caixa
- `Pedagio Livre`: aumenta com valor do pedagio e se o pedagio e obrigatorio
- `Atalho`: aumenta se existe pedagio obrigatorio; cai se o robo valoriza muito pedagios
- `Mudanca de Rota`: aumenta se ha alternativas e com impulso/risco

### 6. Hipoteca

```text
fator_credito = credito_do_ativo / falta_de_caixa

penalidade_estrategica =
  0.20 * apego_a_ativo
  + peso_do_tipo
  + protecao_de_monopolio_se_houver

score_hipoteca =
  fator_credito * (0.72 + 0.38 * urgencia)
  - penalidade_estrategica
```

Quanto maior o score, mais provavel hipotecar aquele ativo primeiro.

Observacao:

- ainda existe um ramo antigo para permissao dentro do engine
- a regra atual do jogo ja impede hipoteca de permissao fora desse trecho
- entao isso virou resto de codigo antigo

### 7. Resgate

```text
valor_estrategico =
  0.16 * apego_a_ativo
  + peso_do_tipo
  + bonus_de_monopolio_se_houver

pressao_de_custo = custo_do_resgate / caixa

score_resgate =
  valor_estrategico - 0.72 * pressao_de_custo
```

So resgata se:

```text
caixa_sobrando >= 0.55 * custo
e score_resgate >= 0.36
```

### 8. Negociacao Robo X Robo

Primeiro o engine checa travas:

- `trade_locked`
- `buy_blocked`
- `sell_blocked`

Se passar, calcula:

Comprador:

```text
agressividade_do_comprador =
  clamp(0.28 + 0.22*compra + 0.12*risco + 0.08*impulso, 0.2, 0.82)
```

Vendedor:

```text
flexibilidade_do_vendedor =
  clamp(0.18 + 0.22*venda + 0.06*risco + 0.10*desespero_por_caixa, 0.12, 0.72)

apego_do_vendedor =
  clamp(0.16 + 0.12*apego_a_ativo + 0.16*apego_estrategico + bonus_perda_de_monopolio, 0.1, 0.85)
```

Contexto:

```text
conforto_de_caixa_comprador =
  clamp((caixa_comprador - preco_base)/(preco_base*2.2), -0.4, 0.55)

estresse_de_caixa_vendedor =
  clamp((preco_base - caixa_vendedor)/preco_base, 0, 1)
```

Valor estrategico:

```text
ganho_estrategico_comprador =
  bonus_do_contexto
  + 0.85 * rendimento_normalizado
  + bonus_tipo
  + bonus_regiao
  + bonus_completa_monopolio

ganho_estrategico_vendedor =
  0.65 * rendimento_normalizado
  + bonus_tipo
  + bonus_regiao
  + bonus_perde_monopolio
```

Faixas:

```text
teto_do_comprador =
  min(
    caixa_comprador,
    preco_base * (
      0.94
      + ganho_estrategico_comprador
      + 0.08*agressividade
      + 0.16*conforto_positivo
    )
  )

piso_do_vendedor =
  max(
    piso_hipoteca * 1.15,
    preco_base * (
      0.80
      + ganho_estrategico_vendedor
      + 0.10*apego
      - 0.18*estresse
      + 0.05*flexibilidade_negativa
    )
  )
```

Preco final:

```text
sobreposicao = teto_do_comprador - piso_do_vendedor

preco_final =
  clamp(
    (piso_do_vendedor + teto_do_comprador)/2
    + (apego_do_vendedor - agressividade_do_comprador) * preco_base * 0.05,
    piso_do_vendedor,
    teto_do_comprador
  )
```

So fecha se houver sobreposicao minima.

### 9. Humano Comprando Do Robo

O robo calcula:

- `flexibilidade_do_vendedor`
- `apego_do_vendedor`
- `estresse_de_caixa_vendedor`
- `ganho_estrategico_vendedor`

Depois:

```text
score_trava_estrategica =
  clamp(
    0.72*ganho_estrategico
    + 0.34*apego
    + bonus_monopolio
    - 0.28*estresse_de_caixa,
    0, 1
  )
```

Disso sai a postura do robo:

- `irredutivel`
- `pressionado`
- `aberto`
- `duro`
- `firme`

Precos privados:

```text
piso_privado =
  max(
    piso_hipoteca*1.10,
    preco_base*(0.82 + 0.22*ganho_estrategico + 0.08*apego - 0.12*estresse)
  )

alvo_privado =
  max(
    piso_privado,
    preco_lista*(0.93 + 0.05*apego) + preco_base*(0.12*ganho_estrategico)
  )

pedido_inicial =
  max(
    alvo_privado,
    preco_lista*(1.00 + 0.05*apego)
    + preco_base*(0.04 + 0.12*ganho_estrategico - 0.05*estresse)
  )
```

Resposta a sua oferta:

```text
limite_ofensivo =
  max(
    piso_privado*(0.90 + 0.05*apego - 0.08*estresse),
    alvo_privado*(0.80 + 0.06*apego - 0.08*estresse),
    pedido_atual*(0.66 + 0.04*apego - 0.05*estresse)
  )

limite_de_aceite =
  clamp(
    max(
      piso_privado,
      alvo_privado*(0.96 - 0.08*flexibilidade - 0.06*estresse + 0.03*apego)
    ),
    piso_privado,
    pedido_atual
  )
```

Se sua oferta:

- ficar abaixo do `limite_ofensivo`: o robo rejeita como proposta ruim
- ficar acima do `limite_de_aceite`: o robo aceita
- ficar no meio: o robo calcula contraoferta

Taxa de concessao:

```text
taxa_de_concessao =
  clamp(0.42 + 0.16*flexibilidade + 0.14*estresse - 0.10*apego, 0.26, 0.58)
```

### 10. Robo Comprando Do Humano

Comprador:

```text
agressividade_do_comprador =
  clamp(0.26 + 0.24*compra + 0.12*risco + 0.10*impulso, 0.14, 0.88)

estresse_de_caixa_comprador =
  clamp((preco_lista - caixa)/preco_lista, 0, 1)

ganho_estrategico_comprador =
  bonus_contexto
  + 0.58*rendimento_normalizado
  + bonus_tipo
  + bonus_regiao
  + bonus_completa_monopolio
```

Faixas privadas:

```text
teto_privado =
  min(
    caixa,
    max(
      piso_hipoteca*1.10,
      preco_base*(0.96 + 0.26*ganho_estrategico + 0.12*agressividade - 0.18*estresse),
      preco_lista*(0.88 + 0.06*agressividade - 0.10*estresse)
    )
  )

alvo_privado =
  min(
    teto_privado,
    max(
      piso_hipoteca,
      preco_base*(0.82 + 0.18*ganho_estrategico + 0.06*agressividade - 0.12*estresse)
    )
  )

lance_inicial =
  min(
    teto_privado,
    max(
      piso_hipoteca,
      alvo_privado - preco_base*(0.03 + 0.02*(1 - agressividade)),
      preco_lista*(0.74 + 0.08*agressividade - 0.12*estresse)
    )
  )
```

Se o humano pedir:

- `pedido <= lance_atual`: o robo aceita
- `pedido > teto_privado` ou `pedido > caixa`: o robo recusa
- `pedido <= limite_de_aceite`: o robo aceita
- senao: o robo faz contraoferta

Taxa de concessao:

```text
taxa_de_concessao =
  clamp(0.42 + 0.18*agressividade - 0.12*estresse_de_caixa, 0.24, 0.56)
```

## Tabela Direta Dos Sliders

### Negociacao

| Slider | Equacao | Efeito intuitivo | Status |
|---|---|---|---|
| `Compra` | entra em `agressividade_do_comprador` | aumenta vontade de comprar de outro jogador | Vivo |
| `Venda` | entra em `flexibilidade_do_vendedor` | aumenta disposicao para vender | Vivo |
| `Agio` | hoje nao governa o preco final diretamente | deveria empurrar o teto do comprador para cima, mas ainda esta subusado | Meio vivo |
| `Desagio` | hoje nao governa o preco final diretamente | deveria empurrar o piso do vendedor para baixo, mas ainda esta subusado | Meio vivo |
| `Apego estrategico` | entra em `apego_do_vendedor` | deixa o robo mais resistente a vender ativos importantes | Vivo |
| `Desespero por caixa` | entra em `flexibilidade_do_vendedor` | faz o robo ceder mais quando precisa de dinheiro | Vivo |

### Visao

| Slider | Equacao | Efeito intuitivo | Status |
|---|---|---|---|
| `Portos` | `0.62 * peso_portos` no score de porto | prioriza compra e preservacao de portos | Vivo |
| `Permissoes` | `0.72 * peso_permissoes` no score de permissao | prioriza cobertura de cargas e combinacao com origem | Vivo |
| `Pedagios` | `0.86 * peso_pedagios` no score de pedagio | prioriza renda de longo prazo por passagem | Vivo |
| `Monopolio` | peso do bonus de monopolio em compras e protecao | prioriza fechar regiao e manter pecas dela | Vivo |
| `Origem` | entra em `bonus_origem` e escolha da permissao ativa | valoriza porto de origem e frete com origem propria | Vivo |
| `Horizonte` | entra em `horizonte_normalizado` | robos de longo prazo guardam mais caixa e gostam mais de ativos lentos | Vivo |

### Personalidade

| Slider | Equacao | Efeito intuitivo | Status |
|---|---|---|---|
| `Reserva de caixa` | `1.15 * reserva_de_caixa` no multiplicador de reserva | quanto caixa o robo quer preservar | Vivo |
| `Risco` | soma em compra, permissao, cupom e negociacao | aceita mais exposicao para ganhar mais | Vivo |
| `Impulso` | soma em compra e negociacao, reduz permanencia na permissao atual | comportamento mais rapido e agressivo | Vivo |
| `Paciencia com cupom` | sobe o limiar de uso de cupom | guarda mais cupons para depois | Vivo |
| `Apego a ativo` | protege venda, hipoteca, resgate e troca de permissao | evita perder ativos e manter estrategia atual | Vivo |

### Skill

| Slider | Equacao | Efeito intuitivo | Status |
|---|---|---|---|
| `Previsao` | soma em compra de ativo, permissao e escolha da permissao ativa | melhora leitura de retorno futuro | Vivo |
| `Ruido` | nao entra em conta real hoje | deveria criar imperfeicao de avaliacao | Morto |
| `Disciplina de caixa` | `0.24 * disciplina_de_caixa` no multiplicador de reserva | aumenta cuidado com liquidez | Vivo |
| `Leitura de combo` | entra em porto, pedagio, permissao e origem | percebe melhor sinergias entre ativos | Vivo |
| `Timing` | nao entra em conta real hoje | deveria melhorar momento de agir | Morto |

## O Que Esta Funcionando Hoje

Funciona de fato:

- compra de porto do banco
- compra de pedagio do banco
- compra de permissao
- escolha de permissao ativa
- uso de cupons
- hipoteca e resgate de portos e pedagios
- negociacao dinamica robo x robo
- negociacao humano x robo
- negociacao robo x humano
- `Perfil fechado` bloqueando negociacoes
- `Perfil aberto` facilitando negociacoes

## O Que Esta Parcial Ou Shell

### Parcial

- `Agio`: existe como parametro, mas ainda nao e o grande motor do teto do comprador
- `Desagio`: existe como parametro, mas ainda nao e o grande motor do piso do vendedor

### Shell Ou Morto

- `Ruido`
- `Timing`
- `force_buy`
- `force_sell`
- `trade_forced`
- `negotiation_enabled`
- `negotiation_phases`
- `default_markup_mode`

Tambem sobra no engine um ramo antigo relacionado a permissao em hipoteca/resgate, mas a regra atual do jogo ja impede isso no fluxo principal.

## Como Funcionam Hoje Os Perfis Aberto E Fechado

### Perfil Fechado

Hoje ele funciona por travas duras.

Na pratica, ele injeta:

- `buy_blocked = 1`
- `sell_blocked = 1`
- `trade_locked = 1`

Resultado:

- o robo deixa de negociar
- a logica encerra antes de calcular faixas de preco

Isto funciona tecnicamente, mas e um modelo bruto. E importante notar que isso nao representa ainda um "mercado fechado elegante"; representa um bloqueio.

### Perfil Aberto

Hoje ele funciona como perfil muito permissivo.

Na pratica:

- aumenta abertura para comprar
- aumenta abertura para vender
- evita bloqueios

Resultado:

- a chance de sobreposicao entre teto do comprador e piso do vendedor aumenta
- mas ele nao "forca" negocio de verdade, porque os flags `force_buy`, `force_sell` e `trade_forced` ainda nao sao consumidos pelo engine

## Como Estao Funcionando As Negociacoes

### Robo X Robo

Fluxo:

1. checa bloqueios
2. calcula agressividade do comprador
3. calcula flexibilidade e apego do vendedor
4. calcula conforto de caixa do comprador
5. calcula estresse de caixa do vendedor
6. calcula ganho estrategico dos dois lados
7. gera `teto_do_comprador`
8. gera `piso_do_vendedor`
9. verifica se ha sobreposicao
10. se houver, calcula preco final

### Humano Comprando Do Robo

Fluxo:

1. robo calcula piso privado
2. robo calcula alvo privado
3. robo calcula pedido inicial
4. humano envia oferta
5. robo aceita, recusa ou contraoferta

### Robo Comprando Do Humano

Fluxo:

1. robo calcula teto privado
2. robo calcula alvo privado
3. robo calcula lance inicial
4. humano responde
5. robo aceita, recusa ou contraoferta

## Observacao Final

Hoje a IA ja esta viva nas decisoes principais, mas ainda ha dois grandes pontos para evoluir:

1. transformar `mercado aberto` e `mercado fechado` em friccao real, em vez de simples liberacao ou bloqueio
2. ligar de verdade os sliders de `Agio`, `Desagio`, `Ruido` e `Timing` na matematica
