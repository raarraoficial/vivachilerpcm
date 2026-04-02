const loginView = document.querySelector("[data-login-view]");
const panelView = document.querySelector("[data-panel-view]");
const adminUser = document.querySelector("[data-admin-user]");
const adminForm = document.querySelector("[data-admin-form]");
const adminAnnouncementForm = document.querySelector("[data-admin-announcement-form]");
const adminEmergencyForm = document.querySelector("[data-admin-emergency-form]");
const adminEmergencyFormAlt = document.querySelector("[data-admin-emergency-form-alt]");
const adminMaintenanceForm = document.querySelector("[data-admin-maintenance-form]");
const adminBalanceForm = document.querySelector("[data-admin-balance-form]");
const adminBulkBalanceForm = document.querySelector("[data-admin-bulk-balance-form]");
const adminIdentityForm = document.querySelector("[data-admin-identity-form]");
const adminDeleteForm = document.querySelector("[data-admin-delete-form]");
const adminStoreForm = document.querySelector("[data-admin-store-form]");
const adminStoreGrantForm = document.querySelector("[data-admin-store-grant-form]");
const adminStoreGrantSelect = document.querySelector("[data-admin-store-grant-select]");
const adminStoreImportForm = document.querySelector("[data-admin-store-import-form]");
const adminStoreList = document.querySelector("[data-admin-store-list]");
const adminFeedback = document.querySelector("[data-admin-feedback]");
const refreshButton = document.querySelector("[data-refresh-session]");
const logoutButton = document.querySelector("[data-logout]");
const adminTabButtons = document.querySelectorAll("[data-admin-tab-button]");
let currentMaintenanceState = {};

function setAdminTab(tabName) {
  document.querySelectorAll("[data-admin-tab]").forEach((section) => {
    section.classList.toggle("is-active", section.dataset.adminTab === tabName);
  });
  adminTabButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.adminTabButton === tabName);
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setFeedback(message, state = "") {
  if (!adminFeedback) return;
  adminFeedback.textContent = message;
  adminFeedback.dataset.state = state;
}

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function uploadStoreImageFile(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("file_read_failed"));
    reader.readAsDataURL(file);
  });

  const response = await fetch("/api/admin/store/upload-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      data_url: dataUrl,
    }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "upload_failed");
  }
  return payload.path;
}

function updateImagePreview(scope, value) {
  const preview = scope.querySelector("[data-image-preview]");
  if (!preview) return;
  const src = String(value || "").trim();
  if (!src) {
    preview.hidden = true;
    preview.removeAttribute("src");
    return;
  }
  preview.src = src;
  preview.hidden = false;
}

function attachImageDropzone(scope) {
  const dropzone = scope.querySelector("[data-image-dropzone]");
  const fileInput = scope.querySelector("[data-image-file-input]");
  const imageInput = scope.querySelector('input[name="image"]');
  if (!dropzone || !fileInput || !imageInput || dropzone.dataset.bound === "true") return;

  dropzone.dataset.bound = "true";

  const uploadAndApply = async (file) => {
    if (!file) return;
    dropzone.classList.add("is-uploading");
    try {
      const savedPath = await uploadStoreImageFile(file);
      imageInput.value = savedPath;
      updateImagePreview(scope, savedPath);
      setFeedback(`Imagen subida correctamente: ${savedPath}`, "success");
    } catch {
      setFeedback("No se pudo subir la imagen.", "error");
    } finally {
      dropzone.classList.remove("is-uploading");
    }
  };

  dropzone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    uploadAndApply(fileInput.files?.[0]);
    fileInput.value = "";
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-dragover");
    });
  });

  dropzone.addEventListener("drop", (event) => {
    const file = event.dataTransfer?.files?.[0];
    uploadAndApply(file);
  });

  imageInput.addEventListener("input", () => {
    updateImagePreview(scope, imageInput.value);
  });

  updateImagePreview(scope, imageInput.value);
}

function fillForm(stats) {
  if (!adminForm) return;
  adminForm.elements.discord_members.value = stats.discord_members ?? 0;
  adminForm.elements.server_staff.value = stats.server_staff ?? 20;
  adminForm.elements.server_status.value = stats.server_status ?? "Cerrado";
  adminForm.elements.general_status.value = stats.general_status ?? "En linea";
  adminForm.elements.updated_at.value = stats.updated_at ?? "sin datos";
}

function fillMaintenanceForm(maintenance = {}) {
  currentMaintenanceState = maintenance || {};
  if (!adminMaintenanceForm) return;
  const section = adminMaintenanceForm.elements.section.value || "inicio";
  const current = currentMaintenanceState[section] || {};
  adminMaintenanceForm.elements.enabled.value = String(Boolean(current.enabled));
  adminMaintenanceForm.elements.title.value = current.title || "";
  adminMaintenanceForm.elements.message.value = current.message || "";
}

