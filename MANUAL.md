# Manual Do Jogador - UltraMarine

Este manual apresenta UltraMarine, a versão online do jogo de tabuleiro Jogo dos Portos. Aqui voce encontra os principios do jogo, a explicacao de todos os conceitos importantes, o fluxo completo da partida e as funcionalidades disponiveis na interface.

## 1. O Que E UltraMarine

UltraMarine e um jogo de estrategia, rota maritima, contratos e controle economico.

Cada jogador comanda uma companhia de navegacao. A partida mistura:

- contratos de frete;
- navegacao no mapa;
- compra de portos e pedagogios;
- receitas passivas;
- cartas de sorte e reves;
- cupons taticos;
- negociacao entre jogadores;
- gestao de caixa, hipotecas e risco de falencia.

No modo Humano x robos, voce joga contra adversarios controlados pelo sistema. O jogo calcula automaticamente grande parte das regras operacionais e economicas, enquanto voce toma as decisoes estrategicas.

## 2. Principios Centrais Do Jogo

UltraMarine gira em torno de cinco principios.

### 2.1. Contrato e o motor da partida

O dinheiro mais importante entra por contratos de frete. Cada contrato define de onde sair, por onde passar e onde entregar.

### 2.2. Rota correta vale mais do que andar muito

Nao basta chegar ao destino. E preciso cumprir a ordem logica do contrato, incluindo o pedagio obrigatorio.

### 2.3. Propriedade muda o jogo de longo prazo

Portos e pedagogios comprados deixam de ser apenas pontos do mapa. Eles passam a gerar renda, pressionar os rivais e alterar o valor estrategico das regioes.

### 2.4. Caixa decide sobrevivencia

Uma companhia pode parecer forte em ativos e ainda assim quebrar por falta de liquidez. Saber quando comprar, negociar, hipotecar ou recusar uma oportunidade faz parte do jogo.

### 2.5. Posicao e timing importam

Uma permissao correta, um cupom usado na hora certa ou a compra de um unico porto-chave podem mudar o valor de varios turnos.

## 3. Objetivo Da Partida

Seu objetivo e construir a companhia mais poderosa da mesa.

Na pratica, isso significa combinar:

- dinheiro em caixa;
- contratos bem pagos;
- portos e pedagogios rentaveis;
- monopolios regionais;
- boa gestao de risco;
- sobrevivencia financeira ate o fim.

Dependendo do fluxo da partida, vence:

- a ultima companhia solvente;
- ou a companhia com melhor patrimonio quando a mesa compara resultados.

## 4. Modo Humano x Robos

Este e o modo principal deste manual.

Nele, a composicao da partida e:

- `1` jogador humano;
- `2` a `5` robos.

Cada robo disputa os mesmos contratos, compra os mesmos ativos, usa cupons, negocia, pode hipotecar bens e tambem pode falir.

Voce acompanha tudo na mesma tela:

- mapa principal;
- painel de acoes;
- barra do jogador humano;
- barras resumidas dos rivais;
- gavetas expansiveis dos jogadores;
- modais de compra, escolha, negociacao, relatorios, save e load.

## 5. O Que O Sistema Faz Automaticamente

Na versao digital, o jogo automatiza tarefas que na mesa fisica exigiriam muito controle manual.

O sistema cuida de:

- sorteios iniciais;
- calculo de frete;
- aplicacao de bonus e penalidades por prazo;
- cobrancas em porto, pedagio e abastecimento;
- compra e posse de propriedades;
- uso e expiracao de cupons;
- controle de monopolio;
- hipoteca e resgate;
- registro de caixa e patrimonio;
- historico de acoes;
- saves e carregamento;
- relatorios por turno.

Voce continua decidindo o que importa estrategicamente:

- comprar ou nao comprar;
- quando negociar;
- quando aceitar ou recusar ofertas;
- quando hipotecar ou resgatar;
- qual permissao usar;
- quando salvar, carregar, pausar e revisar a partida.

## 6. Comeco Da Partida

Ao abrir o modo Humano x robos, voce prepara a mesa na tela inicial.

