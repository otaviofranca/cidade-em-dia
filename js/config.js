/* ==========================================================
   config.js  |  Cidade em Dia
   Ajustes da demonstração. O apresentador troca CENTRO pelas
   coordenadas da cidade que vai visitar e recarrega as páginas.
   Depois de trocar, use "Restaurar dados de exemplo" no admin
   para gerar as 30 ocorrências em volta do novo centro.
   ========================================================== */

// [latitude, longitude] do centro da cidade da demonstração
const CENTRO = [-15.78, -47.93];

// Raio (em km) em que os dados fictícios são espalhados
const RAIO_KM = 2;

// Nome exibido nos documentos e no painel
const NOME_CIDADE = "Cidade Exemplo";

// Zoom inicial dos mapas
const ZOOM_PADRAO = 14;

// Ocorrência aberta há mais de N dias é destacada como atrasada
const DIAS_ATRASO = 7;

// Chaves do localStorage
const CHAVE_DADOS = "cidadeemdia.dados.v1";
const CHAVE_MEUS = "cidadeemdia.meus.v1";
