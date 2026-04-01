const STORAGE_KEY = "viva_chile_comisaria_records";
const DOCUMENT_SESSION_KEY = "viva_chile_comisaria_document";

const tabs = Array.from(document.querySelectorAll(".cv-app-tab"));
const panels = Array.from(document.querySelectorAll(".cv-form-panel"));
const quickOpeners = Array.from(document.querySelectorAll("[data-open-service]"));
const resultCard = document.querySelector("[data-result-card]");
const resultBody = document.querySelector("[data-result-body]");
const queryResult = document.querySelector("[data-query-result]");
const downloadActions = document.querySelector("[data-download-actions]");
const downloadButton = document.querySelector("[data-download-button]");
const previewButton = document.querySelector("[data-preview-button]");
const documentPreview = document.querySelector("[data-document-preview]");
const previewImage = document.querySelector("[data-preview-image]");
let currentDocumentUrl = "";
let currentDocumentFilename = "";
let currentDocumentCanvas = null;

function getRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function setRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function generateFolio() {
  return `CV-${Date.now().toString().slice(-6)}`;
}

function formatRut(value) {
  const clean = String(value ?? "").replace(/[^0-9kK]/g, "").toUpperCase().slice(0, 9);
  if (!clean) return "";
  if (clean.length === 1) return clean;

  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${formattedBody}-${dv}`;
}

function getCleanRut(value) {
  return String(value ?? "").replace(/[^0-9kK]/g, "").toUpperCase();
}

function isRutLengthValid(value) {
  const cleanRut = getCleanRut(value);
  return cleanRut.length >= 8 && cleanRut.length <= 9;
}

function setFieldInvalid(field, message) {
  if (!field) return;
  field.classList.add("is-invalid");
  field.setCustomValidity(message);
}

function clearFieldInvalid(field) {
  if (!field) return;
  field.classList.remove("is-invalid");
  field.setCustomValidity("");
}

function validateRutField(input, { force = false } = {}) {
  if (!input) return true;

  const rawValue = String(input.value || "");
  const cleanRut = getCleanRut(rawValue);

  if (!rawValue.trim()) {
    if (force) {
      setFieldInvalid(input, "Completa este campo.");
      return false;
    }

    clearFieldInvalid(input);
    return true;
  }

  if (!isRutLengthValid(rawValue)) {
    setFieldInvalid(input, "El RUT debe tener entre 8 y 9 caracteres reales, usando solo numeros y K.");
    return false;
  }

  clearFieldInvalid(input);
  return true;
}

function activateService(service) {
  tabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.service === service);
  });

  panels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === service);
  });

  const appSection = document.querySelector("#app");
  if (appSection) {
    appSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function setDownloadLinks(url, filename) {
  if (!downloadActions) return;
  currentDocumentUrl = url;
  currentDocumentFilename = filename;
  downloadActions.hidden = false;
  if (documentPreview && previewImage) {
    documentPreview.hidden = false;
    previewImage.src = url;
  }
  if (downloadButton) {
    if (downloadButton.tagName === "A") {
      downloadButton.href = url;
      downloadButton.download = filename;
    }
    downloadButton.dataset.downloadUrl = url;
    downloadButton.dataset.downloadFilename = filename;
  }
}

function clearDownloadLinks() {
  if (currentDocumentUrl.startsWith("blob:")) {
    URL.revokeObjectURL(currentDocumentUrl);
  }

  currentDocumentUrl = "";
  currentDocumentFilename = "";
  currentDocumentCanvas = null;
  if (!downloadActions) return;
  downloadActions.hidden = true;
  if (documentPreview && previewImage) {
    documentPreview.hidden = true;
    previewImage.removeAttribute("src");
  }
  if (downloadButton) {
    if (downloadButton.tagName === "A") {
      downloadButton.removeAttribute("href");
      downloadButton.setAttribute("href", "#");
      downloadButton.removeAttribute("download");
    }
    delete downloadButton.dataset.downloadUrl;
    delete downloadButton.dataset.downloadFilename;
  }
}

function renderResult(record, title) {
  if (!resultCard || !resultBody) return;
  resultCard.hidden = false;
  resultBody.innerHTML = `
    <div class="cv-result-grid">
      <div><span>Folio</span><strong>${record.folio}</strong></div>
      <div><span>Tipo</span><strong>${record.typeLabel}</strong></div>
      <div><span>Estado</span><strong>${record.status}</strong></div>
      <div><span>Fecha</span><strong>${record.createdAt}</strong></div>
    </div>
    <p class="cv-result-message">${title}</p>
  `;
}

function createRecord(type, data) {
  const labels = {
    constancia: "Constancia simple",
    denuncia: "Denuncia",
    permiso: "Salvoconducto",
  };

  return {
    folio: generateFolio(),
    type,
    typeLabel: labels[type],
    status: type === "denuncia" ? "En revision" : "Ingresado",
    createdAt: new Date().toLocaleString("es-CL"),
    data,
  };
}

function openGeneratedDocument(record) {
  sessionStorage.setItem(DOCUMENT_SESSION_KEY, JSON.stringify(record));
  window.location.href = "documento.html";
}

function canOpenGeneratedDocument(record) {
  return ["constancia", "denuncia", "permiso"].includes(record?.type);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text || "").split(/\s+/);
  let line = "";
  let currentY = y;

  words.forEach((word, index) => {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = word;
      currentY += lineHeight;
    } else {
      line = testLine;
    }

    if (index === words.length - 1 && line) {
      ctx.fillText(line, x, currentY);
      currentY += lineHeight;
    }
  });

  return currentY;
}

function buildPngDocument(record) {
  const logo = document.getElementById("carabineros-logo-source");
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 2260;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (logo && logo.complete && logo.naturalWidth > 0) {
    ctx.drawImage(logo, 70, 60, 180, 180);
  }

  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  ctx.font = "bold 44px Arial";
  ctx.fillText("CARABINEROS DE CHILE", 800, 120);
  ctx.font = "28px Arial";
  ctx.fillText("https://comisariavirtual.vivachile", 800, 175);

  ctx.textAlign = "left";
  ctx.font = "bold 28px Arial";
  ctx.fillText("Folio:", 1280, 80);
  ctx.fillText(record.folio, 1280, 120);
  ctx.font = "bold 56px Courier New";
  ctx.fillText(record.folio.replaceAll("-", " "), 1280, 190);
  ctx.font = "28px Arial";
  ctx.fillText("Pagina 1 de 1", 1280, 240);

  ctx.fillRect(70, 290, 1460, 6);

  ctx.textAlign = "center";
  ctx.font = "54px Arial";
  ctx.fillText(record.typeLabel, 800, 390);

  const subtitleMap = {
    constancia: record.data.tipo || "Constancia general",
    denuncia: "Denuncia formal",
    permiso: "Circulacion en toque de queda",
  };
  ctx.font = "40px Arial";
  ctx.fillText(subtitleMap[record.type], 800, 450);

  ctx.fillStyle = "#333333";
  ctx.fillRect(70, 515, 1460, 2);
  ctx.fillStyle = "#111111";

  const intro =
    record.type === "constancia"
      ? `Se deja constancia que ${record.data.nombre}, identificacion ${record.data.rut}, realiza una presentacion correspondiente a ${record.data.tipo} ante la Comisaria Virtual de Viva Chile Roleplay.`
      : record.type === "denuncia"
        ? `Se registra denuncia presentada por ${record.data.nombre}, contacto ${record.data.contacto}, con fecha ${record.data.fecha} en la ubicacion ${record.data.ubicacion}.`
        : `Se registra solicitud de salvoconducto presentada por ${record.data.nombre}, identificacion ${record.data.rut}, para circular el dia ${record.data.fecha} desde ${record.data.origen} hasta ${record.data.destino}, entre las ${record.data.salida} y las ${record.data.termino}, por motivo ${record.data.motivo}.`;

  ctx.textAlign = "left";
  ctx.font = "38px Arial";
  let y = 590;
  y = wrapText(ctx, intro, 80, y, 1440, 58);
  y += 30;

  const label =
    record.type === "constancia"
      ? "El ciudadano solicitante expone lo siguiente:"
      : record.type === "denuncia"
        ? "Relato del denunciante:"
        : "Observaciones del solicitante:";
  ctx.fillText(label, 80, y);
  y += 70;

  const lines = String(record.data.detalle || "Sin detalle informado.").split("\n");
  lines.forEach((line) => {
    y = wrapText(ctx, line || " ", 80, y, 1440, 54);
    y += 6;
  });
  y += 30;

  ctx.font = "bold 40px Arial";
  const strongLabel =
    record.type === "constancia"
      ? "VALIDO PARA FINES PARTICULARES."
      : record.type === "denuncia"
        ? "DENUNCIA INGRESADA PARA REVISION."
        : "SALVOCONDUCTO REGISTRADO.";
  ctx.fillText(strongLabel, 80, y);
  y += 80;

  ctx.font = "36px Arial";
  const note =
    record.type === "constancia"
      ? "Este documento corresponde a una constancia emitida por el sistema de Comisaria Virtual del servidor."
      : record.type === "denuncia"
        ? "Los antecedentes quedan sujetos a validacion administrativa dentro del contexto RP."
        : "Este documento corresponde a una solicitud de salvoconducto emitida por el sistema de Comisaria Virtual del servidor.";
  wrapText(ctx, note, 80, y, 1440, 52);

  const footerTop = 1700;
  ctx.fillStyle = "#333333";
  ctx.fillRect(70, footerTop, 1460, 2);
  ctx.fillStyle = "#111111";
  ctx.font = "32px Arial";
  ctx.fillText(`Fecha de emision: ${new Date().toLocaleString("es-CL")}`, 80, footerTop + 60);
  ctx.fillText(`Codigo de verificacion: ${record.folio}`, 80, footerTop + 105);

  ctx.beginPath();
  ctx.arc(430, 1960, 120, 0, Math.PI * 2);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#111111";
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.font = "bold 28px Arial";
  ctx.fillText("CARABINEROS DE CHILE", 430, 1940);
  ctx.font = "24px Arial";
  ctx.fillText("COMISARIA VIRTUAL", 430, 1980);

  ctx.beginPath();
  ctx.moveTo(1050, 1980);
  ctx.bezierCurveTo(1110, 1900, 1180, 2050, 1240, 1970);
  ctx.bezierCurveTo(1290, 1910, 1350, 2040, 1410, 1965);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.font = "bold 30px Arial";
  ctx.fillText("Comisario Virtual", 1230, 2050);
  ctx.font = "24px Arial";
  ctx.fillText("Viva Chile Roleplay", 1230, 2090);

  return canvas;
}

function prepareDocument(record) {
  const canvas = buildPngDocument(record);
  currentDocumentCanvas = canvas;
  const filename = `${record.type}-${record.folio}.png`;

  if (canvas.toBlob) {
    canvas.toBlob((blob) => {
      if (!blob) return;
      if (currentDocumentUrl.startsWith("blob:")) {
        URL.revokeObjectURL(currentDocumentUrl);
      }
      setDownloadLinks(URL.createObjectURL(blob), filename);
    }, "image/png");
    return;
  }

  setDownloadLinks(canvas.toDataURL("image/png"), filename);
}

function handleSubmission(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const type = form.dataset.formType;
  const formData = new FormData(form);
  form.classList.add("was-submitted");

  if (type === "consulta") {
    const folio = (formData.get("folio") || "").toString().trim().toUpperCase();
    const records = getRecords();
    const match = records.find((record) => record.folio.toUpperCase() === folio);
    clearDownloadLinks();

    if (!queryResult) return;
    queryResult.hidden = false;

    if (!match) {
      queryResult.innerHTML = `
        <div class="cv-query-empty">
          <strong>Sin resultados</strong>
          <p>No encontramos un tramite con ese folio en este navegador.</p>
        </div>
      `;
      return;
    }

    queryResult.innerHTML = `
      <div class="cv-query-card">
        <div><span>Folio</span><strong>${match.folio}</strong></div>
        <div><span>Tipo</span><strong>${match.typeLabel}</strong></div>
        <div><span>Estado</span><strong>${match.status}</strong></div>
        <div><span>Fecha</span><strong>${match.createdAt}</strong></div>
      </div>
    `;

    if (canOpenGeneratedDocument(match)) {
      const actions = document.createElement("div");
      actions.className = "cv-query-actions";
      const openButton = document.createElement("button");
      openButton.type = "button";
      openButton.className = "cv-inline-button";
      openButton.textContent = "Ver documento";
      openButton.addEventListener("click", () => {
        openGeneratedDocument(match);
      });
      actions.appendChild(openButton);
      queryResult.appendChild(actions);
    }

    return;
  }

  const data = Object.fromEntries(formData.entries());
  if (type === "constancia" || type === "permiso") {
    const rutInput = form.querySelector("[data-rut-input]");
    if (!validateRutField(rutInput, { force: true })) {
      rutInput?.reportValidity();
      return;
    }

    data.rut = formatRut(data.rut);
  }

  if (!form.reportValidity()) {
    return;
  }

  const records = getRecords();
  const record = createRecord(type, data);
  records.unshift(record);
  setRecords(records);

  if (type === "constancia" || type === "denuncia" || type === "permiso") {
    form.reset();
    form.classList.remove("was-submitted");
    clearDownloadLinks();
    openGeneratedDocument(record);
    return;
  }

  form.reset();
  form.classList.remove("was-submitted");
  clearDownloadLinks();
  renderResult(record, "El documento ya esta listo. Usa el boton de descarga para guardarlo en PNG.");
  prepareDocument(record);
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => activateService(tab.dataset.service));
});

quickOpeners.forEach((trigger) => {
  trigger.addEventListener("click", () => activateService(trigger.dataset.openService));
});

document.querySelectorAll(".cv-form").forEach((form) => {
  form.addEventListener("submit", handleSubmission);
});

document.querySelectorAll("[data-rut-input]").forEach((input) => {
  input.addEventListener("input", () => {
    input.value = formatRut(input.value);
    validateRutField(input);
  });

  input.addEventListener("keypress", (event) => {
    const key = event.key;
    const isNumber = /[0-9]/.test(key);
    const isK = key.toLowerCase() === "k";
    const isControl = key.length > 1;
    if (!isNumber && !isK && !isControl) {
      event.preventDefault();
    }
  });

  input.addEventListener("blur", () => {
    validateRutField(input, { force: true });
  });
});

if (downloadButton) {
  downloadButton.addEventListener("click", (event) => {
    if (!currentDocumentUrl) {
      event.preventDefault();
      return;
    }

    if (downloadButton.tagName === "A") {
      return;
    }

    const link = document.createElement("a");
    link.href = currentDocumentUrl;
    link.download = currentDocumentFilename || "documento.png";
    link.target = "_blank";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  });
}

if (previewButton) {
  previewButton.addEventListener("click", () => {
    if (currentDocumentUrl && documentPreview) {
      documentPreview.hidden = false;
      previewImage?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
}

window.addEventListener("load", () => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.classList.remove("cv-intro-pending");
    });
  });
});
