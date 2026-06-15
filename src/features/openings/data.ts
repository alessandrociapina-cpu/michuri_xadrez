// Árvore de aberturas anotadas (portada do protótipo HTML autocontido).
//
// Princípio de design (ver CLAUDE.md): NÃO gravamos FEN na mão. Cada abertura é
// só uma sequência de meios-lances em SAN; o chess.js gera cada posição a partir
// deles. Assim a mesma estrutura serve aos três usos: estudo, treino e exibir o
// nome da abertura durante a partida.

export type Nivel = 'Iniciante' | 'Intermediário' | 'Avançado';

export type Ply = {
  /** Lance em SAN inglês (ex.: "Nf3", "O-O"); convertido para PT-BR na exibição. */
  san: string;
  /** A ideia do lance e a consequência para a partida — em PT-BR. */
  note: string;
};

export type Opening = {
  name: string;
  eco: string;
  lvl: Nivel;
  /** Apresentação da abertura, mostrada antes do primeiro lance. */
  intro: string;
  /** Histórico: origem, época, grandes praticantes e partidas famosas. */
  historia?: string;
  plies: Ply[];
};

export const OPENINGS: Opening[] = [
  {
    name: 'Abertura Italiana (Giuoco Piano)',
    eco: 'C50–C54',
    lvl: 'Intermediário',
    intro:
      'Jogo aberto clássico e didático: ambos os lados desenvolvem rápido e miram o ponto fraco f7/f2. Excelente para aprender princípios de abertura.',
    historia:
      'É uma das aberturas mais antigas registradas: aparece no manuscrito de Göttingen (séc. XV) e foi analisada por Polerio e Greco por volta de 1600 — daí o nome italiano "giuoco piano" ("jogo tranquilo"). Dominou o xadrez romântico do séc. XIX e voltou à moda no elite moderno (Carlsen, Caruana, Giri) na forma do "Italiano lento" com d3, justamente por evitar a teoria pesada da Espanhola.',
    plies: [
      {
        san: 'e4',
        note: 'Abre o jogo no centro. Libera a saída do bispo de f1 e da dama e reivindica as casas d5 e f5. É o lance mais agressivo e principista.',
      },
      {
        san: 'e5',
        note: 'Resposta simétrica. O preto também ocupa o centro e impede que o branco jogue d4 de graça. Caracteriza o "jogo aberto".',
      },
      {
        san: 'Nf3',
        note: 'Desenvolve atacando o peão e5 e controla o centro. Quase sempre o lance mais natural — desenvolva os cavalos antes dos bispos.',
      },
      {
        san: 'Nc6',
        note: 'Defende e5 e desenvolve para uma casa ativa. O cavalo passa a pressionar d4 e e5.',
      },
      {
        san: 'Bc4',
        note: 'O lance que dá nome à abertura. O bispo mira f7 — a casa mais frágil do preto, defendida apenas pelo rei.',
      },
      {
        san: 'Bc5',
        note: 'Simetria: o bispo preto mira f2. Ambos apontam para o ponto fraco adversário; a luta passa a ser por iniciativa e por tempo de desenvolvimento.',
      },
      {
        san: 'c3',
        note: 'Prepara d4 para montar um grande centro de peões e abrir a diagonal do bispo. Consequência: ocupa a casa c3, então o cavalo da dama terá de buscar outra rota (Cbd2).',
      },
      {
        san: 'Nf6',
        note: 'Desenvolve e ataca e4, ganhando tempo antes que o branco complete d4. Pressão imediata sobre o centro branco.',
      },
      {
        san: 'd4',
        note: 'O avanço central que o lance c3 preparava. Abre linhas no centro: começa a fase tática da abertura, onde a disputa pelos peões centrais define a iniciativa.',
      },
    ],
  },
  {
    name: 'Ruy López (Espanhola)',
    eco: 'C60–C99',
    lvl: 'Avançado',
    intro:
      'A abertura estratégica por excelência. O branco pressiona o defensor de e5 a longo prazo, gerando uma das estruturas mais ricas e estudadas da teoria.',
    historia:
      'Leva o nome do padre espanhol Ruy López de Segura, que a analisou em seu livro de 1561. Permaneceu adormecida até o final do séc. XIX, quando a escola russa (Tchigorin) e depois Steinitz, Lasker, Capablanca e Fischer a transformaram na principal arma de 1.e4. Fischer dizia que jogava 1.e4 por considerá-la "o melhor lance" — e a Espanhola era seu campo de batalha favorito. Segue central na elite até hoje (Kasparov, Carlsen).',
    plies: [
      { san: 'e4', note: 'Ocupa o centro e abre linhas para bispo e dama.' },
      { san: 'e5', note: 'Disputa simétrica do centro; jogo aberto.' },
      { san: 'Nf3', note: 'Desenvolve atacando e5.' },
      { san: 'Nc6', note: 'Defende e5 e desenvolve.' },
      {
        san: 'Bb5',
        note: 'A Espanhola. O bispo pressiona o cavalo de c6, que é o defensor de e5. A ameaça posicional de longo prazo é trocar em c6 e minar a defesa de e5.',
      },
      {
        san: 'a6',
        note: 'Defesa Morphy. Questiona o bispo de imediato: ou ele captura em c6 (cedendo o par de bispos) ou recua, perdendo tempo de pressão.',
      },
      {
        san: 'Ba4',
        note: 'O branco preserva o bispo na diagonal a4–e8, mantendo a tensão. Consequência: o bispo poderá ficar exposto a um futuro ...b5 do preto.',
      },
      {
        san: 'Nf6',
        note: 'Ataca e4 e segue o princípio de desenvolvimento rápido, pressionando o centro branco.',
      },
      {
        san: 'O-O',
        note: 'Roque curto. Põe o rei em segurança e ativa a torre na coluna do rei. O branco abre mão de defender e4 momentaneamente — é a Espanhola Fechada, rica em planos estratégicos de longuíssimo prazo.',
      },
    ],
  },
  {
    name: 'Gambito Evans',
    eco: 'C51–C52',
    lvl: 'Avançado',
    intro:
      'A versão agressiva do Italiano: o branco oferece um peão no flanco da dama para ganhar tempo, montar um centro forte com c3 e d4 e lançar um ataque rápido.',
    historia:
      'Inventado por volta de 1827 pelo capitão galês William Davies Evans, oficial da marinha mercante — uma das raras aberturas batizadas com o nome de quem a criou. Foi a arma predileta dos românticos: Anderssen e Morphy a usaram para partidas brilhantes. Caiu em desuso no séc. XX, mas Kasparov a ressuscitou em 1995, vencendo Anand com ela, o que provou que o velho gambito ainda morde.',
    plies: [
      { san: 'e4', note: 'Ocupa o centro.' },
      { san: 'e5', note: 'Disputa simétrica.' },
      { san: 'Nf3', note: 'Ataca e5 e desenvolve.' },
      { san: 'Nc6', note: 'Defende e5.' },
      { san: 'Bc4', note: 'Mira f7, como no Italiano.' },
      { san: 'Bc5', note: 'Simetria, mirando f2.' },
      {
        san: 'b4',
        note: 'O gambito! Oferece o peão b para desviar o bispo de c5. Se o preto aceitar, o branco ganha tempo com c3 e monta um centro com d4.',
      },
      {
        san: 'Bxb4',
        note: 'Aceitar é o mais testado. O preto fica com um peão a mais, mas terá de devolver desenvolvimento e tempo.',
      },
      {
        san: 'c3',
        note: 'Ataca o bispo com ganho de tempo e prepara o avanço d4 — a ideia central do gambito.',
      },
      {
        san: 'Ba5',
        note: 'O bispo recua mantendo a pressão sobre a diagonal e vigiando c3.',
      },
      {
        san: 'd4',
        note: 'O branco abre o centro com vantagem de desenvolvimento e iniciativa — a compensação concreta pelo peão investido.',
      },
    ],
  },
  {
    name: 'Defesa Petrov (Russa)',
    eco: 'C42–C43',
    lvl: 'Intermediário',
    intro:
      'Em vez de defender e5, o preto contra-ataca e4 imediatamente, buscando simetria e solidez. Fama de defesa segura, predileta de quem joga para igualar com pretas.',
    historia:
      'Analisada pelo russo Alexander Petrov no início do séc. XIX (por isso "Defesa Russa"). Ganhou reputação de muralha: Kramnik, Anand e Caruana a usaram no mais alto nível para neutralizar 1.e4. Sua solidez é tanta que vários torneios de elite a viram segurar empates cruciais — o que lhe rendeu também a fama de "tediosa" entre os amantes do ataque.',
    plies: [
      { san: 'e4', note: 'Ocupa o centro.' },
      { san: 'e5', note: 'Disputa simétrica.' },
      { san: 'Nf3', note: 'Ataca e5.' },
      {
        san: 'Nf6',
        note: 'O lance da Petrov: em vez de defender e5, o preto contra-ataca e4. A simetria desafia o branco a provar uma vantagem.',
      },
      {
        san: 'Nxe5',
        note: 'O branco aceita capturar. Cuidado do preto: o natural 4...Cxe4? é um erro por causa de 5.De2! — primeiro provoque com d6.',
      },
      {
        san: 'd6',
        note: 'Expulsa o cavalo intruso ANTES de recapturar — a ordem de lances correta para evitar a armadilha.',
      },
      {
        san: 'Nf3',
        note: 'O cavalo recua para casa segura.',
      },
      {
        san: 'Nxe4',
        note: 'Agora sim o preto recupera o peão e fica com posição simétrica e sólida.',
      },
      {
        san: 'd4',
        note: 'O branco joga pelo centro e por uma pequena vantagem de espaço — a luta a partir daqui é posicional e precisa.',
      },
      {
        san: 'd5',
        note: 'O preto sustenta o cavalo de e4 e fixa um peão central — estrutura equilibrada típica da Petrov.',
      },
    ],
  },
  {
    name: 'Gambito do Rei (Aceito)',
    eco: 'C33–C39',
    lvl: 'Avançado',
    intro:
      'O gambito romântico do século XIX. O branco sacrifica um peão por desenvolvimento e ataque ao rei — jogo agudo, tático e arriscado para os dois lados.',
    historia:
      'Rei das aberturas românticas, dominou o séc. XIX: a célebre "Partida Imortal" (Anderssen x Kieseritzky, Londres 1851) nasceu de um Gambito do Rei. Morphy e Spassky o empunharam com brilho — Spassky chegou a derrotar Fischer com ele em 1960. A teoria moderna o considera arriscado para o branco, mas ele segue vivo como arma surpresa e escola de tática.',
    plies: [
      { san: 'e4', note: 'Ocupa o centro.' },
      { san: 'e5', note: 'Disputa simétrica do centro.' },
      {
        san: 'f4',
        note: 'O gambito. Oferece o peão f para desviar o peão e5, dominar o centro com d4 e abrir a coluna f para atacar o rei. Consequência: enfraquece a própria estrutura do rei branco — é arriscado por natureza.',
      },
      {
        san: 'exf4',
        note: 'Gambito Aceito. O preto fica com um peão a mais, mas concede ao branco o centro e vantagem de desenvolvimento. A partida girará em torno de o branco provar que tem compensação suficiente.',
      },
      {
        san: 'Nf3',
        note: 'Desenvolve e, crucialmente, impede o xeque ...Dh4+ que exploraria o rei branco enfraquecido. Lance quase obrigatório.',
      },
      {
        san: 'g5',
        note: 'Linha clássica: o preto tenta segurar o peão extra de f4 com uma corrente de peões. Consequência: enfraquece seriamente o próprio flanco do rei — jogo de faca.',
      },
      {
        san: 'h4',
        note: 'Ataca a corrente de peões. Após o esperado ...g4, o cavalo de f3 é expulso, mas o branco abre linhas para a iniciativa. Posições extremamente táticas.',
      },
    ],
  },
  {
    name: 'Defesa Francesa',
    eco: 'C00–C19',
    lvl: 'Intermediário',
    intro:
      'O preto responde 1...e6, preparando d5 para atacar o centro branco. Sólida e estratégica, com o eterno tema do "bispo ruim" de c8 e da ruptura ...c5.',
    historia:
      'Ganhou o nome de uma partida por correspondência entre Londres e Paris em 1834, vencida pelos franceses. Botvinnik, Petrosian e mais tarde Korchnoi a elevaram a uma defesa de elite; Korchnoi a defendeu em matches de Candidatos e pelo título mundial. É a escolha de quem aceita um bispo passivo em troca de uma estrutura rígida e contra-ataque no flanco da dama.',
    plies: [
      { san: 'e4', note: 'Ocupa o centro.' },
      {
        san: 'e6',
        note: 'O lance da Francesa: prepara ...d5 para golpear e4, sem expor o peão como na resposta simétrica. Consequência: tranca o bispo de c8, que será a peça-problema do preto.',
      },
      { san: 'd4', note: 'O branco monta o grande centro de peões que a Francesa convida a atacar.' },
      {
        san: 'd5',
        note: 'O contra-ataque central característico: o preto pressiona e4 e força o branco a tomar uma decisão sobre a tensão central.',
      },
      {
        san: 'Nc3',
        note: 'Defende e4 e desenvolve. É a Variante Clássica/Winawer, a mais ambiciosa.',
      },
      {
        san: 'Bb4',
        note: 'A Winawer: o bispo crava o cavalo de c3, atacando o defensor de e4. O preto aposta na pressão sobre a estrutura branca, aceitando ceder o par de bispos.',
      },
      {
        san: 'e5',
        note: 'O branco avança e fecha o centro, ganhando espaço e mirando o flanco do rei. A estrutura travada define os planos: branco ataca à direita, preto contra-ataca em c5.',
      },
      {
        san: 'c5',
        note: 'A ruptura típica da Francesa: o preto ataca a base d4 da corrente de peões, abrindo contra-jogo no flanco da dama.',
      },
      {
        san: 'a3',
        note: 'Questiona o bispo cravado, forçando-o a definir-se: capturar em c3 (dobrando os peões brancos) é o tema central da Winawer.',
      },
      {
        san: 'Bxc3+',
        note: 'O preto captura, dobrando os peões brancos em c3 — dano estrutural permanente em troca do par de bispos do branco.',
      },
      {
        san: 'bxc3',
        note: 'Surge a estrutura típica da Winawer: peões brancos dobrados mas com centro forte e par de bispos; jogo desequilibrado e rico.',
      },
    ],
  },
  {
    name: 'Defesa Caro-Kann',
    eco: 'B10–B19',
    lvl: 'Intermediário',
    intro:
      'Como a Francesa, prepara ...d5 — mas com 1...c6, deixando livre a casa do bispo de c8. Reputação de defesa sólida e de baixo risco contra 1.e4.',
    historia:
      'Batizada em homenagem a Horatio Caro e Marcus Kann, que a analisaram em 1886. Capablanca e depois Botvinnik e Petrosian a tornaram respeitável; nos tempos modernos, Karpov e Anand a usaram como muralha de elite. É a defesa preferida de quem quer evitar fraquezas: o preto desenvolve o bispo de c8 para fora ANTES de trancá-lo, corrigindo o principal defeito da Francesa.',
    plies: [
      { san: 'e4', note: 'Ocupa o centro.' },
      {
        san: 'c6',
        note: 'O lance da Caro-Kann: prepara ...d5 mantendo livre a diagonal c8–h3 para o bispo das casas claras. Mais flexível que a Francesa.',
      },
      { san: 'd4', note: 'O branco monta o centro.' },
      {
        san: 'd5',
        note: 'O golpe central. Diferente da Francesa, aqui o bispo de c8 ainda poderá sair antes de ...e6.',
      },
      {
        san: 'Nc3',
        note: 'Defende e4 e prepara a captura. Leva à Variante Clássica.',
      },
      {
        san: 'dxe4',
        note: 'O preto elimina a tensão capturando e4. Vai recuperar a estrutura e desenvolver com folga.',
      },
      {
        san: 'Nxe4',
        note: 'Recaptura centralizando o cavalo.',
      },
      {
        san: 'Bf5',
        note: 'A grande ideia da Caro-Kann: o bispo "problema" sai para uma casa ativa ANTES de ser trancado por ...e6. Aqui ele ataca o cavalo de e4.',
      },
      {
        san: 'Ng3',
        note: 'O cavalo recua atacando o bispo.',
      },
      {
        san: 'Bg6',
        note: 'O bispo encontra um posto seguro e ativo. O preto completou seu objetivo estratégico: estrutura sólida e bispo bom desenvolvido.',
      },
    ],
  },
  {
    name: 'Defesa Escandinava',
    eco: 'B01',
    lvl: 'Iniciante',
    intro:
      'O preto golpeia o centro já no 1º lance com ...d5. Direta e fácil de aprender: a dama sai cedo, mas com um plano claro de desenvolvimento sólido.',
    historia:
      'É uma das aberturas mais antigas registradas (mencionada por Lucena em 1497). Por décadas foi vista com desconfiança por expor a dama, mas ganhou respeito quando Anand a usou para vencer Kasparov em 1995. Hoje é uma escolha popular entre amadores e até em blitz de elite (Carlsen já a empunhou), por ser direta e de pouca teoria.',
    plies: [
      { san: 'e4', note: 'Ocupa o centro.' },
      {
        san: 'd5',
        note: 'A Escandinava: ataca e4 de imediato, sem preparação. Força o branco a decidir já a estrutura central.',
      },
      {
        san: 'exd5',
        note: 'O branco aceita o peão. Se o preto recapturar de dama, ela ficará exposta a ganhos de tempo.',
      },
      {
        san: 'Qxd5',
        note: 'A recaptura clássica. O preço de sair cedo com a dama é dar tempo ao branco; a vantagem é uma estrutura sólida e sem fraquezas.',
      },
      {
        san: 'Nc3',
        note: 'Desenvolve com ganho de tempo, atacando a dama.',
      },
      {
        san: 'Qa5',
        note: 'A casa mais popular: a dama sai da coluna d (evitando uma futura cravada Td1) e fica ativa, vigiando e5.',
      },
      {
        san: 'd4',
        note: 'O branco ocupa o centro com folga e ligeira vantagem de espaço e desenvolvimento.',
      },
      {
        san: 'Nf6',
        note: 'O preto desenvolve naturalmente; seguirá com ...c6, ...Bf5/g4 e ...e6, montando uma estrutura compacta tipo Caro-Kann.',
      },
    ],
  },
  {
    name: 'Defesa Siciliana (Aberta)',
    eco: 'B20–B99',
    lvl: 'Avançado',
    intro:
      'A defesa mais combativa e mais jogada no xadrez de elite. Em vez de simetria, o preto cria uma luta assimétrica buscando contra-jogo na coluna c.',
    historia:
      'Analisada já no séc. XVI pelo italiano Polerio, mas só explodiu no séc. XX. É a resposta que mais vitórias dá às pretas em torneios. Foi a arma de batalha de Fischer e Kasparov — a Najdorf (5...a6) era a favorita de ambos e está entre as linhas mais estudadas da história. Quem joga 1...c5 não busca igualar: busca vencer.',
    plies: [
      { san: 'e4', note: 'Ocupa o centro.' },
      {
        san: 'c5',
        note: 'Defesa Siciliana — a resposta mais combativa a 1.e4. Em vez de imitar, o preto luta pelo centro de forma assimétrica e busca contra-jogo no flanco da dama.',
      },
      { san: 'Nf3', note: 'Desenvolve e prepara o avanço d4.' },
      {
        san: 'd6',
        note: 'Sustenta um futuro ...Cf6 sem ser expulso por e5 e abre o bispo de c8. Estrutura típica das Sicilianas abertas.',
      },
      {
        san: 'd4',
        note: 'O branco abre o centro, dispondo-se a trocar o peão d pelo peão c do preto para ganhar espaço e desenvolvimento.',
      },
      {
        san: 'cxd4',
        note: 'O preto troca o peão de flanco pelo peão central branco — em troca, ganha uma coluna c semiaberta para pressão futura sobre c2/c3.',
      },
      {
        san: 'Nxd4',
        note: 'Recaptura com o cavalo, que fica fortemente centralizado em d4. Surge a estrutura clássica da Siciliana Aberta.',
      },
      {
        san: 'Nf6',
        note: 'Ataca e4 e força o branco a defendê-lo, em geral com Cc3.',
      },
      {
        san: 'Nc3',
        note: 'Defende e4 e desenvolve. Chega-se às grandes encruzilhadas da Siciliana (Najdorf, Scheveningen e outras) — a assimetria que gera as partidas mais ricas e desequilibradas da teoria.',
      },
    ],
  },
  {
    name: 'Gambito da Dama (Recusado)',
    eco: 'D06–D69',
    lvl: 'Intermediário',
    intro:
      'Apesar do nome, não é um gambito real — o peão é recuperável. É a abordagem posicional e sólida do peão-dama, com luta lenta pelo centro.',
    historia:
      'Conhecido desde Lucena e Damiano (séc. XV–XVI), tornou-se o campo de batalha dos matches mundiais: Capablanca x Alekhine (1927) e Karpov x Kasparov travaram dezenas de partidas nesta abertura. É o paradigma do jogo posicional clássico — quem quer aprender estratégia de peão-dama começa aqui.',
    plies: [
      {
        san: 'd4',
        note: 'Ocupa o centro pelo flanco da dama. Abertura mais posicional e sólida que 1.e4, preparando um jogo de manobra.',
      },
      { san: 'd5', note: 'Resposta simétrica clássica, disputando o centro.' },
      {
        san: 'c4',
        note: 'O "Gambito da Dama". Oferece o peão c para desviar o peão d5 do centro. Na prática não é um gambito de verdade: o peão é facilmente recuperável.',
      },
      {
        san: 'e6',
        note: 'Gambito da Dama Recusado: sólido e principista. Abre a saída do bispo de f8 e reforça d5. Consequência: tranca temporariamente o bispo de c8, que precisará de um plano de desenvolvimento.',
      },
      {
        san: 'Nc3',
        note: 'Desenvolve e adiciona um terceiro atacante sobre d5, aumentando a pressão central.',
      },
      {
        san: 'Nf6',
        note: 'Defende d5 e desenvolve. Posição típica de tensão central, onde a estrutura de peões definirá os planos.',
      },
      {
        san: 'Bg5',
        note: 'Crava o cavalo de f6 contra a dama, reduzindo o controle preto sobre d5 e e4. É o sistema principal clássico — luta lenta pelo centro e pelas casas claras.',
      },
    ],
  },
  {
    name: 'Defesa Eslava',
    eco: 'D10–D19',
    lvl: 'Avançado',
    intro:
      'Recusa o Gambito da Dama com ...c6 em vez de ...e6, mantendo livre a diagonal do bispo de c8. Sólida como uma rocha, foi a defesa de campeões do mundo.',
    historia:
      'Ganhou destaque nos anos 1930–40 com a escola soviética (Alekhine, Euwe, Botvinnik). Sua reputação de solidez extrema fez dela arma de match mundial: Anand e depois Carlsen a usaram para igualar com pretas. O charme é resolver o problema do bispo de c8 sem trancá-lo, ao custo de um desenvolvimento mais lento.',
    plies: [
      { san: 'd4', note: 'Ocupa o centro pelo flanco da dama.' },
      { san: 'd5', note: 'Resposta simétrica.' },
      { san: 'c4', note: 'O Gambito da Dama, pressionando d5.' },
      {
        san: 'c6',
        note: 'A Eslava: defende d5 mantendo livre a casa do bispo de c8 (ao contrário de ...e6). Esse é todo o ponto da defesa.',
      },
      { san: 'Nf3', note: 'Desenvolve e controla e5/d4.' },
      { san: 'Nf6', note: 'Defende d5 e desenvolve.' },
      {
        san: 'Nc3',
        note: 'Aumenta a pressão sobre d5. Agora o preto pode capturar em c4 com a ideia de sustentar o peão com ...b5.',
      },
      {
        san: 'dxc4',
        note: 'A Eslava Aceita: o preto captura e tentará segurar o peão com ...b5 ou devolvê-lo por desenvolvimento e pelo bom bispo de c8, que sai para f5 ou g4.',
      },
    ],
  },
  {
    name: 'Abertura Inglesa',
    eco: 'A10–A39',
    lvl: 'Avançado',
    intro:
      'Começa com 1.c4, controlando d5 pelo flanco antes de ocupar o centro. Flexível e posicional, transpõe para inúmeras estruturas — inclusive uma "Siciliana com cores trocadas".',
    historia:
      'Leva o nome de Howard Staunton, o maior enxadrista inglês do séc. XIX, que a empregou no match contra Saint-Amant em 1843. Tornou-se respeitável no séc. XX e foi decisiva no match mundial de 1972: Fischer, que jogava quase só 1.e4, surpreendeu Spassky com 1.c4. Botvinnik, Kasparov e Carlsen a adotaram pela riqueza estratégica.',
    plies: [
      {
        san: 'c4',
        note: 'A Inglesa. Controla d5 à distância e mantém o centro flexível — o branco decide depois se joga d4, e4 ou um fianqueto.',
      },
      {
        san: 'e5',
        note: 'Resposta ativa: o preto ocupa o centro. Surge uma "Siciliana invertida" (com um tempo a mais para o branco).',
      },
      { san: 'Nc3', note: 'Desenvolve e controla d5 e e4.' },
      { san: 'Nf6', note: 'Simetria, controlando d5 e e4 do lado preto.' },
      {
        san: 'Nf3',
        note: 'Ataca e5 e desenvolve para o fianqueto, sem se comprometer com a estrutura de peões.',
      },
      { san: 'Nc6', note: 'Defende e5 e desenvolve.' },
      {
        san: 'g3',
        note: 'O fianqueto característico da Inglesa: o bispo irá a g2, pressionando a grande diagonal e a casa d5 — coração da estratégia branca.',
      },
      {
        san: 'd5',
        note: 'O preto golpeia o centro, aproveitando que o branco ainda não o ocupou. Posição rica e equilibrada de jogo de manobra.',
      },
      { san: 'cxd5', note: 'Abre a coluna c e a diagonal do futuro bispo de g2.' },
      {
        san: 'Nxd5',
        note: 'Recaptura centralizando. A luta girará em torno do controle de d4/d5 e da grande diagonal — estratégia pura.',
      },
    ],
  },
  {
    name: 'Defesa Índia do Rei',
    eco: 'E60–E99',
    lvl: 'Avançado',
    intro:
      'O preto cede o centro de peões ao branco, fiando-se no bispo de g7 e numa explosão posterior com ...e5 ou ...f5. Combate desequilibrado e ferozmente teórico.',
    historia:
      'Revolucionou a teoria nos anos 1940–50 nas mãos dos "hipermodernos" e da escola soviética: Bronstein, Boleslavsky e sobretudo Fischer e Kasparov fizeram dela uma arma de ataque devastadora. Kasparov a usou para vencer partidas decisivas pelo título. O tema é dramático: o branco ataca no flanco da dama, o preto avança os peões do rei rumo ao mate. Quem busca vitória com pretas adora a Índia do Rei.',
    plies: [
      { san: 'd4', note: 'Ocupa o centro.' },
      {
        san: 'Nf6',
        note: 'Controla e4 e mantém opções flexíveis — não se compromete com ...d5.',
      },
      { san: 'c4', note: 'O branco amplia o domínio central.' },
      {
        san: 'g6',
        note: 'Prepara o fianqueto do bispo de rei em g7 — a alma da Índia do Rei. O bispo pressionará o centro e a grande diagonal a longo prazo.',
      },
      { san: 'Nc3', note: 'Desenvolve e reforça o centro.' },
      {
        san: 'Bg7',
        note: 'O bispo ocupa a grande diagonal. O preto permite deliberadamente que o branco construa um centro imponente — para depois atacá-lo.',
      },
      {
        san: 'e4',
        note: 'O branco aceita o convite e monta um centro de peões enorme (d4+e4). Tem espaço; o preto terá contra-jogo.',
      },
      {
        san: 'd6',
        note: 'Prepara a ruptura central ...e5, a ideia-mestra do preto contra o grande centro branco.',
      },
      {
        san: 'Nf3',
        note: 'Desenvolve defendendo e protegendo contra ...e5 imediato.',
      },
      {
        san: 'O-O',
        note: 'O preto roca e completa o desenvolvimento. Vem a tensão central com ...e5: o branco joga no flanco da dama, o preto rumo ao rei branco — uma das lutas mais agudas do xadrez.',
      },
    ],
  },
  {
    name: 'Defesa Nimzo-Índia',
    eco: 'E20–E59',
    lvl: 'Avançado',
    intro:
      'O preto crava o cavalo de c3 com ...Bb4, lutando pelo controle de e4 com peças em vez de peões. Considerada uma das defesas mais respeitadas e correctas contra 1.d4.',
    historia:
      'Criação do gênio hipermoderno Aron Nimzowitsch nos anos 1920, que pregava controlar o centro à distância. Tornou-se a defesa de elite por excelência contra 1.d4: Capablanca, Botvinnik, Fischer, Karpov e Kasparov a empunharam em matches mundiais. Sua solidez é tão reconhecida que o branco muitas vezes evita-a com 3.Nf3 só para não enfrentá-la.',
    plies: [
      { san: 'd4', note: 'Ocupa o centro.' },
      { san: 'Nf6', note: 'Controla e4.' },
      {
        san: 'c4',
        note: 'O branco amplia o centro e prepara Cc3 para dominar e4.',
      },
      {
        san: 'e6',
        note: 'Abre a saída do bispo de f8 (rumo a b4) e mantém d5 como opção. Prepara a cravada característica.',
      },
      {
        san: 'Nc3',
        note: 'O lance que a Nimzo quer provocar: ao desenvolver para c3, o cavalo vira alvo da cravada.',
      },
      {
        san: 'Bb4',
        note: 'A Nimzo-Índia! O bispo crava o cavalo de c3 — o defensor-chave de e4. O preto luta pelo centro com peças, ameaçando dobrar os peões brancos se trocar em c3.',
      },
      {
        san: 'e3',
        note: 'A Variante Rubinstein, a mais sólida: o branco abre o bispo de f1 e prepara o desenvolvimento tranquilo, aceitando viver com a cravada por ora.',
      },
      {
        san: 'O-O',
        note: 'O preto roca e completa o desenvolvimento. A tensão entre o par de bispos do branco e a estrutura superior do preto define um dos equilíbrios mais ricos da teoria.',
      },
    ],
  },
  {
    name: 'Sistema Londres',
    eco: 'D02 / A48',
    lvl: 'Iniciante',
    intro:
      'Um "sistema": o branco joga quase sempre os mesmos lances (d4, Nf3, Bf4, e3, c3, Bd3) contra quase tudo. Fácil de aprender e sólido — ótimo para iniciantes.',
    historia:
      'O nome vem do torneio de Londres de 1922, onde foi muito jogado. Por décadas teve fama de inofensivo, mas explodiu em popularidade nos anos 2010: Carlsen, Kamsky e até motores o adotaram, mostrando que o desenvolvimento simples esconde veneno. Hoje é uma das aberturas mais jogadas do mundo no xadrez amador, justamente por exigir pouca decoração de teoria.',
    plies: [
      { san: 'd4', note: 'Ocupa o centro.' },
      { san: 'd5', note: 'Resposta simétrica.' },
      { san: 'Nf3', note: 'Desenvolve controlando e5, sem revelar o plano.' },
      { san: 'Nf6', note: 'Simetria, controlando e4.' },
      {
        san: 'Bf4',
        note: 'O lance que define o Londres: o bispo de dama sai para FORA da corrente de peões antes de jogar e3 — corrigindo o velho problema do "bispo ruim". Daqui o sistema é quase automático.',
      },
      {
        san: 'e6',
        note: 'O preto abre seu bispo de rei e prepara desenvolvimento sólido.',
      },
      {
        san: 'e3',
        note: 'Sustenta o bispo de f4 e abre o bispo de f1. Estrutura sólida e fácil de jogar.',
      },
      {
        san: 'c5',
        note: 'O preto contesta o centro pelo flanco da dama — a forma mais ativa de enfrentar o Londres.',
      },
      {
        san: 'c3',
        note: 'A "pirâmide" do Londres (d4–e3–c3): centro sólido como rocha, com o plano de Cbd2, Bd3 e, às vezes, um ataque com Ce5 e avanço dos peões do rei.',
      },
    ],
  },
];
