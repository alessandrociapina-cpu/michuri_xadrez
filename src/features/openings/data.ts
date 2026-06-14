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
  plies: Ply[];
};

export const OPENINGS: Opening[] = [
  {
    name: 'Abertura Italiana (Giuoco Piano)',
    eco: 'C50–C54',
    lvl: 'Intermediário',
    intro:
      'Jogo aberto clássico e didático: ambos os lados desenvolvem rápido e miram o ponto fraco f7/f2. Excelente para aprender princípios de abertura.',
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
    name: 'Gambito do Rei (Aceito)',
    eco: 'C33–C39',
    lvl: 'Avançado',
    intro:
      'O gambito romântico do século XIX. O branco sacrifica um peão por desenvolvimento e ataque ao rei — jogo agudo, tático e arriscado para os dois lados.',
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
    name: 'Gambito da Dama (Recusado)',
    eco: 'D06–D69',
    lvl: 'Intermediário',
    intro:
      'Apesar do nome, não é um gambito real — o peão é recuperável. É a abordagem posicional e sólida do peão-dama, com luta lenta pelo centro.',
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
    name: 'Defesa Siciliana (Aberta)',
    eco: 'B20–B99',
    lvl: 'Avançado',
    intro:
      'A defesa mais combativa e mais jogada no xadrez de elite. Em vez de simetria, o preto cria uma luta assimétrica buscando contra-jogo na coluna c.',
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
];
