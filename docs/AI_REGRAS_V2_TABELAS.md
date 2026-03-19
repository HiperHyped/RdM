# AI REGRAS V2 TABELAS

## Familia 1

| Campo | Valor |
| --- | --- |
| Familia | Liquidez |
| Objetivo | Manter caixa funcional, evitar colapso e decidir quando hipotecar ou resgatar ativos |
| Decisoes | reserve_cash_target, mortgage_candidate, redeem_candidate |

### Sinais Base Da Familia

| Sinal | Origem | Papel na familia |
| --- | --- | --- |
| cash_reserve_ratio | preset.personality | quanto caixa o perfil quer preservar |
| liquidity_discipline | preset.skill | o quanto respeita a reserva alvo |
| risk_tolerance | preset.personality | o quanto aceita esticar caixa |
| planning_horizon | preset.vision | horizonte de planejamento |
| focus_origin_bonus | preset.vision | valor de manter estrutura ligada a origem |
| focus_monopoly | preset.vision | valor de manter conjunto/regiao |
| asset_attachment | preset.personality | apego ao ativo |
| foresight | preset.skill | leitura de retorno futuro |
| combo_awareness | preset.skill | leitura de sinergias |
| timing_quality | preset.skill | qualidade de timing |
| cash_generated | runtime | caixa levantado por hipoteca |
| yield_recovery | runtime | renda recuperada por resgate |
| late_game_keep_penalty | runtime | penalidade por abrir mao de ativo forte no fim |
| under_threat | runtime | ameaca financeira/posicional |
| ahead_on_cash | runtime | sobra de caixa relativa |
| late_game | runtime | fase tardia da partida |

### Sinais Derivados Usados Pela Familia

| Sinal derivado | Tipo | Formula humana |
| --- | --- | --- |
| asset_focus | asset_kind_lookup | porto -> focus_port, permissao -> focus_permission, pedagio -> focus_toll, outro -> 0.5 |
| origin_synergy | weighted_sum | 0.50 * focus_origin_bonus + 0.30 * focus_port + 0.20 * origin_control_gain_norm |
| cash_pressure | normalized_ratio | (reserve_cash_target_amount - current_cash) / max(reserve_cash_target_amount, 1) |
| combo_penalty | weighted_product | combo_break_loss_norm * combo_awareness |
| combo_value | weighted_product | combo_restore_gain_norm * combo_awareness |

### Decisao 1: Reserve Cash Target

| Campo | Valor |
| --- | --- |
| Nome | reserve_cash_target |
| Tipo | formula |
| Saida | reserve_ratio |
| Clamp final | min 0.08, max 0.72 |

Formula humana atual:

`reserve_ratio = clamp(0.18 + 0.42*cash_reserve_ratio + 0.18*liquidity_discipline + 0.12*planning_horizon + 0.06*focus_origin_bonus + 0.08*focus_monopoly - 0.16*risk_tolerance + 0.16*under_threat - 0.08*ahead_on_cash + 0.05*late_game, 0.08, 0.72)`

| Termo | Peso | Interpretacao |
| --- | --- | --- |
| base | 0.18 | piso estrutural de reserva |
| cash_reserve_ratio | 0.42 | principal ancora do caixa protegido |
| liquidity_discipline | 0.18 | reforca obediencia a reserva |
| planning_horizon | 0.12 | quanto mais pensa a frente, mais protege caixa |
| focus_origin_bonus | 0.06 | protege caixa para jogadas ligadas a origem |
| focus_monopoly | 0.08 | protege caixa para nao perder conjunto |
| risk_tolerance | -0.16 | perfis arriscados aliviam a reserva |

| Ajuste contextual | Peso | Interpretacao |
| --- | --- | --- |
| under_threat | 0.16 | aumenta reserva em situacao de ameaca |
| ahead_on_cash | -0.08 | reduz reserva quando ja esta folgado |
| late_game | 0.05 | aumenta levemente a reserva no fim |

### Decisao 2: Mortgage Candidate