Os elementos principais dessa configuracao sao:

- nome da companhia;
- cor da companhia;
- quantidade de robos;
- perfil geral de IA;
- modo avancado de configuracao dos robos, quando habilitado;
- opcao de carregar uma partida salva.

Cada jogador comeca com capital inicial de `$ 1960`.

## 7. Configuracao Dos Robos

Os robos nao sao apenas oponentes passivos. Eles tem perfis e pesos estrategicos.

Na configuracao da partida, a interface pode oferecer:

- dificuldade geral;
- modo balanceado ou modos especializados;
- perfis por arquétipo;
- edicao avancada dos parametros de cada robo.

Na pratica, isso permite criar rivais mais inclinados a:

- negociar bastante;
- proteger caixa;
- buscar monopolio;
- priorizar portos;
- priorizar pedagogios;
- valorizar permissoes;
- correr mais risco;
- guardar cupons para janelas melhores.

Para o jogador, o efeito visivel e simples: cada robo se comporta de forma diferente na economia, na agressividade de compra e na disposicao para fazer negocio.

## 8. O Que Cada Jogador Recebe No Inicio

Depois de iniciar a partida, o sistema monta automaticamente o primeiro contrato de cada companhia.

Cada jogador recebe:

- uma permissao inicial de frete;
- um porto de origem;
- um pedagio obrigatorio;
- um porto de destino;
- um contrato calculado com valor de frete.

A primeira permissao e gratuita.

## 9. Conceito De Contrato

O contrato e a unidade central do jogo. E ele que transforma deslocamento no mapa em receita.

Um contrato completo combina cinco elementos:

- porto de origem;
- porto de destino;
- pedagio obrigatorio;
- permissao de frete ativa;
- valor do frete.

Em linguagem simples:

- voce sai de um porto;
- precisa atravessar o pedagio exigido;
- e entao concluir a entrega no destino.

## 10. Como O Valor Do Frete E Calculado

O frete depende de fatores estruturais do contrato.

Os mais importantes para o jogador sao:

- distancia entre origem e destino;
- permissao de carga usada;
- situacao da origem;
- eventuais efeitos de cupons ou cartas.

Se voce tiver mais de uma permissao de frete, pode haver uma escolha mais vantajosa para aquele contrato especifico.

## 11. Prazo De Entrega

Cada contrato tem um prazo-base.

Na versao atual, a referencia principal e de `4` rodadas.

O jogo aplica automaticamente:

- bonus por entrega adiantada;
- penalidade por entrega atrasada.

Regra pratica:

- entrega antes do prazo: `+ $ 50` por rodada adiantada;
- entrega apos o prazo: `- $ 20` por rodada atrasada.

Alguns cupons podem ampliar esse prazo.

## 12. Fluxo Geral De Uma Rodada

O ciclo mais comum do jogo segue esta ordem:

1. preparar ou confirmar o contrato ativo;
2. rolar os dados de movimento;
3. navegar pelo mapa;
4. resolver a parada do turno;
5. cobrar ou receber valores;
6. verificar uso de cupom, compra, negociacao ou hipoteca;
7. encerrar o turno e passar ao proximo jogador;
8. quando o destino e alcancado corretamente, fechar o contrato e abrir o proximo.

## 13. Movimento No Mapa

O deslocamento da embarcacao e feito com `2` dados numericos.

Aspectos principais:

- a interface mostra a rolagem;
- o navio anda a quantidade resultante;
- em caso de dupla, o jogo pode conceder nova rolagem conforme a regra ativa da mesa;
- o mapa mostra a rota contratual destacada.

Durante a navegacao, o jogo acompanha se voce:

- saiu da origem;
- passou pelo pedagio obrigatorio;
- alcancou o destino.

## 14. Regra Do Pedagio Obrigatorio

Este e um dos conceitos mais importantes de UltraMarine.

Todo contrato define um pedagio obrigatorio.

Consequencia pratica:

- chegar ao destino sem passar pelo pedagio correto nao conclui o contrato de forma valida.

