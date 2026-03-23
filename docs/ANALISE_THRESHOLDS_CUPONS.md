# Analise Corrigida De Distancia E Frete Para Cupons

## Premissas Corretas

1. O frete do contrato e calculado pela distancia direta entre PP e PD.
2. A distancia PP -> PE -> PD nao entra no calculo do frete. Ela serve para representar a travessia real do contrato e pode ser usada como sinal de risco, demora ou custo operacional para decidir cupons.
3. O pedagio obrigatorio PE nao participa da taxa E nem do multiplicador M do frete.
4. Os valores E e M usados aqui foram extraidos apenas dos portos de origem validos.
5. Origem e destino na mesma regiao nao entram no conjunto valido. O proprio jogo filtra destinos por continente diferente da origem.

## Referencias No Codigo

- O filtro de destinos exclui mesma regiao em `destinationCandidatesForOrigin`, comparando `card.continent !== originCard.continent`.
- O preview do contrato calcula a distancia do frete usando apenas `state.distances[origin][destination]`.
- O contrato salva, separadamente:
  - `distance_value`: distancia direta PP -> PD
  - `base_freight_value`: valor base com eventual efeito de origem comprada, sem depender de PE

## O Que Estava Errado Na Analise Anterior

Houve dois erros conceituais:

1. Foi usada a distancia PP -> PE -> PD como se fosse a distancia do frete.
2. Foram misturados dados de todos os `properties`, incluindo pedagios, para coletar E e M.

Isso inflou artificialmente os maximos. O valor `3225` saiu dessa combinacao errada:

- distancia de travessia usada no lugar da distancia de frete
- mistura de taxas de portos e pedagios

Com os filtros corretos, o maximo de `Distancia x E x M` cai para `1725`.

## Base De Dados Usada

- Arquivos:
  - `data/distances.json`
  - `data/ports.json`
- Portos de origem validos: `30`
- Pedagios possiveis: `6`
- Pares validos origem/destino com continentes diferentes: `760`
- Contratos validos origem/destino/pedagio: `4560`

## Estatisticas Corrigidas

### E

- minimo: `2`
- p10: `3`
- p25: `4`
- p50: `6`
- p75: `8`
- p90: `10`
- maximo: `15`

### E x M

- minimo: `4`
- p10: `9`
- p25: `15`
- p50: `24`
- p75: `35`
- p90: `50`
- maximo: `75`

### Distancia Direta Do Frete: PP -> PD

- minimo: `2`
- p10: `7`
- p25: `10`
- p50: `13`
- p75: `17`
- p90: `20`
- maximo: `25`

### Distancia Real De Travessia: PP -> PE -> PD

- minimo: `3`
- p10: `13`
- p25: `17`
- p50: `22`
- p75: `27`
- p90: `31`
- maximo: `43`

### Frete Base: Distancia(PP -> PD) x E

- minimo: `6`
- p10: `35`
- p25: `51`
- p50: `78`
- p75: `120`
- p90: `162`
- maximo: `360`

### Frete Base Com Origem Comprada: Distancia(PP -> PD) x E x M

- minimo: `12`
- p10: `96`
- p25: `168`
- p50: `288`
- p75: `480`
- p90: `720`
- maximo: `1725`

## Exemplos Extremos Corretos

### Maior `Distancia x E x M`

Exemplo valido:

- origem: `TOK`
- destino: `BUE`
- pedagio: `PAN`, `CAP`, `USH`, `SIN` ou `GIB`
- carga: `cars`
- distancia direta PP -> PD: `23`
- distancia de travessia PP -> PE -> PD: entre `23` e `26`, conforme o pedagio
- E: `15`
- M: `5`
- E x M: `75`
- frete base: `23 x 15 = 345`
- frete base com origem comprada: `23 x 15 x 5 = 1725`

### Maior `Distancia x E`

Exemplo valido:

- origem: `SPE`
- destino: `AUC`
- carga: `gas`
- distancia direta PP -> PD: `24`
- E: `15`
- frete base: `24 x 15 = 360`

