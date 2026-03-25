# Rotas e Telas Locais

Este documento lista as principais paginas e ferramentas expostas pelo servidor web do projeto.

Base local padrao:

`http://127.0.0.1:8000`

Se o servidor estiver rodando em outra porta ou host, substitua a base nas URLs abaixo.

## Inicio

- Home principal: `http://127.0.0.1:8000/`
- Home alternativa: `http://127.0.0.1:8000/home`

## Ferramentas

- Ferramenta de coordenadas: `http://127.0.0.1:8000/tools/map`
- Editor do mapa: `http://127.0.0.1:8000/tools/map-editor`

## Jogo

- Preview do jogo base: `http://127.0.0.1:8000/preview/game-ui`
- Preview do jogo AI: `http://127.0.0.1:8000/preview/game-ai-ui`
- Preview do jogo AI V2: `http://127.0.0.1:8000/preview/game-ai-ui-v2`
- Preview do jogo AI V3: `http://127.0.0.1:8000/preview/game-ai-ui-v3`

## Game AI V3 - modos uteis

- Layout editor: `http://127.0.0.1:8000/preview/game-ai-ui-v3?layout`
- Tutorial em modo edicao: `http://127.0.0.1:8000/preview/game-ai-ui-v3?tutorial=editing`
- Tutorial em modo runtime: `http://127.0.0.1:8000/preview/game-ai-ui-v3?tutorial=runtime`

## Robos

- Preview dos robos: `http://127.0.0.1:8000/preview/robots-ui`
- Preview dos robos AI: `http://127.0.0.1:8000/preview/robots-ai-ui`
- Preview dos robos AI V2: `http://127.0.0.1:8000/preview/robots-ai-ui-v2`

## IA e analise

- Analise da IA: `http://127.0.0.1:8000/preview/ai-analysis-ui`
- Laboratorio de formulas da IA: `http://127.0.0.1:8000/preview/ai-formula-lab`

## Cartas e componentes

- Titulos de porto: `http://127.0.0.1:8000/preview/port-titles`
- Cartas de sorte e reves: `http://127.0.0.1:8000/preview/chance-cards`
- Sorteio de carta de sorte e reves: `http://127.0.0.1:8000/preview/chance-card-draw`
- Permissoes de frete: `http://127.0.0.1:8000/preview/freight-permissions`
- Sorteio de permissao de frete: `http://127.0.0.1:8000/preview/freight-permission-draw`

## Sorteios de porto e movimento

- Sorteio do porto de saida: `http://127.0.0.1:8000/preview/origin-port-draw`
- Sorteio do porto de destino: `http://127.0.0.1:8000/preview/destination-port-draw`
- Sorteio de pedagio: `http://127.0.0.1:8000/preview/toll-draw`
- Dados de movimento: `http://127.0.0.1:8000/preview/movement-dice`

## Rotas de apoio e diagnostico

- Healthcheck: `http://127.0.0.1:8000/api/health`
- Layout persistente do game AI V3: `http://127.0.0.1:8000/api/layouts/game-ai-ui-v3`
- Tutorial persistente do game AI V3: `http://127.0.0.1:8000/api/tutorials/game-ai-ui-v3`

## Observacoes

- As paginas em `/preview/...` sao telas de demonstracao, teste ou iteracao de UI.
- O `game-ai-ui-v3` e hoje a tela mais completa para os fluxos recentes de layout, tutorial e save/load.
- O `?layout` no `game-ai-ui-v3` habilita o painel de ajuste fino das janelas.
- Algumas rotas em `/api/...` retornam JSON, nao HTML.

## Fonte das rotas

As rotas acima foram mapeadas a partir do servidor em `app/ui/server.py`.