Por isso, o jogador precisa pensar em rota, tempo e custo ao mesmo tempo.

## 15. Tipos De Ponto No Mapa

No tabuleiro digital, os navios interagem com quatro familias principais de ponto.

### 15.1. Portos

Portos podem ser:

- origem de contrato;
- destino de contrato;
- propriedade compravel;
- fonte de estadia;
- fonte de comissao de origem.

### 15.2. Pedagios

Pedagios podem ser:

- parte obrigatoria do contrato;
- propriedade compravel;
- fonte de renda por passagem vinculada ao contrato;
- fonte de pagamento ao dono quando a regra exigir.

### 15.3. Abastecimentos

Pontos de abastecimento cobram valor do banco quando o navio para ali.

O custo depende do nivel do ponto.

### 15.4. Sorte E Reves

Ao parar nesse tipo de casa, o jogador compra uma carta e resolve o efeito.

## 16. O Que Acontece Ao Parar Em Abastecimento

Ao parar em abastecimento, a companhia paga ao banco o valor correspondente ao ponto.

Esse custo parece pequeno no curto prazo, mas pode virar problema em momentos de caixa apertado, principalmente perto de outras cobrancas obrigatorias.

Alguns cupons podem evitar esse gasto.

## 17. O Que Acontece Ao Parar Em Sorte E Reves

Quando o navio para em uma casa de sorte e reves, o sistema compra a carta do topo e aplica o efeito.

Os efeitos podem ser imediatos ou armazenados como cupom.

Exemplos de efeito:

- ganhar dinheiro;
- perder dinheiro;
- receber ou pagar valor para todos;
- mover casas;
- voltar ou avancar em portos;
- repetir movimento;
- perder turnos;
- ganhar cupom para usar mais tarde;
- estender prazo do contrato;
- cancelar ou redirecionar situacoes especificas.

## 18. O Que Acontece Ao Parar Em Porto

Se o porto nao for o destino do contrato atual, a logica geral e:

- se estiver sem dono, voce pode comprar;
- se nao comprar, paga estadia ao banco;
- se tiver dono, paga estadia ao dono;
- se for seu, nao paga nada.

Se o porto for o destino do contrato e as exigencias da rota tiverem sido cumpridas, ocorre a entrega.

## 19. O Que Acontece Ao Parar Em Pedagio

Pedagios seguem uma logica economica parecida com a dos portos, mas sao mais especializados no papel de travar rotas e gerar renda de passagem.

Em termos praticos:

- pedagio sem dono pode ser comprado;
- pedagio com dono pode gerar pagamento ao proprietario;
- pedagio obrigatorio do contrato tem peso especial na validacao da entrega.

## 20. Entrega Do Contrato

Quando o jogador chega corretamente ao destino, o jogo fecha o contrato.

Nesse momento, o sistema calcula:

- valor-base do frete;
- bonus ou penalidade de prazo;
- modificadores ativos;
- eventuais efeitos de cupom.

Apos a entrega:

- o valor entra no caixa da companhia;
- o contrato anterior e encerrado;
- o jogo prepara o proximo ciclo contratual.

## 21. Portos E Pedagios Como Propriedades

Comprar propriedades e o principal motor economico de medio e longo prazo.

Os ativos aparecem na gaveta do jogador e podem ser:

- consultados individualmente;
- usados para compor monopolios;
- negociados com outros jogadores;
- hipotecados;
- resgatados depois.

## 22. Formas De Ganhar Dinheiro Com Propriedades

As propriedades podem gerar renda por diferentes vias.

### 22.1. Estadia

Quando outro jogador para no seu porto ou pedagio, ele pode pagar ao dono.

### 22.2. Comissao De Origem

Quando um contrato de outro jogador nasce em um porto seu, a origem pode gerar ganho ao dono.

### 22.3. Receita De Pedagio Obrigatorio

Quando a rota obrigatoria de outro jogador usa um pedagio seu, esse ativo ganha importancia economica e estrategica.

## 23. Monopolio Regional

Monopolio acontece quando voce controla todos os portos de uma regiao relevante.