### Maior Distancia De Travessia

Exemplo valido:

- origem: `TOK`
- destino: `AUC`
- pedagio: `USH`
- distancia direta PP -> PD: `15`
- distancia de travessia PP -> PE -> PD: `43`

Esse caso mostra bem a diferenca entre:

- valor economico do contrato, que usa `15`
- esforco operacional da rota, que pode usar `43`

### Menor `Distancia x E x M`

Exemplo valido:

- origem: `JED`
- destino: `ATE`
- carga: `container`
- pedagogios possiveis: `SUZ`, `GIB`, `SIN`, `CAP`, `PAN`
- distancia direta PP -> PD: `2`
- distancia de travessia PP -> PE -> PD: entre `3` e `25`
- E: `3`
- M: `2`
- E x M: `6`
- frete base: `2 x 3 = 6`
- frete base com origem comprada: `2 x 3 x 2 = 12`

## Thresholds Sugeridos

Os thresholds abaixo ja respeitam a separacao entre valor economico e distancia real de travessia.

### Sinal Economico: Distancia(PP -> PD) x E x M

Faixas sugeridas para `base_freight_value` quando houver origem comprada:

- baixo: ate `167`
- medio: `168` a `287`
- bom: `288` a `479`
- alto: `480` a `719`
- muito alto: `720+`

Faixas sugeridas para `distance_value x E` quando nao houver origem comprada:

- baixo: ate `50`
- medio: `51` a `77`
- bom: `78` a `119`
- alto: `120` a `161`
- muito alto: `162+`

### Sinal Operacional: Distancia PP -> PE -> PD

Faixas sugeridas para risco operacional ou demora:

- curta: ate `16`
- media: `17` a `21`
- longa: `22` a `26`
- muito longa: `27` a `30`
- extrema: `31+`

### Sinal De Densidade Economica

Tambem vale usar densidade economica por distancia direta:

- sem origem comprada: `E`
- com origem comprada: `E x M`

Faixas sugeridas:

- fraca:
  - `E <= 4`
  - ou `E x M <= 15`
- media:
  - `E de 5 a 6`
  - ou `E x M de 16 a 24`
- boa:
  - `E de 7 a 8`
  - ou `E x M de 25 a 35`
- forte:
  - `E >= 9`
  - ou `E x M >= 36`

## Direcao Para Os Cupons

Com essa base, a leitura para os cupons fica assim:

### Viagem De Graca

Deve olhar principalmente para:

- distancia de travessia PP -> PE -> PD
- valor economico do contrato

Boa heuristica inicial:

- usar quando travessia >= `22` e o contrato nao for fraco
- priorizar quando travessia >= `27`
- forcar perto da expiracao do cupom quando travessia >= `17`

### Prazo Estendido

Deve olhar para:

- travessia longa
- contrato economicamente medio para cima
- pressao de prazo

Boa heuristica inicial:

- considerar quando travessia >= `22` e valor economico >= faixa media
- priorizar quando travessia >= `27` ou valor economico >= faixa alta

### Contrato Cancelado

Deve olhar para:

- travessia longa
- densidade economica ruim

Boa heuristica inicial:

- considerar cancelamento quando travessia >= `22` e densidade economica for fraca
- priorizar quando travessia >= `27` e densidade economica continuar fraca

## Derivacao Matematica Formal Dos 3 Cupons Criticos

Esta secao corrige a etapa que antes ainda estava heuristica.

A partir daqui, a calibracao dos 3 cupons criticos passa a seguir 4 regras formais:

1. a constante aditiva da formula deve ser `0`
2. a fronteira minima de ativacao deve virar `play_conditions`
3. o `play_threshold` deve ser calculado no nucleo estatistico do estudo, sem depender de intercepto artificial
4. sinais dinamicos de urgencia tatico-temporal continuam existindo, mas entram apenas como bonus sobre um nucleo estatistico ja valido

### Normalizacoes Estatisticas Usadas No Runtime

