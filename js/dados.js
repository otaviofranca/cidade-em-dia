/* ==========================================================
   dados.js  |  Cidade em Dia
   Metadados (categorias, status, equipes, bairros) e gerador
   dos dados fictícios. Tudo embutido: nada de fetch de JSON.
   ========================================================== */

const CATEGORIAS = [
  { id: "buraco",     emoji: "🕳️", rotulo: "Buraco na rua",       equipe: "tapa-buracos" },
  { id: "iluminacao", emoji: "💡", rotulo: "Iluminação pública",  equipe: "iluminacao" },
  { id: "entulho",    emoji: "🗑️", rotulo: "Entulho/lixo",        equipe: "limpeza" },
  { id: "mato",       emoji: "🌿", rotulo: "Mato alto",           equipe: "parques" },
  { id: "arvore",     emoji: "🌳", rotulo: "Árvore com risco",    equipe: "defesa-civil" },
  { id: "calcada",    emoji: "🚧", rotulo: "Calçada danificada",  equipe: "tapa-buracos" },
  { id: "outros",     emoji: "📌", rotulo: "Outros",              equipe: null }
];

const STATUS = [
  { id: "recebida",  rotulo: "Recebida",         cor: "#0b4f9c" },
  { id: "analise",   rotulo: "Em análise",       cor: "#e08a00" },
  { id: "caminho",   rotulo: "Equipe a caminho", cor: "#7b3fb5" },
  { id: "resolvida", rotulo: "Resolvida",        cor: "#17794a" }
];

const EQUIPES = [
  { id: "tapa-buracos", nome: "Tapa-buracos" },
  { id: "iluminacao",   nome: "Iluminação pública" },
  { id: "limpeza",      nome: "Limpeza urbana" },
  { id: "parques",      nome: "Parques e jardins" },
  { id: "defesa-civil", nome: "Defesa Civil" }
];

// dx e dy: deslocamento em km a leste e ao norte do CENTRO
const BAIRROS = [
  { nome: "Centro",            dx:  0.0, dy:  0.0 },
  { nome: "Vila Nova",         dx:  1.1, dy:  0.8 },
  { nome: "Jardim das Flores", dx: -1.0, dy:  1.0 },
  { nome: "São José",          dx: -0.9, dy: -1.0 },
  { nome: "Bairro Industrial", dx:  1.2, dy: -1.1 }
];

/* Converte deslocamento em km (leste, norte) para [lat, lng] a partir do CENTRO */
function kmParaCoord(dxKm, dyKm) {
  const lat = CENTRO[0] + dyKm / 111.32;
  const lng = CENTRO[1] + dxKm / (111.32 * Math.cos(CENTRO[0] * Math.PI / 180));
  return [lat, lng];
}

