// Partidas históricas pré-cadastradas para estudo no módulo Análise.
//
// Como em todo o app, NÃO gravamos FEN: cada partida é só a lista de lances em
// SAN inglês (que o chess.js reproduz). As notas são um mapa esparso
// ply(0-based) -> explicação em PT-BR, anotando os momentos instrutivos.

export type JogoFamoso = {
  id: string;
  titulo: string;
  brancas: string;
  pretas: string;
  evento: string;
  ano: number;
  resultado: string;
  /** Apresentação da partida (contexto histórico e por que é famosa). */
  resumo: string;
  /** Lances em SAN inglês. */
  sans: string[];
  /** Comentários por meio-lance (índice 0-based). */
  notas: Record<number, string>;
};

function split(s: string): string[] {
  return s.trim().split(/\s+/);
}

export const PARTIDAS_FAMOSAS: JogoFamoso[] = [
  {
    id: 'opera-1858',
    titulo: 'A Partida da Ópera',
    brancas: 'Paul Morphy',
    pretas: 'Duque de Brunswick & Conde Isouard',
    evento: 'Paris, camarote da Ópera',
    ano: 1858,
    resultado: '1–0',
    resumo:
      'A miniatura mais famosa da história. Morphy, o maior gênio de sua época, jogou esta partida num camarote da Ópera de Paris enquanto assistia a "O Barbeiro de Sevilha", contra dois aristocratas amadores que jogavam em consulta. É uma aula perfeita dos três princípios da abertura: desenvolva rápido, ocupe o centro e abra linhas para atacar o rei adversário. Cada peça branca entra no jogo com ameaça; termina num duplo sacrifício de torre e dama.',
    sans: split(
      'e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5 b5 Nxb5 cxb5 Bxb5+ Nbd7 O-O-O Rd8 Rxd7 Rxd7 Rd1 Qe6 Bxd7+ Nxd7 Qb8+ Nxb8 Rd8#',
    ),
    notas: {
      0: 'Morphy abre com o lance mais principista: ocupa o centro e libera bispo e dama.',
      3: 'A Defesa Philidor (3...Bg4). A cravada do bispo parece ativa, mas vai dar a Morphy os tempos de que ele precisa.',
      4: 'dxe5! Morphy abre o centro de imediato — contra reis atrasados no desenvolvimento, abrir linhas é a regra de ouro.',
      5: 'As pretas têm de capturar (5...Bxf3), senão perdem peão sem compensação após 5...dxe5 6.Qxd8+.',
      6: 'Qxf3: a dama recaptura e já mira f7, o ponto fraco. Morphy desenvolve sempre COM ameaça.',
      10: 'Bc4: o bispo se junta ao ataque sobre f7. Brancas têm duas peças ativas; pretas, nenhuma além da dama.',
      12: 'Qb3! Dupla pressão sobre b7 e f7 ao mesmo tempo. As pretas já têm de se defender de forma passiva.',
      13: '13...Qe7 defende f7, mas tranca o bispo de f8 e deixa o rei preso no centro.',
      14: 'Nc3: Morphy ignora o peão de b7 — desenvolvimento e ataque valem mais que um peão.',
      16: 'Bg5: a última peça menor entra no jogo, cravando o cavalo de f6. Todas as peças brancas atacam; as pretas mal se moveram.',
      17: '17...b5? Tentativa desesperada de ganhar espaço — mas abre a posição justamente onde Morphy é mais forte.',
      18: 'Nxb5!! O sacrifício temático. Abre a coluna e a diagonal contra o rei preto, ainda preso no centro.',
      22: 'O-O-O! Morphy roca e ao mesmo tempo coloca a torre na coluna "d" aberta, com cravada mortal sobre o cavalo de d7.',
      24: 'Rxd7! Sacrifício de torre para eliminar o defensor e manter o rei preto sob fogo.',
      26: 'Rd1: a segunda torre entra na coluna "d" com a mesma cravada. As pretas estão totalmente paralisadas.',
      28: 'Bxd7+: limpa o caminho para o golpe final.',
      30: 'Qb8+!! O sacrifício de dama que imortaliza a partida — desvia o cavalo de b8 para abrir o mate.',
      32: 'Rd8#: mate puro. Morphy deu mate usando só as peças que desenvolveu, no exato momento em que as pretas ainda não tinham desenvolvido quase nada.',
    },
  },
  {
    id: 'immortal-1851',
    titulo: 'A Partida Imortal',
    brancas: 'Adolf Anderssen',
    pretas: 'Lionel Kieseritzky',
    evento: 'Londres (partida amistosa)',
    ano: 1851,
    resultado: '1–0',
    resumo:
      'O ícone do Xadrez Romântico. Jogada de forma informal durante uma pausa do primeiro torneio internacional da história, Anderssen sacrifica um bispo, as duas torres e a dama — fica com apenas três peças menores — e dá mate. Não é a partida mais "correta" segundo os motores modernos, mas é a celebração máxima do ataque acima do material. O Gambito do Rei em estado puro.',
    sans: split(
      'e4 e5 f4 exf4 Bc4 Qh4+ Kf1 b5 Bxb5 Nf6 Nf3 Qh6 d3 Nh5 Nh4 Qg5 Nf5 c6 g4 Nf6 Rg1 cxb5 h4 Qg6 h5 Qg5 Qf3 Ng8 Bxf4 Qf6 Nc3 Bc5 Nd5 Qxb2 Bd6 Bxg1 e5 Qxa1+ Ke2 Na6 Nxg7+ Kd8 Qf6+ Nxf6 Be7#',
    ),
    notas: {
      2: 'O Gambito do Rei: Anderssen oferece o peão "f" por desenvolvimento e ataque, o estilo da época.',
      5: '4...b5!? — o Contragambito Bryan. Kieseritzky devolve material para ganhar tempo contra o bispo.',
      6: 'Anderssen aceita (6.Bxb5) — toma o peão e mantém a iniciativa.',
      18: '9.Nf5! O cavalo crava-se no coração da posição preta; ameaças começam a se acumular.',
      20: '10.g4! Anderssen avança os peões do flanco do rei mesmo com o próprio rei exposto — tudo pela iniciativa.',
      21: '11.Rg1! Oferece a torre de a1: prioriza o ataque ao invés de salvar material.',
      30: '15.Bxf4 e a sequência seguinte: a dama preta é caçada pelo tabuleiro enquanto as brancas desenvolvem com ameaças.',
      33: '17.Nd5! Dois lances brilhantes seguidos: o cavalo ataca a dama e prepara o golpe, ignorando as torres brancas.',
      34: '17...Qxb2: as pretas devoram material (vão capturar torre e dama), mas cada captura as afasta da defesa.',
      35: '18.Bd6!! A joia da partida: oferece o segundo bispo, bloqueia a defesa e prepara a rede de mate.',
      37: '19.e5! Fecha a diagonal da dama preta sobre g1 e abre o caminho — as brancas jogam com 3 peças menores contra um exército.',
      40: '21.Nxg7+: começa o mate. O rei preto é arrastado para a rede.',
      42: '22.Qf6+!! Sacrifício de dama: desvia o cavalo e prepara o golpe final com as peças menores.',
      44: '23.Be7#: mate com os dois cavalos e o bispo, tendo sacrificado bispo, duas torres e a dama. Imortal.',
    },
  },
  {
    id: 'evergreen-1852',
    titulo: 'A Partida Sempre-Viva (Evergreen)',
    brancas: 'Adolf Anderssen',
    pretas: 'Jean Dufresne',
    evento: 'Berlim (partida amistosa)',
    ano: 1852,
    resultado: '1–0',
    resumo:
      'Apelidada de "Evergreen" (sempre-viva) por Wilhelm Steinitz, que a considerava um exemplo eterno de beleza. Saída de um Gambito Evans, culmina numa das combinações de mate mais elegantes já jogadas: um sacrifício de torre e dama que entrelaça as peças menores numa rede perfeita. A prova de que Anderssen não foi um acaso na Imortal.',
    sans: split(
      'e4 e5 Nf3 Nc6 Bc4 Bc5 b4 Bxb4 c3 Ba5 d4 exd4 O-O d3 Qb3 Qf6 e5 Qg6 Re1 Nge7 Ba3 b5 Qxb5 Rb8 Qa4 Bb6 Nbd2 Bb7 Ne4 Qf5 Bxd3 Qh5 Nf6+ gxf6 exf6 Rg8 Rad1 Qxf3 Rxe7+ Nxe7 Qxd7+ Kxd7 Bf5+ Ke8 Bd7+ Kf8 Bxe7#',
    ),
    notas: {
      6: 'O Gambito Evans (7.b4): Anderssen oferece um peão para ganhar tempo e montar um centro forte.',
      14: '8.Qb3! Mira f7 e prepara pressão; o tema do gambito é a iniciativa, não o material.',
      20: '11.Ba3! O bispo na grande diagonal impede o roque preto — o rei de Dufresne ficará no centro, fatal.',
      28: '15.Ne4! Centraliza o cavalo e mira f6/d6; as brancas concentram forças contra o rei preso.',
      32: '17.Nf6+!? gxf6 18.exf6 — Anderssen rasga a frente do rei preto e ameaça a coluna "g" e a diagonal.',
      36: '19.Rad1!! O lance imortal desta partida: em vez de salvar a dama atacada, Anderssen traz a ÚLTIMA peça ao ataque. A ameaça é 20.Qxd7+!!',
      38: '20.Rxe7+! Começa a combinação final, atraindo o rei para o golpe.',
      40: '21.Qxd7+!! Sacrifício de dama que arrasta o rei para a rede de mate das peças menores.',
      42: '22.Bf5+: o bispo entra com xeque à descoberta, conduzindo o rei.',
      44: '23.Bd7+: o bispo dança, fechando a rede.',
      46: '24.Bxe7#: mate, com a torre e os dois bispos coordenados. Steinitz batizou-a de "sempre-viva".',
    },
  },
  {
    id: 'fischer-1956',
    titulo: 'A Partida do Século',
    brancas: 'Donald Byrne',
    pretas: 'Robert J. Fischer',
    evento: 'Torneio Rosenwald, Nova York',
    ano: 1956,
    resultado: '0–1',
    resumo:
      'Bobby Fischer tinha apenas 13 anos quando jogou esta obra-prima contra um forte mestre. O lance 11...Na4!! e o subsequente sacrifício da dama por 17...Be6!! revelaram um gênio precoce. Fischer entrega a dama mas obtém torre, bispo e cavalo, além de uma rede de mate inescapável que conduz com precisão fria. Batizada de "Partida do Século" pela revista Chess Review.',
    sans: split(
      'Nf3 Nf6 c4 g6 Nc3 Bg7 d4 O-O Bf4 d5 Qb3 dxc4 Qxc4 c6 e4 Nbd7 Rd1 Nb6 Qc5 Bg4 Bg5 Na4 Qa3 Nxc3 bxc3 Nxe4 Bxe7 Qb6 Bc4 Nxc3 Bc5 Rfe8+ Kf1 Be6 Bxb6 Bxc4+ Kg1 Ne2+ Kf1 Nxd4+ Kg1 Ne2+ Kf1 Nc3+ Kg1 axb6 Qb4 Ra4 Qxb6 Nxd1 h3 Rxa2 Kh2 Nxf2 Re1 Rxe1 Qd8+ Bf8 Nxe1 Bd5 Nf3 Ne4 Qb8 b5 h4 h5 Ne5 Kg7 Kg1 Bc5+ Kf1 Ng3+ Ke1 Bb4+ Kd1 Bb3+ Kc1 Ne2+ Kb1 Nc3+ Kc1 Rc2#',
    ),
    notas: {
      8: '5.Bf4 dá uma Defesa Grünfeld. Fischer escolhe a defesa mais combativa contra 1.d4.',
      16: '9.Rd1 parece natural, mas deixa a dama branca aventurada longe do rei — Fischer vai explorar isso.',
      20: '11...Na4!! O lance que anuncia o gênio: oferece a troca em c3 para destruir o centro branco e expor a dama.',
      25: '13...Nxe4!! Início da combinação imortal. Se 14.Bxe7?? então vem o tema do sacrifício de dama.',
      27: '14.Bxe7 Qb6! As pretas ignoram a dama atacada e preparam o golpe.',
      32: '17...Be6!! O sacrifício de dama. Fischer entrega a peça mais valiosa porque vê que torre, bispo e cavalo coordenados são imparáveis.',
      33: '18.Bxb6 — Byrne aceita a dama; agora Fischer colhe a colheita com xeques sucessivos.',
      36: '19...Ne2+ inicia o "moinho" de xeques que recupera material e desmonta a posição branca.',
      48: 'Após a poeira baixar, Fischer tem torre, dois bispos e cavalo pela dama — vantagem material e ataque.',
      80: '41...Rc2# (Tc2#): o mate final, conduzido com precisão absoluta por um menino de 13 anos. Lendária.',
    },
  },
];
