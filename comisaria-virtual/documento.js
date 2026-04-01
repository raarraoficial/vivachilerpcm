const DOCUMENT_SESSION_KEY = "viva_chile_comisaria_document";

function getStoredDocument() {
  try {
    const raw = sessionStorage.getItem(DOCUMENT_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function sanitizeText(value) {
  return String(value ?? "").trim();
}

function getDocumentCopy(record) {
  if (record.type === "denuncia") {
    return {
      pageTitle: "Denuncia",
      subtitle: "Denuncia formal",
      intro: `Se deja registro que ${sanitizeText(record.data?.nombre)}, contacto ${sanitizeText(record.data?.contacto)}, presenta una denuncia formal con fecha ${sanitizeText(record.data?.fecha)} por un hecho ocurrido en ${sanitizeText(record.data?.ubicacion)} ante la Comisaria Virtual de Viva Chile Roleplay.`,
      detailLabel: "Relato del denunciante:",
      strongNote: "DENUNCIA INGRESADA PARA REVISION.",
      note: "Este documento corresponde a una denuncia emitida por el sistema de Comisaria Virtual del servidor y queda asociada al folio indicado en esta hoja.",
    };
  }

  if (record.type === "permiso") {
    return {
      pageTitle: "Salvoconducto",
      subtitle: "Circulacion en toque de queda",
      intro: `Se deja registro que ${sanitizeText(record.data?.nombre)}, identificacion ${sanitizeText(record.data?.rut)}, solicita salvoconducto para circular el dia ${sanitizeText(record.data?.fecha)} desde ${sanitizeText(record.data?.origen)} hasta ${sanitizeText(record.data?.destino)}, entre las ${sanitizeText(record.data?.salida)} y las ${sanitizeText(record.data?.termino)}, por motivo ${sanitizeText(record.data?.motivo)} ante la Comisaria Virtual de Viva Chile Roleplay.`,
      detailLabel: "Observaciones del solicitante:",
      strongNote: "SALVOCONDUCTO REGISTRADO.",
      note: "Este documento corresponde a una solicitud de salvoconducto emitida por el sistema de Comisaria Virtual del servidor y queda asociada al folio indicado en esta hoja.",
    };
  }

  return {
    pageTitle: "Constancia",
    subtitle: sanitizeText(record.data?.tipo) || "Constancia simple",
    intro: `Se deja constancia que ${sanitizeText(record.data?.nombre)}, identificacion ${sanitizeText(record.data?.rut)}, realiza una presentacion correspondiente a ${sanitizeText(record.data?.tipo)} ante la Comisaria Virtual de Viva Chile Roleplay.`,
    detailLabel: "El ciudadano solicitante expone lo siguiente:",
    strongNote: "VALIDO PARA FINES PARTICULARES.",
    note: "Este documento corresponde a una constancia emitida por el sistema de Comisaria Virtual del servidor y queda asociado al folio indicado en esta hoja.",
  };
}

function showDocument(record) {
  const pages = document.querySelectorAll("[data-document-page]");
  const emptyState = document.querySelector("[data-empty-state]");

  pages.forEach((page) => {
    page.hidden = false;
  });

  if (emptyState) {
    emptyState.hidden = true;
  }

  const folio = sanitizeText(record.folio);
  const createdAt = sanitizeText(record.createdAt);
  const detalle = sanitizeText(record.data?.detalle);
  const copy = getDocumentCopy(record);

  const folioNode = document.querySelector("[data-folio]");
  const folioLargeNode = document.querySelector("[data-folio-large]");
  const documentTitleNode = document.querySelector("[data-document-title]");
  const subtitleNode = document.querySelector("[data-subtitle]");
  const introNode = document.querySelector("[data-intro]");
  const detailLabelNode = document.querySelector("[data-detail-label]");
  const detailNode = document.querySelector("[data-detail]");
  const strongNoteNode = document.querySelector("[data-strong-note]");
  const documentNoteNode = document.querySelector("[data-document-note]");
  const issuedAtNode = document.querySelector("[data-issued-at]");
  const verificationNode = document.querySelector("[data-verification-code]");

  document.title = `${copy.pageTitle} emitida`;
  if (folioNode) folioNode.textContent = folio;
  if (folioLargeNode) folioLargeNode.textContent = folio.replaceAll("-", " ");
  if (documentTitleNode) documentTitleNode.textContent = copy.pageTitle;
  if (subtitleNode) subtitleNode.textContent = copy.subtitle;
  if (introNode) introNode.textContent = copy.intro;
  if (detailLabelNode) detailLabelNode.textContent = copy.detailLabel;
  if (detailNode) detailNode.textContent = detalle || "Sin detalle informado.";
  if (strongNoteNode) strongNoteNode.textContent = copy.strongNote;
  if (documentNoteNode) documentNoteNode.textContent = copy.note;
  if (issuedAtNode) issuedAtNode.textContent = createdAt;
  if (verificationNode) verificationNode.textContent = folio;
}

function showEmptyState() {
  const pages = document.querySelectorAll("[data-document-page]");
  const emptyState = document.querySelector("[data-empty-state]");

  pages.forEach((page) => {
    page.hidden = true;
  });

  if (emptyState) {
    emptyState.hidden = false;
  }
}

const record = getStoredDocument();

if (record && (record.type === "constancia" || record.type === "denuncia" || record.type === "permiso")) {
  showDocument(record);
} else {
  showEmptyState();
}
