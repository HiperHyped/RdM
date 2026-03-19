# REGRAS DA IA V2

## Objetivo

Este documento define a arquitetura alvo das regras da IA V2.

Ele complementa `data/ai_v2_presets.json` com um segundo catalogo: `data/ai_v2_rules.json`.

Separacao intencional:

- `ai_v2_presets.json`: quem o robo e
- `ai_v2_rules.json`: como o robo decide

Essa divisao permite alterar presets sem reescrever o motor e, ao mesmo tempo, revisar regras sem mudar a definicao dos grupos.

## Principios

1. Todos os parametros continuam normalizados em `0..1`.
2. `planning_horizon_turns` segue salvo em `0..1` e representa `0..20` turnos no runtime.
3. `evaluation_noise` nao e mais tratado como um comportamento binario; ele apenas controla a amplitude de ruido permitida por cada regra.
4. Regras devem ser organizadas por familia de decisao, nunca por tela ou por fluxo legado.
5. Cada decisao deve declarar explicitamente:
   - sinais de entrada
   - pesos ou coeficientes
   - limiares
   - modo de resolucao

## Familias

### Liquidez

Responsabilidades:

- calcular reserva de caixa
- escolher qual ativo hipotecar
- escolher qual ativo resgatar

Pergunta central:

- quanto caixa preciso proteger antes de continuar crescendo?

### Compra e Expansao

Responsabilidades:

- comprar ativo do banco
- comprar permissao extra
- escolher a melhor permissao entre candidatas

Pergunta central:

- este investimento melhora minha malha, meu rendimento ou meu plano estrutural mais do que consome meu caixa?

### Negociacao

Responsabilidades:

- decidir interesse em abrir negociacao
- calcular faixa de preco de compra e venda
- aceitar, recusar ou contraofertar
- conduzir negociacao com humano e com robos

Pergunta central:

- este ativo vale uma conversa, e em que faixa de preco ela ainda faz sentido?

### Recursos Taticos

Responsabilidades:

- decidir quando usar cupons
- separar contexto de emergencia, aceleração e defesa

Pergunta central:

- o ganho de usar agora supera o valor de esperar uma janela melhor?

## Catalogo De Sinais

Os sinais declarados em `data/ai_v2_rules.json` fazem a ponte entre os grupos do perfil e as decisoes.

Exemplos:

- `buy_openness`, `sell_openness`, `premium_tolerance`, `strategic_lock`
- `focus_port`, `focus_permission`, `focus_toll`, `focus_monopoly`, `focus_origin_bonus`
- `cash_reserve_ratio`, `risk_tolerance`, `impulsiveness`, `asset_attachment`
- `foresight`, `skill_noise`, `liquidity_discipline`, `combo_awareness`, `timing_quality`

Regra pratica:

- o motor deve ler sinais desse catalogo antes de aplicar formulas especificas de cada decisao

## Modos De Resolucao

O arquivo de regras usa quatro modos principais:

- `formula`: calcula um valor interno, como reserva de caixa
- `score_vs_threshold`: gera score e compara com limiar
- `rank_then_select`: ranqueia candidatos e escolhe o melhor
- `session_policy`: controla sessoes de negociacao com limites de rodada e bandas de aceitacao

## Estrutura Do JSON

O arquivo agora tem tres camadas diferentes, com papeis distintos:

- `signal_catalog`: parametros brutos que vem dos presets
- `runtime_context_signals`: sinais calculados pelo estado atual da partida
- `derived_signals`: sinais compostos, declarados por estrutura de calculo
- `decision_families`: regras finais, tambem declaradas por estrutura de calculo

Cada decisao traz:

- `description`
- `formula_spec`, `scoring_formula`, `ranking_formula`, `session_formula` ou `price_formula`
- `thresholds`
- `noise`, quando existir

Quando o contexto exige preco, a decisao usa `price_formula` com componentes separados para comprador e vendedor.

Estado atual do JSON:

- `data/ai_v2_rules.json` ja contem pesos, coeficientes, limiares, amplitudes de ruido e bandas de preco.
- Os sinais derivados nao ficam mais descritos como string de formula. Eles agora usam estruturas como `weighted_sum`, `normalized_ratio`, `price_multiplier` e `asset_kind_lookup`.
- As familias de decisao agora tambem carregam explicitamente sua forma de calculo, em vez de expor so um pacote de pesos soltos.
- Ainda nao esta tudo executado pelo motor. O JSON hoje e a fonte de verdade de desenho e tuning; a migracao do runtime ainda vem em seguida.

