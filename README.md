# Rei dos Mares

Novo recomeÃ§o do app browser do jogo de tabuleiro `Rei dos Mares`.

## Principios desta base

- Reaproveitar apenas dados e regras confiaveis.
- Tratar o manual atualizado como fonte principal.
- Reescrever a interface do zero.
- Construir o mapa final com `Plotly Geo`.
- Capturar o tabuleiro real com uma ferramenta propria, em vez de interpolar rotas automaticamente.

## Stack aprovada

- Backend: `FastAPI`
- Templates: `Jinja2`
- Interacao leve: `HTMX` + `Alpine.js`
- Mapa: `Plotly Geo`
- Testes: `pytest`

## Estrutura

- `app/domain`: modelos centrais do jogo
- `app/engine`: regras e calculos
- `app/services`: carregamento de dados e bootstrap da UI
- `app/ai`: heuristicas dos jogadores do sistema
- `app/maptools`: captura e calibracao do tabuleiro
- `app/ui`: servidor e templates
- `data`: dados canonicos do jogo e arquivos do tabuleiro digital

## Estado atual desta base

- JSONs canonicos importados para o workspace
- modelos de dominio reescritos
- motor inicial do jogo refeito com as regras corrigidas de estadia
- shell web inicial em tela unica
- ferramenta inicial de captura de coordenadas do tabuleiro

## Instalar dependencias

```powershell
python -m pip install -e .[dev]
```

## Rodar o servidor

```powershell
python run.py
```

## Testes

```powershell
python -m pytest -q
```

## Observacoes

- O arquivo `MANUAL - REI DOS MARES.docx` passou a ser a referencia principal de regra.
- A regra de parada adotada nesta base e:
  - propriedade sem dono: pode comprar, senao paga estadia ao banco
  - propriedade com dono: paga estadia ao dono pelo valor `x`
- A calibracao do mapa ainda esta em fase 1: captura de pontos e projecao equiretangular inicial.

## Documentacao completa

- [docs/DEVELOPER_DOCUMENTATION.md](C:/Users/Haroldo%20Duraes/Desktop/GOvGO/RdM/docs/DEVELOPER_DOCUMENTATION.md)

