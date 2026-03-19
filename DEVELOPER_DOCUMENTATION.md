# Documentacao Tecnica Completa - Rei dos Mares

## 1. Objetivo deste documento

Este documento e a referencia tecnica principal do projeto `Rei dos Mares` no estado atual do workspace.

Ele foi escrito para:

- onboarding de novos desenvolvedores;
- manutencao do prototipo jogavel atual;
- entendimento da divisao entre dados, motor, mapa e interface;
- registro das decisoes tecnicas ja tomadas;
- registro do que ja foi implementado e do que ainda falta.

Este documento deve ser lido junto com:

- [README.md](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/README.md)
- [MANUAL - REI DOS MARES.docx](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/manual/MANUAL%20-%20REI%20DOS%20MARES.docx)

## 2. Visao geral do produto

`Rei dos Mares` e uma adaptacao browser, em Python, do jogo de tabuleiro homonimo.

O projeto foi reconstruido com as seguintes premissas:

- preservar o manual oficial como fonte de regra;
- preservar os JSONs como base canonica de dados;
- abandonar a UI antiga e reconstruir a experiencia;
- reproduzir o tabuleiro real com `Plotly Geo`;
- usar uma ferramenta propria para capturar e corrigir a geometria do mapa;
- manter a maior parte da experiencia em uma unica tela;
- permitir `1` jogador humano + `2` a `5` jogadores do sistema.

## 3. Estado atual do projeto

No estado atual, o projeto tem:

- uma base Python organizada;
- um servidor FastAPI funcional;
- um mapa oficial do jogo em forma de grafo;
- ferramentas de calibracao e edicao do mapa;
- previews dos acessorios do jogo;
- uma preview jogavel da partida;
- primeiro turno completo;
- turnos seguintes basicos;
- resolucao de paradas essenciais;
- sorteio de permissao, porto, pedagio, destino e dados;
- economia basica e contratos funcionando na preview.

Importante:

- o comportamento jogavel mais avancado hoje vive principalmente em [app/static/js/game-preview.js](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/static/js/game-preview.js);
- o motor Python em [app/engine/game_engine.py](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/engine/game_engine.py) existe e cobre regras importantes, mas ainda nao e a unica autoridade de runtime.

## 4. Stack tecnica

### 4.1 Backend

- Python `3.12+`
- FastAPI
- Uvicorn
- Jinja2

Arquivo principal de configuracao:

- [pyproject.toml](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/pyproject.toml)

### 4.2 Frontend

- HTML via Jinja2
- CSS proprio em [app/static/css/app.css](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/static/css/app.css)
- JavaScript principal da preview em [app/static/js/game-preview.js](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/static/js/game-preview.js)
- Plotly Geo para o mapa

### 4.3 Dados

- JSONs canonicos em [data](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/data)

### 4.4 Testes

- pytest

## 5. Estrutura do repositorio

### 5.1 Arquivos de entrada e configuracao

- [run.py](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/run.py)
  - ponto de entrada local do servidor;
  - executa `uvicorn` com `reload=True`.

- [pyproject.toml](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/pyproject.toml)
  - metadados do projeto;
  - dependencias;
  - configuracao do pytest.

- [README.md](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/README.md)
  - resumo curto do projeto;
  - comandos basicos.

### 5.2 Pacote `app`

- [app/config.py](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/config.py)
  - centraliza paths principais do projeto.

- [app/domain](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/domain)
  - modelos centrais do jogo.

- [app/engine](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/engine)
  - motor Python de regras.

- [app/services](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/services)
  - carga de dados, fabricas de preview e bootstrap de sessao.

- [app/maptools](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/maptools)
  - calibracao, repositorio local do mapa e grafo de navegacao.

- [app/ai](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/ai)
  - heuristicas simples dos jogadores do sistema.

- [app/ui](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/ui)
  - criacao do app FastAPI, rotas HTML e API.