| Campo | Valor |
| --- | --- |
| Nome | mortgage_candidate |
| Tipo | rank_then_select |
| Saida | score por ativo hipotecavel |
| Criterio | maior score vence |

Formula humana atual:

`score = 0.38*cash_generated - 0.22*asset_focus - 0.12*origin_synergy - 0.12*combo_penalty - 0.08*asset_attachment + 0.06*timing_quality - 0.05*late_game_keep_penalty`

| Termo | Peso | Interpretacao |
| --- | --- | --- |
| cash_generated | 0.38 | prioriza ativos que resolvem caixa mais rapido |
| asset_focus | -0.22 | evita hipotecar ativos centrais ao plano |
| origin_synergy | -0.12 | evita desmontar estrutura de origem |
| combo_penalty | -0.12 | evita quebrar sinergia |
| asset_attachment | -0.08 | respeita apego do perfil |
| timing_quality | 0.06 | melhora escolha da janela |
| late_game_keep_penalty | -0.05 | protege ativos melhores no fim |

| Limiar | Valor | Leitura |
| --- | --- | --- |
| must_raise_cash_gap_ratio | 0.12 | so entra em modo de levantar caixa se o buraco for relevante |
| skip_if_safe_ratio | 0.03 | se a margem estiver segura, pode nem hipotecar |

### Decisao 3: Redeem Candidate

| Campo | Valor |
| --- | --- |
| Nome | redeem_candidate |
| Tipo | rank_then_select |
| Saida | score por ativo hipotecado |
| Criterio | maior score vence |

Formula humana atual:

`score = 0.28*asset_focus + 0.14*origin_synergy + 0.18*combo_value + 0.16*yield_recovery + 0.10*foresight + 0.08*timing_quality - 0.20*cash_pressure`

| Termo | Peso | Interpretacao |
| --- | --- | --- |
| asset_focus | 0.28 | prioriza resgatar o que o perfil mais valoriza |
| origin_synergy | 0.14 | prioriza ativos que reforcam origem |
| combo_value | 0.18 | valoriza recompor sinergias |
| yield_recovery | 0.16 | valoriza voltar a gerar renda |
| foresight | 0.10 | melhora leitura de retorno futuro |
| timing_quality | 0.08 | melhora decisao do momento do resgate |
| cash_pressure | -0.20 | impede resgate se o caixa ainda esta apertado |

| Limiar | Valor | Leitura |
| --- | --- | --- |
| redeem | 0.57 | limiar normal para resgatar |
| stretch_redeem | 0.67 | limiar de resgate mais exigente |

## Familia 2

| Campo | Valor |
| --- | --- |
| Familia | Compra e Expansao |
| Objetivo | Decidir compras do banco, compra de permissao extra e prioridade entre ativos disponiveis |
| Decisoes | bank_property_purchase, extra_permission_purchase, permission_selection |

### Sinais Base Da Familia

| Sinal | Origem | Papel na familia |
| --- | --- | --- |
| focus_port | preset.vision | prioridade por portos |
| focus_permission | preset.vision | prioridade por permissoes |
| focus_toll | preset.vision | prioridade por pedagios |
| focus_monopoly | preset.vision | prioridade por conjuntos/regioes |
| focus_origin_bonus | preset.vision | prioridade por origem |
| planning_horizon | preset.vision | horizonte de planejamento |
| cash_reserve_ratio | preset.personality | protecao de caixa desejada |
| risk_tolerance | preset.personality | tolerancia a esticar caixa |
| impulsiveness | preset.personality | impulso de curto prazo |
| foresight | preset.skill | leitura de retorno futuro |
| combo_awareness | preset.skill | leitura de sinergias |
| skill_noise | preset.skill | amplitude de ruido |

### Sinais De Contexto E Derivados Usados Pela Familia

