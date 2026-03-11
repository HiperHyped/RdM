# RESUMO

Resumo executivo do projeto `RdM` (`Rei dos Mares`).

Fontes principais:

- [README.md](README.md)
- [docs/DEVELOPER_DOCUMENTATION.md](docs/DEVELOPER_DOCUMENTATION.md)
- [manual/MANUAL - REI DOS MARES.docx](manual/MANUAL%20-%20REI%20DOS%20MARES.docx)

## 1. Visao geral do projeto

`RdM` e uma recriacao browser do jogo de tabuleiro `Rei dos Mares`.

Premissas da base:

- usar o manual oficial como fonte principal de regra;
- usar os JSONs em `data/` como base canonica;
- reescrever a interface do zero;
- reproduzir o tabuleiro real em mapa digital;
- manter a experiencia principal em uma tela jogavel;
- suportar `1` jogador humano + `2` a `5` jogadores do sistema.

### Objetivo do jogo

Conquistar a maior fortuna da partida por meio de:

- contratos de frete;
- compra de portos e pedagios;
- recebimento de estadias, comissoes e premios;
- gestao de rota, prazo e risco.

### Stack tecnica

- Backend: `Python 3.12+`, `FastAPI`, `Uvicorn`
- Templates: `Jinja2`
- Frontend: HTML, CSS e JavaScript proprios
- Mapa: `Plotly Geo`
- Testes: `pytest`

### Arquitetura pratica atual

O projeto hoje esta dividido em 4 camadas:

1. `Dados canonicos`
2. `Motor Python`
3. `Mapa e grafo`
4. `Preview jogavel em JavaScript`

A regra de runtime ainda esta dividida entre:

- [app/engine/game_engine.py](app/engine/game_engine.py)
- [app/static/js/game-preview.js](app/static/js/game-preview.js)

### Estado atual

O projeto ja possui:

- servidor FastAPI funcional;
- mapa oficial modelado como grafo;
- ferramenta de captura/calibracao do mapa;
- editor manual do mapa;
- previews dos acessorios;
- preview jogavel da partida;
- primeiro turno completo;
- turnos seguintes basicos;
- economia central parcial;
- compra e pagamento de portos/pedagios;
- contratos com prazo, bonus e multa;
- log, gavetas, modais e overlays principais da UI.

### Numeros atuais

- `36` propriedades
- `30` portos
- `6` pedagios
- `35` cartas de sorte/reves
- `6` tipos de carga/navio
- `7` regioes
- `203` nos no tabuleiro digital
- `212` arestas no grafo do mapa

### Fluxo jogavel atual

1. sortear permissao de frete;
2. sortear porto de partida;
3. opcionalmente comprar o porto;
4. sortear pedagio obrigatorio;
5. sortear porto de destino;
6. calcular contrato;
7. posicionar o navio;
8. rolar os dados;
9. mover no menor caminho;
10. resolver as paradas;
11. concluir o contrato e abrir o ciclo seguinte.

Conceito atual de rota:

- `PP -> PE -> PD`

Depois de cumprir o `PE`, a rota segue apenas da posicao atual ate o `PD`.

## 2. Nomenclatura principal

### Pastas principais

- `app/domain`: modelos centrais do jogo
- `app/engine`: regras e calculos em Python
- `app/services`: carga de dados e bootstrap da UI
- `app/ai`: heuristicas simples dos jogadores do sistema
- `app/maptools`: captura, calibracao, grafo e repositorio do mapa
- `app/ui`: servidor FastAPI, rotas e templates
- `app/static`: CSS, JS, assets e artefatos gerados
- `data`: JSONs canonicos

### Objetos de dominio principais

- `ShipType`: tipos de carga/navio
- `PropertyKind`: tipo de propriedade (`port` ou `toll`)
- `ContractStatus`: estado do contrato
- `Rate`: `fee` e `multiplier`
- `PropertyCard`: titulo de porto ou pedagio
- `ChanceCard`: carta de sorte/reves
- `ShipPermission`: permissao de frete
- `Ship`: navio do jogador
- `Contract`: contrato/frete ativo
- `Player`: companhia/jogador
- `StopQuote`: quote de parada em propriedade
- `BoardNode`: no do tabuleiro
- `BoardEdge`: ligacao entre nos
- `GameRules`: regras globais
- `GameData`: dados carregados dos JSONs
- `GameState`: estado vivo da partida

### Objetos tecnicos principais

- `ReiDosMaresEngine`: motor Python principal
- `BoardGraph`: grafo de navegacao e menor caminho
- `BoardWorkspaceRepository`: leitura e escrita do mapa oficial
- `CalibrationConfig`: calibracao do mapa base
- `MapWorkspaceSnapshot`: snapshot completo do mapa

### Nomenclatura oficial da UI

