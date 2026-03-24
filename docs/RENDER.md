# Deploy no Render

Este projeto pode ser publicado no Render como um servico `Web Service` com runtime Docker.

## Arquivos usados no deploy

- `Dockerfile`: build e inicializacao do container.
- `render.yaml`: blueprint opcional para criar o servico com `healthCheckPath` configurado.

## URL principal do game-v3

Depois do deploy, abra:

- `/preview/game-ai-ui-v3`

Exemplo:

- `https://seu-servico.onrender.com/preview/game-ai-ui-v3`

## Healthcheck

O endpoint de healthcheck usado pelo Render e:

- `/api/health`

Ele retorna status `ok` quando a app inicializa corretamente.

## Persistencia de saves e tutorial

Sem disco persistente do Render, estes dados ficam efemeros:

- saves criados pela UI;
- alteracoes no tutorial do game-v3.

Se quiser persistencia, monte um disco no Render e configure variaveis de ambiente apontando para esse volume:

- `RDM_SAVE_ROOT_DIR=/caminho/do/disco/saves`
- `RDM_TUTORIAL_CONFIG_PATH=/caminho/do/disco/game_v3_tutorial_v2.json`

## Como subir com Blueprint

1. Conecte o repositorio no Render.
2. Escolha `Blueprint` ou importe o arquivo `render.yaml`.
3. Confirme que o servico usa o `Dockerfile` da raiz.
4. Aguarde o build.
5. Acesse `/preview/game-ai-ui-v3`.

## Como subir manualmente no Render

1. Crie um novo `Web Service`.
2. Selecione `Docker` como ambiente.
3. Use o repositorio atual.
4. Configure o health check como `/api/health`.
5. Publique o servico.