Erro da versao anterior:

- eu tinha misturado duas coisas diferentes: uma formula em texto para leitura humana e, ao lado, pesos reutilizaveis
- isso realmente passava a impressao de hardcode e nao deixava claro qual parte o runtime deveria interpretar
- agora a intencao ficou separada: o JSON guarda apenas estrutura declarativa; as formulas escritas no documento abaixo sao somente uma renderizacao humana dessa estrutura

## Como Ler O JSON Agora

Exemplo de sinal derivado:

- `derived_signals.origin_synergy`
- tipo: `weighted_sum`
- leitura: somar os termos ponderados, depois aplicar clamp entre `0` e `1`

Exemplo de decisao:

- `decision_families.acquisition.decisions.bank_property_purchase`
- tipo de conta: `scoring_formula`
- leitura: somar os termos ponderados, aplicar ruido controlado por `skill_noise`, depois comparar com os limiares `buy`, `stretch_buy` e `deny`

Exemplo de negociacao por preco:

- `decision_families.negotiation.decisions.owned_property_price_band`
- leitura: calcular `buyer_max` e `seller_min` por multiplicador sobre `base_price`, cada um com seus termos ponderados

## Formulas Base

### Padrao Score X Limiar

| Elemento | Formula |
| --- | --- |
| score bruto | `soma(peso_i * sinal_i)` |
| ruido | `random(-1, 1) * skill_noise * amplitude_local` |
| score final | `clamp(score_bruto + ruido + ajustes_contextuais, 0, 1)` |
| decisao | `comprar/aceitar/usar` quando `score_final >= threshold` |

### Padrao Ranking

| Elemento | Formula |
| --- | --- |
| score do candidato | `soma(peso_i * sinal_i)` |
| ordenacao | maior `score` vence |
| corte | a regra pode abortar antes por limiar de seguranca ou falta de necessidade |

### Padrao Banda De Preco

| Elemento | Formula |
| --- | --- |
| teto do comprador | `preco_base * (1 + soma_componentes)` |
| piso do vendedor | `preco_base * (1 + soma_componentes)` |
| aceitacao direta | quando `buyer_max - seller_min >= auto_accept_margin` |
| rejeicao por insulto | quando a distancia passa de `insult_*_gap` |

## Sinais Derivados

Os pesos de varias regras apontam para sinais derivados. Eles agora estao descritos no JSON e resumidos abaixo.

| Sinal derivado | Formula | Leitura |
| --- | --- | --- |
| `asset_focus` | `port -> focus_port; permission -> focus_permission; toll -> focus_toll; other -> 0.5` | prioridade bruta pelo tipo do ativo |
| `origin_synergy` | `0.5 * focus_origin_bonus + 0.3 * focus_port + 0.2 * origin_control_gain_norm` | ganho de origem e porto proprio |
| `monopoly_progress` | `0.55 * focus_monopoly + 0.3 * region_completion_after_action_norm + 0.15 * combo_awareness` | aproximacao de conjunto/regiao |
| `permission_synergy` | `0.5 * focus_permission + 0.25 * route_unlock_gain_norm + 0.25 * combo_awareness` | ganho de rede e permissoes |
| `yield_projection` | `0.45 * projected_income_norm + 0.3 * planning_horizon + 0.25 * foresight` | retorno esperado no horizonte |
| `cash_headroom` | `(cash_after_action - reserve_cash_target_amount) / max(action_cost, 1)` | folga apos agir |
| `cash_pressure` | `(reserve_cash_target_amount - current_cash) / max(reserve_cash_target_amount, 1)` | aperto de caixa atual |
| `permission_need` | `0.55 * open_contract_slots_pressure + 0.25 * focus_permission + 0.1 * planning_horizon + 0.1 * combo_awareness` | urgencia de permissao extra |
| `network_synergy` | `0.4 * route_unlock_gain_norm + 0.35 * focus_permission + 0.25 * focus_origin_bonus` | ganho de malha |
| `coverage_gain` | `0.6 * reachable_destinations_gain_norm + 0.4 * route_unlock_gain_norm` | aumento de cobertura |
| `contract_synergy` | `0.55 * contract_value_gain_norm + 0.45 * combo_awareness` | melhora de carteira de contratos |
| `strategic_value` | `0.4 * asset_focus + 0.3 * monopoly_progress + 0.15 * origin_synergy + 0.15 * combo_awareness` | valor estrutural do ativo |
| `combo_penalty` | `combo_break_loss_norm * combo_awareness` | perda de sinergia ao sair do ativo |
| `combo_value` | `combo_restore_gain_norm * combo_awareness` | ganho de sinergia ao resgatar |
| `asset_opportunity` | `0.45 * bank_or_market_opportunity_norm + 0.3 * network_synergy + 0.25 * monopoly_progress` | tamanho da oportunidade aceleravel |
| `turn_value` | `0.55 * immediate_turn_swing_norm + 0.25 * timing_quality + 0.2 * risk_tolerance` | valor marginal desta rodada |
| `opponent_monopoly_threat` | `0.65 * opponent_region_completion_norm + 0.35 * opponent_income_swing_norm` | risco de consolidacao rival |
| `self_protection` | `0.55 * self_loss_prevention_norm + 0.45 * asset_attachment` | ganho defensivo proprio |