Na versao atual, o monopolio importa porque:

- fortalece a posicao economica da companhia;
- valoriza certos pagamentos;
- aumenta o peso estrategico da regiao;
- influencia negociacoes;
- aparece destacado na interface do jogador.

Monopolio so vale de forma plena quando os ativos envolvidos estao ativos e nao hipotecados.

## 24. Permissoes De Frete

As permissoes definem que tipo de carga sua companhia pode transportar e afetam o valor dos contratos.

Regras principais:

- a primeira permissao e gratuita;
- permissoes extras custam `$ 2000`;
- com varias permissoes, voce pode escolher a mais vantajosa para a origem e o contrato atual;
- permissoes tambem podem ser hipotecadas em situacoes de emergencia.

Na interface, elas aparecem como cartas do jogador.

## 25. Escolha De Permissao

Quando o jogador possui mais de uma permissao, o jogo pode abrir uma etapa de escolha.

Essa decisao importa porque diferentes permissoes alteram:

- valor do frete;
- encaixe com a origem;
- sinergia economica da rodada;
- custo total de manter a malha da companhia.

## 26. Cartas De Sorte E Reves

O baralho de sorte e reves contem cartas positivas e negativas.

Os grupos mais importantes de efeito sao:

- dinheiro direto;
- pagamento coletivo;
- ganho coletivo;
- pulo de custo;
- deslocamento no mapa;
- perda de rodada;
- alteracao do contrato;
- geracao de cupom armazenado.

## 27. Cupons

Cupons sao efeitos guardados na mao do jogador para uso posterior.

Na versao atual, eles tem papel tatico muito forte.

Exemplos de cupons existentes:

- ignorar pedagio;
- nao pagar abastecimento;
- nao pagar estadia de porto;
- dobrar frete;
- estender prazo do contrato;
- cancelar contrato;
- redirecionar contrato mantendo valor;
- protecao contra certas rendas de monopolio.

Os cupons ficam separados na interface do jogador.

Tambem existe expiracao automatica. Alguns cupons duram menos, outros mais, e o jogo controla isso sem intervencao manual.

## 28. Negociacao

UltraMarine inclui negociacao entre jogadores.

No modo Humano x robos, isso significa que voce pode:

- tentar comprar porto de um robo;
- tentar comprar pedagio de um robo;
- vender ativos seus;
- avaliar contraofertas;
- trabalhar com dinheiro e, em certos fluxos, trocas de ativos.

Os robos nao aceitam qualquer preco. Eles avaliam:

- valor-base do ativo;
- situacao de caixa;
- risco estrategico;
- impacto em monopolio;
- oportunidade de crescimento;
- perfil de negociacao configurado.

## 29. Como Ler Uma Negociacao

Na interface, a negociacao costuma aparecer como um overlay ou modal.

Os elementos principais sao:

- quem vende;
- quem compra;
- ativo em disputa;
- oferta atual;
- espaco para contraoferta;
- feedback do sistema;
- opcoes de aceitar, recusar ou responder.

Em termos estrategicos, negociacao serve para duas coisas:

- corrigir um erro de posicao;
- acelerar uma estrutura importante, como monopolio ou origem forte.

## 30. Hipoteca

Hipoteca e a ferramenta de liquidez emergencial do jogo.

Regra geral:

- o banco paga uma fracao do valor do ativo;
- enquanto hipotecado, o ativo perde o efeito economico normal;
- para resgatar, e preciso pagar o valor de liberacao definido pela regra.

Na versao atual, isso vale para:

- propriedades;
- e tambem, em certos fluxos, permissoes.

O sistema mostra o estado hipotecado e calcula automaticamente:

- credito recebido;
- custo de resgate;
- impacto em monopolio;
- indisponibilidade temporaria da renda.

## 31. Hipoteca No Fluxo Humano

Quando o jogador humano nao tem caixa suficiente para uma cobranca obrigatoria, o jogo pode abrir uma decisao de hipoteca.

Nessa janela, voce enxerga:

