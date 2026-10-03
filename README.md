# Cidade em Dia

MVP de demonstração de um sistema de zeladoria urbana para prefeituras de cidades pequenas e médias.
O cidadão registra problemas da cidade pelo celular (com foto e local) e a prefeitura gerencia as
ocorrências, gera ordem de serviço e acompanha indicadores.

- JavaScript puro (ES6), sem frameworks, sem build, sem chaves de API, sem cadastro em nenhum serviço.
- Única dependência externa: Leaflet 1.9.4 por CDN (unpkg), com mapas do OpenStreetMap.
- Dados no `localStorage`, com 30 ocorrências fictícias embutidas em `js/dados.js`.
- Interface em português do Brasil. Nenhum dado real.

## Estrutura

```
cidadeemdia/
├── index.html        app do cidadão (mobile-first, base 360px)
├── admin.html        painel da prefeitura (desktop-first)
├── css/estilo.css    estilos do cidadão, do admin e da impressão
├── js/config.js      CENTRO do mapa, raio, nome da cidade
├── js/dados.js       categorias, status, equipes, bairros e gerador dos dados fictícios
├── js/store.js       acesso ao localStorage e utilidades compartilhadas
├── js/cidadao.js     telas e lógica do cidadão
├── js/admin.js       telas e lógica da prefeitura
└── README.md
```

## Como abrir

**Recomendado: servidor local.** Na pasta `cidadeemdia/`, rode um destes comandos:

```bash
python3 -m http.server 8000
# ou
npx serve .
```

Depois abra:

- Cidadão: <http://localhost:8000/index.html>
- Prefeitura: <http://localhost:8000/admin.html>

Por que servidor local? Em `localhost` o navegador libera a geolocalização (GPS) e trata todas as
páginas como a mesma origem, então o cidadão e o admin enxergam os mesmos dados.

**Alternativa: dar dois cliques em `index.html`.** Funciona no Chrome e no Edge. No Firefox, cada arquivo
aberto por `file://` pode ter um `localStorage` separado, e o admin não veria o que o cidadão registrou.
Se isso acontecer, use o servidor local.

## Como os dados são compartilhados (importante para a demonstração)

Este MVP não tem servidor. O app do cidadão e o admin leem e gravam as **mesmas chaves do `localStorage`**
(`cidadeemdia.dados.v1` e `cidadeemdia.meus.v1`). Isso funciona porque as duas páginas estão **no mesmo
navegador e na mesma origem**.

Consequências:

- Duas abas do mesmo navegador compartilham os dados. É assim que a demonstração funciona.
- Um celular de verdade e o computador **não** compartilham dados, porque cada aparelho tem o seu
  próprio `localStorage`. Para simular o celular, use o modo dispositivo do navegador (veja abaixo).
- Quando uma aba grava algo, a outra recebe o aviso do navegador (evento `storage`): o admin mostra
  "Nova ocorrência recebida" e o app do cidadão atualiza a linha do tempo sozinho.
- Limpar os dados do site apaga tudo. O sistema recria os 30 exemplos na próxima abertura.

## Como configurar a cidade da demonstração

1. Abra `js/config.js`.
2. Troque `CENTRO = [-15.78, -47.93]` pelas coordenadas da cidade (latitude, longitude). Para achar:
   no Google Maps ou no OpenStreetMap, clique com o botão direito no centro da cidade e copie as coordenadas.
3. Se quiser, ajuste `NOME_CIDADE` e `RAIO_KM`.
4. Recarregue o admin e clique em **Restaurar dados de exemplo**. As 30 ocorrências são geradas de novo
   em volta do novo centro, em até ~2 km.

## Roteiro para demonstrar de ponta a ponta (duas abas)

**Preparação**

1. Aba 1, "celular": abra `index.html`. Aperte `F12`, ative o modo dispositivo (`Ctrl+Shift+M`) e
   escolha 360 x 640 (ou "Responsive" com essas medidas).
2. Aba 2, "admin": abra `admin.html` em tela cheia. Deixe as duas abas visíveis (janelas lado a lado ajudam).
3. No admin, clique em **Restaurar dados de exemplo** para começar do zero.

**Passo a passo**

1. **Admin, Painel.** Mostre os cartões (abertas, em andamento, resolvidas no mês, tempo médio), as barras por
   categoria e por bairro e a tabela das 5 mais antigas, com a marca vermelha de atraso (mais de 7 dias).
2. **Admin, Ocorrências.** Filtre por status, categoria e bairro. Mostre os marcadores coloridos por status
   no mapa e clique em um marcador para abrir o detalhe.