## Tabelas Das Regras

### Liquidez: `reserve_cash_target`

Formula:

`reserve_ratio = clamp(0.18 + 0.42*cash_reserve_ratio + 0.18*liquidity_discipline + 0.12*planning_horizon + 0.06*focus_origin_bonus + 0.08*focus_monopoly - 0.16*risk_tolerance + ajustes_contextuais, 0.08, 0.72)`

| Termo | Peso | Efeito |
| --- | --- | --- |
| `base_ratio` | `0.18` | piso estrutural de caixa |
| `cash_reserve_ratio` | `0.42` | ancora principal da reserva |
| `liquidity_discipline` | `0.18` | respeita melhor a reserva |
| `planning_horizon` | `0.12` | protege mais caixa ao planejar longe |
| `focus_origin_bonus` | `0.06` | preserva caixa para linhas de origem |
| `focus_monopoly` | `0.08` | evita perder conjunto por falta de caixa |
| `risk_tolerance_relief` | `-0.16` | perfis arriscados aliviam a reserva |

| Ajuste contextual | Valor |
| --- | --- |
| `under_threat` | `+0.16` |
| `ahead_on_cash` | `-0.08` |
| `late_game` | `+0.05` |

### Liquidez: `mortgage_candidate`

Formula de ranking:

`score = 0.38*cash_generated - 0.22*asset_focus - 0.12*origin_synergy - 0.12*combo_penalty - 0.08*asset_attachment + 0.06*timing_quality - 0.05*late_game_keep_penalty`

| Termo | Peso | Efeito |
| --- | --- | --- |
| `cash_generated` | `0.38` | prioriza levantar caixa rapido |
| `asset_focus_penalty` | `-0.22` | evita hipotecar ativo prioritario |
| `origin_synergy_penalty` | `-0.12` | evita desmontar origem relevante |
| `combo_penalty` | `-0.12` | evita quebrar sinergia forte |
| `asset_attachment_penalty` | `-0.08` | respeita apego do perfil |
| `timing_quality_bonus` | `0.06` | recompensa janela boa para hipotecar |
| `late_game_keep_penalty` | `-0.05` | segura ativos valiosos no fim |

| Limiar | Valor |
| --- | --- |
| `must_raise_cash_gap_ratio` | `0.12` |
| `skip_if_safe_ratio` | `0.03` |

### Liquidez: `redeem_candidate`

Formula de ranking:

`score = 0.28*asset_focus + 0.14*origin_synergy + 0.18*combo_value + 0.16*yield_recovery + 0.10*foresight + 0.08*timing_quality - 0.20*liquidity_penalty`

| Termo | Peso | Efeito |
| --- | --- | --- |
| `asset_focus_value` | `0.28` | prioriza resgatar o que o perfil mais quer |
| `origin_synergy_value` | `0.14` | resgata origem/porto importante |
| `combo_value` | `0.18` | recompõe sinergias |
| `yield_recovery` | `0.16` | recupera renda futura |
| `foresight_bonus` | `0.10` | skill melhora leitura de retorno |
| `timing_quality_bonus` | `0.08` | evita resgate ruim |
| `liquidity_penalty` | `-0.20` | nao resgata se isso compromete caixa |