- [app/static](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/static)
  - CSS, JS, assets e gerados.

### 5.3 Dados canonicos

Em [data](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/data):

- [ports.json](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/data/ports.json)
- [distances.json](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/data/distances.json)
- [cards.json](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/data/cards.json)
- [docs/CHANCE_CARDS_GUIDE.md](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/docs/CHANCE_CARDS_GUIDE.md)
- [continents.json](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/data/continents.json)
- [rules_v2.json](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/data/rules_v2.json)
- [ship_types.json](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/data/ship_types.json)
- [player_colors.json](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/data/player_colors.json)
- [board_nodes.json](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/data/board_nodes.json)
- [board_edges.json](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/data/board_edges.json)
- [map_calibration.json](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/data/map_calibration.json)
- [port_coordinates.json](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/data/port_coordinates.json)
- [region_distances.json](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/data/region_distances.json)

### 5.4 Assets

- [assets/cargo](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/assets/cargo)
  - simbolos finais de carga;
  - [cargo_assets_manifest.json](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/assets/cargo/cargo_assets_manifest.json)

- [assets/ships/colored](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/assets/ships/colored)
  - sprites dos navios por tipo e por cor;
  - [ship_sprite_manifest.json](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/assets/ships/colored/ship_sprite_manifest.json)

- [assets/ships/recolorable](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/assets/ships/recolorable)
  - masks e variantes intermediarias.

Os assets usados na UI normalmente sao espelhados em:

- [app/static/assets](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/static/assets)

### 5.5 Scripts

- [scripts/build_board_geometry.py](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/scripts/build_board_geometry.py)
  - montagem/geracao da geometria do tabuleiro.

- [scripts/prepare_accessory_assets.py](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/scripts/prepare_accessory_assets.py)
  - preparacao de assets de acessorios.

### 5.6 Testes

Em [tests](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/tests):

- [conftest.py](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/tests/conftest.py)
- [test_accessory_assets.py](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/tests/test_accessory_assets.py)
- [test_board_geometry.py](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/tests/test_board_geometry.py)
- [test_board_graph.py](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/tests/test_board_graph.py)
- [test_chance_cards.py](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/tests/test_chance_cards.py)
- [test_data_loader.py](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/tests/test_data_loader.py)
- [test_engine_rules.py](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/tests/test_engine_rules.py)
- [test_game_factory.py](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/tests/test_game_factory.py)
- [test_permission_cards.py](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/tests/test_permission_cards.py)
- [test_port_title_cards.py](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/tests/test_port_title_cards.py)

## 6. Arquitetura funcional

### 6.1 Camadas atuais

O projeto hoje esta dividido em quatro camadas praticas:

1. `Dados`
2. `Motor Python`
3. `Mapa e grafo`
4. `Preview jogavel em JavaScript`

### 6.2 Verdade atual do runtime

Hoje existem duas camadas de regra:

1. a camada Python em [app/engine/game_engine.py](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/engine/game_engine.py)
2. a camada JS em [app/static/js/game-preview.js](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/static/js/game-preview.js)

Isso e uma decisao historica do prototipo atual e tambem uma divida tecnica importante:

- o motor Python cobre varias regras corretamente;
- a preview jogavel implementa muitas regras diretamente no cliente para acelerar o desenvolvimento da UX;
- no longo prazo, o ideal e convergir para uma autoridade unica de regra.

## 7. Componentes centrais e o que fazem

### 7.1 Dominio

Arquivo principal:

- [app/domain/models.py](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/domain/models.py)

Responsabilidade:

- definir os tipos e entidades do jogo.

Componentes importantes:

- `ShipType`
- `PropertyKind`
- `ContractStatus`
- `Rate`
- `PropertyCard`
- `ChanceCard`
- `ShipPermission`
- `Ship`
- `Contract`
- `Player`
- `StopQuote`
- `BoardNode`
- `BoardEdge`
- `GameRules`
- `GameData`
- `GameState`