3. **Celular, registrar.** Toque em **Registrar problema** e siga as etapas:
   categoria, foto (no computador abre o seletor de arquivos; no celular abre a câmera),
   local (arraste o marcador ou toque no mapa; escolha o bairro) e revisão. Toque em **Enviar**.
4. **Celular, protocolo.** Aparece o protocolo no formato `CE-AAAA-NNNN`. Toque em **Copiar protocolo**.
5. **Admin.** Surge o aviso "Nova ocorrência recebida". Abra a ocorrência (Ocorrências, primeira linha da tabela).
6. **Admin, atender.** Mude o status para **Em análise**, escolha a equipe, escreva uma **Resposta ao cidadão**
   e clique em **Salvar alterações**.
7. **Celular, acompanhar.** Toque em **Acompanhar** na confirmação. A linha do tempo mostra "Em análise" com data
   e hora, e a resposta da prefeitura aparece. Volte ao admin, mude para **Equipe a caminho** e depois
   **Resolvida**: o celular acompanha cada mudança sem recarregar.
8. **Admin, ordem de serviço.** No detalhe, clique em **Gerar ordem de serviço**, depois em
   **Imprimir ordem de serviço**. A impressão (ou "Salvar como PDF") mostra só o documento: número da OS,
   dados da ocorrência, equipe, espaço para data de execução e assinaturas.
9. **Admin, Painel.** Volte ao painel e mostre os indicadores atualizados (resolvidas, tempo médio).

Dica: no celular, o campo "Acompanhar solicitação" também aceita o protocolo de qualquer ocorrência de exemplo
(copie da tabela do admin) para mostrar a linha do tempo de uma ocorrência antiga.

## Observações técnicas

**GPS exige HTTPS ou localhost.** O botão "Usar minha localização" usa `navigator.geolocation`, que os
navegadores só liberam em `https://` ou `http://localhost`. Em `file://` ou em um endereço `http://` comum
o app mostra uma mensagem amigável e a pessoa marca o ponto tocando no mapa.
Se o GPS do aparelho estiver longe do `CENTRO` configurado, o ponto cairá fora da região dos dados
de exemplo. Na demonstração, prefira tocar no mapa.

**Sem internet.** Se o Leaflet não carregar, o mapa é substituído por um aviso e o sistema continua:
o cidadão escolhe o bairro e escreve um ponto de referência (as coordenadas ficam aproximadas pelo bairro).
No admin, as tabelas continuam funcionando sem o mapa.

**Fotos.** O input usa `accept="image/*" capture="environment"`. A imagem é reduzida para no máximo 800 px
de largura e salva como JPEG qualidade 0,7 em data URL. O `localStorage` costuma ter cerca de 5 MB: se a cota
acabar, o cidadão vê uma mensagem amigável e pode enviar sem a foto.

**Ocorrências de exemplo sem foto** mostram uma ilustração em SVG por categoria.

**Indicador "Resolvidas no mês".** Conta as ocorrências resolvidas nos últimos 30 dias (e não no mês do
calendário), para o número não zerar no primeiro dia do mês durante uma demonstração.
O tempo de resolução é a data de resolução menos a data de abertura.

**Protocolo.** Formato `CE-AAAA-NNNN`, com numeração sequencial por ano. A ordem de serviço usa `OS-AAAA-NNNN`.

## O que ficou fora do MVP

- Servidor, banco de dados e sincronização real entre aparelhos (hoje, só o mesmo navegador).
- Login e perfis de acesso (o admin é aberto) e cadastro do cidadão.
- Notificações por SMS, e-mail ou WhatsApp quando o status muda.
- Aplicativo instalável (PWA) e uso offline com fila de envio.
- Envio de várias fotos, vídeo ou áudio por ocorrência.
- Detecção de ocorrências duplicadas e agrupamento por proximidade.
- Prioridade, prazos por categoria (SLA) e alertas automáticos de atraso.
- Gestão de equipes (escalas, membros, rotas), materiais e custos.
- Cadastro de bairros e categorias pelo admin (hoje ficam em `js/dados.js`).
- Exportação de relatórios (CSV, PDF) e filtros por período.
- Busca de endereço por texto (geocodificação) e delimitação do município.
- Moderação de conteúdo enviado pelo cidadão e proteção contra spam.
- Acessibilidade avançada (testes com leitores de tela) e outros idiomas.
- Testes automatizados e publicação em hospedagem.

## Créditos

Mapas: © colaboradores do OpenStreetMap. Biblioteca de mapas: Leaflet 1.9.4.