Para todos os calculos abaixo, os sinais normalizados relevantes ficam assim:

#### Valor Economico Do Contrato

Com origem comprada:

$$
contract\_value\_band\_norm = clamp\left(\frac{freightValue - 168}{720 - 168}, 0, 1\right)
$$

Sem origem comprada:

$$
contract\_value\_band\_norm = clamp\left(\frac{freightValue - 51}{162 - 51}, 0, 1\right)
$$

Representante minimo da faixa media em ambos os regimes:

- origem comprada, p50: `(288 - 168) / 552 = 0.217391`
- sem origem comprada, p50: `(78 - 51) / 111 = 0.243243`
- valor adotado como piso comum conservador: `0.217391`

#### Densidade Economica

Com origem comprada:

$$
freight\_density\_norm = clamp\left(\frac{freightDensity - 15}{50 - 15}, 0, 1\right)
$$

Sem origem comprada:

$$
freight\_density\_norm = clamp\left(\frac{freightDensity - 4}{10 - 4}, 0, 1\right)
$$

Representante minimo da faixa media em ambos os regimes:

- origem comprada, p50: `(24 - 15) / 35 = 0.257143`
- sem origem comprada, p50: `(6 - 4) / 6 = 0.333333`
- valor adotado como piso comum conservador: `0.257143`

#### Travessia Real

$$
travel\_distance\_norm = clamp\left(\frac{travelRouteDistance - 17}{31 - 17}, 0, 1\right)
$$

Faixas de referencia:

- travessia p50 = `22` vira `(22 - 17) / 14 = 0.357143`
- travessia p75 = `27` vira `(27 - 17) / 14 = 0.714286`

#### Pressao De Combustivel Na Rota

$$
fuel\_route\_pressure = \frac{fuelStopsRemaining}{max(3, fuelStopsRemaining)}
$$

Valores de referencia:

- `1` posto restante -> `1 / 3 = 0.333333`
- `2` postos restantes -> `2 / 3 = 0.666667`

#### Fraqueza Economica

$$
freight\_weakness\_norm = 1 - (0.55 \cdot contract\_value\_band\_norm + 0.45 \cdot freight\_density\_norm)
$$

Caso representativo de contrato com valor apenas medio e densidade fraca:

$$
1 - (0.55 \cdot 0.217391 + 0.45 \cdot 0) = 0.880435
$$

### Metodo Formal De Calculo Do Threshold

Para cada cupom critico, o calculo passa a usar dois pontos estatisticos do estudo:

1. `S_considerar`
  - menor ponto do estudo em que o cupom passa a fazer sentido
2. `S_priorizar`
  - ponto do estudo em que o cupom ja deve ser preferido de forma clara

O threshold numerico do score fica definido por:

$$
play\_threshold = \frac{S_{considerar} + S_{priorizar}}{2}
$$

As `play_conditions` ficam responsaveis por bloquear ativacoes abaixo da fronteira minima do estudo.

Isso elimina a necessidade de constante arbitraria na formula.

### Viagem De Graca

Fronteira minima do estudo:

- pelo menos `1` posto restante -> `fuel_route_pressure >= 0.333333`
- travessia pelo menos p50 -> `travel_distance_norm >= 0.357143`
- contrato pelo menos medio -> `contract_value_band_norm >= 0.217391`
- densidade pelo menos media -> `freight_density_norm >= 0.257143`

Logo, as `play_conditions` passam a ser exatamente essas quatro desigualdades.

Score de considerar:

$$
S_{considerar} =
0.26 \cdot 0.333333 +
0.22 \cdot 0.357143 +
0.18 \cdot 0.217391 +
0.10 \cdot 0.257143
$$

$$
S_{considerar} = 0.230083
$$

Score de priorizar:

- `2` postos restantes -> `0.666667`
- travessia p75 -> `0.714286`
- mantidos os mesmos pisos economicos minimos