- quanto falta pagar;
- qual ativo pode ser hipotecado;
- quanto entra no caixa;
- se isso basta ou nao para sair da crise.

Ou seja, a interface ajuda a decidir sob pressao, mas a escolha ainda e sua.

## 32. Falta De Dinheiro E Falencia

Se sua companhia nao consegue honrar um pagamento obrigatorio, o jogo entra em verificacao de liquidez.

As saidas normais sao:

- usar caixa;
- hipotecar ativos;
- evitar compras nao essenciais;
- negociar antes que a crise piore.

Se nada resolver, a companhia vai a falencia.

Quando isso acontece:

- o jogador sai da disputa competitiva;
- seus ativos deixam de sustentar a estrategia;
- a mesa segue com os sobreviventes.

## 33. O Papel Dos Robos Na Economia

Os robos nao servem apenas para preencher a mesa.

Eles:

- compram ativos do banco;
- analisam oportunidades de expansao;
- escolhem permissoes;
- negociam;
- hipotecam quando necessario;
- usam cupons;
- podem entrar em falencia;
- disputam monopolios.

Para o jogador humano, isso cria uma partida viva, com pressao constante no mapa e no mercado.

## 34. Interface Principal Do Jogo

Na tela principal de UltraMarine, as areas mais importantes sao estas.

### 34.1. Mapa

O mapa e o centro visual da partida.

Ele mostra:

- navios;
- portos;
- pedagogios;
- pontos de sorte e reves;
- abastecimentos;
- destaque da rota atual.

### 34.2. Painel De Acoes

Mostra o que aconteceu no turno atual e nos eventos recentes.

Serve para acompanhar:

- compras;
- pagamentos;
- recebimentos;
- entregas;
- uso de cupons;
- falhas economicas;
- negociacoes e efeitos especiais.

### 34.3. Barra Do Jogador Humano

Reune suas informacoes principais:

- caixa;
- contrato ativo;
- permissoes;
- propriedades;
- cupons;
- monopolios;
- atalhos importantes.

### 34.4. Barras Dos Rivais

Os rivais aparecem resumidos e podem ser expandidos em gavetas.

Isso permite inspecionar:

- perfil do robo;
- caixa estimado ou exibido;
- ativos controlados;
- rota atual;
- monopolios;
- status geral.

### 34.5. Gaveta Do Jogador

A gaveta do jogador e o painel expansivel acima do balao do jogador.

Ela organiza visualmente:

- miniaturas de portos e pedagogios;
- permissoes;
- cupons;
- monopolios;
- indicadores de patrimonio;
- detalhes do estado da companhia.

## 35. Inspetor De Propriedade

Ao clicar em um porto ou pedagio, o jogo pode abrir o cartao detalhado do ativo.

Ali voce consulta:

- nome;
- tipo;
- continente ou regiao;
- dono atual;
- preco;
- valor de estadia;
- situacao hipotecada ou livre.

## 36. Tutorial Integrado

O game-ai-ui-v3 inclui um tutorial integrado.

Esse tutorial destaca partes da tela e ajuda o jogador a entender:

- estrutura da interface;
- fluxo inicial;
- leitura do contrato;
- painel humano;
- barras dos rivais;
- toolbar superior;
- mapa e areas clicaveis.

Para o jogador, o importante e que a propria interface pode orientar os primeiros passos dentro da partida.

## 37. Toolbar Superior

No topo da interface, UltraMarine concentra os comandos de sessao e controle.

As acoes mais importantes sao:

- salvar;
- carregar;
- abrir configuracoes;
- abrir relatorios;
- controlar overlays e pausar quando necessario.

## 38. Save E Load

O sistema de save e load permite interromper e retomar partidas.

Na pratica, voce pode:

- salvar com nome sugerido ou personalizado;
- abrir um navegador de saves;
- filtrar saves compativeis com o modo atual;
- carregar uma sessao anterior.

Isso e especialmente util porque partidas longas de UltraMarine acumulam muita informacao economica e muitas viradas de posicao.

## 39. Relatorios