function renderStoreItems(items = []) {
  if (!adminStoreList) return;
  if (adminStoreGrantSelect) {
    adminStoreGrantSelect.innerHTML = `
      <option value="">Selecciona un item</option>
      ${items.map((item) => `<option value="${item.id}">${item.name}</option>`).join("")}
    `;
  }
  if (!items.length) {
    adminStoreList.innerHTML = "<p class=\"admin-user\">Todavia no hay items cargados.</p>";
    return;
  }

  adminStoreList.innerHTML = items
    .map(
      (item) => `
        <article class="admin-store-item">
          <img src="${item.image}" alt="${item.name}" onerror="this.src='assets/tienda/placeholder-auto.svg';this.onerror=null;">
          <div class="admin-store-item-content">
            <div class="admin-store-item-summary">
              <div>
                <h3>${item.name}</h3>
                <p>${item.description}</p>
                <p><strong>$${Number(item.price || 0).toLocaleString("es-CL")}</strong></p>
              </div>
              <div class="admin-store-item-actions">
                <button type="button" class="admin-button secondary" data-store-toggle="${item.id}">Editar</button>
                <button type="button" class="admin-button secondary" data-store-delete="${item.id}">Borrar</button>
              </div>
            </div>
            <form class="admin-form admin-store-edit-form" data-store-edit-form data-store-id="${item.id}" hidden>
              <label>
                Nombre
                <input type="text" name="name" value="${escapeHtml(item.name)}" required>
              </label>
              <label>
                Precio
                <input type="number" name="price" min="0" value="${Number(item.price || 0)}" required>
              </label>
              <label>
                Categoria
                <select name="category" required>
                  <option value="vehiculos" ${item.category === "vehiculos" ? "selected" : ""}>Vehiculos</option>
                  <option value="armamento" ${item.category === "armamento" ? "selected" : ""}>Armamento</option>
                  <option value="licencias" ${item.category === "licencias" ? "selected" : ""}>Licencias</option>
                  <option value="casino" ${item.category === "casino" ? "selected" : ""}>Casino</option>
                </select>
              </label>
              <label class="admin-form-span">
                Descripcion
                <textarea name="description" rows="3" required>${escapeHtml(item.description)}</textarea>
              </label>
              <label class="admin-form-span">
                Foto
                <input type="text" name="image" value="${escapeHtml(item.image)}" required>
                <div class="admin-dropzone" data-image-dropzone>
                  <input class="admin-dropzone-input" type="file" accept="image/png,image/jpeg,image/webp" data-image-file-input hidden>
                  <strong>Sueltala aqui o haz click</strong>
                  <span>Tambien puedes reemplazar la foto del item desde aqui.</span>
                </div>
                <img class="admin-image-preview" data-image-preview src="${escapeHtml(item.image)}" alt="Vista previa de imagen">
              </label>
              <div class="admin-store-item-actions">
                <button type="submit" class="admin-button primary">Guardar cambios</button>
                <button type="button" class="admin-button secondary" data-store-toggle="${item.id}">Cerrar</button>
              </div>
            </form>
          </div>
        </article>
      `
    )
    .join("");

  adminStoreList.querySelectorAll("[data-store-edit-form]").forEach((form) => {
    attachImageDropzone(form);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = {
        id: form.dataset.storeId,
        name: form.elements.name.value.trim(),
        description: form.elements.description.value.trim(),
        price: Number(form.elements.price.value),
        image: form.elements.image.value.trim(),
        category: form.elements.category.value,
      };

      try {
        const response = await fetch("/api/admin/store/items/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) throw new Error("update_item_failed");
        renderStoreItems(data.items || []);
        setFeedback("Item actualizado correctamente.", "success");
      } catch {
        setFeedback("No se pudo actualizar el item.", "error");
      }
    });
  });

  adminStoreList.querySelectorAll("[data-store-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const itemCard = button.closest(".admin-store-item");
      const form = itemCard?.querySelector("[data-store-edit-form]");
      if (!form) return;
      const shouldOpen = form.hidden;
      form.hidden = !shouldOpen;
      if (shouldOpen) {
        itemCard.classList.add("is-editing");
      } else {
        itemCard.classList.remove("is-editing");
      }
    });
  });

  adminStoreList.querySelectorAll("[data-store-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const response = await fetch("/api/admin/store/items/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: button.dataset.storeDelete }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error("delete_item_failed");
        renderStoreItems(data.items || []);
        setFeedback("Item borrado correctamente.", "success");
      } catch {
        setFeedback("No se pudo borrar el item.", "error");
      }
    });
  });
}