| Sinal | Tipo | Formula humana |
| --- | --- | --- |
| asset_focus | derivado | porto -> focus_port, permissao -> focus_permission, pedagio -> focus_toll, outro -> 0.5 |
| origin_synergy | derivado | 0.50 * focus_origin_bonus + 0.30 * focus_port + 0.20 * origin_control_gain_norm |
| monopoly_progress | derivado | 0.55 * focus_monopoly + 0.30 * region_completion_after_action_norm + 0.15 * combo_awareness |
| permission_synergy | derivado | 0.50 * focus_permission + 0.25 * route_unlock_gain_norm + 0.25 * combo_awareness |
| yield_projection | derivado | 0.45 * projected_income_norm + 0.30 * planning_horizon + 0.25 * foresight |
| cash_headroom | derivado | (cash_after_action - reserve_cash_target_amount) / max(action_cost, 1) |
| permission_need | derivado | 0.55 * open_contract_slots_pressure + 0.25 * focus_permission + 0.10 * planning_horizon + 0.10 * combo_awareness |
| network_synergy | derivado | 0.40 * route_unlock_gain_norm + 0.35 * focus_permission + 0.25 * focus_origin_bonus |
| coverage_gain | derivado | 0.60 * reachable_destinations_gain_norm + 0.40 * route_unlock_gain_norm |
| contract_synergy | derivado | 0.55 * contract_value_gain_norm + 0.45 * combo_awareness |

### Decisao 1: Bank Property Purchase

| Campo | Valor |
| --- | --- |
| Nome | bank_property_purchase |
| Tipo | score_vs_threshold |
| Saida | score de compra |
| Regra | comprar se passar os limiares definidos |

Formula humana atual:

`score = 0.24*asset_focus + 0.14*origin_synergy + 0.14*monopoly_progress + 0.10*permission_synergy + 0.10*yield_projection + 0.08*planning_horizon + 0.14*cash_headroom + 0.06*risk_tolerance + 0.04*impulsiveness + 0.08*foresight + 0.08*combo_awareness + ruido`

Ruido:

`ruido = random(-1, 1) * skill_noise * 0.08`

| Termo | Peso | Interpretacao |
| --- | --- | --- |
| asset_focus | 0.24 | maior peso da decisao; valor bruto do tipo do ativo |
| origin_synergy | 0.14 | valor estrutural ligado a origem |
| monopoly_progress | 0.14 | valor de completar/proteger conjunto |
| permission_synergy | 0.10 | ganho de malha operacional |
| yield_projection | 0.10 | retorno economico esperado |
| planning_horizon | 0.08 | valorizacao de retorno futuro |
| cash_headroom | 0.14 | folga de caixa apos comprar |
| risk_tolerance | 0.06 | aceitacao de maior risco financeiro |
| impulsiveness | 0.04 | impulso de oportunidade |
| foresight | 0.08 | leitura mais qualificada do retorno |
| combo_awareness | 0.08 | percepcao de sinergias |

| Campo | Valor | Leitura |
| --- | --- | --- |
| noise.amplitude | 0.08 | ruido moderado |
| buy | 0.58 | limiar normal de compra |
| stretch_buy | 0.68 | compra mais exigente/agressiva |
| deny | 0.42 | abaixo disso, rejeita |
| reserve_cash_penalty | 0.22 | pressao de caixa fora do score principal |
| late_game_relief | 0.05 | alivio contextual no fim |
| premium_tolerance_cap | 0.18 | teto de agressividade de preco |

### Decisao 2: Extra Permission Purchase

| Campo | Valor |
| --- | --- |
| Nome | extra_permission_purchase |
| Tipo | score_vs_threshold |
| Saida | score de compra de permissao extra |
| Regra | comprar se passar os limiares definidos |

Formula humana atual:

`score = 0.30*permission_need + 0.18*network_synergy + 0.12*planning_horizon + 0.16*cash_headroom + 0.06*risk_tolerance + 0.10*foresight + 0.08*combo_awareness + ruido`

Ruido:

`ruido = random(-1, 1) * skill_noise * 0.06`

