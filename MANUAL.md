# Manual Do Jogador

Este manual explica como jogar a versao online de Rei dos Mares.

Ele foi adaptado do manual original do tabuleiro, mas o foco aqui e a experiencia no navegador: o jogo calcula contratos, pagamentos e eventos automaticamente, enquanto voce toma as decisoes da partida.

## 1. Objetivo

O objetivo e construir a maior fortuna da mesa.

Voce faz isso ao:

- cumprir fretes valiosos
- comprar portos e pedagogios
- receber estadias, comissoes e rendas de rota
- fechar monopolios regionais
- negociar bem seus ativos

## 2. O Que Existe Na Versao Online

Na versao online, o jogo substitui os componentes fisicos por elementos de interface:

- mapa mundi interativo
- navios no tabuleiro
- cartoes de porto e pedagio
- cartas de sorte e reves
- permissoes de frete
- painel de contratos
- gavetas dos jogadores com seus ativos
- log de acoes, relatorios e sistema de save/load

Voce nao precisa de banqueiro nem de ficha de rota em papel. O sistema faz essa parte.

## 3. Inicio Da Partida

Ao abrir a tela principal do jogo online, voce monta sua companhia:

1. escolha o nome da companhia
2. escolha a cor
3. escolha o numero de adversarios
4. ajuste a dificuldade da IA, se quiser
5. carregue um save, se quiser continuar uma partida antiga
6. clique em `Iniciar partida`

Cada jogador comeca com `$ 1960`.

## 4. O Que O Jogo Define No Comeco

No comeco da partida, cada jogador recebe:

- uma permissao inicial de carga
- um porto de partida
- um porto de destino
- um pedagio obrigatorio
- um contrato com distancia e valor de frete

A primeira permissao e gratuita.

Na interface, essas informacoes aparecem no painel da companhia, no resumo dos jogadores e nos cartoes que surgem durante o fluxo da partida.

## 5. Como Nasce Um Contrato

Cada contrato combina cinco elementos:

- porto de origem
- porto de destino
- pedagio obrigatorio
- carga ativa
- valor do frete

O valor do frete depende da distancia e da permissao de carga usada no contrato.

Em termos praticos, a rodada de abertura de contrato segue este fluxo:

1. definicao da permissao ativa
2. definicao do porto de origem
3. definicao do pedagio obrigatorio
4. definicao do porto de destino
5. calculo do frete

Depois disso, o navio esta pronto para navegar.

## 6. Como Navegar

Em cada rodada, o jogador movimenta o navio com 2 dados numericos.

Se sair dupla, o jogador recebe uma nova rolagem, conforme a regra da mesa.

O objetivo do movimento e cumprir a rota correta:

- sair do porto de origem
- passar pelo pedagio obrigatorio
- chegar ao porto de destino

Se o jogador chegar ao destino sem ter passado pelo pedagio obrigatorio, o contrato nao vale.

## 7. Tipos De Casa

Durante a navegacao, o navio pode parar em quatro tipos principais de ponto.

### 7.1. Abastecimento

Ao parar em ponto de abastecimento, o jogador paga ao banco o valor correspondente ao nivel do ponto.

### 7.2. Sorte E Reves

Ao parar num ponto de sorte/reves, o jogador compra a carta do topo e cumpre o efeito.

Na versao online, isso pode gerar:

- ganho de dinheiro
- perda de dinheiro
- movimento extra
- perda de rodada
- cupons para usar mais tarde

### 7.3. Porto

Ao parar em um porto:

- se estiver sem dono, voce pode comprar
- se nao comprar, paga estadia ao banco
- se tiver dono, paga estadia ao dono
- se o porto for seu, nao paga nada

### 7.4. Pedagio

Pedagios seguem a mesma logica basica dos portos, mas costumam ser mais caros e mais fortes como fonte de renda.

## 8. Cumprimento Do Contrato

Quando o navio chega corretamente ao destino, o jogo fecha o contrato e calcula o pagamento.

O prazo-base do contrato e de 4 rodadas.

Regras de prazo:

- entrega antes do prazo: bonus de `$ 50` por rodada adiantada
- entrega apos o prazo: penalidade de `$ 20` por rodada atrasada

Depois da entrega, um novo contrato passa a ser preparado a partir da situacao atual do jogador.

## 9. Portos E Pedagios Como Propriedades

Voce pode comprar titulos do banco ou negociar com outros jogadores.

Esses ativos geram renda por tres caminhos principais:

- estadia: quando outros navios param no local
- comissao de origem: quando outro jogador parte de um porto seu
- renda de pedagio: quando a rota obrigatoria de outro jogador passa por um pedagio seu

Na interface, os titulos aparecem nas gavetas dos jogadores como chips coloridos. Clicar neles abre o cartao completo.

## 10. Monopolio

Se voce conquistar todos os portos de uma mesma regiao, fecha um monopolio.

Na versao online, isso traz os mesmos beneficios estruturais do jogo de tabuleiro:

- estadias mais fortes nos portos da regiao
- origem mais valiosa quando o contrato sai de um porto seu dentro do monopolio

Os monopolios ativos aparecem destacados na gaveta do jogador.

## 11. Permissoes De Frete

As permissoes determinam qual tipo de carga voce pode transportar e afetam diretamente o valor do frete.

Regras principais:

- a primeira permissao e gratuita
- permissoes extras custam `$ 2000`
- com mais de uma permissao, voce escolhe a mais vantajosa para o contrato

Na versao online, as permissoes aparecem como cartoes na gaveta do jogador.

## 12. Cartas, Cupons E Efeitos Especiais

O jogo online inclui cartas de sorte e reves e tambem cupons guardados na mao.

Esses efeitos podem:

- aliviar custos
- ignorar pedagogio ou abastecimento
- melhorar frete
- cancelar ou reconfigurar situacoes ruins
- causar perdas, atrasos ou desvios

Na interface, os cupons ficam separados na gaveta do jogador quando existirem.

## 13. Negociacao

Voce pode negociar ativos com os robos durante a partida.

Na pratica, a negociacao pode envolver:

- compra de porto
- compra de pedagio
- venda de porto
- venda de pedagio

Os precos e a disposicao dos robos variam conforme o contexto da partida. Alguns ativos ficam mais caros quando afetam monopolios, origem importante ou renda futura.

## 14. Hipotecas

Quando faltar caixa, voce pode recorrer a hipotecas.

Regra geral:

- o banco paga metade do valor de compra
- enquanto hipotecado, o ativo deixa de render
- para resgatar, e preciso devolver o valor com acrescimo

Na versao online, o sistema controla automaticamente o estado hipotecado do ativo e seus efeitos na renda.

## 15. Quando Falta Dinheiro

Se a companhia entrar em aperto financeiro, as saidas normais sao:

- vender ativos
- negociar com outros jogadores
- hipotecar ativos
- evitar compras nao essenciais

Se nada disso resolver e voce nao conseguir honrar os debitos, a companhia entra em falencia.

## 16. Falencia

Uma companhia falida sai da disputa.

Seus ativos deixam de sustentar a estrategia do jogador, e a partida segue com os demais participantes.

## 17. Fim De Jogo

O jogo termina quando resta apenas uma companhia solvente ou quando a mesa encerra a disputa e compara patrimonio total.

Em termos praticos, vence quem tiver o melhor resultado combinado entre:

- dinheiro em caixa
- portos
- pedagogios
- posicao estrategica

## 18. Como Ler A Interface

Na tela principal, observe estas areas:

- mapa: mostra navios, rotas, portos, pedagogios, sorte e abastecimentos
- painel de acoes: mostra o que aconteceu no turno
- gavetas dos jogadores: mostram ativos, permissoes, cupons e monopolios
- cartao de propriedade: aparece ao clicar em porto ou pedagio no mapa ou na gaveta
- botoes do topo: salvar, carregar, configuracoes e relatorios

## 19. Salvar, Carregar E Ajustar A Partida

Voce pode usar os botoes da interface para:

- salvar a partida atual
- carregar uma partida salva
- alterar configuracoes da simulacao
- abrir relatorios com historico da mesa

Isso torna a versao online mais pratica do que a mesa fisica para partidas longas e testes de estrategia.

## 20. Diferencas Importantes Em Relacao Ao Tabuleiro

As bases do jogo sao as mesmas, mas a versao online automatiza varias etapas:

- nao ha banqueiro manual
- contratos sao calculados automaticamente
- rendas e penalidades sao aplicadas pelo sistema
- a rota e acompanhada visualmente no mapa
- saves permitem interromper e continuar depois
- relatorios ajudam a acompanhar o desempenho da mesa

## 21. Dicas Rapidas

- cuide do caixa antes de acumular ativos demais
- valorize portos de origem forte e regioes quase completas
- nao ignore a importancia do pedagogio obrigatorio do contrato
- permissao certa pode valer mais do que um ativo ruim
- monopolio muda bastante o peso economico de uma regiao
- use saves em partidas longas

Bom jogo.