async function loadSession() {
  try {
    const response = await fetch("/api/admin/session", { cache: "no-store" });
    if (!response.ok) {
      if (loginView) loginView.hidden = false;
      if (panelView) panelView.hidden = true;
      return;
    }

    const payload = await response.json();
    if (loginView) loginView.hidden = true;
    if (panelView) panelView.hidden = false;
    if (adminUser) {
      adminUser.textContent = `Autorizado como ${payload.user.global_name || payload.user.username}`;
    }
    fillForm(payload.stats || {});
    fillMaintenanceForm(payload.maintenance || {});
    renderStoreItems(payload.storeItems || []);
    if (adminTabButtons.length) {
      const activeButton = Array.from(adminTabButtons).find((button) => button.classList.contains("is-active"));
      setAdminTab(activeButton?.dataset.adminTabButton || adminTabButtons[0].dataset.adminTabButton);
    }
    setFeedback("Sesion verificada.", "success");
  } catch (error) {
    setFeedback("No se pudo validar la sesion admin.", "error");
  }
}

if (adminForm) {
  adminForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      discord_members: Number(adminForm.elements.discord_members.value) || 0,
      server_staff: Number(adminForm.elements.server_staff.value) || 20,
      server_status: adminForm.elements.server_status.value.trim() || "Cerrado",
      general_status: adminForm.elements.general_status.value.trim() || "En linea",
      updated_at: adminForm.elements.updated_at.value.trim() || new Date().toLocaleString("es-CL"),
    };

    try {
      const response = await fetch("/api/admin/stats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("save_failed");
      }

      setFeedback("Stats guardadas correctamente.", "success");
    } catch (error) {
      setFeedback("No se pudieron guardar las stats.", "error");
    }
  });
}

adminAnnouncementForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    title: adminAnnouncementForm.elements.title.value.trim(),
    message: adminAnnouncementForm.elements.message.value.trim(),
  };

  try {
    const response = await fetch("/api/admin/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("announcement_failed");
    adminAnnouncementForm.reset();
    setFeedback("Anuncio enviado correctamente.", "success");
  } catch {
    setFeedback("No se pudo enviar el anuncio.", "error");
  }
});

async function submitEmergencyForm(form) {
  const payload = {
    kind: "emergency_alert",
    title: form.elements.title.value.trim(),
    message: form.elements.message.value.trim(),
  };

  const response = await fetch("/api/admin/announcements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error("emergency_announcement_failed");
  form.reset();
  form.elements.title.value = "Alerta de Emergencia";
}

adminEmergencyForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await submitEmergencyForm(adminEmergencyForm);
    setFeedback("Alerta de emergencia enviada correctamente.", "success");
  } catch {
    setFeedback("No se pudo enviar la alerta de emergencia.", "error");
  }
});

adminEmergencyFormAlt?.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await submitEmergencyForm(adminEmergencyFormAlt);
    setFeedback("Alerta de emergencia enviada correctamente.", "success");
  } catch {
    setFeedback("No se pudo enviar la alerta de emergencia.", "error");
  }
});

if (adminMaintenanceForm) {
  adminMaintenanceForm.elements.section.addEventListener("change", () => {
    fillMaintenanceForm(currentMaintenanceState);
  });
}

adminMaintenanceForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    section: adminMaintenanceForm.elements.section.value,
    enabled: adminMaintenanceForm.elements.enabled.value === "true",
    title: adminMaintenanceForm.elements.title.value.trim(),
    message: adminMaintenanceForm.elements.message.value.trim(),
  };

  try {
    const response = await fetch("/api/admin/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) throw new Error(data.error || "maintenance_failed");
    currentMaintenanceState = data.maintenance || {};
    fillMaintenanceForm(currentMaintenanceState);
    setFeedback("Estado de mantenimiento guardado correctamente.", "success");
  } catch (error) {
    const messageMap = {
      unauthorized: "Tu sesion admin ya no es valida. Recarga e intenta otra vez.",
      invalid_section: "La seccion seleccionada no es valida.",
      invalid_payload: "El servidor rechazo la configuracion de mantenimiento.",
    };
    setFeedback(messageMap[error.message] || "No se pudo guardar el mantenimiento.", "error");
  }
});

adminBalanceForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    identifier: adminBalanceForm.elements.identifier.value.trim(),
    amount: Number(adminBalanceForm.elements.amount.value),
    mode: adminBalanceForm.elements.mode.value,
  };

  try {
    const response = await fetch("/api/admin/bank/update-balance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("balance_failed");
    setFeedback("Balance actualizado correctamente.", "success");
    adminBalanceForm.reset();
  } catch {
    setFeedback("No se pudo actualizar el balance.", "error");
  }
});

adminBulkBalanceForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    amount: Number(adminBulkBalanceForm.elements.amount.value),
    reason: adminBulkBalanceForm.elements.reason.value.trim(),
  };

  try {
    const response = await fetch("/api/admin/bank/grant-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await parseJsonSafe(response);
    if (!response.ok) throw new Error(data.error || "bulk_grant_failed");
    adminBulkBalanceForm.reset();
    setFeedback(`Se enviaron ${Number(data.amount || 0).toLocaleString("es-CL")} pesos a ${data.affected || 0} jugadores.`, "success");
  } catch (error) {
    const messageMap = {
      unauthorized: "Tu sesion admin ya no es valida. Recarga e intenta otra vez.",
      bulk_grant_failed: "El servidor no respondio como se esperaba. Reinicia node server.js y vuelve a intentar.",
      invalid_bulk_amount: "Ingresa un monto valido para el abono masivo.",
      no_registered_players: "Todavia no hay jugadores registrados para recibir dinero.",
    };
    setFeedback(messageMap[error.message] || "No se pudo enviar el dinero a todos los jugadores.", "error");
  }
});

adminIdentityForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    identifier: adminIdentityForm.elements.identifier.value.trim(),
    nombres: adminIdentityForm.elements.nombres.value.trim(),
    apellidos: adminIdentityForm.elements.apellidos.value.trim(),
    rut: adminIdentityForm.elements.rut.value.trim(),
    birth_date: adminIdentityForm.elements.birth_date.value.trim(),
    sex: adminIdentityForm.elements.sex.value.trim(),
    nationality: adminIdentityForm.elements.nationality.value.trim(),
  };

  try {
    const response = await fetch("/api/admin/identity/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("identity_failed");
    setFeedback("DNI actualizado correctamente.", "success");
    adminIdentityForm.reset();
  } catch {
    setFeedback("No se pudo actualizar el DNI.", "error");
  }
});

adminDeleteForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    identifier: adminDeleteForm.elements.identifier.value.trim(),
  };

  try {
    const response = await fetch("/api/admin/identity/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("delete_failed");
    setFeedback("DNI borrado correctamente.", "success");
    adminDeleteForm.reset();
  } catch {
    setFeedback("No se pudo borrar el DNI.", "error");
  }
});

adminStoreForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    name: adminStoreForm.elements.name.value.trim(),
    description: adminStoreForm.elements.description.value.trim(),
    price: Number(adminStoreForm.elements.price.value),
    image: adminStoreForm.elements.image.value.trim(),
    category: adminStoreForm.elements.category.value,
  };

  try {
    const response = await fetch("/api/admin/store/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error("store_failed");
    adminStoreForm.reset();
    renderStoreItems(data.items || []);
    setFeedback("Item agregado correctamente a la tienda.", "success");
  } catch {
    setFeedback("No se pudo agregar el item de tienda.", "error");
  }
});

attachImageDropzone(adminStoreForm || document);

adminStoreImportForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    raw: adminStoreImportForm.elements.raw.value,
  };

  try {
    const response = await fetch("/api/admin/store/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "import_failed");
    renderStoreItems(data.items || []);
    adminStoreImportForm.reset();
    setFeedback(`Importacion completada: ${data.count} articulos agregados.`, "success");
  } catch {
    setFeedback("No se pudo completar la importacion masiva.", "error");
  }
});

adminStoreGrantForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    identifier: adminStoreGrantForm.elements.identifier.value.trim(),
    item_id: adminStoreGrantForm.elements.item_id.value,
  };

  try {
    const response = await fetch("/api/admin/store/grant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "grant_failed");
    adminStoreGrantForm.reset();
    setFeedback(`Entrega asignada a ${data.target?.name || "jugador"}: ${data.item?.name || "item"}.`, "success");
  } catch (error) {
    const messageMap = {
      unauthorized: "Tu sesion admin ya no es valida. Recarga e intenta de nuevo.",
      person_not_found: "No se encontro al jugador indicado.",
      item_not_found: "No se encontro el item seleccionado.",
      invalid_grant: "Completa el jugador y el item que quieres asignar.",
      invalid_payload: "El servidor rechazo la entrega. Revisa que el jugador e item existan.",
    };
    setFeedback(messageMap[error.message] || "No se pudo asignar la entrega.", "error");
  }
});

if (refreshButton) {
  refreshButton.addEventListener("click", () => {
    loadSession();
  });
}

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    try {
      window.localStorage.removeItem("vcrp_admin_session");
    } catch {}
    document.cookie = "vcrp_admin_session=; Path=/; Max-Age=0; SameSite=Lax; Secure";
    window.location.href = "/admin.html";
  });
}

adminTabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setAdminTab(button.dataset.adminTabButton);
  });
});

loadSession();