$$
S_{priorizar} =
0.26 \cdot 0.666667 +
0.22 \cdot 0.714286 +
0.18 \cdot 0.217391 +
0.10 \cdot 0.257143
$$

$$
S_{priorizar} = 0.395321
$$

Threshold calculado:

$$
play\_threshold = \frac{0.230083 + 0.395321}{2} = 0.312702
$$

Valor adotado no JSON: `0.313`

Constante calculada: `0`

### Contrato Cancelado

Fronteira minima do estudo:

- risco tatico minimo presente -> `contract_failure_risk >= 0.30`
- travessia pelo menos p50 -> `travel_distance_norm >= 0.357143`
- densidade ainda na faixa fraca -> `freight_density_norm <= 0.05`

Observacao importante:

- o estudo fala em densidade fraca
- a formula usa `freight_weakness_norm`
- por isso o caso-base calculado usa valor medio e densidade fraca, que gera:

$$
freight\_weakness\_norm = 1 - (0.55 \cdot 0.217391 + 0.45 \cdot 0) = 0.880435
$$

Score de considerar no nucleo estatistico:

$$
S_{considerar} =
0.18 \cdot 0.357143 +
0.28 \cdot 0.880435
$$

$$
S_{considerar} = 0.310807
$$

Score de priorizar no nucleo estatistico:

- travessia p75 -> `0.714286`
- mantida a mesma fraqueza economica de referencia

$$
S_{priorizar} =
0.18 \cdot 0.714286 +
0.28 \cdot 0.880435
$$

$$
S_{priorizar} = 0.375093
$$

Threshold calculado:

$$
play\_threshold = \frac{0.310807 + 0.375093}{2} = 0.342950
$$

Valor adotado no JSON: `0.343`

Constante calculada: `0`

### Prazo Estendido

Fronteira minima do estudo:

- pressao real de prazo presente -> `remaining_round_pressure >= 0.333333`
- risco tatico minimo presente -> `contract_failure_risk >= 0.30`
- travessia pelo menos p50 -> `travel_distance_norm >= 0.357143`
- contrato pelo menos medio -> `contract_value_band_norm >= 0.217391`

No score estatistico base, a densidade minima media continua em `0.257143`.

Score de considerar no nucleo estatistico:

$$
S_{considerar} =
0.12 \cdot 0.357143 +
0.26 \cdot 0.217391 +
0.12 \cdot 0.257143
$$

$$
S_{considerar} = 0.130348
$$

O estudo diz que se prioriza quando a travessia sobe para p75 ou quando o valor economico sobe para faixa alta.

Caso A, prioridade por travessia:

$$
S_{priorizarA} =
0.12 \cdot 0.714286 +
0.26 \cdot 0.217391 +
0.12 \cdot 0.257143 = 0.173205
$$

Caso B, prioridade por valor economico alto:

Usando o piso conservador da faixa alta com origem comprada:

$$
contract\_value\_band\_norm(p75) = \frac{480 - 168}{552} = 0.565217
$$

$$
S_{priorizarB} =
0.12 \cdot 0.357143 +
0.26 \cdot 0.565217 +
0.12 \cdot 0.257143 = 0.220783
$$

Como a prioridade pode surgir por qualquer um dos dois gatilhos, adota-se o primeiro ponto de prioridade valida:

$$
S_{priorizar} = min(0.173205, 0.220783) = 0.173205
$$

Threshold calculado:

$$
play\_threshold = \frac{0.130348 + 0.173205}{2} = 0.151776
$$

Valor adotado no JSON: `0.152`

Constante calculada: `0`

### Consequencia Pratica

Com essa revisao:

- o numero que ativa o cupom deixa de nascer de intercepto arbitrario
- a fronteira estatistica minima sai do estudo e vira `play_conditions`
- o `play_threshold` passa a medir a passagem entre caso apenas aceitavel e caso claramente prioritario
- idade do cupom, passos restantes e outras urgencias continuam validos, mas agora como moduladores taticos sobre um nucleo estatistico ja correto

## Conclusao