/* Gerador pseudoaleatório com semente (mesmos dados a cada restauração) */
function criarRandom(semente) {
  let a = semente >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function embaralhar(lista, rnd) {
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}

/* Sorteio com variedade: percorre todos os valores antes de repetir */
function sorteioBalanceado(n, tamanho, rnd) {
  const saida = [];
  while (saida.length < n) {
    const ordem = embaralhar(Array.from({ length: tamanho }, (_, i) => i), rnd);
    ordem.forEach(i => saida.length < n && saida.push(i));
  }
  return saida;
}

const DESCRICOES_EXEMPLO = {
  buraco: [
    "Buraco grande no meio da pista, perigoso para motos.",
    "Buraco ao lado do bueiro, carros desviam para a outra faixa.",
    "O asfalto cedeu depois da chuva."
  ],
  iluminacao: [
    "Poste apagado há mais de uma semana.",
    "A luz fica piscando a noite toda.",
    "Rua inteira sem iluminação."
  ],
  entulho: [
    "Entulho de obra deixado na calçada.",
    "Lixo acumulado na esquina, com mau cheiro.",
    "Móveis velhos jogados no terreno baldio."
  ],
  mato: [
    "Mato alto cobrindo a calçada.",
    "Terreno público com mato na altura da cintura.",
    "Capim tomando conta da praça."
  ],
  arvore: [
    "Galho grande prestes a cair sobre a fiação.",
    "Árvore inclinada depois do vento forte.",
    "Tronco rachado perto do ponto de ônibus."
  ],
  calcada: [
    "Calçada quebrada, difícil para cadeirantes.",
    "Pedras soltas na calçada em frente à escola.",
    "Raiz levantou o piso e causa tropeços."
  ],
  outros: [
    "Placa de rua caída.",
    "Bueiro sem tampa.",
    "Banco da praça quebrado."
  ]
};

const REFERENCIAS_EXEMPLO = [
  "Em frente ao nº 120", "Perto da praça", "Próximo à escola", "",
  "Ao lado do mercado", "Esquina com a avenida principal", "",
  "Perto do ponto de ônibus", "Atrás da igreja", ""
];

const RESPOSTAS_EXEMPLO = {
  recebida: "",
  analise: "Recebemos sua solicitação e ela está em análise pela equipe responsável.",
  caminho: "Uma equipe foi designada e deve chegar ao local nos próximos dias.",
  resolvida: "Serviço executado. Obrigado por colaborar com a sua cidade!"
};

/* Gera as 30 ocorrências fictícias: 10 recebidas, 8 em análise,
   4 equipe a caminho e 8 resolvidas, nos últimos 45 dias. */
function gerarDadosExemplo() {
  const rnd = criarRandom(2026);
  const DIA = 86400000;
  const agora = Date.now();
  const N = 30;

  // 1) Idades (em dias) e status. As mais antigas tendem a estar mais adiantadas.
  const itens = [];
  for (let i = 0; i < N; i++) {
    const idade = 0.3 + 44.5 * Math.pow(rnd(), 1.25);
    itens.push({ idade, score: idade / 45 + (rnd() - 0.5) * 0.8, status: null });
  }
  const sequencia = []
    .concat(Array(8).fill("resolvida"), Array(4).fill("caminho"),
            Array(8).fill("analise"), Array(10).fill("recebida"));
  itens.slice().sort((a, b) => b.score - a.score)
    .forEach((it, pos) => { it.status = sequencia[pos]; });
  itens.sort((a, b) => b.idade - a.idade); // mais antigas primeiro

  const poolCat = sorteioBalanceado(N, CATEGORIAS.length, rnd);
  const poolBairro = sorteioBalanceado(N, BAIRROS.length, rnd);
  const contProtocolo = {};
  const contOS = {};
  const iso = ms => new Date(ms).toISOString();

  const ocorrencias = itens.map((it, i) => {
    const cat = CATEGORIAS[poolCat[i]];
    const bairro = BAIRROS[poolBairro[i]];

    // coordenadas: em torno do bairro, sempre dentro do raio do CENTRO
    const ang = rnd() * 2 * Math.PI;
    const r = 0.7 * Math.sqrt(rnd());
    let dx = bairro.dx + r * Math.cos(ang);
    let dy = bairro.dy + r * Math.sin(ang);
    const dist = Math.hypot(dx, dy);
    if (dist > RAIO_KM) { dx *= RAIO_KM / dist; dy *= RAIO_KM / dist; }
    const [lat, lng] = kmParaCoord(dx, dy);

    // linha do tempo, sempre antes de "agora"
    const criadoMs = agora - it.idade * DIA;
    let f1 = 0.06 + 0.18 * rnd();
    let f2 = f1 + 0.08 + 0.18 * rnd();
    let f3 = Math.min(f2 + 0.12 + 0.30 * rnd(), 0.97);
    f2 = Math.min(f2, f3 - 0.03);
    f1 = Math.min(f1, f2 - 0.02);
    const t = f => criadoMs + it.idade * DIA * f;

    const historico = [{ status: "recebida", em: iso(criadoMs) }];
    if (it.status !== "recebida") historico.push({ status: "analise", em: iso(t(f1)) });
    if (it.status === "caminho" || it.status === "resolvida") historico.push({ status: "caminho", em: iso(t(f2)) });
    if (it.status === "resolvida") historico.push({ status: "resolvida", em: iso(t(f3)) });

    const equipe = it.status === "recebida"
      ? null
      : (cat.equipe || EQUIPES[Math.floor(rnd() * EQUIPES.length)].id);

    const ano = new Date(criadoMs).getFullYear();
    contProtocolo[ano] = (contProtocolo[ano] || 0) + 1;

    let os = null;
    if (it.status === "caminho" || it.status === "resolvida") {
      const anoOS = new Date(t(f2)).getFullYear();
      contOS[anoOS] = (contOS[anoOS] || 0) + 1;
      os = {
        numero: "OS-" + anoOS + "-" + String(contOS[anoOS]).padStart(4, "0"),
        geradaEm: iso(t(f2))
      };
    }

    const descs = DESCRICOES_EXEMPLO[cat.id];
    return {
      id: "ex" + (i + 1),
      protocolo: "CE-" + ano + "-" + String(contProtocolo[ano]).padStart(4, "0"),
      categoria: cat.id,
      bairro: bairro.nome,
      referencia: REFERENCIAS_EXEMPLO[Math.floor(rnd() * REFERENCIAS_EXEMPLO.length)],
      lat, lng,
      descricao: descs[Math.floor(rnd() * descs.length)],
      foto: null,
      status: it.status,
      equipe,
      resposta: RESPOSTAS_EXEMPLO[it.status],
      criadoEm: iso(criadoMs),
      resolvidoEm: it.status === "resolvida" ? iso(t(f3)) : null,
      historico,
      os,
      semMapa: false
    };
  });

  return { versao: 1, ocorrencias };
}