O modo Humano x robos inclui relatorios de acompanhamento da partida.

Os paines principais da versao atual incluem:

- dinheiro por turno;
- patrimonio por turno;
- ativos por turno.

Esses relatorios ajudam a entender:

- quem esta crescendo de verdade;
- quem vive de caixa momentaneo;
- quem montou a melhor carteira de ativos;
- em que momento a partida virou.

Tambem existem eventos ligados a atividade e expiracao de cupons dentro desse acompanhamento.

## 40. Configuracoes Da Partida Em Runtime

A interface inclui ajustes operacionais que afetam a experiencia de jogo, como:

- velocidade dos robos;
- forma de exibicao dos logs;
- comportamento da simulacao em segundo plano;
- travas ou filtros ligados a negociacao, dependendo do fluxo.

Esses ajustes nao mudam a identidade do jogo, mas alteram o ritmo e a legibilidade da partida.

## 41. Como Jogar Bem No Modo Humano x Robos

Uma boa partida costuma seguir esta logica:

1. preserve caixa nas primeiras rodadas;
2. compre apenas ativos com utilidade real;
3. valorize origem forte e pedagio estrategico;
4. use permissao melhor quando a diferenca de frete justificar;
5. nao trate monopolio como luxo, e sim como virada estrutural;
6. guarde cupons para pontos realmente decisivos;
7. negocie quando isso acelerar uma posicao importante;
8. hipoteque cedo demais so se a urgencia exigir;
9. nao ignore sinais de crise nos rivais;
10. acompanhe relatorios para ver quem esta crescendo de forma sustentavel.

## 42. Todos Os Conceitos Fundamentais, Em Resumo

Para jogar UltraMarine bem, voce precisa dominar estes conceitos:

- contrato;
- origem;
- destino;
- pedagio obrigatorio;
- prazo;
- frete;
- permissao;
- porto;
- pedagio;
- abastecimento;
- sorte e reves;
- cupom;
- estadia;
- comissao de origem;
- receita de pedagio;
- monopolio;
- negociacao;
- hipoteca;
- resgate;
- liquidez;
- falencia;
- patrimonio;
- relatorio;
- save e load.

Se esses conceitos estiverem claros, o restante da experiencia fica muito mais intuitivo.

## 43. Funcionalidades Disponiveis Na Versao Atual

Em termos de produto, a versao atual do jogo oferece:

- modo Humano x robos;
- configuracao de companhia;
- configuracao de perfis de IA;
- contrato inicial automatico;
- rolagem de dados;
- mapa interativo;
- parada em porto, pedagio, sorte e abastecimento;
- compra de propriedades;
- permissoes adicionais;
- escolha de permissao para contrato;
- cartas de sorte e reves;
- cupons e expiracao automatica;
- entregas com bonus e penalidade de prazo;
- gavetas dos jogadores;
- inspetor de propriedade;
- save e load;
- relatorios;
- negociacao com robos;
- hipoteca e resgate;
- deteccao de monopolio;
- controle de falencia;
- tutorial guiado na interface.

## 44. Observacao Sobre O Estado Atual Do Projeto

UltraMarine ja e plenamente jogavel, mas continua sendo um projeto em evolucao.

Isso significa que a base principal da experiencia esta disponivel, enquanto partes mais finas do balanceamento e algumas regras avancadas ainda podem receber refinamentos.

Na pratica, o jogador pode tratar este manual como a referencia do comportamento atual da versao online.

## 45. Encerramento

UltraMarine recompensa planejamento, leitura de mapa, timing economico e sangue frio sob pressao.

Jogar bem nao e apenas andar e entregar. E montar uma companhia que:

- navega com eficiencia;
- compra com criterio;
- negocia quando precisa;
- sobrevive aos custos;
- extrai renda dos rivais;
- e transforma boa posicao em dominio de mesa.

Para jogar no modo Humano x robos, abra:

- `http://127.0.0.1:8000/preview/game-ai-ui-v3`

Para ter aceeso ao manul online, acesse:
- `https://bit.ly/4sA62bM`

Bom jogo.