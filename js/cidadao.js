/* ==========================================================
   cidadao.js  |  Cidade em Dia (app do cidadão, mobile-first)
   Fluxo: Início > 1 Categoria > 2 Foto > 3 Local >
          4 Descrição e revisão > 5 Confirmação. Também: Acompanhar.
   ========================================================== */
(function () {
  "use strict";

  const $ = (seletor, raiz) => (raiz || document).querySelector(seletor);
  const esc = U.esc;

  const elTopo = document.getElementById("topo");
  const elMiolo = document.getElementById("miolo");
  const elRodape = document.getElementById("rodape");

  const TOTAL_PASSOS = 5;
  const PASSO = { categoria: 1, foto: 2, local: 3, revisao: 4, confirmacao: 5 };
  const ANTERIOR = {
    categoria: "inicio", foto: "categoria", local: "foto", revisao: "local",
    confirmacao: "inicio", acompanhar: "inicio"
  };

  /* ---------- Estado ---------- */
  let tela = "inicio";
  let origemDetalhe = "inicio";
  let detalheProtocolo = null;
  let ultimoProtocolo = null;
  let rascunho = novoRascunho();
  let mapa = null;
  let marcador = null;
  let processandoFoto = false;
  let msgFoto = "";
  let msgEnvio = "";
  let podeEnviarSemFoto = false;
  let enviando = false;

  function novoRascunho() {
    return {
      categoria: null, foto: null,
      lat: CENTRO[0], lng: CENTRO[1],
      localDefinido: false,       // true quando a pessoa marcou o ponto (toque, arraste ou GPS)
      bairro: "", bairroManual: false,
      referencia: "", descricao: "", semMapa: false
    };
  }

  /* ---------- Navegação ---------- */
  function ir(nova) { tela = nova; render(); }

  function render() {
    destruirMapa();
    const def = TELAS[tela];
    elTopo.innerHTML = htmlTopo();
    elMiolo.innerHTML = def.corpo();
    elRodape.innerHTML = def.rodape ? def.rodape() : "";
    if (def.montar) def.montar();
    elMiolo.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function htmlTopo() {
    const passo = PASSO[tela];
    let progresso = '<div class="topo-folga"></div>';
    if (passo) {
      progresso =
        '<div class="progresso"><span class="progresso-rotulo">Passo ' + passo + " de " + TOTAL_PASSOS + "</span>" +
        '<div class="trilha" role="progressbar" aria-valuemin="1" aria-valuemax="' + TOTAL_PASSOS +
        '" aria-valuenow="' + passo + '"><div class="trilha-cheia" style="width:' + (passo / TOTAL_PASSOS * 100) + '%"></div></div></div>';
    }
    return '<div class="topo-linha">' +
      '<button type="button" class="btn-voltar" data-acao="voltar"' + (tela === "inicio" ? " hidden" : "") + ">← Voltar</button>" +
      '<span class="marca">Cidade em Dia</span></div>' + progresso;
  }

  /* ---------- Componentes ---------- */
  function cartaoOcorrencia(o) {
    const c = U.cat(o.categoria);
    return '<button type="button" class="cartao-oc" data-acao="abrir" data-p="' + esc(o.protocolo) + '">' +
      '<span class="cartao-emoji" aria-hidden="true">' + c.emoji + "</span>" +
      '<span class="cartao-corpo"><strong>' + esc(c.rotulo) + "</strong>" +
      "<small>" + esc(o.protocolo) + "</small><small>" + U.data(o.criadoEm) + "</small></span>" +
      U.chip(o.status) + "</button>";
  }

  function meusRecentes() {
    return Store.meus().map(p => Store.porProtocolo(p)).filter(Boolean)
      .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
  }

  function linhaDoTempo(o) {
    const atual = STATUS.findIndex(s => s.id === o.status);
    return '<ol class="tl">' + STATUS.map((s, i) => {
      const registros = o.historico.filter(h => h.status === s.id);
      const reg = registros[registros.length - 1];
      const cls = i < atual ? "feito" : (i === atual ? "atual" : "futuro");
      const quando = reg ? U.dataHora(reg.em) : (i < atual ? "Etapa concluída" : "Aguardando");
      const leitor = cls === "atual" ? " (etapa atual)" : (cls === "feito" ? " (concluída)" : " (pendente)");
      return '<li class="tl-item ' + cls + '"><span class="tl-marca" aria-hidden="true">' + (i <= atual ? "✓" : "") + "</span>" +
        "<div><strong>" + s.rotulo + '<span class="so-leitor">' + leitor + "</span></strong><small>" + quando + "</small></div></li>";
    }).join("") + "</ol>";
  }

  /* ---------- Telas ---------- */
  const TELAS = {
    inicio: {
      corpo() {
        const recentes = meusRecentes().slice(0, 3);
        return '<h1 class="titulo">Viu algo errado na sua rua?</h1>' +
          '<p class="lead">Conte para a prefeitura em poucos toques. Você recebe um número para acompanhar o andamento.</p>' +
          '<button type="button" class="btn btn-principal btn-enorme" data-acao="registrar">Registrar problema</button>' +
          '<button type="button" class="btn btn-secundario" data-acao="acompanhar">Acompanhar solicitação</button>' +
          '<h2 class="sub">Últimas solicitações deste aparelho</h2>' +
          (recentes.length
            ? '<div class="lista">' + recentes.map(cartaoOcorrencia).join("") + "</div>"
            : '<p class="vazio">Nada por aqui ainda. Quando você registrar um problema, ele aparece nesta lista.</p>');
      }
    },

    categoria: {
      corpo() {
        return '<h1 class="titulo">Qual é o problema?</h1>' +
          '<p class="lead">Toque na opção que mais se parece com o que você viu.</p>' +
          '<div class="cat-grade">' + CATEGORIAS.map(c =>
            '<button type="button" class="cat' + (rascunho.categoria === c.id ? " escolhida" : "") +
            '" data-acao="categoria" data-cat="' + c.id + '"><span aria-hidden="true">' + c.emoji + "</span>" +
            esc(c.rotulo) + "</button>").join("") + "</div>";
      }
    },

    foto: {
      corpo() {
        return '<h1 class="titulo">Mostre o problema</h1>' +
          '<p class="lead">Uma foto ajuda a equipe a entender o que fazer. Ela é opcional.</p>' +
          '<div class="previa">' + (rascunho.foto
            ? '<img src="' + rascunho.foto + '" alt="Prévia da foto do problema">'
            : '<div class="previa-vazia"><span aria-hidden="true">📷</span><p>Nenhuma foto ainda</p></div>') + "</div>" +
          '<p class="msg' + (msgFoto ? " erro" : "") + '" role="status">' +
          (processandoFoto ? "Preparando a foto…" : esc(msgFoto)) + "</p>" +
          '<input type="file" id="in-foto" class="so-leitor" accept="image/*" capture="environment" tabindex="-1">';
      },
      rodape() {
        const dis = processandoFoto ? " disabled" : "";
        if (rascunho.foto) {
          return '<button type="button" class="btn btn-secundario" data-acao="abrir-camera"' + dis + ">Trocar foto</button>" +
            '<button type="button" class="btn btn-principal" data-acao="continuar-foto"' + dis + ">Continuar</button>";
        }
        return '<button type="button" class="btn btn-principal" data-acao="abrir-camera"' + dis + ">Tirar foto ou escolher da galeria</button>" +
          '<button type="button" class="btn btn-secundario" data-acao="sem-foto"' + dis + ">Continuar sem foto</button>";
      },
      montar() { $("#in-foto").addEventListener("change", aoEscolherFoto); }
    },

    local: {
      corpo() {
        return '<h1 class="titulo">Onde fica o problema?</h1>' +
          '<div class="aviso" id="aviso-mapa" role="status" hidden></div>' +
          '<div id="mapa" class="mapa-cid" aria-label="Mapa para marcar o local"></div>' +
          '<p class="dica" id="dica-mapa">Arraste o marcador ou toque no mapa para indicar o ponto exato.</p>' +
          '<button type="button" class="btn btn-secundario" data-acao="gps">📍 Usar minha localização</button>' +
          '<p class="msg" id="msg-gps" role="status"></p>' +
          '<label class="campo" for="c-bairro">Bairro</label>' +
          '<div class="campo" style="margin-top:0"><select id="c-bairro"><option value="">Escolha o bairro</option>' +
          BAIRROS.map(b => '<option value="' + esc(b.nome) + '"' + (rascunho.bairro === b.nome ? " selected" : "") + ">" + esc(b.nome) + "</option>").join("") +
          "</select></div>" +
          '<label class="campo" for="c-ref">Ponto de referência (opcional)</label>' +
          '<div class="campo" style="margin-top:0"><input type="text" id="c-ref" maxlength="80" placeholder="Ex.: em frente à padaria" value="' + esc(rascunho.referencia) + '"></div>' +
          '<p class="msg erro" id="msg-local" role="alert"></p>';
      },
      rodape() {
        return '<button type="button" class="btn btn-principal" data-acao="continuar-local">Continuar</button>';
      },
      montar() {
        $("#c-bairro").addEventListener("change", e => {
          rascunho.bairro = e.target.value;
          rascunho.bairroManual = !!e.target.value;
          $("#msg-local").textContent = "";
          // Enquanto a pessoa não marcou o ponto, o marcador acompanha o bairro escolhido
          if (rascunho.bairro && !rascunho.localDefinido) {
            const b = BAIRROS.find(x => x.nome === rascunho.bairro);
            const [lat, lng] = kmParaCoord(b.dx, b.dy);
            rascunho.lat = lat; rascunho.lng = lng;
            if (marcador) marcador.setLatLng([lat, lng]);
            if (mapa) mapa.setView([lat, lng], ZOOM_PADRAO);
          }
        });
        $("#c-ref").addEventListener("input", e => { rascunho.referencia = e.target.value; });
        iniciarMapa();
      }
    },

    revisao: {
      corpo() {
        const c = U.cat(rascunho.categoria);
        return '<h1 class="titulo">Confira e envie</h1>' +
          '<label class="campo" for="c-desc">Quer contar mais? (opcional)</label>' +
          '<textarea id="c-desc" rows="3" maxlength="200" placeholder="Ex.: o buraco fica na faixa da direita">' + esc(rascunho.descricao) + "</textarea>" +
          '<div class="contador" id="contador">' + rascunho.descricao.length + "/200</div>" +
          '<h2 class="sub">Resumo</h2>' +
          '<div class="resumo"><img src="' + (rascunho.foto || U.placeholder(rascunho.categoria)) + '" alt="' +
          (rascunho.foto ? "Foto do problema" : "Sem foto, imagem ilustrativa") + '">' +
          "<dl><dt>Problema</dt><dd>" + c.emoji + " " + esc(c.rotulo) + "</dd>" +
          "<dt>Local</dt><dd>" + esc(rascunho.bairro) + (rascunho.referencia ? "<br>" + esc(rascunho.referencia) : "") + "</dd>" +
          '<dt>Descrição</dt><dd id="res-desc">' + (rascunho.descricao ? esc(rascunho.descricao) : "Sem descrição") + "</dd></dl></div>" +
          '<p class="msg erro" id="msg-envio" role="alert">' + esc(msgEnvio) + "</p>";
      },
      rodape() {
        return '<button type="button" class="btn btn-principal" data-acao="enviar">Enviar</button>' +
          (podeEnviarSemFoto ? '<button type="button" class="btn btn-secundario" data-acao="enviar-sem-foto">Enviar sem a foto</button>' : "");
      },
      montar() {
        $("#c-desc").addEventListener("input", e => {
          rascunho.descricao = e.target.value;
          $("#contador").textContent = e.target.value.length + "/200";
          $("#res-desc").textContent = e.target.value || "Sem descrição";
        });
      }
    },

    confirmacao: {
      corpo() {
        return '<div class="selo" aria-hidden="true">✅</div>' +
          '<h1 class="titulo centro">Recebemos seu pedido!</h1>' +
          '<p class="lead centro">Guarde este número para acompanhar o andamento:</p>' +
          '<div class="protocolo" id="protocolo">' + esc(ultimoProtocolo) + "</div>" +
          '<p class="msg centro" id="msg-copia" role="status"></p>';
      },
      rodape() {
        return '<button type="button" class="btn btn-principal" data-acao="ver-confirmado">Acompanhar</button>' +
          '<button type="button" class="btn btn-secundario" data-acao="copiar">Copiar protocolo</button>';
      }
    },

    acompanhar: {
      corpo() {
        const meus = meusRecentes();
        return '<h1 class="titulo">Acompanhar solicitação</h1>' +
          '<label class="campo" for="c-protocolo">Número do protocolo</label>' +
          '<div class="campo" style="margin-top:0"><input type="text" id="c-protocolo" autocapitalize="characters" autocomplete="off" placeholder="CE-2026-0001"></div>' +
          '<p class="msg erro" id="msg-busca" role="alert"></p>' +
          '<button type="button" class="btn btn-principal" data-acao="buscar">Buscar</button>' +
          '<h2 class="sub">Solicitações deste aparelho</h2>' +
          (meus.length
            ? '<div class="lista">' + meus.map(cartaoOcorrencia).join("") + "</div>"
            : '<p class="vazio">Você ainda não registrou nada neste aparelho. Digite um protocolo acima para consultar.</p>');
      },
      montar() {
        $("#c-protocolo").addEventListener("keydown", e => { if (e.key === "Enter") buscar(); });
      }
    },

    detalhe: {
      corpo() {
        const o = Store.porProtocolo(detalheProtocolo);
        if (!o) {
          return '<h1 class="titulo">Solicitação não encontrada</h1>' +
            '<p class="lead">Esse protocolo não existe mais. Os dados da demonstração podem ter sido restaurados.</p>';
        }
        const c = U.cat(o.categoria);
        return '<img class="foto-det" src="' + U.foto(o) + '" alt="' + (o.foto ? "Foto enviada" : "Sem foto, imagem ilustrativa") + '">' +
          '<div class="cab-det"><div><h1 class="titulo">' + c.emoji + " " + esc(c.rotulo) + "</h1>" +
          "<p>Protocolo " + esc(o.protocolo) + "</p></div>" + U.chip(o.status) + "</div>" +
          '<dl class="dados-cid"><dt>Local</dt><dd>' + esc(o.bairro) + (o.referencia ? "<br>" + esc(o.referencia) : "") + "</dd>" +
          (o.descricao ? "<dt>Descrição</dt><dd>" + esc(o.descricao) + "</dd>" : "") +
          "<dt>Aberta em</dt><dd>" + U.dataHora(o.criadoEm) + "</dd></dl>" +
          '<h2 class="sub">Andamento</h2>' + linhaDoTempo(o) +
          '<h2 class="sub">Resposta da prefeitura</h2>' +
          (o.resposta
            ? '<div class="resposta">' + esc(o.resposta) + "</div>"
            : '<div class="resposta vazia">A prefeitura ainda não enviou uma resposta.</div>');
      }
    }
  };

  /* ---------- Foto ---------- */
  function processarFoto(arquivo) {
    return new Promise((resolver, rejeitar) => {
      const url = URL.createObjectURL(arquivo);
      const img = new Image();
      img.onload = () => {
        try {
          const largura = Math.min(800, img.naturalWidth);
          const altura = Math.round(img.naturalHeight * largura / img.naturalWidth);
          const canvas = document.createElement("canvas");
          canvas.width = largura;
          canvas.height = altura;
          canvas.getContext("2d").drawImage(img, 0, 0, largura, altura);
          resolver(canvas.toDataURL("image/jpeg", 0.7));
        } catch (e) { rejeitar(e); }
        URL.revokeObjectURL(url);
      };
      img.onerror = () => { URL.revokeObjectURL(url); rejeitar(new Error("imagem inválida")); };
      img.src = url;
    });
  }

  async function aoEscolherFoto(ev) {
    const arquivo = ev.target.files && ev.target.files[0];
    if (!arquivo) return;
    processandoFoto = true; msgFoto = "";
    render();
    try {
      rascunho.foto = await processarFoto(arquivo);
    } catch (e) {
      msgFoto = "Não foi possível usar essa imagem. Tente tirar outra foto.";
    }
    processandoFoto = false;
    render();
  }

  /* ---------- Mapa e localização ---------- */
  function destruirMapa() {
    if (mapa) { mapa.remove(); mapa = null; marcador = null; }
  }

  function iniciarMapa() {
    const aviso = $("#aviso-mapa");
    if (!window.L) {
      rascunho.semMapa = true;
      aviso.hidden = false;
      aviso.textContent = "O mapa não está disponível sem internet. Escolha o bairro e escreva um ponto de referência para a equipe encontrar o local.";
      $("#mapa").hidden = true;
      $("#dica-mapa").hidden = true;
      return;
    }
    rascunho.semMapa = false;
    mapa = L.map("mapa").setView([rascunho.lat, rascunho.lng], ZOOM_PADRAO);
    const camada = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19, attribution: "&copy; OpenStreetMap"
    }).addTo(mapa);
    let avisouTiles = false;
    camada.on("tileerror", () => {
      if (avisouTiles) return;
      avisouTiles = true;
      aviso.hidden = false;
      aviso.textContent = "Não conseguimos carregar as imagens do mapa. Você pode continuar escolhendo o bairro e o ponto de referência.";
    });
    marcador = L.marker([rascunho.lat, rascunho.lng], {
      draggable: true,
      icon: L.divIcon({ className: "pino", html: "<span></span>", iconSize: [34, 34], iconAnchor: [17, 41] })
    }).addTo(mapa);
    marcador.on("dragend", () => { const p = marcador.getLatLng(); definirPonto(p.lat, p.lng, false); });
    mapa.on("click", e => definirPonto(e.latlng.lat, e.latlng.lng, false));
    setTimeout(() => { if (mapa) mapa.invalidateSize(); }, 150);
  }

  /* Registra o ponto marcado. "mover" recentraliza o mapa (usado pelo GPS). */
  function definirPonto(lat, lng, mover) {
    rascunho.lat = lat; rascunho.lng = lng; rascunho.localDefinido = true;
    if (marcador) marcador.setLatLng([lat, lng]);
    if (mapa) {
      if (mover) mapa.setView([lat, lng], Math.max(mapa.getZoom(), 16));
      else mapa.panTo([lat, lng]);
    }
    // Sugere o bairro mais próximo, se a pessoa ainda não escolheu um e o ponto está na região
    if (!rascunho.bairroManual) {
      const p = U.bairroMaisProximo(lat, lng);
      if (p.distKm <= 1.5) {
        rascunho.bairro = p.bairro.nome;
        const sel = $("#c-bairro");
        if (sel) sel.value = p.bairro.nome;
      }
    }
  }

  function usarLocalizacao() {
    const msg = $("#msg-gps");
    msg.className = "msg";
    const alternativa = window.L ? "Toque no mapa para marcar o ponto." : "Escolha o bairro abaixo.";
    if (!("geolocation" in navigator)) {
      msg.textContent = "Seu aparelho não oferece localização. " + alternativa;
      return;
    }
    msg.textContent = "Buscando sua localização…";
    navigator.geolocation.getCurrentPosition(pos => {
      definirPonto(pos.coords.latitude, pos.coords.longitude, true);
      msg.textContent = window.L
        ? "Localização encontrada. Se precisar, arraste o marcador para ajustar."
        : "Localização registrada. Confira o bairro abaixo.";
    }, err => {
      let texto = "Não foi possível pegar sua localização. " + alternativa;
      if (err.code === 1) texto = "Sem permissão para usar a localização. " + alternativa;
      else if (err.code === 3) texto = "A localização demorou demais. Tente de novo ou use outra opção. " + alternativa;
      if (!window.isSecureContext) texto += " A localização só funciona em endereço seguro (https) ou em localhost.";
      msg.textContent = texto;
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  }

  /* ---------- Envio ---------- */
  function enviar(semFoto) {
    if (enviando) return;
    if (semFoto) rascunho.foto = null;
    enviando = true;
    const agora = new Date().toISOString();
    const oc = {
      id: "o" + Date.now(),
      protocolo: Store.proximoProtocolo(),
      categoria: rascunho.categoria,
      bairro: rascunho.bairro,
      referencia: rascunho.referencia.trim(),
      lat: rascunho.lat, lng: rascunho.lng,
      descricao: rascunho.descricao.trim(),
      foto: rascunho.foto,
      status: "recebida",
      equipe: null,
      resposta: "",
      criadoEm: agora,
      resolvidoEm: null,
      historico: [{ status: "recebida", em: agora }],
      os: null,
      semMapa: rascunho.semMapa
    };
    const r = Store.adicionar(oc);
    enviando = false;
    if (!r.ok) {
      if (r.cota) {
        msgEnvio = "O navegador não tem mais espaço para guardar esta solicitação." +
          (rascunho.foto ? " Você pode enviar sem a foto." : " Peça à prefeitura para restaurar os dados de exemplo e tente de novo.");
        podeEnviarSemFoto = !!rascunho.foto;
      } else {
        msgEnvio = "Não foi possível enviar agora. Tente de novo em instantes.";
        podeEnviarSemFoto = false;
      }
      render();
      return;
    }
    Store.guardarMeu(oc.protocolo);
    ultimoProtocolo = oc.protocolo;
    rascunho = novoRascunho();
    msgEnvio = ""; podeEnviarSemFoto = false;
    ir("confirmacao");
  }

  /* ---------- Copiar protocolo ---------- */
  function copiaAntiga(texto) {
    const ta = document.createElement("textarea");
    ta.value = texto;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;opacity:0;top:0;left:0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function copiarProtocolo() {
    const msg = $("#msg-copia");
    const sucesso = () => { msg.className = "msg centro"; msg.textContent = "Protocolo copiado!"; };
    const falha = () => { msg.className = "msg centro erro"; msg.textContent = "Não foi possível copiar. Anote o número acima."; };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(ultimoProtocolo).then(sucesso, () => (copiaAntiga(ultimoProtocolo) ? sucesso() : falha()));
    } else {
      copiaAntiga(ultimoProtocolo) ? sucesso() : falha();
    }
  }

  /* ---------- Busca ---------- */
  function buscar() {
    let p = $("#c-protocolo").value.trim().toUpperCase().replace(/\s+/g, "");
    const msg = $("#msg-busca");
    if (!p) { msg.textContent = "Digite o número do protocolo."; return; }
    const curto = p.match(/^(\d{4})-(\d{1,4})$/);   // aceita "2026-31" e completa
    if (curto) p = "CE-" + curto[1] + "-" + curto[2].padStart(4, "0");
    if (!Store.porProtocolo(p)) {
      msg.textContent = "Não encontramos esse protocolo. Confira o número e tente de novo.";
      return;
    }
    abrir(p);
  }

  function abrir(protocolo) {
    origemDetalhe = tela;
    detalheProtocolo = protocolo;
    ANTERIOR.detalhe = origemDetalhe;
    ir("detalhe");
  }

  /* ---------- Ações (delegação de cliques) ---------- */
  const ACOES = {
    voltar() { ir(ANTERIOR[tela] || "inicio"); },
    registrar() { rascunho = novoRascunho(); msgFoto = ""; msgEnvio = ""; podeEnviarSemFoto = false; ir("categoria"); },
    acompanhar() { ir("acompanhar"); },
    categoria(b) { rascunho.categoria = b.dataset.cat; ir("foto"); },
    "abrir-camera"() { const el = $("#in-foto"); if (el) el.click(); },
    "sem-foto"() { rascunho.foto = null; msgFoto = ""; ir("local"); },
    "continuar-foto"() { msgFoto = ""; ir("local"); },
    gps() { usarLocalizacao(); },
    "continuar-local"() {
      if (!rascunho.bairro) {
        $("#msg-local").textContent = "Escolha o bairro para continuar.";
        $("#c-bairro").focus();
        return;
      }
      ir("revisao");
    },
    enviar() { enviar(false); },
    "enviar-sem-foto"() { enviar(true); },
    copiar() { copiarProtocolo(); },
    "ver-confirmado"() { abrir(ultimoProtocolo); },
    buscar() { buscar(); },
    abrir(b) { abrir(b.dataset.p); }
  };

  document.getElementById("app").addEventListener("click", e => {
    const botao = e.target.closest("[data-acao]");
    if (!botao || botao.disabled) return;
    const acao = ACOES[botao.dataset.acao];
    if (acao) acao(botao);
  });

  /* Quando o admin (outra aba) muda algo, atualiza as telas de leitura */
  function atualizarSeSeguro() {
    if (["inicio", "acompanhar", "detalhe", "confirmacao"].indexOf(tela) === -1) return;
    const ativo = document.activeElement;
    if (ativo && ["INPUT", "TEXTAREA", "SELECT"].indexOf(ativo.tagName) !== -1) return;
    render();
  }
  Store.aoMudar(atualizarSeSeguro);
  window.addEventListener("focus", atualizarSeSeguro);

  render();
})();