| Termo | Peso | Interpretacao |
| --- | --- | --- |
| permission_need | 0.30 | principal driver; urgencia de capacidade adicional |
| network_synergy | 0.18 | ganho de cobertura e flexibilidade |
| planning_horizon | 0.12 | valor do ganho ao longo do tempo |
| cash_headroom | 0.16 | quanto sobra de caixa apos comprar |
| risk_tolerance | 0.06 | aceitacao de esticar caixa |
| foresight | 0.10 | leitura melhor do ganho futuro |
| combo_awareness | 0.08 | leitura de sinergias operacionais |

| Campo | Valor | Leitura |
| --- | --- | --- |
| noise.amplitude | 0.06 | ruido um pouco menor que compra de ativo |
| buy | 0.60 | limiar normal de compra |
| stretch_buy | 0.70 | limiar mais alto |

### Decisao 3: Permission Selection

| Campo | Valor |
| --- | --- |
| Nome | permission_selection |
| Tipo | rank_then_select |
| Saida | score por permissao candidata |
| Criterio | maior score vence |

Formula humana atual:

`score = 0.28*focus_permission + 0.16*focus_origin_bonus + 0.14*coverage_gain + 0.12*contract_synergy + 0.08*planning_horizon + 0.04*risk_tolerance + 0.04*impulsiveness + 0.08*foresight + 0.10*combo_awareness + ruido`

Ruido:

`ruido = random(-1, 1) * skill_noise * 0.05`

| Termo | Peso | Interpretacao |
| --- | --- | --- |
| focus_permission | 0.28 | prioridade estrutural por permissoes |
| focus_origin_bonus | 0.16 | valor extra se reforca origem |
| coverage_gain | 0.14 | aumento de cobertura util |
| contract_synergy | 0.12 | melhora da carteira de contratos |
| planning_horizon | 0.08 | considera retorno futuro |
| risk_tolerance | 0.04 | aceita mais aposta |
| impulsiveness | 0.04 | aproveita chance imediata |
| foresight | 0.08 | melhora leitura futura |
| combo_awareness | 0.10 | percebe conexoes mais complexas |

| Campo | Valor | Leitura |
| --- | --- | --- |
| noise.amplitude | 0.05 | menor ruido das tres decisoes da familia |

## Familia 3

| Campo | Valor |
| --- | --- |
| Familia | Negociacao |
| Objetivo | Decidir interesse, faixa de preco, aceitacao, contraoferta e fechamento de compras e vendas entre jogadores |
| Decisoes | owned_property_interest, owned_property_price_band, human_buy_negotiation, human_sale_negotiation |

### Sinais Base Da Familia

| Sinal | Origem | Papel na familia |
| --- | --- | --- |
| buy_openness | preset.negotiation | disposicao para entrar em compra |
| sell_openness | preset.negotiation | disposicao para vender |
| premium_tolerance | preset.negotiation | tolerancia a pagar premio |
| discount_tolerance | preset.negotiation | tolerancia a vender com desconto |
| strategic_lock | preset.negotiation | protecao de ativos estruturais |
| desperation_discount | preset.negotiation | relaxamento de preco sob pressao |
| cash_reserve_ratio | preset.personality | protecao de caixa |
| risk_tolerance | preset.personality | tolerancia a risco |
| asset_attachment | preset.personality | apego aos ativos |
| foresight | preset.skill | leitura de retorno futuro |
| combo_awareness | preset.skill | leitura de sinergias |
| timing_quality | preset.skill | qualidade de timing |
| skill_noise | preset.skill | amplitude de ruido |

### Sinais De Contexto E Derivados Usados Pela Familia