Os numeros mais uteis para a proxima etapa sao:

- frete direto PP -> PD:
  - p25 `10`
  - p50 `13`
  - p75 `17`
  - p90 `20`
- travessia PP -> PE -> PD:
  - p25 `17`
  - p50 `22`
  - p75 `27`
  - p90 `31`
- valor economico sem origem comprada:
  - p25 `51`
  - p50 `78`
  - p75 `120`
  - p90 `162`
- valor economico com origem comprada:
  - p25 `168`
  - p50 `288`
  - p75 `480`
  - p90 `720`

Esses cortes sao um bom ponto de partida para a revisao dos cupons.

## Varredura Ampliada Dos Cupons

Esta secao amplia a analise para outros cupons que tocam frete, comissao, rota ou custo operacional e que hoje nao estao todos condicionados explicitamente aos sinais economicos e logisticos desta analise.

### Inventario Dos Cupons Com IA Automatizada

Cupons com decisao automatica no runtime V2:

- `free_port_stay`
- `free_toll`
- `free_fuel`
- `free_fuel_contract`
- `shortcut_ignore_toll`
- `reroute_same_value`
- `cancel_contract`
- `extended_contract_deadline`
- `double_freight`
- `anti_monopoly_owner_share`
- `skip_owner_share`

### Classificacao Por Tipo De Sinal

#### Grupo A: Cupons Diretamente Economicos

Dependem do valor do frete ou de comissao sobre o frete. Precisam olhar, no minimo, para `distance_value`, `base_freight_value` e faixas de valor economico.

- `double_freight`
- `anti_monopoly_owner_share`
- `skip_owner_share`
- `cancel_contract`
- `extended_contract_deadline`
- `free_fuel_contract`

#### Grupo B: Cupons Logisticos

Dependem mais da travessia real `PP -> PE -> PD`, do desbloqueio de rota e do atrito operacional.

- `shortcut_ignore_toll`
- `reroute_same_value`
- `free_fuel_contract`
- `extended_contract_deadline`
- `cancel_contract`

#### Grupo C: Cupons De Alivio De Custo Imediato

Dependem principalmente do custo evitado na casa atual, mas podem herdar contexto economico do contrato para evitar gasto miope.

- `free_port_stay`
- `free_toll`
- `free_fuel`

## O Que Ja Esta Bom Estruturalmente

O motor V2 de cupons e melhor do que a leitura inicial do motor legado sugeria.

Pontos fortes atuais:

1. `decideCouponUsage` em `ai-policy-engine-v2.js` ja consome formulas declarativas por cupom.
2. O runtime injeta idade do cupom, vencimento e contexto basico em `maybeSpendCoupon`.
3. Existem sinais derivados declarados para:
   - `freight_value_norm`
   - `mandatory_toll_pressure`
   - `fuel_route_pressure`
   - `remaining_steps_pressure`
   - `remaining_round_pressure`
   - `contract_failure_risk`
   - `asset_opportunity`
   - `coupon_age_pressure`

Ou seja: a arquitetura declarativa esta razoavelmente pronta. O gargalo principal nao e mais ausencia total de regra, e sim ausencia dos sinais corretos ligados aos dados certos.

## Onde A IA Ainda Esta Cega

### 1. Falta Sinal Economico De Densidade

Hoje a IA ve `freightValue`, mas nao ve explicitamente:

- a distancia direta `PP -> PD`
- a densidade economica do contrato
- a relacao entre valor economico e distancia real de travessia

Isso faz falta principalmente para:

- `cancel_contract`
- `extended_contract_deadline`
- `free_fuel_contract`
- `double_freight`

Sem esse sinal, a IA enxerga um contrato caro e um contrato eficiente como se fossem a mesma coisa, desde que o frete nominal seja parecido.

### 2. Falta Sinal Explicito De Travessia Total

Hoje a IA recebe `remainingSteps` e `fuelStopsRemaining`, mas nao recebe um sinal equivalente a:

- distancia total de travessia `PP -> PE -> PD`
- detour causado pelo pedagio
- relacao entre travessia total e distancia economica `PP -> PD`

Isso faz falta principalmente para:

- `shortcut_ignore_toll`
- `reroute_same_value`
- `free_fuel_contract`
- `extended_contract_deadline`
- `cancel_contract`

### 3. Cupons De Comissao Nao Usam O Valor Da Comissao Evitada

`anti_monopoly_owner_share` e `skip_owner_share` recebem `freightValue`, mas nao recebem explicitamente o valor da comissao bloqueada.

Isso e uma perda de precisao, porque o que interessa nesses cupons nao e apenas o frete bruto, e sim o caixa efetivamente poupado.

Hoje, dois contratos com o mesmo `freightValue` podem ter impacto diferente dependendo da regra de comissao e do contexto do dono.

### 4. Cupons De Alivio Imediato Nao Herdam Contexto Suficiente

`free_port_stay`, `free_toll` e `free_fuel` olham bem para `charge`, mas pouco para o contexto do contrato em andamento.

Isso pode gerar dois comportamentos ruins:

- gastar cedo demais em contrato fraco
- guardar demais quando o contrato corrente e caro e operacionalmente duro

## Releitura Cupom A Cupom

### `double_freight`

Estado atual:

- depende de `freightValue`
- usa `freight_value_norm`
- considera idade do cupom

Problema:

- ainda nao diferencia bem frete alto por distancia boa versus frete alto em contrato operacionalmente ruim

Releitura:

- manter `freightValue` como sinal principal
- adicionar banda economica baseada em `base_freight_value`
- nao precisa usar travessia como sinal central
- pode usar travessia apenas como desempate leve

Conclusao:

- e um cupom economicamente orientado
- deve ser recalibrado com os thresholds de valor economico desta analise

### `anti_monopoly_owner_share`

Estado atual:

- depende de `freightValue`
- depende de `owner_monopoly_flag`
- considera idade do cupom

Problema:

- falta o valor da comissao evitada
- falta distinguir contratos de baixo e alto retorno economico real

Releitura:

- passar `ownerShareValue` ou `commissionAvoided`
- usar `base_freight_value` por banda economica
- usar `owner_monopoly_flag` como gatilho, nao como unico peso

Conclusao:

- este cupom claramente pertence ao grupo economico
- deve ser condicionado ao valor real poupado, nao apenas ao monopolio existir

### `skip_owner_share`

Estado atual:

- depende de `freightValue`
- depende de `ownerPresent`
- considera idade do cupom

Problema:

- mesma limitacao do cupom anterior: falta valor da comissao efetiva evitada

Releitura:

- passar `commissionAvoided`
- usar banda economica do contrato
- opcionalmente considerar se o caixa atual esta apertado

Conclusao:

- este cupom tambem deve ser revisto com base em economia do contrato e nao so presenca de dono

### `free_fuel_contract`

Estado atual:

- depende de `fuelStopsRemaining`
- depende de `remainingSteps`
- depende de idade do cupom

Problema:

- ainda nao incorpora explicitamente banda economica do contrato
- ainda nao ve a travessia total como grandeza primaria

Releitura:

- usar travessia total como eixo principal
- usar banda economica do contrato como filtro de qualidade
- usar `fuelStopsRemaining` como reforco, nao como unico gatilho

Conclusao:

- continua sendo um dos cupons mais carentes de alinhamento com a nova analise

### `shortcut_ignore_toll`

Estado atual:

- depende de `mandatory_toll_pressure`
- depende de `routeUnlockGainNorm`
- considera idade do cupom

Problema:

- nao enxerga o tamanho do desvio imposto pelo pedagio
- nao enxerga a razao entre travessia total e distancia economica

Releitura:

- este cupom nao deve depender do valor do frete como sinal principal
- deve depender do ganho logistico real do atalho
- idealmente receber um sinal de `detour_pressure`

Conclusao:

- e logistico, nao economico
- precisa dos dados desta analise indiretamente, via travessia e desvio, nao via `freightValue`