| Limiar | Valor |
| --- | --- |
| `redeem` | `0.57` |
| `stretch_redeem` | `0.67` |

### Compra: `bank_property_purchase`

Formula:

`score = 0.24*asset_focus + 0.14*origin_synergy + 0.14*monopoly_progress + 0.10*permission_synergy + 0.10*yield_projection + 0.08*planning_horizon + 0.14*cash_headroom + 0.06*risk_tolerance + 0.04*impulsiveness + 0.08*foresight + 0.08*combo_awareness + ruido`

| Termo | Peso | Efeito |
| --- | --- | --- |
| `asset_focus` | `0.24` | peso central do tipo do ativo |
| `origin_synergy` | `0.14` | valor ligado a origem |
| `monopoly_progress` | `0.14` | valor de conjunto/regiao |
| `permission_synergy` | `0.10` | valor de malha |
| `yield_projection` | `0.10` | retorno esperado |
| `planning_horizon` | `0.08` | paciencia de longo prazo |
| `cash_headroom` | `0.14` | caixa apos comprar |
| `risk_tolerance` | `0.06` | aceita esticar mais o caixa |
| `impulse` | `0.04` | oportunidade imediata |
| `foresight_bonus` | `0.08` | melhora leitura futura |
| `combo_awareness_bonus` | `0.08` | percebe sinergias |

| Ruido/limiar | Valor |
| --- | --- |
| `noise.amplitude` | `0.08` |
| `buy` | `0.58` |
| `stretch_buy` | `0.68` |
| `deny` | `0.42` |
| `reserve_cash_penalty` | `0.22` |
| `late_game_relief` | `0.05` |
| `premium_tolerance_cap` | `0.18` |

### Compra: `extra_permission_purchase`

Formula:

`score = 0.30*permission_need + 0.18*network_synergy + 0.12*planning_horizon + 0.16*cash_headroom + 0.06*risk_tolerance + 0.10*foresight + 0.08*combo_awareness + ruido`

| Termo | Peso | Efeito |
| --- | --- | --- |
| `permission_need` | `0.30` | urgencia de capacidade adicional |
| `network_synergy` | `0.18` | ganho de malha |
| `planning_horizon` | `0.12` | valor de uso ao longo do tempo |
| `cash_headroom` | `0.16` | folga apos pagar |
| `risk_tolerance` | `0.06` | aceita esticar mais |
| `foresight_bonus` | `0.10` | projeta melhor o ganho |
| `combo_awareness_bonus` | `0.08` | lê sinergias da permissao |

| Ruido/limiar | Valor |
| --- | --- |
| `noise.amplitude` | `0.06` |
| `buy` | `0.60` |
| `stretch_buy` | `0.70` |

### Compra: `permission_selection`

Formula de ranking:

`score = 0.28*focus_permission + 0.16*focus_origin_bonus + 0.14*coverage_gain + 0.12*contract_synergy + 0.08*planning_horizon + 0.04*risk_tolerance + 0.04*impulsiveness + 0.08*foresight + 0.10*combo_awareness + ruido`

| Termo | Peso | Efeito |
| --- | --- | --- |
| `permission_focus` | `0.28` | prioridade bruta por permissoes |
| `origin_bonus` | `0.16` | valor extra de origem |
| `coverage_gain` | `0.14` | expande destinos uteis |
| `contract_synergy` | `0.12` | melhora contratos |
| `planning_horizon` | `0.08` | considera valor futuro |
| `risk_tolerance` | `0.04` | tolera mais aposta |
| `impulse` | `0.04` | aproveita janela imediata |
| `foresight_bonus` | `0.08` | projeta retorno |
| `combo_awareness_bonus` | `0.10` | reconhece sinergia complexa |

| Ruido | Valor |
| --- | --- |
| `noise.amplitude` | `0.05` |

### Negociacao: `owned_property_interest`

Formula:

`score = 0.18*buy_openness + 0.16*asset_focus + 0.10*origin_synergy + 0.12*monopoly_progress + 0.10*premium_tolerance + 0.12*cash_headroom + 0.06*risk_tolerance + 0.08*combo_awareness + 0.06*timing_quality - 0.12*seller_lock - 0.04*buyer_attachment + ruido`