| Sinal | Tipo | Formula humana |
| --- | --- | --- |
| asset_focus | derivado | porto -> focus_port, permissao -> focus_permission, pedagio -> focus_toll, outro -> 0.5 |
| origin_synergy | derivado | 0.50 * focus_origin_bonus + 0.30 * focus_port + 0.20 * origin_control_gain_norm |
| monopoly_progress | derivado | 0.55 * focus_monopoly + 0.30 * region_completion_after_action_norm + 0.15 * combo_awareness |
| strategic_value | derivado | 0.40 * asset_focus + 0.30 * monopoly_progress + 0.15 * origin_synergy + 0.15 * combo_awareness |
| cash_headroom | derivado | (cash_after_action - reserve_cash_target_amount) / max(action_cost, 1) |
| cash_pressure | derivado | (reserve_cash_target_amount - current_cash) / max(reserve_cash_target_amount, 1) |
| seller_lock | runtime | resistencia percebida do vendedor |
| buyer_attachment | runtime | apego percebido do comprador a sua posicao atual |
| interest_score | runtime | score de interesse ja consolidado |
| base_price | runtime | preco base do ativo |

### Decisao 1: Owned Property Interest

| Campo | Valor |
| --- | --- |
| Nome | owned_property_interest |
| Tipo | score_vs_threshold |
| Saida | score de interesse de negociacao |
| Regra | abrir, insistir ou abandonar negociacao conforme limiar |

Formula humana atual:

`score = 0.18*buy_openness + 0.16*asset_focus + 0.10*origin_synergy + 0.12*monopoly_progress + 0.10*premium_tolerance + 0.12*cash_headroom + 0.06*risk_tolerance + 0.08*combo_awareness + 0.06*timing_quality - 0.12*seller_lock - 0.04*buyer_attachment + ruido`

Ruido:

`ruido = random(-1, 1) * skill_noise * 0.07`

| Termo | Peso | Interpretacao |
| --- | --- | --- |
| buy_openness | 0.18 | vontade base de entrar na compra |
| asset_focus | 0.16 | valor estrutural do ativo para o plano |
| origin_synergy | 0.10 | valor ligado a origem |
| monopoly_progress | 0.12 | valor de conjunto/regiao |
| premium_tolerance | 0.10 | quanto aceita pagar acima |
| cash_headroom | 0.12 | folga de caixa para sustentar a negociacao |
| risk_tolerance | 0.06 | disposicao a assumir risco |
| combo_awareness | 0.08 | percepcao de sinergias |
| timing_quality | 0.06 | qualidade da janela da negociacao |
| seller_lock | -0.12 | desincentivo pela resistencia percebida do vendedor |
| buyer_attachment | -0.04 | desincentivo por apego do comprador a sua situacao atual |

| Campo | Valor | Leitura |
| --- | --- | --- |
| noise.amplitude | 0.07 | ruido moderado |
| open_negotiation | 0.55 | limiar de abertura |
| push_harder | 0.68 | limiar de insistencia/agressividade |
| abandon | 0.41 | abaixo disso, abandona |

### Decisao 2: Owned Property Price Band

| Campo | Valor |
| --- | --- |
| Nome | owned_property_price_band |
| Tipo | price_band |
| Saida | buyer_max e seller_min |
| Regra | calcular teto do comprador e piso do vendedor e medir sobreposicao |

Formula do comprador:

`buyer_max = base_price * (1 + 0.30*interest_score + 0.24*premium_tolerance + 0.08*risk_tolerance + 0.05*timing_quality - 0.18*cash_pressure)`

Formula do vendedor:

`seller_min = base_price * (1 + 0.22*strategic_value + 0.20*strategic_lock + 0.12*asset_attachment - 0.16*discount_tolerance - 0.18*desperation_discount + 0.05*timing_quality)`

| Componente | Lado | Peso | Interpretacao |
| --- | --- | --- | --- |
| base_price | buyer_max | 1.00 | ancora do preco |
| interest_score | buyer_max | 0.30 | quanto maior o interesse, maior o teto |
| premium_tolerance | buyer_max | 0.24 | tolerancia explicita a sobrepreco |
| risk_tolerance | buyer_max | 0.08 | disposicao a arriscar caixa |
| timing_quality | buyer_max | 0.05 | melhora o ajuste fino do momento |
| cash_pressure | buyer_max | -0.18 | aperto de caixa reduz teto |
| base_price | seller_min | 1.00 | ancora do preco |
| strategic_value | seller_min | 0.22 | quanto mais estrutural o ativo, maior o piso |
| strategic_lock | seller_min | 0.20 | protecao explicita do ativo |
| asset_attachment | seller_min | 0.12 | apego do dono ao ativo |
| discount_tolerance | seller_min | -0.16 | maior tolerancia a desconto reduz piso |
| desperation_discount | seller_min | -0.18 | pressao de caixa reduz piso |
| timing_quality | seller_min | 0.05 | ajuste fino da avaliacao |

