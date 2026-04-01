const loader = document.querySelector("[data-kame-loader]");
const loginView = document.querySelector("[data-kame-login]");
const appView = document.querySelector("[data-kame-app]");
const loginMessage = document.querySelector("[data-kame-login-message]");
const modeStage = document.querySelector("[data-kame-mode-stage]");
const citizenView = document.querySelector("[data-kame-citizen]");
const employeeView = document.querySelector("[data-kame-employee]");
const employeeDenied = document.querySelector("[data-kame-employee-denied]");
const employeePanel = document.querySelector("[data-kame-employee-panel]");
const requestForm = document.querySelector("[data-kame-request-form]");
const fleetForm = document.querySelector("[data-kame-fleet-form]");
const employeeFilterForm = document.querySelector("[data-kame-employee-filter-form]");
const vehicleSelect = document.querySelector("[data-kame-vehicle-select]");
const citizenFeedback = document.querySelector("[data-kame-citizen-feedback]");
const employeeFeedback = document.querySelector("[data-kame-employee-feedback]");
const myRequestsNode = document.querySelector("[data-kame-my-requests]");
const employeeRequestsNode = document.querySelector("[data-kame-employee-requests]");
const citizenFleetNode = document.querySelector("[data-kame-fleet-citizen]");
const employeeFleetNode = document.querySelector("[data-kame-fleet-employee]");
const rentalModal = document.querySelector("[data-kame-rental-modal]");
const rentalForm = document.querySelector("[data-kame-rental-form]");
const rentalTitle = document.querySelector("[data-kame-rental-title]");
const staffModal = document.querySelector("[data-kame-staff-modal]");
const staffForm = document.querySelector("[data-kame-staff-form]");
const staffTitle = document.querySelector("[data-kame-staff-title]");
const staffScheduleWrap = document.querySelector("[data-kame-staff-schedule-wrap]");

let currentDashboard = null;
let employeePlateFilter = "";
let currentRentalModel = "";
let currentStaffAction = { requestId: "", status: "" };

function setFeedback(node, message, isError = false) {
  if (!node) return;
  node.textContent = message;
  node.classList.toggle("is-error", Boolean(isError));
  node.classList.toggle("is-ok", !isError && Boolean(message));
}

function hideLoader() {
  if (!loader) return;
  setTimeout(() => loader.classList.add("is-hidden"), 500);
}

function showLogin(message = "Debes iniciar sesion en el portal para entrar a Kame Motors.") {
  if (loginMessage) loginMessage.textContent = message;
  loginView.hidden = false;
  appView.hidden = true;
  hideLoader();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateTime(value) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("es-CL");
}

function statusLabel(status) {
  return ({
    pending: "Pendiente",
    accepted: "Aceptada",
    rejected: "Rechazada",
    scheduled: "Agendada",
    completed: "Completada",
  })[status] || status;
}

function prettifyServiceType(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function renderVehicleOptions(vehicles = []) {
  if (!vehicleSelect) return;
  vehicleSelect.innerHTML = `
    <option value="">Selecciona tu vehiculo</option>
    ${vehicles
      .map(
        (vehicle) =>
          `<option value="${escapeHtml(vehicle.plate)}">${escapeHtml(vehicle.name)} - ${escapeHtml(vehicle.plate || "Sin patente")}</option>`
      )
      .join("")}
  `;
}

function createFleetCard(item, canManage = false) {
  const image = escapeHtml(item.image || "assets/tienda/placeholder-auto.svg");
  return `
    <article class="kame-fleet-card">
      <div class="kame-fleet-image">
        <img src="${image}" alt="${escapeHtml(item.name)}" onerror="this.src='assets/tienda/placeholder-auto.svg'">
      </div>
      <div class="kame-fleet-body">
        <span class="kame-type">${escapeHtml(item.type || "Vehiculo")}</span>
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.description || "Sin descripcion.")}</p>
        <div class="portal-actions">
          ${
            canManage
              ? `<button type="button" class="portal-button danger" data-kame-remove-fleet="${escapeHtml(item.id)}">Quitar auto</button>`
              : `<button type="button" class="portal-button secondary" data-kame-rental="${escapeHtml(item.name)}">Solicitar arriendo</button>`
          }
        </div>
      </div>
    </article>
  `;
}

function openRentalModal(modelName) {
  currentRentalModel = modelName || "";
  if (rentalTitle) {
    rentalTitle.textContent = currentRentalModel ? `Solicitar arriendo: ${currentRentalModel}` : "Solicitar arriendo";
  }
  rentalForm?.reset();
  rentalModal?.removeAttribute("hidden");
}

function closeRentalModal() {
  currentRentalModel = "";
  rentalModal?.setAttribute("hidden", "");
}

function openStaffModal(requestId, status, label) {
  currentStaffAction = { requestId, status };
  if (staffTitle) {
    staffTitle.textContent = label || "Actualizar solicitud";
  }
  if (staffForm) {
    staffForm.reset();
  }
  if (staffScheduleWrap) {
    staffScheduleWrap.hidden = status !== "scheduled";
  }
  staffModal?.removeAttribute("hidden");
}

function closeStaffModal() {
  currentStaffAction = { requestId: "", status: "" };
  staffModal?.setAttribute("hidden", "");
}

function bindRentalButtons(scope) {
  scope.querySelectorAll("[data-kame-rental]").forEach((button) => {
    button.addEventListener("click", () => {
      openRentalModal(button.dataset.kameRental || "");
    });
  });
}

function bindFleetRemoveButtons(scope) {
  scope.querySelectorAll("[data-kame-remove-fleet]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const response = await fetch("/api/kame/fleet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "remove",
            fleet_id: button.dataset.kameRemoveFleet,
          }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "fleet_remove_failed");
        currentDashboard.fleet = payload.fleet || [];
        renderFleet();
        setFeedback(employeeFeedback, "Auto retirado de la flota correctamente.", false);
      } catch {
        setFeedback(employeeFeedback, "No se pudo quitar el auto de la flota.", true);
      }
    });
  });
}