### `reroute_same_value`

Estado atual:

- depende de `asset_opportunity`
- depende de `routeUnlockGainNorm`
- recebe `remainingSteps` e `fuelStopsRemaining` do melhor candidato

Problema:

- como o cupom preserva o frete, o ponto central nao e valor economico bruto
- falta um sinal mais explicito de melhora operacional sobre a rota atual

Releitura:

- priorizar reducao de travessia total
- priorizar reducao de combustivel e passos
- usar valor economico apenas como restricao minima de equivalencia, o que ja acontece pela propria regra do cupom

Conclusao:

- este cupom quase nao depende das bandas de frete
- depende muito das bandas de travessia

### `cancel_contract`

Estado atual:

- depende de `contract_failure_risk`
- depende de `remaining_steps_pressure`
- depende de idade do cupom

Problema:

- ainda falta distinguir contrato longo e ruim de contrato longo e muito lucrativo

Releitura:

- combinar risco logistico com densidade economica
- um contrato com travessia longa e baixa densidade deve puxar cancelamento
- um contrato com travessia longa mas alta densidade nao deve ser cancelado so por ser longo

Conclusao:

- este cupom e um dos principais beneficiarios da nova analise

### `extended_contract_deadline`

Estado atual:

- depende de `contract_failure_risk`
- depende de `remaining_round_pressure`
- depende de idade do cupom

Problema:

- ainda nao filtra suficientemente a qualidade economica do contrato que esta sendo salvo

Releitura:

- so vale salvar contrato de banda economica pelo menos media
- travessia longa aumenta prioridade
- densidade economica forte justifica alongar prazo em vez de cancelar

Conclusao:

- e outro grande candidato a absorver diretamente os thresholds desta analise

### `free_port_stay`, `free_toll`, `free_fuel`

Estado atual:

- reagem ao custo evitado imediato
- reagem ao contexto basico de dono, pedagio obrigatorio e idade

Problema:

- sao bons para alivio local, mas ainda pouco conectados ao contexto do contrato

Releitura:

- nao precisam da mesma profundidade dos cupons estruturais
- podem ganhar apenas um ajuste leve:
  - se o contrato atual estiver em banda economica alta e travessia alta, aceitar uso com um pouco mais de facilidade
  - se o contrato atual for fraco, tolerar segurar um pouco mais

Conclusao:

- sao secundarios nesta revisao
- nao parecem a principal origem dos vencimentos ruins observados

## Novo Mapa Mental Para A IA

Em vez de perguntar apenas “o cupom e bom neste instante?”, a IA deveria separar a decisao em tres eixos:

1. Qualidade economica do contrato
   - baseada em `PP -> PD`, `E`, `M` e `base_freight_value`
2. Atrito operacional da travessia
   - baseado em `PP -> PE -> PD`, passos restantes, combustivel e desvio do pedagio
3. Pressao temporal do cupom
   - baseada em idade e proximidade de expiracao

## Sinais Novos Recomendados

Para a proxima iteracao, os sinais novos mais valiosos seriam:

- `direct_freight_distance`
  - distancia economica `PP -> PD`
- `travel_route_distance`
  - travessia total `PP -> PE -> PD`
- `travel_distance_norm`
  - normalizacao da travessia total
- `freight_density_norm`
  - relacao entre `base_freight_value` e `direct_freight_distance`
- `detour_pressure`
  - diferenca ou razao entre travessia total e distancia direta
- `commission_avoided_norm`
  - comissao efetivamente bloqueada por cupom

## Prioridade De Revisao

Se a revisao for incremental, a ordem mais produtiva e:

1. `cancel_contract`
2. `extended_contract_deadline`
3. `free_fuel_contract`
4. `double_freight`
5. `anti_monopoly_owner_share`
6. `skip_owner_share`
7. `shortcut_ignore_toll`
8. `reroute_same_value`
9. `free_port_stay`, `free_toll`, `free_fuel`