### 7.2 Motor Python

Arquivo principal:

- [app/engine/game_engine.py](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/engine/game_engine.py)

Responsabilidade:

- regras de negocio em Python;
- validacoes centrais;
- compra de propriedade;
- criacao e liquidacao de contratos;
- calculos de timing;
- quote de parada em propriedade;
- deteccao de monopolio regional.

Pontos fortes atuais:

- regra de banco quando a propriedade nao tem dono;
- regra de multiplicador quando a propriedade tem dono;
- rejeicao de destino na mesma regiao;
- calculos centrais de contrato.

### 7.3 Carregamento de dados

Arquivos:

- [app/services/data_loader.py](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/services/data_loader.py)
- [app/services/card_factory.py](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/services/card_factory.py)
- [app/services/game_factory.py](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/services/game_factory.py)

Responsabilidade:

- carregar regras e dados;
- normalizar cores e continentes;
- fabricar previews de cartas;
- montar o bootstrap da UI;
- publicar mapas de assets para navios e cargas.

### 7.4 Grafo do tabuleiro

Arquivo principal:

- [app/maptools/graph.py](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/maptools/graph.py)

Responsabilidade:

- leitura do grafo do tabuleiro;
- vizinhanca;
- caminho minimo;
- lookups por porto e pedagio.

### 7.5 Camada web

Arquivo principal:

- [app/ui/server.py](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/ui/server.py)

Responsabilidade:

- criar o `FastAPI app`;
- servir `templates`;
- servir `static files`;
- expor previews e ferramentas;
- expor APIs de bootstrap e edicao do mapa.

## 8. Rotas principais do projeto

### 8.1 Tela principal