- `Painel Geral`: balao superior esquerdo com turno e botoes
- `Mapa`: mapa-mundi central com portos, pedagios, rotas, halos e navios
- `Log`: balao expansivel de acoes do turno
- `Barra de Jogadores`: faixa inferior com humano e CPUs
- `Balao do Jogador`: card fechado de cada jogador
- `Gaveta do Jogador`: area expandida acima do balao
- `Mao de Permissoes`: miniaturas de permissoes dentro da gaveta
- `Mao de Titulos`: miniaturas de portos e pedagios dentro da gaveta
- `Mao de Cupons`: miniaturas de cupons/cartas guardadas
- `Janela Central`: modal central de setup, sorteio, dados, carta ou decisao
- `Carta de Titulo Expandida`: carta aberta ao clicar no mapa

### Nomes tecnicos atuais da UI

- `#game-preview-map`: mapa principal
- `#game-action-log`: log de acoes
- `#preview-rival-list`: barra/lista de jogadores
- `#property-inspector-overlay`: carta expandida de propriedade
- `#game-setup-overlay`: setup inicial
- `#permission-draw-overlay`: sorteio de permissao
- `#port-draw-overlay`: sorteio de porto/pedagio
- `#movement-dice-overlay`: rolagem de dados
- `#chance-draw-overlay`: sorte/reves
- `#decision-overlay`: decisao/confirmacao

### Componentes JS principais

- `state`: estado global da preview
- `renderHud()`: atualiza HUD/paineis
- `renderRivals()`: renderiza barra e gavetas dos jogadores
- `renderActionFeed()`: renderiza o log
- `renderPropertyInspector()`: renderiza a carta expandida
- `applyMapPayload()`: aplica bootstrap do mapa
- `applyBootstrapPayload()`: aplica bootstrap geral da partida
- `runContractOpeningForPlayer()`: abertura do contrato
- `runTurnExecutionForPlayer()`: execucao do turno
- `runPostContractForPlayer()`: pos-contrato
- `resolveChanceStopForPlayer()`: parada em sorte/reves
- `resolvePortStopForPlayer()`: parada em porto
- `resolveTollStopForPlayer()`: parada em pedagio

### Observacao de nomenclatura

Existe uma diferenca entre o manual e o prototipo atual nas cores dos jogadores:

- manual fisico: `amarelo`, `vermelho`, `verde`, `preto`, `cinza`, `branco`
- prototipo atual: `blue`, `yellow`, `green`, `red`, `orange`, `purple`

## 3. Afazeres

### Feitos principais

Ja foram concluidos:

- leitura do manual oficial e consolidacao das regras-base;
- reorganizacao completa da base em Python/browser;
- consolidacao dos JSONs como base canonica;
- criacao dos modelos e carregadores de dados;
- construcao da ferramenta de captura/calibracao do mapa;
- construcao do editor manual do mapa;
- fechamento do mapa oficial com portos, pedagios, abastecimentos, sorte/reves e rotas;
- criacao do grafo navegavel do tabuleiro;
- implementacao do mapa do jogo com arrasto horizontal;
- criacao da preview inicial da UI;
- ligacao do setup inicial ao backend;
- preview das cartas de titulo de porto e pedagio;
- preview das cartas de sorte/reves;
- preview das cartas de permissao de frete;
- previews dos sorteios de permissao, portos, pedagios e dados;
- integracao dos assets finais de carga e navios;
- implementacao do primeiro turno completo;
- implementacao dos turnos seguintes basicos;
- implementacao da logica de compra e pagamento em portos/pedagios;
- implementacao de contratos com prazo, bonus e multa;
- implementacao parcial da economia central;
- correcao da persistencia da rota `PP -> PE -> PD`;
- refinamento da UI com log, barra de jogadores, gavetas, miniaturas, modais e clique no mapa.

### Pendencias oficiais

1. implementar comissoes completas, monopolio, hipoteca e demais regras economicas avancadas;
2. refinar a negociacao entre jogadores para compra de porto/pedagio;
3. implementar escolha de rota pelo jogador humano nas bifurcacoes;
4. melhorar a IA para compra, rota e negociacao;
5. integrar totalmente cupons e cartas de sorte/reves ao fluxo real da partida;
6. implementar o resolvedor oficial completo de sorte/reves no motor e convergir Python/JS;
7. implementar `save/load` de partida;
8. polir a UI final, telas de inicio/fim e revisao geral de regras;
9. refatorar a preview jogavel para reduzir o monolito de JS/CSS.

### Principais riscos tecnicos atuais

- `app/static/js/game-preview.js` concentra estado, regras, render, fluxo de modais, IA simples e log;
- `app/static/css/app.css` cresceu de forma incremental, com risco de override em cadeia;
- a logica ainda esta dividida entre Python e JavaScript;
- isso aumenta o custo de manutencao e evolucao.

### Ordem recomendada para a proxima fase

1. consolidar regras economicas faltantes;
2. consolidar o comportamento completo de sorte/reves;
3. implementar escolha de rota nas bifurcacoes;
4. melhorar a IA;
5. definir a convergencia entre `game-preview.js` e `game_engine.py`;
6. implementar save/load;
7. fazer o polimento final.