| Campo | Valor | Leitura |
| --- | --- | --- |
| acceptable_overlap | 0.00 | qualquer sobreposicao ja torna viavel |
| auto_accept_margin | 0.03 | pequena folga ja justifica aceitacao direta |
| insult_reject_margin | -0.12 | distancia muito ruim gera rejeicao por insulto |

### Decisao 3: Human Buy Negotiation

| Campo | Valor |
| --- | --- |
| Nome | human_buy_negotiation |
| Tipo | session_policy |
| Saida | session_score para vender ao humano |
| Regra | aceitar, contraofertar ou rejeitar conforme score e limites |

Formula humana atual:

`session_score = 0.24*sell_openness + 0.16*discount_tolerance - 0.18*strategic_lock - 0.10*cash_reserve_ratio - 0.12*asset_attachment + 0.10*desperation_discount + 0.05*combo_awareness + 0.05*timing_quality`

| Termo | Peso | Interpretacao |
| --- | --- | --- |
| sell_openness | 0.24 | vontade base de vender |
| discount_tolerance | 0.16 | tolerancia a baixar preco |
| strategic_lock | -0.18 | protecao de ativo estrutural |
| cash_reserve_ratio | -0.10 | perfis que protegem caixa resistem mais |
| asset_attachment | -0.12 | apego reduz chance de venda |
| desperation_discount | 0.10 | aperto de caixa ajuda a vender |
| combo_awareness | 0.05 | melhora leitura do impacto estrutural |
| timing_quality | 0.05 | melhora calibracao da resposta |

| Campo | Valor | Leitura |
| --- | --- | --- |
| accept_offer | 0.62 | aceita acima disso |
| counter_offer | 0.48 | contraoferta nessa faixa |
| hard_reject | 0.34 | rejeicao firme abaixo disso |
| insult_floor_gap | -0.14 | proposta ruim demais gera reacao de insulto |
| max_rounds | 4 | limite de rodadas de negociacao |
| late_round_concession | 0.04 | concessao extra nas rodadas finais |

### Decisao 4: Human Sale Negotiation

| Campo | Valor |
| --- | --- |
| Nome | human_sale_negotiation |
| Tipo | session_policy |
| Saida | session_score para comprar do humano |
| Regra | aceitar, contraofertar ou rejeitar conforme score e limites |

Formula humana atual:

`session_score = 0.24*buy_openness + 0.16*premium_tolerance + 0.10*risk_tolerance - 0.14*cash_reserve_ratio + 0.12*foresight + 0.12*combo_awareness + 0.12*timing_quality`

| Termo | Peso | Interpretacao |
| --- | --- | --- |
| buy_openness | 0.24 | vontade base de comprar |
| premium_tolerance | 0.16 | aceitacao de pagar premio |
| risk_tolerance | 0.10 | disposicao a esticar caixa |
| cash_reserve_ratio | -0.14 | protecao de caixa segura a compra |
| foresight | 0.12 | melhora leitura de retorno |
| combo_awareness | 0.12 | melhora leitura de sinergia |
| timing_quality | 0.12 | melhora janela de proposta |

| Campo | Valor | Leitura |
| --- | --- | --- |
| accept_offer | 0.64 | aceita acima disso |
| counter_offer | 0.50 | contraoferta nessa faixa |
| hard_reject | 0.36 | rejeita firmemente abaixo disso |
| insult_ceiling_gap | 0.16 | preco acima demais gera rejeicao por exagero |
| max_rounds | 4 | limite de rodadas |
| late_round_premium_relief | 0.05 | relaxamento de premio nas rodadas finais |