- [http://127.0.0.1:8000/preview/game-ui](http://127.0.0.1:8000/preview/game-ui)

### 8.2 Ferramentas do mapa

- [http://127.0.0.1:8000/tools/map](http://127.0.0.1:8000/tools/map)
- [http://127.0.0.1:8000/tools/map-editor](http://127.0.0.1:8000/tools/map-editor)

### 8.3 Previews de acessorios

- [http://127.0.0.1:8000/preview/port-titles](http://127.0.0.1:8000/preview/port-titles)
- [http://127.0.0.1:8000/preview/chance-cards](http://127.0.0.1:8000/preview/chance-cards)
- [http://127.0.0.1:8000/preview/chance-card-draw](http://127.0.0.1:8000/preview/chance-card-draw)
- [http://127.0.0.1:8000/preview/freight-permissions](http://127.0.0.1:8000/preview/freight-permissions)
- [http://127.0.0.1:8000/preview/freight-permission-draw](http://127.0.0.1:8000/preview/freight-permission-draw)
- [http://127.0.0.1:8000/preview/origin-port-draw](http://127.0.0.1:8000/preview/origin-port-draw)
- [http://127.0.0.1:8000/preview/destination-port-draw](http://127.0.0.1:8000/preview/destination-port-draw)
- [http://127.0.0.1:8000/preview/toll-draw](http://127.0.0.1:8000/preview/toll-draw)
- [http://127.0.0.1:8000/preview/movement-dice](http://127.0.0.1:8000/preview/movement-dice)

### 8.4 APIs

APIs mais importantes em [app/ui/server.py](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/ui/server.py):

- `GET /api/bootstrap`
- `POST /api/game/setup`
- `GET /api/map/bootstrap`
- `GET /api/map/editor/bootstrap`
- endpoints de CRUD do editor do mapa

## 9. Modelo do mapa oficial

### 9.1 Fonte de verdade

O mapa oficial usado pelo jogo e um grafo salvo em:

- [board_nodes.json](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/data/board_nodes.json)
- [board_edges.json](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/data/board_edges.json)

### 9.2 Significado

`board_nodes.json` define:

- portos
- pedagios
- abastecimentos
- sorte/reves
- pontos de rota

`board_edges.json` define:

- as ligacoes entre esses pontos

### 9.3 Ferramentas de manutencao

- [map_tool.html](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/ui/templates/map_tool.html)
- [map-tool.js](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/static/js/map-tool.js)
- [map_editor.html](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/ui/templates/map_editor.html)
- [map-editor.js](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/static/js/map-editor.js)

## 10. UI: nomenclatura oficial dos componentes

Para alinhamento entre desenvolvedores e usuario, os componentes da UI devem ser referidos por estes nomes:

- `Painel Geral`
  - balao do canto superior esquerdo com `Turno XX` e botoes.

- `Mapa`
  - mapa-mundi central com portos, pedagios, rotas, halos e navios.

- `Log`
  - balao expansivel de acoes no canto superior direito.

- `Barra de Jogadores`
  - faixa inferior com usuario e jogadores do sistema.

- `Balao do Jogador`
  - card fechado de cada jogador na barra inferior.

- `Gaveta do Jogador`
  - area que abre acima do balao do jogador.

- `Mao de Permissoes`
  - faixa de miniaturas das permissoes dentro da gaveta.

- `Mao de Titulos`
  - faixa de miniaturas de portos/pedagios dentro da gaveta.

- `Mao de Cupons`
  - faixa de cupons de sorte/reves dentro da gaveta.

- `Janela Central`
  - qualquer modal central de sorteio, dados, carta etc.

- `Carta de Titulo Expandida`
  - carta de porto/pedagio em tamanho natural aberta ao clicar no mapa.

## 11. Fluxo jogavel atual

### 11.1 Setup inicial

Hoje a tela principal:

- pede nome da companhia;
- pede cor do usuario;
- pede numero de adversarios.

Arquivos:

- [game_preview.html](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/ui/templates/game_preview.html)
- [game-preview.js](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/static/js/game-preview.js)

### 11.2 Primeiro turno

Ja implementado:

1. sortear permissao;
2. sortear porto de partida;
3. perguntar compra do porto de partida;
4. sortear pedagio obrigatorio;
5. sortear porto de destino;
6. calcular contrato;
7. posicionar navio no `PP`;
8. rolar dados;
9. mover no menor caminho.

Isso vale:

- para o usuario com modais;
- para os jogadores do sistema automaticamente.

### 11.3 Turnos seguintes

Ja implementado:

- se ha contrato em andamento, vai direto para os dados;
- se o contrato foi concluido, entra no pos-contrato e abre novo contrato;
- os turnos avancam entre usuario e jogadores do sistema;
- `skip_turns` e estados afins ja estao parcialmente considerados.

### 11.4 Persistencia da rota

Problema antigo resolvido:

- o jogo antes podia voltar ao pedagio depois de ja te-lo cumprido;
- isso foi corrigido persistindo no contrato a nocao de que o `PE` ja foi cumprido.

Conceito atual:

- `PP -> PE -> PD`
- depois que o `PE` e cumprido, a rota passa a ser so `posicao atual -> PD`

## 12. Resolucao de paradas

Na preview atual, ja existem resolucoes para:

- abastecimento;
- sorte/reves;
- porto nao-destino;
- pedagio;
- porto de destino;
- compra do porto atual depois da entrega;
- compra de nova permissao.

## 13. Acessorios do jogo ja implementados

Ja existem previews para:

- titulos de porto;
- titulos de pedagio;
- cartas de sorte/reves;
- cartas de permissao;
- sorteio de permissao;
- sorteio de porto de saida;
- sorteio de porto de destino;
- sorteio de pedagio;
- dados de movimento;
- assets de navios;
- assets de carga.

## 14. Onde esta cada comportamento importante

### 14.1 Runtime principal da preview

- [game-preview.js](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/static/js/game-preview.js)

Contem:

- bootstrap da sessao;
- orquestracao do primeiro turno;
- orquestracao dos turnos seguintes;
- abertura de contrato;
- execucao de turno;
- pos-contrato;
- sorte/reves;
- resolucao de paradas;
- render da UI;
- render do mapa;
- log;
- drawers dos jogadores;
- pausar/despausar.

### 14.2 Estilo global

- [app.css](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/static/css/app.css)

Contem:

- layout geral;
- modais;
- barra de jogadores;
- gavetas;
- cartas miniatura;
- log;
- mapa;
- overlays.

### 14.3 Template principal

- [game_preview.html](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/ui/templates/game_preview.html)

Contem:

- markup da tela jogavel;
- estrutura dos modais;
- pontos de montagem do JS.

## 15. Padrao de validacao e teste

### 15.1 Subir o servidor

No diretorio raiz:

```powershell
python run.py
```

### 15.2 Rodar testes automatizados

```powershell
python -m pytest -q
```

### 15.3 Validar JavaScript principal

```powershell
node --check app\static\js\game-preview.js
```

### 15.4 Links de validacao mais usados

- Jogo principal:
  - [http://127.0.0.1:8000/preview/game-ui](http://127.0.0.1:8000/preview/game-ui)

- Editor do mapa:
  - [http://127.0.0.1:8000/tools/map-editor](http://127.0.0.1:8000/tools/map-editor)

- Ferramenta de captura:
  - [http://127.0.0.1:8000/tools/map](http://127.0.0.1:8000/tools/map)

- Titulos de porto/pedagio:
  - [http://127.0.0.1:8000/preview/port-titles](http://127.0.0.1:8000/preview/port-titles)

- Sorte / Reves:
  - [http://127.0.0.1:8000/preview/chance-cards](http://127.0.0.1:8000/preview/chance-cards)
  - [http://127.0.0.1:8000/preview/chance-card-draw](http://127.0.0.1:8000/preview/chance-card-draw)

- Permissoes:
  - [http://127.0.0.1:8000/preview/freight-permissions](http://127.0.0.1:8000/preview/freight-permissions)
  - [http://127.0.0.1:8000/preview/freight-permission-draw](http://127.0.0.1:8000/preview/freight-permission-draw)

- Sorteio de portos e pedagios:
  - [http://127.0.0.1:8000/preview/origin-port-draw](http://127.0.0.1:8000/preview/origin-port-draw)
  - [http://127.0.0.1:8000/preview/destination-port-draw](http://127.0.0.1:8000/preview/destination-port-draw)
  - [http://127.0.0.1:8000/preview/toll-draw](http://127.0.0.1:8000/preview/toll-draw)

- Dados:
  - [http://127.0.0.1:8000/preview/movement-dice](http://127.0.0.1:8000/preview/movement-dice)

### 15.5 Regra pratica para validar alteracoes visuais

Depois de qualquer mudanca em JS/CSS/templates:

1. manter ou subir o servidor com `python run.py`;
2. abrir o link correspondente;
3. pressionar `Ctrl+F5`.

## 16. Como lidar com o usuario durante o desenvolvimento

Esta secao e importante porque o projeto foi construído de forma fortemente colaborativa e iterativa.

### 16.1 Regras praticas de comunicacao

- trabalhar em passos pequenos;
- nao mexer em partes validadas sem necessidade;
- antes de mudar comportamento grande, alinhar o objetivo exato;
- depois de cada etapa, sempre fornecer um link claro para teste;
- sempre dizer se a mudanca exige:
  - so `Ctrl+F5`;
  - ou `parar e rodar python run.py` de novo.

### 16.2 Padrao recomendado de resposta ao usuario

Ao terminar uma alteracao:

- dizer objetivamente o que mudou;
- apontar os arquivos principais alterados;
- dizer como validar;
- sempre incluir o link do ambiente correspondente.

Exemplo de validacao:

- `Ctrl+F5` em [http://127.0.0.1:8000/preview/game-ui](http://127.0.0.1:8000/preview/game-ui)

### 16.3 Coisas a evitar

- alterar mapa e logica visual ao mesmo tempo sem necessidade;
- misturar refatoracao estrutural com tuning visual em uma unica etapa;
- responder sem fornecer o link de teste;
- assumir que o navegador vai recarregar JS/CSS sozinho.

## 17. Historico resumido do que ja foi feito

### 17.1 Base e dados

- reorganizacao completa da base;
- consolidacao do manual oficial como referencia principal;
- consolidacao dos JSONs como base canonica;
- criacao de modelos e carregadores de dados.

### 17.2 Mapa

- ferramenta de captura;
- ferramenta de edicao;
- calibracao por ancoras;
- construcao do mapa oficial;
- grafo navegavel do tabuleiro;
- correcoes visuais de rotas, overlays e antimeridiana.

### 17.3 UI

- reconstruida do zero;
- setup inicial;
- preview jogavel;
- barra de jogadores;
- gavetas;
- log;
- modais centrais;
- pausar/despausar;
- popup de carta ao clicar em porto/pedagio.

### 17.4 Acessorios

- cartas de titulo;
- cartas de sorte/reves;
- cartas de permissao;
- embaralhadores;
- dados;
- assets de carga;
- assets de navio.

### 17.5 Jogo

- primeiro turno completo;
- turnos seguintes basicos;
- compra e pagamento em portos/pedagios;
- sorte/reves com varios efeitos;
- entrega no destino;
- bonus/onus;
- compra de nova permissao;
- bloqueio de permissao repetida;
- ciclo geral da partida em preview.

## 18. Divida tecnica e riscos conhecidos

### 18.1 Monolito de frontend

[game-preview.js](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/static/js/game-preview.js) concentra muita responsabilidade:

- estado;
- regras;
- render;
- fluxo de modais;
- animacao;
- IA simples;
- logs;
- resolucao de paradas.

No estado atual isso funciona, mas a manutencao futura vai melhorar muito se esse arquivo for quebrado em modulos.

### 18.2 CSS incremental

[app.css](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/app/static/css/app.css) ja recebeu varias rodadas de ajuste fino. O efeito colateral e:

- override sobre override;
- dependencia de ordem no arquivo;
- risco de regressao visual localizada.

### 18.3 Dupla camada de regra

Ja citado, mas importante repetir:

- parte da regra vive no engine Python;
- parte importante vive na preview JS.

Isso e o principal ponto arquitetural a ser resolvido mais adiante.

### 18.4 Artefatos nao-core

Pastas/arquivos que nao devem ser tratados como codigo principal do produto:

- `.deps`
- `vendor_libs`
- `__pycache__`
- `.pytest_cache`
- `tmp_test_write.txt`

## 19. Lista de afazeres

### 19.1 Itens concluidos

1. `[feito]` Ler o manual oficial e consolidar as regras-base do jogo.
2. `[feito]` Organizar a base do projeto em Python/browser e reaproveitar so o que servia dos dados e do motor.
3. `[feito]` Construir a ferramenta de captura/calibracao do mapa.
4. `[feito]` Construir o editor manual do mapa com salvamento no mapa oficial do jogo.
5. `[feito]` Fechar o mapa oficial com portos, pedagios, abastecimentos, sorte/reves e rotas.
6. `[feito]` Implementar o mapa do jogo com arrasto horizontal e visual correto.
7. `[feito]` Criar a preview inicial da UI e a janela central de configuracao da partida.
8. `[feito]` Ligar a janela inicial ao backend para criar a sessao com nome da companhia, cor e numero de adversarios.
9. `[feito]` Criar a base do grafo do tabuleiro para navegacao e caminhos.
10. `[feito]` Criar o preview das cartas de titulo de porto.
11. `[feito]` Incluir os cartoes de pedagio no preview de titulos, em secao separada.
12. `[feito]` Criar o preview das cartas de sorte/reves.
13. `[feito]` Categorizar os efeitos das cartas de sorte/reves no dado oficial.
14. `[feito]` Criar as cartas de permissao de frete.
15. `[feito]` Definir a apresentacao visual e a interacao do “dado de carga” como embaralhamento das cartas de permissao.
16. `[feito]` Criar o preview do embaralhamento das cartas de sorte/reves.
17. `[feito]` Criar o preview do embaralhamento do porto de saida.
18. `[feito]` Criar o preview do embaralhamento do porto de destino com a regra de regiao diferente.
19. `[feito]` Criar o preview do embaralhamento dos pedagios.
20. `[feito]` Criar o preview dos 2 dados D6 de movimentacao em 2D.
21. `[feito]` Integrar ao projeto os 6 simbolos finais de tipos de carga.
22. `[feito]` Integrar ao projeto os 6 navios finais.
23. `[feito]` Implementar o fluxo principal do turno, incluindo:
   - primeiro turno do usuario;
   - primeiro turno dos jogadores do sistema;
   - turnos seguintes;
   - abertura de contrato;
   - execucao do turno;
   - pos-contrato;
   - movimento no menor caminho;
   - persistencia da logica `PP -> PE -> PD`.
24. `[feito]` Implementar a compra de portos e pedagios e o pagamento ao banco ou ao dono durante a partida.
25. `[feito]` Implementar os turnos seguintes ao primeiro turno.
26. `[feito]` Implementar contratos completos com continuidade de rodadas, prazo, bonus e multa.
27. `[feito]` Implementar boa parte da economia central:
   - compra de nova permissao;
   - bloqueio de permissao repetida;
   - compra do porto atual apos entrega.
28. `[feito]` Refinar UI e janelas:
   - pausa com barra de espaco;
   - barra de jogadores;
   - gavetas;
   - miniaturas;
   - rotas com simbolos;
   - log expansivel;
   - modais centrais;
   - clique no mapa para abrir carta de titulo;
   - ajustes iterativos de UX.

### 19.2 Pendencias

29. `[pendente]` Implementar comissoes completas, monopolio, hipoteca e demais regras economicas avancadas.
30. `[pendente]` Refinar a negociacao entre jogadores para compra de porto/pedagio.
31. `[pendente]` Implementar escolha de rota pelo jogador humano nas bifurcacoes durante a navegacao.
32. `[pendente]` Refinar os jogadores do sistema com decisoes automaticas mais inteligentes de compra, rota e negociacao.
33. `[pendente]` Integrar totalmente os cupons e cartas de sorte/reves ao fluxo real da partida.
34. `[pendente]` Implementar o resolvedor oficial completo dos cartoes de sorte/reves no motor, cobrindo todos os casos com profundidade e convergindo runtime Python/JS.
35. `[pendente]` Implementar save/load de partida.
36. `[pendente]` Polir a UI final, telas de inicio/fim e revisao geral de regras.
37. `[pendente]` Refatorar a preview jogavel para reduzir o monolito de JS/CSS.

## 20. Recomendacoes para a proxima fase

Se um novo desenvolvedor assumir o projeto agora, a ordem recomendada e:

1. consolidar regras economicas faltantes;
2. consolidar o comportamento completo de sorte/reves;
3. implementar escolha de rota nas bifurcacoes;
4. melhorar a IA;
5. definir estrategia de convergencia entre `game-preview.js` e `game_engine.py`;
6. implementar save/load;
7. fazer o polimento final.

## 21. Resumo executivo final

O projeto hoje ja tem:

- mapa oficial jogavel;
- UI principal operante;
- acessorios principais do jogo;
- turnos iniciais e seguintes funcionando em preview;
- logica de compra, contrato, entrega e movimento.

O principal desafio tecnico a partir daqui nao e mais “criar o jogo do zero”, e sim:

- completar regras faltantes;
- reduzir duplicacao entre JS e Python;
- estabilizar a UX;
- preparar a base para manutencao de longo prazo.
