/* ==========================================================
   store.js  |  Cidade em Dia
   Acesso ao localStorage + utilidades usadas pelo cidadão e
   pelo admin. As duas páginas leem e gravam as MESMAS chaves,
   por isso compartilham os dados no mesmo navegador.
   ========================================================== */

/* ---------- Utilidades ---------- */
const U = {
  esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  },

  data(iso) {
    return new Date(iso).toLocaleDateString("pt-BR");
  },

  dataHora(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR") + " às " +
      d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  },

  /* diferença em dias (com fração) entre duas datas ISO */
  dias(deIso, ateIso) {
    return (new Date(ateIso) - new Date(deIso)) / 86400000;
  },

  num(n, casas) {
    return n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
  },

  cat(id) { return CATEGORIAS.find(c => c.id === id) || CATEGORIAS[CATEGORIAS.length - 1]; },
  st(id) { return STATUS.find(s => s.id === id) || STATUS[0]; },
  equipe(id) { const e = EQUIPES.find(x => x.id === id); return e ? e.nome : "Sem equipe"; },

  chip(status) {
    const s = U.st(status);
    return '<span class="chip chip-' + s.id + '">' + s.rotulo + "</span>";
  },

  foto(o) { return o.foto || U.placeholder(o.categoria); },

  /* Bairro cujo centro fica mais perto do ponto. Retorna { bairro, distKm } */
  bairroMaisProximo(lat, lng) {
    const dy = (lat - CENTRO[0]) * 111.32;
    const dx = (lng - CENTRO[1]) * 111.32 * Math.cos(CENTRO[0] * Math.PI / 180);
    let melhor = null;
    BAIRROS.forEach(b => {
      const d = Math.hypot(dx - b.dx, dy - b.dy);
      if (!melhor || d < melhor.distKm) melhor = { bairro: b, distKm: d };
    });
    return melhor;
  },

  /* Placeholder desenhado em SVG para ocorrências sem foto */
  placeholder(catId) {
    if (!U._cachePh) U._cachePh = {};
    if (U._cachePh[catId]) return U._cachePh[catId];

    let lamina = "";
    for (let i = 0; i < 34; i++) {
      const x = 8 + i * 11.5;
      const h = 60 + ((i * 37) % 55);
      const dx = ((i * 53) % 21) - 10;
      lamina += '<path d="M' + x + " 215Q" + (x + dx / 2) + " " + (215 - h / 2) + " " + (x + dx) + " " + (215 - h) +
        '" stroke="' + (i % 3 ? "#2f7d32" : "#3f9a43") + '" stroke-width="7" fill="none" stroke-linecap="round"/>';
    }

    const desenhos = {
      buraco:
        '<rect width="400" height="250" fill="#aab4bd"/><rect y="120" width="400" height="130" fill="#59636d"/>' +
        '<rect y="118" width="400" height="6" fill="#3c444c"/><path d="M0 205H400" stroke="#f6c600" stroke-width="6" stroke-dasharray="36 24"/>' +
        '<ellipse cx="200" cy="170" rx="105" ry="34" fill="#2a3036"/><ellipse cx="200" cy="164" rx="82" ry="22" fill="#11161a"/>' +
        '<path d="M95 174 62 196M305 174 340 192M128 146 92 132M276 144 312 130" stroke="#2a3036" stroke-width="4" fill="none" stroke-linecap="round"/>',
      iluminacao:
        '<rect width="400" height="250" fill="#1d2b4d"/><circle cx="60" cy="40" r="3" fill="#fff"/><circle cx="340" cy="60" r="2" fill="#fff"/>' +
        '<circle cx="110" cy="90" r="2" fill="#fff"/><circle cx="310" cy="130" r="2" fill="#fff"/><rect y="200" width="400" height="50" fill="#2d3742"/>' +
        '<rect x="196" y="70" width="10" height="135" fill="#56606c"/><path d="M201 74Q201 48 250 48" stroke="#56606c" stroke-width="9" fill="none"/>' +
        '<rect x="236" y="46" width="44" height="14" rx="6" fill="#7b8590"/><path d="M247 70 269 90M269 70 247 90" stroke="#e5484d" stroke-width="5" stroke-linecap="round"/>',
      entulho:
        '<rect width="400" height="250" fill="#d5dce2"/><rect y="160" width="400" height="90" fill="#8c9399"/>' +
        '<ellipse cx="120" cy="175" rx="48" ry="40" fill="#23282d"/><ellipse cx="190" cy="185" rx="42" ry="34" fill="#2f353b"/>' +
        '<ellipse cx="240" cy="170" rx="38" ry="38" fill="#23282d"/><rect x="270" y="145" width="86" height="60" fill="#a77b4f" stroke="#7d5a38" stroke-width="3"/>' +
        '<path d="M270 163H356M313 145v60" stroke="#7d5a38" stroke-width="3"/><path d="M50 200 110 188 145 205" stroke="#6b4f33" stroke-width="8" fill="none" stroke-linecap="round"/>',
      mato:
        '<rect width="400" height="250" fill="#cfe7f7"/><circle cx="330" cy="50" r="26" fill="#f6c600"/><rect y="205" width="400" height="45" fill="#4f8a3f"/>' + lamina,
      arvore:
        '<rect width="400" height="250" fill="#cfe7f7"/><rect y="195" width="400" height="55" fill="#6b9e55"/>' +
        '<g transform="rotate(-9 190 215)"><path d="M172 215 182 100 206 100 214 215Z" fill="#7a5230"/>' +
        '<circle cx="150" cy="85" r="48" fill="#2e7d32"/><circle cx="205" cy="70" r="56" fill="#388e3c"/><circle cx="235" cy="105" r="42" fill="#2e7d32"/></g>' +
        '<path d="M335 40 372 104H298Z" fill="#f6c600" stroke="#1d252d" stroke-width="5" stroke-linejoin="round"/>' +
        '<path d="M335 62v24" stroke="#1d252d" stroke-width="6" stroke-linecap="round"/><circle cx="335" cy="95" r="3.5" fill="#1d252d"/>',
      calcada:
        '<defs><pattern id="t" width="80" height="50" patternUnits="userSpaceOnUse"><rect width="80" height="50" fill="#cfd5db" stroke="#a3acb4" stroke-width="3"/></pattern></defs>' +
        '<rect width="400" height="250" fill="#8e9aa5"/><rect y="70" width="400" height="180" fill="url(#t)"/>' +
        '<path d="M70 250 120 195 170 160 235 140 310 96" stroke="#2c333a" stroke-width="6" fill="none" stroke-linejoin="round"/>' +
        '<path d="M170 160 150 130 190 118 235 140Z" fill="#e3e8ec" stroke="#2c333a" stroke-width="3"/>',
      outros:
        '<rect width="400" height="250" fill="#d9dee3"/><circle cx="200" cy="115" r="68" fill="#fff" stroke="#1d252d" stroke-width="8"/>' +
        '<text x="200" y="150" text-anchor="middle" font-family="Arial,sans-serif" font-size="100" font-weight="700" fill="#1d252d">?</text>'
    };

    const corpo = desenhos[catId] || desenhos.outros;
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250">' + corpo +
      '<rect y="218" width="400" height="32" fill="rgba(29,37,45,.82)"/>' +
      '<text x="14" y="240" font-family="Arial,sans-serif" font-size="16" fill="#ffffff">Imagem ilustrativa, sem foto</text></svg>';
    U._cachePh[catId] = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    return U._cachePh[catId];
  }
};