function renderFleet() {
  const fleet = currentDashboard?.fleet || [];

  if (citizenFleetNode) {
    citizenFleetNode.innerHTML = fleet.length
      ? fleet.map((item) => createFleetCard(item, false)).join("")
      : '<div class="kame-empty">Por ahora no hay autos disponibles en Kame Motors.</div>';
    bindRentalButtons(citizenFleetNode);
  }

  if (employeeFleetNode) {
    employeeFleetNode.innerHTML = fleet.length
      ? fleet.map((item) => createFleetCard(item, true)).join("")
      : '<div class="kame-empty">No hay autos cargados en la flota actual.</div>';
    bindFleetRemoveButtons(employeeFleetNode);
  }
}

function renderMyRequests(items = []) {
  if (!myRequestsNode) return;
  if (!items.length) {
    myRequestsNode.innerHTML = '<div class="kame-empty">Todavia no has enviado solicitudes a Kame Motors.</div>';
    return;
  }

  myRequestsNode.innerHTML = items
    .map(
      (item) => `
        <article class="kame-request-item">
          <div class="kame-request-head">
            <div>
              <strong>${escapeHtml(prettifyServiceType(item.service_type || ""))}</strong>
              <p class="kame-mini">${escapeHtml(item.plate || item.rental_model || "Sin referencia")}</p>
            </div>
            <span class="kame-pill ${escapeHtml(item.status || "pending")}">${escapeHtml(statusLabel(item.status || "pending"))}</span>
          </div>
          <p>${escapeHtml(item.note || "Sin detalle.")}</p>
          <p class="kame-mini">Solicitado para ${escapeHtml(formatDateTime(item.preferred_date))}</p>
          ${item.scheduled_for ? `<p class="kame-mini">Agenda confirmada: ${escapeHtml(formatDateTime(item.scheduled_for))}</p>` : ""}
          ${item.staff_note ? `<p class="kame-mini">Respuesta interna: ${escapeHtml(item.staff_note)}</p>` : ""}
        </article>
      `
    )
    .join("");
}

function buildEmployeeActions(item) {
  const category = String(item.category || "").trim().toLowerCase();
  const status = String(item.status || "pending").trim().toLowerCase();

  if (category === "rental") {
    if (status === "pending") {
      return `
        <button type="button" class="portal-button primary" data-kame-update="${item.id}" data-kame-status="accepted">Aceptar arriendo</button>
        <button type="button" class="portal-button danger" data-kame-update="${item.id}" data-kame-status="rejected">Rechazar</button>
      `;
    }
    if (status === "accepted") {
      return `
        <button type="button" class="portal-button secondary" data-kame-update="${item.id}" data-kame-status="completed">Marcar como entregado</button>
      `;
    }
    return "";
  }

  if (status === "pending") {
    return `
      <button type="button" class="portal-button primary" data-kame-update="${item.id}" data-kame-status="scheduled">Agendar hora</button>
      <button type="button" class="portal-button danger" data-kame-update="${item.id}" data-kame-status="rejected">Rechazar</button>
    `;
  }

  if (status === "scheduled" || status === "accepted") {
    return `
      <button type="button" class="portal-button secondary" data-kame-update="${item.id}" data-kame-status="completed">Marcar como completado</button>
      <button type="button" class="portal-button danger" data-kame-update="${item.id}" data-kame-status="rejected">Rechazar</button>
    `;
  }

  return "";
}