| Termo | Peso | Efeito |
| --- | --- | --- |
| `buy_openness` | `0.18` | vontade de abrir compra |
| `asset_focus` | `0.16` | valor do ativo para o plano |
| `origin_synergy` | `0.10` | valor de origem |
| `monopoly_progress` | `0.12` | ganho de conjunto |
| `premium_tolerance` | `0.10` | aceita pagar premio |
| `cash_headroom` | `0.12` | so insiste se tem caixa |
| `risk_tolerance` | `0.06` | aceita risco |
| `combo_awareness_bonus` | `0.08` | reconhece sinergias |
| `timing_quality_bonus` | `0.06` | avalia janela da negociacao |
| `seller_lock_penalty` | `-0.12` | vendedor travado desincentiva |
| `buyer_attachment_penalty` | `-0.04` | comprador muito apegado gira menos |

| Ruido/limiar | Valor |
| --- | --- |
| `noise.amplitude` | `0.07` |
| `open_negotiation` | `0.55` |
| `push_harder` | `0.68` |
| `abandon` | `0.41` |

### Negociacao: `owned_property_price_band`

Formula do comprador:

`buyer_max = base_price * (1 + 0.30*interest_score + 0.24*premium_tolerance + 0.08*risk_tolerance + 0.05*timing_quality - 0.18*cash_pressure)`

Formula do vendedor:

`seller_min = base_price * (1 + 0.22*strategic_value + 0.20*strategic_lock + 0.12*asset_attachment - 0.16*discount_tolerance - 0.18*desperation_discount + 0.05*timing_quality)`

| Banda | Componente | Peso |
| --- | --- | --- |
| `buyer_max` | `base_price` | `1.00` |
| `buyer_max` | `interest_score` | `0.30` |
| `buyer_max` | `premium_tolerance` | `0.24` |
| `buyer_max` | `risk_tolerance` | `0.08` |
| `buyer_max` | `timing_quality` | `0.05` |
| `buyer_max` | `cash_pressure_penalty` | `-0.18` |
| `seller_min` | `base_price` | `1.00` |
| `seller_min` | `strategic_value` | `0.22` |
| `seller_min` | `strategic_lock` | `0.20` |
| `seller_min` | `asset_attachment` | `0.12` |
| `seller_min` | `discount_tolerance` | `-0.16` |
| `seller_min` | `desperation_discount` | `-0.18` |
| `seller_min` | `timing_quality` | `0.05` |

| Limiar | Valor |
| --- | --- |
| `acceptable_overlap` | `0.00` |
| `auto_accept_margin` | `0.03` |
| `insult_reject_margin` | `-0.12` |

### Negociacao: `human_buy_negotiation`

Score-base da sessao:

`session_score = 0.24*sell_openness + 0.16*discount_tolerance - 0.18*strategic_lock - 0.10*cash_reserve_ratio - 0.12*asset_attachment + 0.10*desperation_discount + 0.05*combo_awareness + 0.05*timing_quality`

| Termo | Peso | Efeito |
| --- | --- | --- |
| `sell_openness` | `0.24` | aumenta chance de conversar/vender |
| `discount_tolerance` | `0.16` | aceita reduzir piso |
| `strategic_lock` | `-0.18` | segura ativo importante |
| `cash_reserve_ratio` | `-0.10` | quem preserva caixa resiste mais |
| `asset_attachment` | `-0.12` | apego dificulta venda |
| `desperation_discount` | `0.10` | aperto de caixa aumenta concessao |
| `combo_awareness` | `0.05` | leitura melhor de perda/ganho |
| `timing_quality` | `0.05` | melhora calibracao da resposta |

| Limiar/limite | Valor |
| --- | --- |
| `accept_offer` | `0.62` |
| `counter_offer` | `0.48` |
| `hard_reject` | `0.34` |
| `insult_floor_gap` | `-0.14` |
| `max_rounds` | `4` |
| `late_round_concession` | `0.04` |

### Negociacao: `human_sale_negotiation`

Score-base da sessao:

`session_score = 0.24*buy_openness + 0.16*premium_tolerance + 0.10*risk_tolerance - 0.14*cash_reserve_ratio + 0.12*foresight + 0.12*combo_awareness + 0.12*timing_quality`

