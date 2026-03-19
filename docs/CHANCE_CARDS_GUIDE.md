# Guia de Cartas de Sorte e Reves

Este guia resume como criar novas cartas de sorte e reves no projeto hoje.

## Onde as cartas vivem

- Fonte canonica: `data/cards.json`
- Loader tipado: `app/services/data_loader.py`
- Modelo: `app/domain/models.py` (`ChanceCard`)
- Factory para UI: `app/services/card_factory.py`
- Resolucao real no jogo: `app/static/js/game-preview.js` e `app/static/js/game-ai-ui.js`
- Testes principais: `tests/test_chance_cards.py`, `tests/test_game_factory.py`, `tests/test_chance_engine.py`

## Estrutura de uma carta

Cada item em `data/cards.json` segue este formato:

```json
{
  "id": "baleias",
  "title": "Baleias",
  "description": "Voce podera estocar oleo e comida!",
  "effect_text": "Ganhe $40",
  "effect": {
    "type": "gain_money",
    "amount": 40
  },
  "order": 1,
  "category": "sorte",
  "accent": "#18C43A",
  "text": "#FFFFFF"
}
```

Campos:

- `id`: identificador unico e estavel.
- `title`: titulo da carta.
- `description`: descricao longa.
- `effect_text`: resumo curto exibido na carta.
- `effect`: payload operacional da carta.
- `order`: ordem fixa do baralho.
- `category`: `sorte` ou `reves`.
- `accent`: cor de fundo da carta.
- `text`: cor do texto da carta.

## Efeitos suportados hoje

Se a nova carta usar um destes tipos, normalmente basta editar `data/cards.json` e ajustar testes.

| effect.type | Parametros | Comportamento |
| --- | --- | --- |
| `gain_money` | `amount` | Credita dinheiro ao jogador. |
| `pay_money` | `amount` | Cobra dinheiro do jogador para o banco. |
| `gain_from_each` | `amount` | Recebe este valor de cada adversario. |
| `pay_each` | `amount` | Paga este valor a cada adversario. |
| `receive_half_current_freight` | nenhum | Reduz o frete atual para metade. |
| `skip_turns` | `turns` | Faz o jogador perder rodadas futuras. |
| `coupon` | `coupon` | Gera uma carta guardada ate uso ou expiracao automatica. |
| `double_dice_once` | nenhum | Repete o valor da ultima rolagem valida. |
| `move_steps` | `steps` | Move casas na rota atual. Pode ser positivo ou negativo. |
| `move_to_toll` | nenhum | Leva o navio ao pedagio da rota atual. |
| `move_ports` | `offset` | Move para frente ou para tras entre portos da rota. |
| `move_to_origin_port` | nenhum | Volta ao porto de origem do contrato atual. |

## Cupons validos hoje

Se a carta usa `effect.type = coupon`, o campo `coupon` precisa ser um destes valores:

Cupons guardados na mao expiram apos `100` rodadas globais. Quando vencem, saem da mao e o `source_card_id` volta ao baralho pelo descarte, podendo reaparecer em sorteios futuros.

- `shortcut_ignore_toll`
- `free_toll`
- `free_fuel`
- `double_freight`
- `free_port_stay`
- `skip_owner_share`
- `reroute_same_value`
- `cancel_contract`
- `anti_monopoly_owner_share`
- `free_fuel_contract`
- `extended_contract_deadline`

Esses valores vivem no enum `CouponKind` em `app/domain/models.py`.

## Templates prontos

### Carta simples de ganho

```json
{
  "id": "tesouro_perdido",
  "title": "Tesouro Perdido",
  "description": "Sua tripulacao encontrou um bau submerso.",
  "effect_text": "Ganhe $75",
  "effect": {
    "type": "gain_money",
    "amount": 75
  },
  "order": 36,
  "category": "sorte",
  "accent": "#18C43A",
  "text": "#FFFFFF"
}
```

### Carta de penalidade simples

```json
{
  "id": "multa_ambiental",
  "title": "Multa Ambiental",
  "description": "Sua companhia foi autuada por descarte irregular.",
  "effect_text": "Pague $90",
  "effect": {
    "type": "pay_money",
    "amount": 90
  },
  "order": 37,
  "category": "reves",
  "accent": "#F01B12",
  "text": "#FFFFFF"
}
```

### Carta de cupom

```json
{
  "id": "porto_franco",
  "title": "Porto Franco",
  "description": "Voce nao paga a proxima estadia em porto.",
  "effect_text": "Guarde ate o uso",
  "effect": {
    "type": "coupon",
    "coupon": "free_port_stay"
  },
  "order": 38,
  "category": "sorte",
  "accent": "#18C43A",
  "text": "#FFFFFF"
}
```

### Carta de movimento

```json
{
  "id": "corrente_forte",
  "title": "Corrente Forte",
  "description": "A corrente maritima empurra sua embarcacao pela rota.",
  "effect_text": "Avance 4 casas",
  "effect": {
    "type": "move_steps",
    "steps": 4
  },
  "order": 39,
  "category": "sorte",
  "accent": "#18C43A",
  "text": "#FFFFFF"
}
```

## Processo recomendado para adicionar uma carta

### Caso 1: carta nova usando efeito ja existente

1. Adicione a nova entrada em `data/cards.json`.
2. Garanta `id` unico.
3. Defina `order` sem colidir com outro item.
4. Escolha `category`, `accent` e `text` coerentes.
5. Se for cupom, use um valor ja existente em `CouponKind`.
6. Ajuste testes que assumem contagem fixa do baralho.
7. Valide os previews de cartas e sorteio.

### Caso 2: carta nova com efeito novo

Se o `effect.type` nao existir ainda, alem do JSON voce precisa implementar codigo.

Passos:

1. Adicionar a carta em `data/cards.json`.
2. Implementar o novo `case` em `app/static/js/game-preview.js`.
3. Repetir o mesmo `case` em `app/static/js/game-ai-ui.js`.
4. Se criar um novo cupom, adicionar o valor ao enum `CouponKind` em `app/domain/models.py`.
5. Ajustar testes de comportamento e de deck.

Observacao importante:

- Hoje a resolucao efetiva de sorte e reves esta concentrada no frontend JS.
- O motor Python ja cobre baralho e cupons, mas ainda nao concentra toda a resolucao oficial dos efeitos.

## Checklist de validacao

Depois de alterar cartas:

1. Rode `pytest tests/test_chance_cards.py tests/test_game_factory.py tests/test_chance_engine.py`.
2. Abra os previews:
   - `http://127.0.0.1:8000/preview/chance-cards`
   - `http://127.0.0.1:8000/preview/chance-card-draw`
3. Teste no jogo real em `game` e `game-ai` se a carta mexer no fluxo de rodada.

## Arquivos que normalmente mudam

- Apenas nova carta com efeito existente:
  - `data/cards.json`
  - `tests/test_chance_cards.py`
  - `tests/test_game_factory.py`

- Nova carta com efeito novo:
  - `data/cards.json`
  - `app/static/js/game-preview.js`
  - `app/static/js/game-ai-ui.js`
  - `app/domain/models.py` se houver novo cupom
  - testes relevantes