function renderEmployeeRequests(items = []) {
  if (!employeeRequestsNode) return;
  const filtered = employeePlateFilter
    ? items.filter((item) => String(item.plate || "").toLowerCase().includes(employeePlateFilter.toLowerCase()))
    : items;

  if (!filtered.length) {
    employeeRequestsNode.innerHTML = '<div class="kame-empty">No hay solicitudes que coincidan con el filtro actual.</div>';
    return;
  }

  employeeRequestsNode.innerHTML = filtered
    .map((item) => {
      const actions = buildEmployeeActions(item);
      return `
        <article class="kame-request-item">
          <div class="kame-request-head">
            <div>
              <strong>${escapeHtml(item.owner_name || "Sin nombre")}</strong>
              <p class="kame-mini">${escapeHtml(prettifyServiceType(item.service_type || ""))} - ${escapeHtml(item.plate || item.rental_model || "Sin referencia")}</p>
            </div>
            <span class="kame-pill ${escapeHtml(item.status || "pending")}">${escapeHtml(statusLabel(item.status || "pending"))}</span>
          </div>
          <p>${escapeHtml(item.note || "Sin detalle.")}</p>
          <p class="kame-mini">Deseada: ${escapeHtml(formatDateTime(item.preferred_date))} - RUT: ${escapeHtml(item.owner_rut || "Sin rut")}</p>
          ${item.scheduled_for ? `<p class="kame-mini">Agenda confirmada: ${escapeHtml(formatDateTime(item.scheduled_for))}</p>` : ""}
          <div class="kame-request-actions${actions ? "" : " is-empty"}">
            ${actions || `<span class="kame-mini">Sin acciones disponibles para este estado.</span>`}
          </div>
        </article>
      `;
    })
    .join("");

  employeeRequestsNode.querySelectorAll("[data-kame-update]").forEach((button) => {
    button.addEventListener("click", () => {
      const requestId = button.dataset.kameUpdate;
      const status = button.dataset.kameStatus;
      openStaffModal(requestId, status, button.textContent.trim());
    });
  });
}

function showStage(stage) {
  modeStage.hidden = stage !== "mode";
  citizenView.hidden = stage !== "citizen";
  employeeView.hidden = stage !== "employee";
}

async function loadDashboard() {
  const response = await fetch("/api/kame/dashboard", { cache: "no-store" });
  if (!response.ok) throw new Error("unauthorized");
  currentDashboard = await response.json();
  renderVehicleOptions(currentDashboard.vehicles || []);
  renderFleet();
  renderMyRequests(currentDashboard.my_requests || []);
  renderEmployeeRequests(currentDashboard.employee_requests || []);
}

requestForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);

  try {
    const response = await fetch("/api/kame/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "service",
        service_type: String(data.get("service_type") || "").trim(),
        plate: String(data.get("plate") || "").trim(),
        preferred_date: String(data.get("preferred_date") || "").trim(),
        note: String(data.get("note") || "").trim(),
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "request_failed");
    currentDashboard.my_requests = payload.my_requests || [];
    renderMyRequests(currentDashboard.my_requests);
    requestForm.reset();
    setFeedback(citizenFeedback, "Solicitud enviada correctamente a Kame Motors.", false);
  } catch (error) {
    const messageMap = {
      identity_required: "Primero necesitas tener tu identidad creada en el portal.",
      bank_not_found: "Primero debes crear tu cuenta bancaria y tener un vehiculo registrado.",
      vehicle_not_found: "No encontramos un vehiculo tuyo con esa patente.",
      invalid_request: "Completa el tipo, la patente y la fecha deseada.",
    };
    setFeedback(citizenFeedback, messageMap[error.message] || "No se pudo enviar la solicitud.", true);
  }
});

fleetForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);

  try {
    const response = await fetch("/api/kame/fleet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add",
        name: String(data.get("name") || "").trim(),
        type: String(data.get("type") || "").trim(),
        description: String(data.get("description") || "").trim(),
        image: String(data.get("image") || "").trim(),
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "fleet_add_failed");
    currentDashboard.fleet = payload.fleet || [];
    renderFleet();
    fleetForm.reset();
    setFeedback(employeeFeedback, "Auto agregado a la flota correctamente.", false);
  } catch (error) {
    const messageMap = {
      invalid_fleet_item: "Debes completar nombre, tipo y descripcion del auto.",
    };
    setFeedback(employeeFeedback, messageMap[error.message] || "No se pudo agregar el auto.", true);
  }
});

employeeFilterForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  employeePlateFilter = String(new FormData(event.currentTarget).get("plate") || "").trim();
  renderEmployeeRequests(currentDashboard?.employee_requests || []);
});

document.querySelectorAll("[data-kame-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.dataset.kameMode;
    if (mode === "employee") {
      showStage("employee");
      const allowed = Boolean(currentDashboard?.permissions?.canAccessKame);
      employeeDenied.hidden = allowed;
      employeePanel.hidden = !allowed;
      if (!allowed) {
        setFeedback(employeeFeedback, "No tienes el rol Kame motors para entrar como funcionario.", true);
      }
      return;
    }

    showStage("citizen");
  });
});

document.querySelectorAll("[data-kame-back]").forEach((button) => {
  button.addEventListener("click", () => {
    setFeedback(citizenFeedback, "", false);
    setFeedback(employeeFeedback, "", false);
    showStage("mode");
  });
});

document.querySelectorAll("[data-kame-rental-cancel]").forEach((button) => {
  button.addEventListener("click", closeRentalModal);
});

document.querySelectorAll("[data-kame-staff-cancel]").forEach((button) => {
  button.addEventListener("click", closeStaffModal);
});

rentalModal?.addEventListener("click", (event) => {
  if (event.target === rentalModal) {
    closeRentalModal();
  }
});

staffModal?.addEventListener("click", (event) => {
  if (event.target === staffModal) {
    closeStaffModal();
  }
});

rentalForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  try {
    const response = await fetch("/api/kame/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: "rental",
        service_type: "arriendo",
        rental_model: currentRentalModel,
        preferred_date: String(data.get("preferred_date") || "").trim(),
        note: String(data.get("note") || "").trim(),
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "rental_failed");
    currentDashboard.my_requests = payload.my_requests || [];
    renderMyRequests(currentDashboard.my_requests);
    closeRentalModal();
    setFeedback(citizenFeedback, `Solicitud de arriendo enviada para ${currentRentalModel}.`, false);
  } catch (error) {
    const messageMap = {
      invalid_request: "Debes ingresar una fecha valida y un detalle del arriendo.",
      rental_not_found: "Ese auto ya no esta disponible dentro de la flota actual.",
    };
    setFeedback(citizenFeedback, messageMap[error.message] || "No se pudo solicitar el arriendo.", true);
  }
});

staffForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  try {
    const response = await fetch("/api/kame/request/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        request_id: currentStaffAction.requestId,
        status: currentStaffAction.status,
        staff_note: String(data.get("staff_note") || "").trim(),
        scheduled_for: currentStaffAction.status === "scheduled" ? String(data.get("scheduled_for") || "").trim() : "",
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "kame_update_failed");
    currentDashboard.employee_requests = payload.employee_requests || [];
    renderEmployeeRequests(currentDashboard.employee_requests);
    closeStaffModal();
    setFeedback(employeeFeedback, `Solicitud ${statusLabel(currentStaffAction.status).toLowerCase()} correctamente.`, false);
  } catch (error) {
    const messageMap = {
      request_not_found: "No se encontro la solicitud indicada.",
      invalid_update: "Debes indicar un estado valido para la solicitud.",
    };
    setFeedback(employeeFeedback, messageMap[error.message] || "No se pudo actualizar la solicitud.", true);
  }
});

(async () => {
  try {
    if (window.location.protocol === "file:") {
      showLogin("Debes abrir Kame Motors desde un servidor web valido para que la sesion del portal funcione.");
      return;
    }
    const response = await fetch("/api/portal/session", { cache: "no-store" });
    if (!response.ok) {
      showLogin("Tu sesion del portal no esta activa en el servidor. Vuelve a entrar al portal y reintenta.");
      return;
    }
    appView.hidden = false;
    await loadDashboard();
    showStage("mode");
    hideLoader();
  } catch {
    showLogin("No pudimos validar tu sesion del portal. Abre la web desde localhost y vuelve a iniciar sesion si hace falta.");
  }
})();