/* ---------- Armazenamento ---------- */
const Store = (function () {
  const memoria = {};            // plano B se o localStorage estiver bloqueado
  let cacheTexto = null;
  let cacheDados = null;

  function ehCota(e) {
    return e && (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
                 e.code === 22 || e.code === 1014);
  }

  function ler(chave) {
    try { return localStorage.getItem(chave); }
    catch (e) { return memoria[chave] || null; }
  }

  /* Retorna { ok:true } ou { ok:false, cota:true|false } */
  function gravar(chave, texto) {
    try {
      localStorage.setItem(chave, texto);
      return { ok: true };
    } catch (e) {
      if (ehCota(e)) return { ok: false, cota: true };
      memoria[chave] = texto;     // armazenamento indisponível: guarda só em memória
      return { ok: true, memoria: true };
    }
  }

  function dados() {
    let texto = ler(CHAVE_DADOS);
    if (!texto) {
      const semente = gerarDadosExemplo();
      texto = JSON.stringify(semente);
      gravar(CHAVE_DADOS, texto);
      cacheTexto = texto;
      cacheDados = semente;
      return cacheDados;
    }
    if (texto !== cacheTexto) {
      try {
        cacheDados = JSON.parse(texto);
      } catch (e) {
        cacheDados = gerarDadosExemplo();
        texto = JSON.stringify(cacheDados);
        gravar(CHAVE_DADOS, texto);
      }
      cacheTexto = texto;
    }
    return cacheDados;
  }

  function clonar(x) { return JSON.parse(JSON.stringify(x)); }

  function salvar(d) {
    const texto = JSON.stringify(d);
    const r = gravar(CHAVE_DADOS, texto);
    if (r.ok) { cacheTexto = texto; cacheDados = d; }
    return r;
  }

  function proximoNumero(prefixo, extrair) {
    const ano = new Date().getFullYear();
    const inicio = prefixo + "-" + ano + "-";
    let max = 0;
    dados().ocorrencias.forEach(o => {
      const valor = extrair(o);
      if (valor && valor.indexOf(inicio) === 0) {
        const n = parseInt(valor.slice(inicio.length), 10);
        if (n > max) max = n;
      }
    });
    return inicio + String(max + 1).padStart(4, "0");
  }

  return {
    todas() { return dados().ocorrencias.slice(); },
    obter(id) { return dados().ocorrencias.find(o => o.id === id) || null; },
    porProtocolo(p) { return dados().ocorrencias.find(o => o.protocolo === p) || null; },

    adicionar(oc) {
      const d = clonar(dados());
      d.ocorrencias.push(oc);
      return salvar(d);
    },

    /* fn recebe uma cópia da ocorrência e a modifica */
    atualizar(id, fn) {
      const d = clonar(dados());
      const o = d.ocorrencias.find(x => x.id === id);
      if (!o) return { ok: false };
      fn(o);
      return salvar(d);
    },

    restaurar() {
      const r = salvar(gerarDadosExemplo());
      gravar(CHAVE_MEUS, "[]");
      return r;
    },

    proximoProtocolo() { return proximoNumero("CE", o => o.protocolo); },
    proximaOS() { return proximoNumero("OS", o => o.os && o.os.numero); },

    /* Protocolos registrados neste aparelho, do mais antigo ao mais novo */
    meus() {
      try { return JSON.parse(ler(CHAVE_MEUS) || "[]"); } catch (e) { return []; }
    },
    guardarMeu(protocolo) {
      const lista = Store.meus();
      lista.push(protocolo);
      gravar(CHAVE_MEUS, JSON.stringify(lista));
    },

    /* Avisa quando OUTRA aba altera os dados (evento "storage") */
    aoMudar(callback) {
      window.addEventListener("storage", e => {
        if (e.key === null || e.key === CHAVE_DADOS || e.key === CHAVE_MEUS) callback();
      });
    }
  };
})();
