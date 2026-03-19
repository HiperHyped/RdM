# Rei dos Mares

Versao online do jogo Rei dos Mares, executada no navegador.

Este projeto permite jogar uma partida contra robos ou acompanhar simulacoes completas entre robos, com mapa interativo, contratos, titulos, permissoes, cartas de sorte/reves, negociacoes e sistema de save/load.

## Requisitos

- Python 3.12 ou superior
- Navegador moderno

## Instalacao

No diretorio do projeto, instale as dependencias:

```powershell
python -m pip install -e .[dev]
```

## Como rodar

Inicie o servidor local:

```powershell
python run.py
```

Depois abra no navegador:

- `http://127.0.0.1:8000/`

## Qual tela abrir

- `http://127.0.0.1:8000/`:
  pagina inicial com links para previews e ferramentas
  
- `http://127.0.0.1:8000/preview/game-ai-ui-v2`:
  partida principal, com jogador humano contra robos

- `http://127.0.0.1:8000/preview/robots-ai-ui-v2`:
  mesa totalmente automatica entre robos



## Como comecar uma partida

Ao abrir a tela principal do jogo:

1. Informe o nome da sua companhia.
2. Escolha a cor da companhia.
3. Escolha o numero de adversarios.
4. Ajuste a dificuldade geral da IA se quiser.
5. Se preferir, carregue um save existente.
6. Clique em `Iniciar partida`.

## Como jogar

Cada jogador comeca com capital inicial de `$ 1960`.

No inicio, o jogo define:

- sua permissao inicial de carga
- seu porto de partida
- seu porto de destino
- o pedagio obrigatorio da rota
- a distancia do contrato
- o valor do frete

Durante a partida:

1. Role os 2 dados numericos para movimentar o navio.
2. Siga a rota entre o porto de origem, o pedagio obrigatorio e o destino.
3. Pare em portos, pedagogios, abastecimentos e pontos de sorte/reves conforme o movimento.
4. Compre ativos, pague estadias e receba rendas quando for dono dos titulos.
5. Entregue o contrato dentro do prazo para maximizar o frete.

## Regras rapidas

- Cada jogador mantem um contrato ativo por vez.
- O prazo padrao do contrato e de 4 rodadas.
- Se entregar antes, recebe bonus de `$ 50` por rodada adiantada.
- Se entregar depois, perde `$ 20` por rodada atrasada.
- Se o porto de origem for seu, voce recebe vantagem no frete.
- Se o pedagio obrigatorio tiver dono, parte do frete vai para esse dono.
- Monopolios fortalecem a renda dos portos da regiao.

## Controles uteis da interface

Na barra do jogo, voce encontra botoes para:

- carregar partida
- salvar partida
- abrir configuracoes
- abrir relatorios

Na interface, voce tambem pode:

- clicar em portos e pedagogios no mapa para abrir o cartao
- clicar nos chips das gavetas dos jogadores para ver os titulos
- abrir as gavetas dos jogadores para consultar portos, pedagogios, permissoes, cupons e monopolios

## Salvar e carregar

- Use o botao de disquete para salvar a partida atual.
- Use o botao de pasta para carregar um save existente.
- O jogo cria snapshots completos do estado da partida.

## Testes

Para rodar a suite de testes:

```powershell
python -m pytest -q
```

## Arquivos importantes

- `run.py`: sobe o servidor local
- `app/ui/server.py`: registra as rotas da aplicacao
- `data/rules_v2.json`: regras-base da versao online
- `MANUAL.md`: manual do jogador para a versao online

## Leitura recomendada

- `MANUAL.md`
- `docs/DEVELOPER_DOCUMENTATION.md`