## Tabela Objetiva Por Cupom

| Cupom | Sinais-alvo | Formula-alvo | Threshold inicial |
| --- | --- | --- | --- |
| `free_port_stay` | `charge`, `owner_present_flag`, `coupon_age_pressure`, contexto economico leve do contrato | alivio imediato com pequena modulacao por valor do contrato atual | `0.45` |
| `free_toll` | `charge`, `mandatory_toll_pressure`, `owner_present_flag`, `coupon_age_pressure` | alivio imediato de custo com prioridade maior em pedagio obrigatorio | `0.45` |
| `free_fuel` | `charge`, `coupon_age_pressure`, contexto economico leve do contrato | alivio imediato de combustivel com pequena modulacao por contrato atual | `0.45` |
| `free_fuel_contract` | `fuel_route_pressure`, `travel_distance_norm`, `contract_value_band_norm`, `freight_density_norm`, `remaining_steps_pressure`, `coupon_age_pressure` | cupom logistico-economico para contratos relevantes e travessias longas | `0.48` |
| `shortcut_ignore_toll` | `mandatory_toll_pressure`, `route_unlock_gain_norm`, `coupon_age_pressure`, no futuro `detour_pressure` | cupom logistico puro para reduzir travessia e desvio imposto pelo pedagio | `0.45` |
| `reroute_same_value` | `asset_opportunity`, `route_unlock_gain_norm`, `remainingSteps`, `fuelStopsRemaining`, no futuro `travel_distance_norm` comparativo | cupom logistico para trocar mesma economia por melhor rota | `0.45` |
| `cancel_contract` | `contract_failure_risk`, `travel_distance_norm`, `freight_weakness_norm`, `detour_pressure`, `coupon_age_pressure` | cancelar rota ruim e pouco eficiente, nao apenas rota longa | `0.50` |
| `extended_contract_deadline` | `contract_failure_risk`, `remaining_round_pressure`, `travel_distance_norm`, `contract_value_band_norm`, `freight_density_norm`, `coupon_age_pressure` | salvar contratos apertados que ainda merecem ser preservados | `0.52` |
| `double_freight` | `freightValue`, `freight_value_norm`, no futuro `contract_value_band_norm` | multiplicador de renda em contrato economicamente forte | `0.45` |
| `anti_monopoly_owner_share` | `owner_monopoly_flag`, `freightValue`, no futuro `commission_avoided_norm`, `contract_value_band_norm` | bloquear comissao monopolista quando o valor poupado justificar | `0.45` |
| `skip_owner_share` | `owner_present_flag`, `freightValue`, no futuro `commission_avoided_norm`, `contract_value_band_norm` | bloquear comissao simples quando o valor poupado justificar | `0.45` |

## Aplicacao Inicial Nos 3 Cupons Criticos

Os tres cupons abaixo ja foram remapeados conceitualmente para usar a nova leitura:

1. `free_fuel_contract`
  - deixou de depender quase so de combustivel e idade
  - agora passa a considerar travessia total, valor economico e densidade economica do contrato
2. `cancel_contract`
  - deixou de tratar todo contrato arriscado como candidato igual
  - agora separa rota ruim e pouco eficiente de rota ruim mas economicamente forte
3. `extended_contract_deadline`
  - deixou de premiar apenas o aperto de prazo
  - agora exige tambem sinal de que o contrato vale a pena ser salvo

## Sintese

Os dados desta analise nao servem apenas para os tres cupons originalmente suspeitos.

Eles tambem deveriam influenciar:

- todos os cupons que protegem, ampliam ou multiplicam frete
- todos os cupons que evitam comissao sobre frete
- todos os cupons que trocam economia por eficiencia logistica

Em especial, a IA ainda precisa separar melhor:

- frete alto por contrato bom
- frete alto por contrato apenas longo
- rota ruim mas valiosa
- rota ruim e pouco valiosa

Essa separacao e o passo mais importante para reduzir vencimento ruim de cupons e uso tatico incoerente.