## Familia 4

| Campo | Valor |
| --- | --- |
| Familia | Recursos Taticos |
| Objetivo | Decidir quando usar cupons e outros aceleradores situacionais |
| Decisoes | coupon_usage por cupom especifico |

### Sinais Base Da Familia

| Sinal | Origem | Papel na familia |
| --- | --- | --- |
| coupon_patience | preset.personality | propensao a guardar cupons |
| risk_tolerance | preset.personality | tolerancia a risco |
| impulsiveness | preset.personality | impulso de curto prazo |
| cash_reserve_ratio | preset.personality | protecao de caixa |
| foresight | preset.skill | leitura de retorno futuro |
| timing_quality | preset.skill | qualidade de timing |
| skill_noise | preset.skill | amplitude de ruido da familia |
| combo_awareness | preset.skill | leitura de sinergias |
| planning_horizon | preset.vision | valor de horizonte para cupons estruturais |
| asset_attachment | preset.personality | valor defensivo de preservar a propria posicao |

### Sinais De Contexto E Derivados Usados Pela Familia

| Sinal | Tipo | Formula humana |
| --- | --- | --- |
| cash_pressure | derivado | (reserve_cash_target_amount - cash_after_action) / max(reserve_cash_target_amount, 1) |
| asset_opportunity | derivado | 0.35 * candidate_count_norm + 0.25 * route_unlock_gain_norm + 0.20 * region_completion_after_action_norm + 0.10 * planning_horizon + 0.10 * combo_awareness |
| turn_value | derivado | 0.55 * freight_value_norm + 0.25 * timing_quality + 0.20 * risk_tolerance |
| opponent_monopoly_threat | derivado | 0.45 * opponent_region_completion_norm + 0.25 * opponent_income_swing_norm + 0.30 * owner_monopoly_flag |
| self_protection | derivado | 0.60 * action_cost_pressure + 0.25 * asset_attachment + 0.15 * cash_pressure |
| contract_failure_risk | derivado | 0.48 * remaining_round_pressure + 0.24 * remaining_steps_pressure + 0.14 * mandatory_toll_pressure + 0.14 * fuel_route_pressure |

### Ruido Base Da Familia

| Campo | Valor | Leitura |
| --- | --- | --- |
| noise.signal | skill_noise | ruido controlado pela habilidade |
| noise.amplitude | 0.06 | amplitude comum da familia |

Formula:

`ruido = random(-1, 1) * skill_noise * 0.06`

### Regras Declarativas Por Cupom

| Cupom | Threshold | Drivers principais |
| --- | --- | --- |
| free_fuel | 0.42 | cash_pressure, self_protection, timing_quality |
| free_port_stay | 0.46 | self_protection, cash_pressure, owner_present_flag |
| free_toll | 0.46 | self_protection, mandatory_toll_pressure, cash_pressure |
| free_fuel_contract | 0.44 | fuel_route_pressure, contract_failure_risk, remaining_steps_pressure |
| shortcut_ignore_toll | 0.50 | mandatory_toll_pressure, route_unlock_gain_norm, contract_failure_risk |
| reroute_same_value | 0.46 | asset_opportunity, route_unlock_gain_norm, combo_awareness |
| cancel_contract | 0.50 | contract_failure_risk, remaining_steps_pressure, remaining_round_pressure |
| extended_contract_deadline | 0.48 | contract_failure_risk, remaining_round_pressure, planning_horizon |
| double_freight | 0.48 | turn_value, timing_quality, risk_tolerance |
| anti_monopoly_owner_share | 0.48 | opponent_monopoly_threat, self_protection |
| skip_owner_share | 0.50 | self_protection, turn_value |

Leitura operacional:

- cupons simples passaram a ter thresholds mais baixos para sair do congelamento observado em jogo
- cupons de contrato agora dependem de sinais declarativos de rota, prazo e combustivel
- patience continua segurando coupon, mas deixou de dominar a decisao sozinho