| Termo | Peso | Efeito |
| --- | --- | --- |
| `buy_openness` | `0.24` | vontade de entrar na compra |
| `premium_tolerance` | `0.16` | aceita premio maior |
| `risk_tolerance` | `0.10` | estica mais o caixa |
| `cash_reserve_ratio` | `-0.14` | reserva alta segura a compra |
| `foresight` | `0.12` | projeta retorno melhor |
| `combo_awareness` | `0.12` | percebe sinergias |
| `timing_quality` | `0.12` | melhora timing da proposta |

| Limiar/limite | Valor |
| --- | --- |
| `accept_offer` | `0.64` |
| `counter_offer` | `0.50` |
| `hard_reject` | `0.36` |
| `insult_ceiling_gap` | `0.16` |
| `max_rounds` | `4` |
| `late_round_premium_relief` | `0.05` |

### Recursos Taticos: `coupon_usage`

Ruido base da familia:

`noise = random(-1, 1) * skill_noise * 0.06`

No estado atual, a regra ja nao e mais agrupada so por classe de cupom. Cada cupom relevante tem sua propria formula e seu proprio limiar no JSON.

Sinais centrais usados por quase todos os cupons:

- `coupon_age_pressure`: mede quao perto o cupom esta de expirar na mao.
- `mandatory_toll_pressure`: marca quando existe uma janela obrigatoria de rota para usar o cupom.
- `asset_opportunity`: marca quando o cupom abriu uma janela util clara de uso.
- `contract_failure_risk`: mede risco de fracasso do contrato a partir de passos restantes, rodadas restantes, combustivel e pedagio obrigatorio.

Todos os cupons V2 agora expiram apos `100` rodadas globais guardados na mao. Quando vencem, saem da mao do jogador e o `source_card_id` retorna ao baralho de sorte/reves pelo descarte.

Cupons de alivio imediato:

- `free_fuel`: threshold `0.45`
- `free_port_stay`: threshold `0.45`
- `free_toll`: threshold `0.45`
- `free_fuel_contract`: threshold `0.45`

Cupons de rota e contrato:

- `shortcut_ignore_toll`: threshold `0.45`
- `reroute_same_value`: threshold `0.45`
- `cancel_contract`: threshold `0.50`
- `extended_contract_deadline`: threshold `0.50`

Cupons de liquidacao e comissao:

- `double_freight`: threshold `0.45`
- `anti_monopoly_owner_share`: threshold `0.45`
- `skip_owner_share`: threshold `0.45`

Em resumo:

- a regra de cupons deixou de depender de caixa e agora prioriza a primeira oportunidade clara de uso
- cupons de contrato deixaram de depender de gates hardcoded na UI
- o engine V2 resolve `coupon_usage` por chave de cupom especifica dentro de `coupon_rules`
- cupons guardados por `100` rodadas expiram automaticamente e retornam ao deck

## Como As Formulas Entram No JSON

O modelo que estou adotando no JSON e este:

1. `signal_catalog`: parametros brutos que vem do perfil.
2. `derived_signals`: sinais compostos, com formula explicita e termos nomeados.
3. `decision_families.*.decisions.*`: regra final, com pesos, limiares, ruido e modo de resolucao.

Em outras palavras:

- o perfil fornece materia-prima
- os sinais derivados transformam contexto em variaveis auditaveis
- a decisao final combina essas variaveis em score, ranking ou banda de preco

Isso resolve o problema de configuracao porque voce pode criticar e alterar separadamente:

- o significado dos sinais derivados
- o peso deles dentro de cada decisao
- os limiares de corte

## Ordem Recomendada De Migracao

1. Migrar `reserve_cash_target`, `mortgage_candidate` e `redeem_candidate`.
2. Migrar `bank_property_purchase`, `extra_permission_purchase` e `permission_selection`.
3. Migrar `owned_property_interest` e `owned_property_price_band`.
4. Migrar negociacoes com humano.
5. Refinar `coupon_usage` por cupom especifico conforme telemetria e playtests.

Essa ordem reduz risco porque liquidez e compra sustentam quase todo o resto.

## Efeito Esperado

Com esse catalogo, a IA deixa de depender de constantes escondidas em blocos longos de JavaScript e passa a ter:

- parametros rastreaveis
- limiares auditaveis
- familias claras de decisao
- caminho direto para editor futuro ou tuning automatizado