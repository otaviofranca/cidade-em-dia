/* ==========================================================
   admin.js  |  Cidade em Dia (painel da prefeitura, desktop-first)
   Rotas por hash: #painel, #ocorrencias, #ocorrencia/ID, #os/ID
   ========================================================== */
(function () {
  "use strict";

  const $ = (seletor, raiz) => (raiz || document).querySelector(seletor);
  const esc = U.esc;
  const conteudo = $("#conteudo");

  let mapaAtual = null;
  let camadaMarcadores = null;
  let filtros = { status: "", categoria: "", bairro: "" };
  let totalAnterior = Store.todas().length;

  /* ---------- Utilidades ---------- */
  function agoraISO() { return new Date().toISOString(); }
  function diasAberta(o) { return U.dias(o.criadoEm, agoraISO()); }
  function porDataDesc(a, b) { return new Date(b.criadoEm) - new Date(a.criadoEm); }
  function opcoes(lista, selecionado, vazio) {
    return (vazio ? '<option value="">' + vazio + "</option>" : "") + lista.map(i =>
      '<option value="' + esc(i.valor) + '"' + (i.valor === selecionado ? " selected" : "") + ">" + esc(i.texto) + "</option>").join("");
  }

  let temporizadorToast;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("visivel");
    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(() => t.classList.remove("visivel"), 3200);
  }

  function destruirMapa() {
    if (mapaAtual) { mapaAtual.remove(); mapaAtual = null; camadaMarcadores = null; }
  }

  function iconeStatus(status) {
    return L.divIcon({
      className: "marcador-status",
      html: '<span style="background:' + U.st(status).cor + '"></span>',
      iconSize: [22, 22], iconAnchor: [11, 11]
    });
  }

  function atualizarBadge() {
    const abertas = Store.todas().filter(o => o.status !== "resolvida").length;
    $("#badge-abertas").textContent = abertas;
  }

  /* ---------- Roteamento ---------- */
  function rota() {
    const partes = (location.hash.replace(/^#/, "") || "painel").split("/");
    return { nome: partes[0], arg: partes[1] };
  }

  function render() {
    destruirMapa();
    const r = rota();
    document.querySelectorAll(".lateral nav a").forEach(a => {
      const ativo = r.nome === "painel" ? "painel" : "ocorrencias";
      a.classList.toggle("ativo", a.dataset.rota === ativo);
    });
    atualizarBadge();
    if (r.nome === "ocorrencias") telaOcorrencias();
    else if (r.nome === "ocorrencia") telaDetalhe(r.arg);
    else if (r.nome === "os") telaOrdemServico(r.arg);
    else telaPainel();
    window.scrollTo(0, 0);
  }

  /* ==========================================================
     1) PAINEL
     ========================================================== */
  function telaPainel() {
    const lista = Store.todas();
    const abertas = lista.filter(o => o.status !== "resolvida");
    const andamento = lista.filter(o => o.status === "analise" || o.status === "caminho");
    const resolvidas = lista.filter(o => o.status === "resolvida" && o.resolvidoEm);
    const limite = Date.now() - 30 * 86400000;
    const resolvidasMes = resolvidas.filter(o => new Date(o.resolvidoEm).getTime() >= limite);
    const tempoMedio = resolvidas.length
      ? resolvidas.reduce((s, o) => s + U.dias(o.criadoEm, o.resolvidoEm), 0) / resolvidas.length
      : null;

    const cartao = (classe, rotulo, valor, nota) =>
      '<div class="cartao ' + classe + '"><div class="cartao-rotulo">' + rotulo + '</div><div class="cartao-valor">' + valor +
      '</div><div class="cartao-nota">' + nota + "</div></div>";

    const maisAntigas = abertas.slice().sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm)).slice(0, 5);

    conteudo.innerHTML =
      '<header class="pagina-cab"><h1>Painel</h1><p>Resumo das ocorrências de ' + esc(NOME_CIDADE) + "</p></header>" +
      '<section class="cartoes" aria-label="Indicadores">' +
      cartao("", "Abertas", abertas.length, "ainda sem resolução") +
      cartao("c-andamento", "Em andamento", andamento.length, "em análise ou com equipe a caminho") +
      cartao("c-resolvida", "Resolvidas no mês", resolvidasMes.length, "nos últimos 30 dias") +
      cartao("c-tempo", "Tempo médio de resolução", tempoMedio === null ? "—" : U.num(tempoMedio, 1) + " dias", "entre abertura e resolução") +
      "</section>" +
      '<section class="grade-2">' +
      '<div class="bloco"><h2>Ocorrências por categoria</h2>' + barras(
        CATEGORIAS.map(c => ({ rotulo: c.emoji + " " + c.rotulo, itens: lista.filter(o => o.categoria === c.id) }))) + "</div>" +
      '<div class="bloco"><h2>Ocorrências por bairro</h2>' + barras(
        BAIRROS.map(b => ({ rotulo: b.nome, itens: lista.filter(o => o.bairro === b.nome) }))) + "</div>" +
      "</section>" +
      '<section class="bloco"><h2>As 5 mais antigas ainda abertas</h2>' +
      (maisAntigas.length ? '<table class="tabela"><thead><tr><th>Protocolo</th><th>Categoria</th><th>Bairro</th><th>Aberta há</th><th>Status</th></tr></thead><tbody>' +
        maisAntigas.map(o => {
          const d = Math.floor(diasAberta(o));
          const atrasada = d > DIAS_ATRASO;
          return '<tr data-id="' + o.id + '"' + (atrasada ? ' class="atrasada"' : "") + '><td><a href="#ocorrencia/' + o.id + '">' + esc(o.protocolo) + "</a></td>" +
            "<td>" + U.cat(o.categoria).emoji + " " + esc(U.cat(o.categoria).rotulo) + "</td><td>" + esc(o.bairro) + "</td>" +
            "<td>" + d + (d === 1 ? " dia" : " dias") + (atrasada ? ' <span class="etq-atraso">Atrasada</span>' : "") + "</td><td>" + U.chip(o.status) + "</td></tr>";
        }).join("") + "</tbody></table>"
        : '<p class="tabela-vazia">Nenhuma ocorrência aberta. Bom trabalho!</p>') +
      "</section>";
  }

  /* Barras em CSS: parte azul = abertas, parte verde = resolvidas */
  function barras(grupos) {
    const dados = grupos.map(g => {
      const res = g.itens.filter(o => o.status === "resolvida").length;
      return { rotulo: g.rotulo, abertas: g.itens.length - res, resolvidas: res, total: g.itens.length };
    }).filter(g => g.total > 0).sort((a, b) => b.total - a.total);
    const max = Math.max.apply(null, [1].concat(dados.map(d => d.total)));
    return '<div class="legenda-barras"><span><i class="seg-aberta"></i>Abertas</span><span><i class="seg-resolvida"></i>Resolvidas</span></div>' +
      dados.map(d =>
        '<div class="barra-linha"><span>' + esc(d.rotulo) + '</span><div class="barra-trilho" role="img" aria-label="' +
        d.abertas + " abertas e " + d.resolvidas + ' resolvidas"><i class="seg-aberta" style="width:' + (d.abertas / max * 100) +
        '%"></i><i class="seg-resolvida" style="width:' + (d.resolvidas / max * 100) + '%"></i></div><span class="barra-total">' + d.total + "</span></div>"
      ).join("");
  }

  /* ==========================================================
     2) OCORRÊNCIAS (tabela + mapa)
     ========================================================== */
  function telaOcorrencias() {
    conteudo.innerHTML =
      '<header class="pagina-cab"><h1>Ocorrências</h1><p id="contagem"></p></header>' +
      '<div class="filtros">' +
      '<label>Status<select id="f-status">' + opcoes(STATUS.map(s => ({ valor: s.id, texto: s.rotulo })), filtros.status, "Todos") + "</select></label>" +
      '<label>Categoria<select id="f-categoria">' + opcoes(CATEGORIAS.map(c => ({ valor: c.id, texto: c.rotulo })), filtros.categoria, "Todas") + "</select></label>" +
      '<label>Bairro<select id="f-bairro">' + opcoes(BAIRROS.map(b => ({ valor: b.nome, texto: b.nome })), filtros.bairro, "Todos") + "</select></label>" +
      '<button type="button" class="btn-adm" id="f-limpar">Limpar filtros</button></div>' +
      '<div class="dupla">' +
      '<div class="bloco tabela-wrap"><table class="tabela"><thead><tr><th>Protocolo</th><th>Categoria</th><th>Bairro</th><th>Data</th><th>Status</th><th>Equipe</th></tr></thead><tbody id="tbody"></tbody></table></div>' +
      '<div class="bloco mapa-bloco"><div id="mapa-adm"></div><div class="legenda">' +
      STATUS.map(s => '<span><i style="background:' + s.cor + '"></i>' + s.rotulo + "</span>").join("") + "</div></div>" +
      "</div>";

    if (window.L) {
      mapaAtual = L.map("mapa-adm").setView(CENTRO, ZOOM_PADRAO);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(mapaAtual);
      camadaMarcadores = L.layerGroup().addTo(mapaAtual);
    } else {
      $("#mapa-adm").outerHTML = '<div class="aviso-adm">O mapa não está disponível sem internet. A tabela ao lado continua funcionando normalmente.</div>';
    }

    ["status", "categoria", "bairro"].forEach(campo => {
      $("#f-" + campo).addEventListener("change", e => { filtros[campo] = e.target.value; atualizarLista(); });
    });
    $("#f-limpar").addEventListener("click", () => {
      filtros = { status: "", categoria: "", bairro: "" };
      ["status", "categoria", "bairro"].forEach(c => { $("#f-" + c).value = ""; });
      atualizarLista();
    });
    atualizarLista();
  }

  function atualizarLista() {
    const lista = Store.todas().filter(o =>
      (!filtros.status || o.status === filtros.status) &&
      (!filtros.categoria || o.categoria === filtros.categoria) &&
      (!filtros.bairro || o.bairro === filtros.bairro)).sort(porDataDesc);

    $("#contagem").textContent = lista.length + (lista.length === 1 ? " ocorrência encontrada" : " ocorrências encontradas");
    $("#tbody").innerHTML = lista.length ? lista.map(o => {
      const c = U.cat(o.categoria);
      return '<tr data-id="' + o.id + '"><td><a href="#ocorrencia/' + o.id + '">' + esc(o.protocolo) + "</a></td>" +
        "<td>" + c.emoji + " " + esc(c.rotulo) + "</td><td>" + esc(o.bairro) + "</td><td>" + U.data(o.criadoEm) + "</td>" +
        "<td>" + U.chip(o.status) + "</td><td>" + esc(U.equipe(o.equipe)) + "</td></tr>";
    }).join("") : '<tr><td colspan="6" class="tabela-vazia">Nenhuma ocorrência com esses filtros. Limpe os filtros para ver todas.</td></tr>';

    if (mapaAtual) {
      camadaMarcadores.clearLayers();
      const pontos = [];
      lista.forEach(o => {
        const c = U.cat(o.categoria);
        L.marker([o.lat, o.lng], { icon: iconeStatus(o.status), title: o.protocolo })
          .bindTooltip(esc(o.protocolo) + "<br>" + esc(c.rotulo))
          .on("click", () => { location.hash = "#ocorrencia/" + o.id; })
          .addTo(camadaMarcadores);
        pontos.push([o.lat, o.lng]);
      });
      if (pontos.length) mapaAtual.fitBounds(pontos, { padding: [30, 30], maxZoom: 16 });
      else mapaAtual.setView(CENTRO, ZOOM_PADRAO);
    }
  }

  /* ==========================================================
     3) DETALHE DA OCORRÊNCIA
     ========================================================== */
  function telaDetalhe(id) {
    const o = Store.obter(id);
    if (!o) {
      conteudo.innerHTML = '<a class="voltar-link" href="#ocorrencias">← Voltar para ocorrências</a>' +
        '<header class="pagina-cab"><h1>Ocorrência não encontrada</h1><p>Ela pode ter sido removida ao restaurar os dados de exemplo.</p></header>';
      return;
    }
    const c = U.cat(o.categoria);
    const equipeInicial = o.equipe || c.equipe || "";
    const tempo = o.status === "resolvida" && o.resolvidoEm
      ? "Resolvida em " + U.num(U.dias(o.criadoEm, o.resolvidoEm), 1) + " dias"
      : "Aberta há " + Math.floor(diasAberta(o)) + " dias";

    conteudo.innerHTML =
      '<a class="voltar-link" href="#ocorrencias">← Voltar para ocorrências</a>' +
      '<header class="pagina-cab linha"><div><h1>' + c.emoji + " " + esc(c.rotulo) + "</h1><p>Protocolo <strong>" + esc(o.protocolo) +
      "</strong>, aberta em " + U.dataHora(o.criadoEm) + "</p></div>" + U.chip(o.status) + "</header>" +
      '<div class="detalhe-grade"><div>' +
      '<section class="bloco"><img class="foto-adm" src="' + U.foto(o) + '" alt="' + (o.foto ? "Foto enviada pelo cidadão" : "Sem foto, imagem ilustrativa") + '">' +
      (o.foto ? "" : '<p class="nota">O cidadão não enviou foto. A imagem acima é ilustrativa.</p>') + "</section>" +
      '<section class="bloco"><h2>Dados</h2><dl class="dados">' +
      "<dt>Bairro</dt><dd>" + esc(o.bairro) + "</dd>" +
      "<dt>Ponto de referência</dt><dd>" + (o.referencia ? esc(o.referencia) : "Não informado") + "</dd>" +
      "<dt>Descrição</dt><dd>" + (o.descricao ? esc(o.descricao) : "Sem descrição") + "</dd>" +
      "<dt>Coordenadas</dt><dd>" + o.lat.toFixed(5) + ", " + o.lng.toFixed(5) + (o.semMapa ? " (aproximadas pelo bairro)" : "") + "</dd>" +
      "<dt>Situação do prazo</dt><dd>" + tempo + "</dd>" +
      (o.os ? "<dt>Ordem de serviço</dt><dd>" + esc(o.os.numero) + ", gerada em " + U.data(o.os.geradaEm) + "</dd>" : "") +
      "</dl></section>" +
      '<section class="bloco"><h2>Local</h2><div id="mapa-det" class="mapa-det"></div></section>' +
      '<section class="bloco"><h2>Histórico</h2><ol class="hist">' +
      o.historico.map(h => "<li><span>" + U.chip(h.status) + "</span><small>" + U.dataHora(h.em) + "</small></li>").join("") + "</ol></section>" +
      "</div>" +
      '<aside><section class="bloco acao"><h2>Atendimento</h2>' +
      '<label class="campo-adm">Status<select id="d-status">' + opcoes(STATUS.map(s => ({ valor: s.id, texto: s.rotulo })), o.status) + "</select></label>" +
      '<label class="campo-adm">Equipe responsável<select id="d-equipe">' +
      opcoes(EQUIPES.map(e => ({ valor: e.id, texto: e.nome })), equipeInicial, "Sem equipe definida") + "</select></label>" +
      '<label class="campo-adm">Resposta ao cidadão<textarea id="d-resposta" rows="5" maxlength="400" placeholder="Esta mensagem aparece para o cidadão ao acompanhar a solicitação.">' + esc(o.resposta) + "</textarea></label>" +
      '<p class="msg-form" id="d-msg" role="status"></p>' +
      '<div class="acoes"><button type="button" class="btn-adm btn-adm-prim" id="d-salvar">Salvar alterações</button>' +
      '<button type="button" class="btn-adm" id="d-os">Gerar ordem de serviço</button></div>' +
      "</section></aside></div>";

    // mapa do local
    if (window.L) {
      mapaAtual = L.map("mapa-det", { scrollWheelZoom: false }).setView([o.lat, o.lng], 16);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(mapaAtual);
      L.marker([o.lat, o.lng], { icon: iconeStatus(o.status) }).addTo(mapaAtual);
    } else {
      $("#mapa-det").outerHTML = '<div class="aviso-adm">O mapa não está disponível sem internet. Bairro: ' + esc(o.bairro) +
        (o.referencia ? ". Referência: " + esc(o.referencia) : "") + ".</div>";
    }

    const msg = $("#d-msg");
    function mostrar(texto, erro) { msg.textContent = texto; msg.className = "msg-form" + (erro ? " erro" : ""); }

    /* Grava o formulário. Mudar o status registra data e hora no histórico. */
    function salvarFormulario() {
      const novoStatus = $("#d-status").value;
      const equipe = $("#d-equipe").value || null;
      const resposta = $("#d-resposta").value.trim();
      const r = Store.atualizar(o.id, copia => {
        if (novoStatus !== copia.status) {
          const agora = agoraISO();
          copia.status = novoStatus;
          copia.historico.push({ status: novoStatus, em: agora });
          copia.resolvidoEm = novoStatus === "resolvida" ? agora : null;
        }
        copia.equipe = equipe;
        copia.resposta = resposta;
      });
      if (!r.ok) {
        mostrar(r.cota ? "O armazenamento do navegador está cheio. Use \"Restaurar dados de exemplo\" para liberar espaço." : "Não foi possível salvar. Tente de novo.", true);
      }
      return r.ok;
    }

    $("#d-salvar").addEventListener("click", () => {
      if (salvarFormulario()) { toast("Alterações salvas"); render(); }
    });

    $("#d-os").addEventListener("click", () => {
      if (!$("#d-equipe").value) {
        mostrar("Escolha a equipe responsável antes de gerar a ordem de serviço.", true);
        $("#d-equipe").focus();
        return;
      }
      if (!salvarFormulario()) return;
      const atual = Store.obter(o.id);
      if (!atual.os) {
        const numero = Store.proximaOS();
        const r = Store.atualizar(o.id, copia => { copia.os = { numero, geradaEm: agoraISO() }; });
        if (!r.ok) { mostrar("Não foi possível gerar a ordem de serviço. Tente de novo.", true); return; }
      }
      location.hash = "#os/" + o.id;
    });
  }

  /* ==========================================================
     4) ORDEM DE SERVIÇO (página imprimível)
     ========================================================== */
  function telaOrdemServico(id) {
    const o = Store.obter(id);
    if (!o || !o.os) {
      conteudo.innerHTML = '<a class="voltar-link" href="#ocorrencias">← Voltar para ocorrências</a>' +
        '<header class="pagina-cab"><h1>Ordem de serviço não encontrada</h1><p>Gere a ordem de serviço a partir do detalhe da ocorrência.</p></header>';
      return;
    }
    const c = U.cat(o.categoria);
    conteudo.innerHTML =
      '<div class="barra-os no-print"><a class="voltar-link" href="#ocorrencia/' + o.id + '">← Voltar para a ocorrência</a>' +
      '<button type="button" class="btn-adm btn-adm-prim" id="b-imprimir">Imprimir ordem de serviço</button></div>' +
      '<article class="os-doc" id="os-doc">' +
      '<header class="os-cab"><div><h1>Ordem de Serviço</h1><p>Prefeitura Municipal de ' + esc(NOME_CIDADE) + "</p><p>Zeladoria urbana</p></div>" +
      '<div class="os-num"><span>Número</span><strong>' + esc(o.os.numero) + "</strong><small>Emitida em " + U.data(o.os.geradaEm) + "</small></div></header>" +
      "<h2>Dados da ocorrência</h2><table class=\"os-tab\">" +
      "<tr><th>Protocolo</th><td>" + esc(o.protocolo) + "</td></tr>" +
      "<tr><th>Categoria</th><td>" + esc(c.rotulo) + "</td></tr>" +
      "<tr><th>Bairro</th><td>" + esc(o.bairro) + "</td></tr>" +
      "<tr><th>Ponto de referência</th><td>" + (o.referencia ? esc(o.referencia) : "Não informado") + "</td></tr>" +
      "<tr><th>Coordenadas</th><td>" + o.lat.toFixed(5) + ", " + o.lng.toFixed(5) + "</td></tr>" +
      "<tr><th>Aberta em</th><td>" + U.dataHora(o.criadoEm) + "</td></tr>" +
      "<tr><th>Descrição</th><td>" + (o.descricao ? esc(o.descricao) : "Sem descrição") + "</td></tr></table>" +
      (o.foto ? '<img class="os-foto" src="' + o.foto + '" alt="Foto da ocorrência">' : "") +
      "<h2>Equipe responsável</h2><table class=\"os-tab\"><tr><th>Equipe</th><td>" + esc(U.equipe(o.equipe)) + "</td></tr></table>" +
      "<h2>Execução do serviço</h2>" +
      '<div class="os-linha"><span>Data de execução:</span><i></i><span>Início:</span><i></i><span>Término:</span><i></i></div>' +
      '<p style="margin:14px 0 4px">Serviço realizado e observações:</p>' +
      '<div class="os-escrita"></div><div class="os-escrita"></div><div class="os-escrita"></div>' +
      '<div class="os-assinaturas"><div>Responsável da equipe</div><div>Fiscal da prefeitura</div></div>' +
      '<p class="os-rodape">Documento gerado pelo sistema Cidade em Dia (demonstração com dados fictícios).</p>' +
      "</article>";
    $("#b-imprimir").addEventListener("click", () => window.print());
  }

  /* ---------- Restaurar dados de exemplo ---------- */
  $("#b-restaurar").addEventListener("click", () => {
    const ok = window.confirm("Isto apaga as ocorrências atuais, inclusive as que você registrou na demonstração, e volta para as 30 ocorrências de exemplo. Continuar?");
    if (!ok) return;
    const r = Store.restaurar();
    totalAnterior = Store.todas().length;
    if (r.ok) toast("Dados de exemplo restaurados");
    else toast("Não foi possível restaurar os dados. Tente de novo.");
    if (location.hash && !/^#(painel|ocorrencias)?$/.test(location.hash)) location.hash = "#painel";
    else render();
  });

  /* ---------- Atualização entre abas ---------- */
  Store.aoMudar(() => {
    const lista = Store.todas();
    if (lista.length > totalAnterior) {
      toast("Nova ocorrência recebida: " + lista.slice().sort(porDataDesc)[0].protocolo);
    }
    totalAnterior = lista.length;
    const nome = rota().nome;
    if (nome === "painel" || nome === "ocorrencias") render();   // detalhe e OS não são recarregados para não perder edições
    else atualizarBadge();
  });

  /* Clicar em qualquer ponto da linha abre o detalhe */
  conteudo.addEventListener("click", e => {
    const linha = e.target.closest("tr[data-id]");
    if (linha && !e.target.closest("a")) location.hash = "#ocorrencia/" + linha.dataset.id;
  });

  window.addEventListener("hashchange", render);
  $("#nome-cidade").textContent = "Prefeitura de " + NOME_CIDADE;
  render();
})();
