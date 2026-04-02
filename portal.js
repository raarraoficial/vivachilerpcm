const loginView = document.querySelector("[data-portal-login]");
const portalLoaderNode = document.querySelector("[data-portal-loader]");
const portalTopActions = document.querySelector(".portal-top-actions");
const portalNotificationButton = document.querySelector("[data-notifications-toggle]");
const createView = document.querySelector("[data-portal-create]");
const appView = document.querySelector("[data-portal-app]");
const identityForm = document.querySelector("[data-identity-form]");
const feedbackNode = document.querySelector("[data-portal-feedback]");
const portalUserNode = document.querySelector("[data-portal-user]");
const portalContentNode = document.querySelector(".portal-content");
const logoutButtons = document.querySelectorAll("[data-portal-logout]");
const notificationsToggleButton = document.querySelector("[data-notifications-toggle]");
const notificationsCloseButton = document.querySelector("[data-notifications-close]");
const notificationsPanel = document.querySelector("[data-notifications-panel]");
const notificationsList = document.querySelector("[data-notifications-list]");
const notificationsDot = document.querySelector("[data-notifications-dot]");
const emergencyAlertNode = document.querySelector("[data-emergency-alert]");
const emergencyTitleNode = document.querySelector("[data-emergency-title]");
const emergencyDateNode = document.querySelector("[data-emergency-date]");
const emergencyMessageNode = document.querySelector("[data-emergency-message]");
const emergencyAcceptButton = document.querySelector("[data-emergency-accept]");
const emergencyAudio = document.querySelector("[data-emergency-audio]");
const avatarNode = document.querySelector("[data-dni-avatar]");
const initialsNode = document.querySelector("[data-dni-initials]");
const nav = document.querySelector("[data-portal-nav]");
const sectionTitle = document.querySelector("[data-portal-section-title]");
const bankCreate = document.querySelector("[data-bank-create]");
const bankDashboard = document.querySelector("[data-bank-dashboard]");
const bankCreateForm = document.querySelector("[data-bank-create-form]");
const bankTransferForm = document.querySelector("[data-bank-transfer-form]");
const bankInternalTransferForm = document.querySelector("[data-bank-internal-transfer-form]");
const creditForm = document.querySelector("[data-credit-form]");
const creditFeedback = document.querySelector("[data-credit-feedback]");
const loansListNode = document.querySelector("[data-loans-list]");
const bankFeedback = document.querySelector("[data-bank-feedback]");
const bankActionFeedback = document.querySelector("[data-bank-action-feedback]");
const claimSalaryButton = document.querySelector("[data-claim-salary]");
const bankCardNode = document.querySelector("[data-bank-card]");
const bankCardToggle = document.querySelector("[data-bank-card-toggle]");
const bankInvestmentCreateButton = document.querySelector("[data-bank-investment-create]");
const transactionHistoryNode = document.querySelector("[data-transaction-history]");
const storeGridNode = document.querySelector("[data-store-grid]");
const storeClaimsNode = document.querySelector("[data-store-claims]");
const storeClaimsGridNode = document.querySelector("[data-store-claims-grid]");
const inventoryGridNode = document.querySelector("[data-inventory-grid]");
const marketGridNode = document.querySelector("[data-market-grid]");
const storeConfirmationNode = document.querySelector("[data-store-confirmation]");
const storeConfirmationTitle = document.querySelector("[data-store-confirmation-title]");
const storeConfirmationDescription = document.querySelector("[data-store-confirmation-description]");
const storeConfirmationPrice = document.querySelector("[data-store-confirmation-price]");
const storeConfirmationBalance = document.querySelector("[data-store-confirmation-balance]");
const storeConfirmationVehicle = document.querySelector("[data-store-confirmation-vehicle]");
const storeConfirmationColorInput = document.querySelector("[data-store-confirmation-color]");
const storeConfirmationPlateInput = document.querySelector("[data-store-confirmation-plate]");
const storeConfirmButton = document.querySelector("[data-store-confirm]");
const storeCancelButton = document.querySelector("[data-store-cancel]");
const sellConfirmationNode = document.querySelector("[data-sell-confirmation]");
const sellConfirmationTitle = document.querySelector("[data-sell-confirmation-title]");
const sellConfirmationDescription = document.querySelector("[data-sell-confirmation-description]");
const sellConfirmationPriceInput = document.querySelector("[data-sell-confirmation-price-input]");
const sellConfirmButton = document.querySelector("[data-sell-confirm]");
const sellCancelButton = document.querySelector("[data-sell-cancel]");
const purchaseTicketNode = document.querySelector("[data-purchase-ticket]");
const purchaseTicketText = document.querySelector("[data-purchase-ticket-text]");
const municipalityListNode = document.querySelector("[data-municipality-list]");

let currentUser = null;
let currentIdentity = null;
let currentBank = null;
let currentStoreItems = [];
let currentMarketItems = [];
let currentMunicipality = { fines: [], backgrounds: [], impounded_vehicles: [] };
let pendingStoreItem = null;
let pendingInventoryItem = null;
let activeStoreFilter = "all";
let activeMarketFilter = "mercado";
const purchaseSound = new Audio("assets/purchase-sound.mp3");
let purchaseTicketTimeout = null;
let currentPermissions = {};
let currentNotifications = [];
let activeEmergencyAlert = null;

function setFeedback(node, message, isError = false) {
  if (!node) return;
  node.textContent = message;
  node.style.color = isError ? "#d97f7f" : "";
}

function showPortalLoader(duration = 320) {
  if (!portalLoaderNode) return;
  portalLoaderNode.hidden = false;
  portalLoaderNode.classList.remove("is-hidden");

  window.setTimeout(() => {
    portalLoaderNode.classList.add("is-hidden");
  }, duration);
}

function hidePortalLoader() {
  if (!portalLoaderNode) return;
  window.setTimeout(() => {
    portalLoaderNode.classList.add("is-hidden");
  }, 720);
}

function renderNotifications(items = []) {
  if (notificationsDot) {
    notificationsDot.hidden = !items.some((item) => item.read === false);
  }
  if (!notificationsList) return;
  if (!items.length) {
    notificationsList.innerHTML = '<p class="transaction-empty">Todavia no hay notificaciones.</p>';
    return;
  }

  notificationsList.innerHTML = items
    .map(
      (item) => `
        <article class="transaction-item ${item.kind === "emergency_alert" ? "expense" : item.kind === "announcement" ? "admin" : "income"}">
          <div class="transaction-item-head">
            <p class="transaction-item-title">${item.title || "Aviso"}</p>
          </div>
          <p class="transaction-item-description">${item.message || ""}</p>
          <p class="transaction-item-meta">${formatDateTime(item.created_at)}</p>
        </article>
      `
    )
    .join("");
}

function playEmergencyAudio() {
  if (!emergencyAudio) return;
  try {
    emergencyAudio.currentTime = 0;
    const result = emergencyAudio.play();
    if (result && typeof result.catch === "function") {
      result.catch(() => {});
    }
  } catch {}
}

function handleEmergencyAlert(items = []) {
  const latestAlert = items.find((item) => item.kind === "emergency_alert");
  if (!latestAlert || !emergencyAlertNode) return;

  const seenId = window.localStorage.getItem("vcrp_seen_emergency_alert");
  if (seenId === latestAlert.id) return;

  activeEmergencyAlert = latestAlert;
  if (emergencyTitleNode) emergencyTitleNode.textContent = latestAlert.title || "Alerta de Emergencia";
  if (emergencyDateNode) emergencyDateNode.textContent = formatDateTime(latestAlert.created_at);
  if (emergencyMessageNode) emergencyMessageNode.textContent = latestAlert.message || "";
  emergencyAlertNode.hidden = false;
  playEmergencyAudio();
}

async function markNotificationsRead() {
  try {
    const response = await fetch("/api/portal/notifications/read-all", { method: "POST" });
    if (!response.ok) return;
    const payload = await response.json();
    currentNotifications = payload.notifications || [];
    renderNotifications(currentNotifications);
    handleEmergencyAlert(currentNotifications);
  } catch {}
}

function renderLoans(loans = []) {
  if (!loansListNode) return;
  if (!loans.length) {
    loansListNode.innerHTML = '<p class="transaction-empty">No tienes creditos activos ni registrados.</p>';
    return;
  }

  loansListNode.innerHTML = loans
    .map(
      (loan) => `
        <article class="transaction-item ${loan.is_overdue ? "expense" : "admin"}">
          <div class="transaction-item-head">
            <p class="transaction-item-title">Credito ${loan.status || "activo"}</p>
            <strong class="transaction-item-amount">${formatMoney(loan.remaining_balance || 0)}</strong>
          </div>
          <p class="transaction-item-description">${loan.reason || "Sin motivo informado"}</p>
          <p class="transaction-item-meta">Cuota referencial: ${formatMoney(loan.monthly_payment || 0)} · Vence ${formatDateTime(loan.due_at)}</p>
        </article>
      `
    )
    .join("");
}

function buildCardMedia(image, name) {
  const safeImage = image ? String(image).replace(/"/g, "&quot;") : "";
  const safeName = String(name || "Item").replace(/"/g, "&quot;");
  const imageMarkup = safeImage
    ? `<img class="store-item-image" src="${safeImage}" alt="${safeName}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false;">`
    : "";
  return `
    <div class="store-item-media">
      ${imageMarkup}
      <div class="store-item-fallback" ${safeImage ? "hidden" : ""}>
        <strong>Viva Chile RP</strong>
        <span>Imagen no disponible</span>
      </div>
    </div>
  `;
}

function showPurchaseTicket(message) {
  if (!purchaseTicketNode || !purchaseTicketText) return;
  purchaseTicketText.textContent = message;
  purchaseTicketNode.hidden = false;
  purchaseTicketNode.classList.remove("is-hiding");

  if (purchaseTicketTimeout) {
    clearTimeout(purchaseTicketTimeout);
  }

  purchaseTicketTimeout = setTimeout(() => {
    purchaseTicketNode.hidden = true;
  }, 2400);
}

function playPurchaseSound() {
  try {
    purchaseSound.currentTime = 0;
    purchaseSound.play().catch(() => {});
    return;
  } catch {}

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(660, now);
    oscillator.frequency.exponentialRampToValueAtTime(990, now + 0.18);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.3);
  } catch {}
}

function closeStoreConfirmation() {
  pendingStoreItem = null;
  if (storeConfirmationColorInput) storeConfirmationColorInput.value = "";
  if (storeConfirmationPlateInput) storeConfirmationPlateInput.value = "";
  if (storeConfirmationVehicle) storeConfirmationVehicle.hidden = true;
  if (storeConfirmationNode) {
    storeConfirmationNode.hidden = true;
  }
}

function closeSellConfirmation() {
  pendingInventoryItem = null;
  if (sellConfirmationPriceInput) sellConfirmationPriceInput.value = "";
  if (sellConfirmationNode) {
    sellConfirmationNode.hidden = true;
  }
}

function openStoreConfirmation(item) {
  pendingStoreItem = item;
  if (storeConfirmationTitle) storeConfirmationTitle.textContent = item.name;
  if (storeConfirmationDescription) storeConfirmationDescription.textContent = item.description;
  if (storeConfirmationPrice) storeConfirmationPrice.textContent = formatMoney(item.price);
  if (storeConfirmationBalance) storeConfirmationBalance.textContent = formatMoney(currentBank?.balance || 0);
  if (storeConfirmationVehicle) {
    const isVehicle = String(item.category || "vehiculos").toLowerCase() === "vehiculos";
    storeConfirmationVehicle.hidden = !isVehicle;
  }
  if (storeConfirmationColorInput) {
    storeConfirmationColorInput.value = "";
  }
  if (storeConfirmationPlateInput) {
    storeConfirmationPlateInput.value = "";
  }
  if (storeConfirmationNode) {
    storeConfirmationNode.hidden = false;
  }
}

function openSellConfirmation(item) {
  pendingInventoryItem = item;
  if (sellConfirmationTitle) sellConfirmationTitle.textContent = item.name;
  if (sellConfirmationDescription) {
    sellConfirmationDescription.textContent = `Define el precio al que quieres publicar ${item.name} en el mercado de 2da mano.`;
  }
  if (sellConfirmationPriceInput) {
    sellConfirmationPriceInput.value = String(Number(item.price || 0));
  }
  if (sellConfirmationNode) {
    sellConfirmationNode.hidden = false;
  }
}

function formatDate(dateValue) {
  if (!dateValue) return "-";
  const date = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(date.getTime()) ? dateValue : date.toLocaleDateString("es-CL");
}

function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString("es-CL")}`;
}

function buildFakeExpiry() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String((now.getFullYear() + 4) % 100).padStart(2, "0");
  return `${month} / ${year}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("es-CL");
}

function buildImpoundedVehiclesFromBank(bank) {
  if (!Array.isArray(bank?.inventory)) return [];
  return bank.inventory
    .filter((item) => item.impounded?.active)
    .map((item) => ({
      inventory_id: item.id,
      name: item.name,
      image: item.image,
      plate: item.vehicle_record?.plate || "Sin patente",
      reason: item.impounded?.reason || "Sin detalle",
      impounded_at: item.impounded?.created_at || null,
      release_fee: Math.max(85000, Math.round(Number(item.price || 0) * 0.02)),
    }));
}

function setActiveBankSubtab(tabName) {
  document.querySelectorAll("[data-bank-subtab]").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.bankSubtab === tabName);
  });
  document.querySelectorAll("[data-bank-subtab-button]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.bankSubtabButton === tabName);
  });
}

function setView(viewName) {
  if (loginView) loginView.hidden = viewName !== "login";
  if (createView) createView.hidden = viewName !== "create";
  if (appView) appView.hidden = viewName !== "app";
  if (nav) nav.hidden = viewName !== "app";
  const hideTopButtons = viewName === "login";
  if (portalTopActions) portalTopActions.hidden = hideTopButtons;
  if (portalNotificationButton) portalNotificationButton.hidden = hideTopButtons;
}

function setActiveTab(tabName) {
  document.querySelectorAll("[data-portal-tab]").forEach((tab) => {
    const isTarget = tab.dataset.portalTab === tabName;
    tab.classList.toggle("is-active", isTarget);

    if (isTarget) {
      tab.classList.remove("is-animating");
      void tab.offsetWidth;
      tab.classList.add("is-animating");
    } else {
      tab.classList.remove("is-animating");
    }
  });

  if (portalContentNode) {
    portalContentNode.classList.remove("is-switching");
    void portalContentNode.offsetWidth;
    portalContentNode.classList.add("is-switching");
  }

  document.querySelectorAll("[data-portal-tab-button]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.portalTabButton === tabName);
  });
  if (sectionTitle) {
    sectionTitle.textContent =
      tabName === "banco"
        ? "Banco"
        : tabName === "tienda"
          ? "Tienda"
          : tabName === "inventario"
            ? "Inventario"
            : tabName === "mercado"
              ? "Mercado de 2da mano"
              : tabName === "municipalidad"
                ? "Municipalidad de Providencia"
            : "Inicio";
  }

  if (tabName === "banco") {
    setActiveBankSubtab("resumen");
  }

  if (tabName !== "inicio") {
    showPortalLoader(260);
  }
}

function renderIdentity(identity, user) {
  if (portalUserNode) {
    portalUserNode.textContent = `Conectado como ${user.global_name || user.username}`;
  }

  const fullInitials = `${identity.nombres} ${identity.apellidos}`
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  const mappings = {
    '[data-dni-rut]': identity.rut,
    '[data-dni-apellidos]': identity.apellidos,
    '[data-dni-nombres]': identity.nombres,
    '[data-dni-nacionalidad]': identity.nationality,
    '[data-dni-sexo]': identity.sex,
    '[data-dni-nacimiento]': formatDate(identity.birth_date),
    '[data-dni-documento]': identity.document_number,
    '[data-dni-emision]': identity.issued_at,
  };

  Object.entries(mappings).forEach(([selector, value]) => {
    const node = document.querySelector(selector);
    if (node) node.textContent = value || "-";
  });

  if (initialsNode) initialsNode.textContent = fullInitials || "VC";

  if (avatarNode) {
    const avatarUrl = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=512`
      : "";

    if (avatarUrl) {
      avatarNode.src = avatarUrl;
      avatarNode.classList.add("is-visible");
      initialsNode?.classList.add("is-hidden");
    } else {
      avatarNode.removeAttribute("src");
      avatarNode.classList.remove("is-visible");
      initialsNode?.classList.remove("is-hidden");
    }
  }
}

function renderBank(bank) {
  currentBank = bank;
  if (!bank) {
    bankCreate.hidden = false;
    bankDashboard.hidden = true;
    return;
  }

  bankCreate.hidden = true;
  bankDashboard.hidden = false;

  const fullName = `${currentIdentity?.nombres || ""} ${currentIdentity?.apellidos || ""}`.trim() || "Titular";
  const nextSalaryText = bank.next_salary_available_at
    ? `Disponible el ${formatDateTime(bank.next_salary_available_at)}`
    : "Disponible ahora";
  const values = {
    '[data-bank-card-number]': bank.card_number,
    '[data-bank-holder]': fullName,
    '[data-bank-expiry]': buildFakeExpiry(),
    '[data-bank-cvv]': bank.card_cvv || "000",
    '[data-bank-balance]': formatMoney(bank.balance),
    '[data-bank-investment-balance]': formatMoney(bank.investment_account?.balance || 0),
    '[data-bank-investment-status]': bank.investment_account?.enabled
      ? "Cuenta de inversion activa."
      : "Crea tu cuenta de inversion para mover fondos.",
    '[data-bank-next-salary]': nextSalaryText,
    '[data-bank-next-salary-panel]': nextSalaryText,
    '[data-salary-rank]': bank.salary?.rank || "Sin cargo asignado",
    '[data-salary-base]': formatMoney(bank.salary?.base || 250000),
    '[data-salary-tax]': formatMoney(bank.salary?.tax || 35000),
    '[data-salary-net]': formatMoney(bank.salary?.net || 215000),
    '[data-casino-balance]': formatMoney(bank.casino_balance || 0),
  };

  Object.entries(values).forEach(([selector, value]) => {
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = value;
    });
  });

  if (bankInvestmentCreateButton) {
    bankInvestmentCreateButton.disabled = Boolean(bank.investment_account?.enabled);
    bankInvestmentCreateButton.textContent = bank.investment_account?.enabled
      ? "Cuenta de inversion activa"
      : "Crear cuenta de inversion";
  }

  renderLoans(bank.loans || []);
  renderPendingClaims(bank.pending_claims || []);
  renderTransactionHistory(bank.transactions || []);
  renderInventory(bank.inventory || []);
}

function renderPendingClaims(items = []) {
  if (!storeClaimsNode || !storeClaimsGridNode) return;
  storeClaimsNode.hidden = !items.length;

  if (!items.length) {
    storeClaimsGridNode.innerHTML = "";
    return;
  }

  storeClaimsGridNode.innerHTML = items
    .map(
      (item) => `
        <article class="store-item-card">
          ${buildCardMedia(item.image, item.name)}
          <div class="store-item-content">
            <h4>${item.name}</h4>
            <p>${item.description || "Entrega administrativa pendiente."}</p>
            <p class="transaction-item-meta">Asignado el ${formatDateTime(item.granted_at)}</p>
            <div class="portal-actions">
              <button type="button" class="portal-button primary" data-claim-store-item="${item.id}">Reclamar item</button>
            </div>
          </div>
        </article>
      `
    )
    .join("");

  storeClaimsGridNode.querySelectorAll("[data-claim-store-item]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const response = await fetch("/api/store/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ claim_id: button.dataset.claimStoreItem }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "claim_failed");
        renderBank(data.bank);
        playPurchaseSound();
        showPurchaseTicket(`Reclamaste ${data.claimed_item?.name || "tu item"} correctamente.`);
        setFeedback(bankActionFeedback, `Entrega reclamada: ${data.claimed_item?.name || "item"}.`, false);
      } catch (error) {
        const messageMap = {
          claim_not_found: "Esa entrega ya no esta disponible.",
          bank_not_found: "Primero debes crear tu cuenta bancaria.",
        };
        setFeedback(bankActionFeedback, messageMap[error.message] || "No se pudo reclamar el item.", true);
      }
    });
  });
}

function renderTransactionHistory(transactions) {
  if (!transactionHistoryNode) return;
  const visibleTransactions = (transactions || []).filter((item) => {
    const type = String(item?.type || "");
    return type !== "casino_coinflip" && type !== "casino_slots";
  });

  if (!visibleTransactions.length) {
    transactionHistoryNode.innerHTML = '<p class="transaction-empty">Todavia no hay movimientos registrados.</p>';
    return;
  }

  transactionHistoryNode.innerHTML = visibleTransactions
    .slice()
    .reverse()
    .map((item) => {
      const kind =
        item.type === "admin_adjustment"
          ? "admin"
          : item.direction === "in"
            ? "income"
            : "expense";
      const sign = item.direction === "out" ? "-" : "+";
      return `
        <article class="transaction-item ${kind}">
          <div class="transaction-item-head">
            <p class="transaction-item-title">${item.title || "Movimiento"}</p>
            <strong class="transaction-item-amount">${sign}${formatMoney(item.amount || 0)}</strong>
          </div>
          <p class="transaction-item-description">${item.description || ""}</p>
          <p class="transaction-item-meta">${formatDateTime(item.created_at)}</p>
        </article>
      `;
    })
    .join("");
}

function renderStoreItems(items) {
  if (!storeGridNode) return;
  currentStoreItems = items;
  const filteredItems =
    activeStoreFilter === "all"
      ? items
      : items.filter((item) => String(item.category || "vehiculos").toLowerCase() === activeStoreFilter);

  document.querySelectorAll("[data-store-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.storeFilter === activeStoreFilter);
  });

  if (!filteredItems.length) {
    storeGridNode.innerHTML = '<p class="store-empty">Todavia no hay productos disponibles.</p>';
    return;
  }

  storeGridNode.innerHTML = filteredItems
    .map(
      (item) => {
        const isPendingPrice = Number(item.price || 0) <= 0;
        return `
        <article class="store-item-card">
          ${buildCardMedia(item.image, item.name)}
          <div class="store-item-body">
            <div>
              <h3>${item.name}</h3>
              <p>${item.description}</p>
            </div>
            <strong class="store-item-price">${isPendingPrice ? "Precio pendiente" : `$${Number(item.price || 0).toLocaleString("es-CL")}`}</strong>
            <div class="store-item-actions">
              <button type="button" class="portal-button primary" data-store-buy="${item.id}" ${isPendingPrice ? "disabled" : ""}>${isPendingPrice ? "No disponible" : "Comprar"}</button>
            </div>
          </div>
        </article>
      `;
      }
    )
    .join("");

  storeGridNode.querySelectorAll("[data-store-buy]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = currentStoreItems.find((entry) => entry.id === button.dataset.storeBuy);
      if (!item) return;
      openStoreConfirmation(item);
    });
  });
}

function renderInventory(items) {
  if (!inventoryGridNode) return;
  if (!items.length) {
    inventoryGridNode.innerHTML = '<p class="store-empty">Todavia no has comprado articulos.</p>';
    return;
  }

  inventoryGridNode.innerHTML = items
    .slice()
    .reverse()
    .map(
      (item) => {
        const isVehicle = (item.category || "vehiculos") === "vehiculos";
        const vehicle = item.vehicle_record;
        const isImpounded = Boolean(item.impounded?.active);
        const impoundNotice = isImpounded
          ? `
            <div class="vehicle-alert-box">
              <p class="vehicle-alert-kicker">En corrales</p>
              <strong>Este vehiculo se encuentra retenido.</strong>
              <p class="transaction-item-meta">Motivo: ${item.impounded.reason || "Sin detalle"}</p>
              <p class="transaction-item-meta">Registrado el ${formatDateTime(item.impounded.created_at)}</p>
            </div>
          `
          : "";
        const vehicleDetails = isVehicle
          ? vehicle?.registered
            ? `
              <div class="vehicle-meta-box">
                <p class="transaction-item-meta"><strong>Estado:</strong> Inscrito</p>
                <p class="transaction-item-meta"><strong>Color:</strong> ${vehicle.color || "Sin color"}</p>
                <p class="transaction-item-meta"><strong>Patente:</strong> ${vehicle.plate}</p>
                <p class="transaction-item-meta"><strong>Inscripcion:</strong> ${vehicle.registration_number}</p>
                <p class="transaction-item-meta"><strong>Permiso vigente hasta:</strong> ${formatDateTime(vehicle.circulation_valid_until)}</p>
                <p class="transaction-item-meta"><strong>Revision tecnica desde:</strong> ${formatDateTime(vehicle.technical_review_due_at)}</p>
              </div>
            `
            : `
              <div class="vehicle-meta-box">
                <p class="transaction-item-meta"><strong>Estado:</strong> Pendiente de inscripcion</p>
                <p class="transaction-item-meta"><strong>Color solicitado:</strong> ${vehicle?.color || "Sin definir"}</p>
                <p class="transaction-item-meta"><strong>Patente solicitada:</strong> ${vehicle?.plate || "Pendiente"}</p>
                <p class="transaction-item-meta"><strong>Inscripcion inicial:</strong> ${formatMoney(vehicle?.inscription_fee || 0)}</p>
                <p class="transaction-item-meta"><strong>Placas:</strong> ${formatMoney(vehicle?.plate_fee || 0)}</p>
                <p class="transaction-item-meta"><strong>Permiso de circulacion:</strong> ${formatMoney(vehicle?.circulation_fee || 0)}</p>
                <p class="transaction-item-meta"><strong>Total a pagar:</strong> ${formatMoney(vehicle?.total_fee || 0)}</p>
              </div>
            `
          : "";

        const vehicleActions = isVehicle
          ? vehicle?.registered
            ? `
              <button type="button" class="portal-button secondary" disabled>Revision tecnica (proximamente)</button>
            `
            : `
              <button type="button" class="portal-button primary" data-vehicle-register="${item.id}">Inscribir vehiculo</button>
            `
          : "";

        return `
        <article class="store-item-card">
          ${buildCardMedia(item.image, item.name)}
          <div class="store-item-body">
            <div>
              <h3>${item.name}</h3>
              <p>${item.description}</p>
              <p class="transaction-item-meta">Comprado el ${formatDateTime(item.purchased_at)}</p>
              ${impoundNotice}
              ${vehicleDetails}
            </div>
            <div class="store-item-actions">
              ${vehicleActions}
              <button type="button" class="portal-button danger" data-inventory-sell="${item.id}">Publicar venta</button>
            </div>
          </div>
        </article>
      `;
      }
    )
    .join("");

  inventoryGridNode.querySelectorAll("[data-vehicle-register]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const response = await fetch("/api/vehicle/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inventory_id: button.dataset.vehicleRegister }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "vehicle_register_failed");
        renderBank(data.bank);
        showPurchaseTicket(`Vehiculo inscrito: ${data.item.name}.`);
        setFeedback(bankActionFeedback, `Vehiculo inscrito correctamente: ${data.item.name}.`, false);
      } catch (error) {
        const messageMap = {
          insufficient_funds: "No tienes saldo suficiente para inscribir este vehiculo.",
          item_not_found: "No se encontro el vehiculo en tu inventario.",
          already_registered: "Este vehiculo ya esta inscrito.",
          not_vehicle: "Este articulo no es un vehiculo.",
        };
        setFeedback(bankActionFeedback, messageMap[error.message] || "No se pudo inscribir el vehiculo.", true);
      }
    });
  });

  inventoryGridNode.querySelectorAll("[data-inventory-sell]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = items.find((entry) => entry.id === button.dataset.inventorySell);
      if (!item) return;
      openSellConfirmation(item);
    });
  });
}

function renderMarketItems(items) {
  if (!marketGridNode) return;
  currentMarketItems = items;
  const filteredItems = items.filter((item) => {
    const isVehicle = String(item.category || "vehiculos").toLowerCase() === "vehiculos";
    return activeMarketFilter === "yapo" ? isVehicle : !isVehicle;
  });

  document.querySelectorAll("[data-market-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.marketFilter === activeMarketFilter);
  });

  if (!filteredItems.length) {
    marketGridNode.innerHTML = `<p class="store-empty">Todavia no hay articulos publicados en ${activeMarketFilter === "yapo" ? "Yapo.cl" : "Mercado"}.</p>`;
    return;
  }

  marketGridNode.innerHTML = filteredItems
    .map(
      (item) => `
        <article class="store-item-card">
          ${buildCardMedia(item.image, item.name)}
          <div class="store-item-body">
            <div>
              <h3>${item.name}</h3>
              <p>${item.description}</p>
              <p class="transaction-item-meta">Vendedor: ${item.seller_name || "Desconocido"}</p>
            </div>
            <strong class="store-item-price">$${Number(item.price || 0).toLocaleString("es-CL")}</strong>
            <div class="store-item-actions">
              <button type="button" class="portal-button primary" data-market-buy="${item.id}">Comprar</button>
              ${currentPermissions.canModerateMarket ? `<button type="button" class="portal-button danger" data-market-delete="${item.id}">Eliminar</button>` : ""}
            </div>
          </div>
        </article>
      `
    )
    .join("");

  marketGridNode.querySelectorAll("[data-market-buy]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const response = await fetch("/api/market/buy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ market_id: button.dataset.marketBuy }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "market_buy_failed");
        renderBank(data.bank);
        await loadMarketItems();
        playPurchaseSound();
        showPurchaseTicket(`Compraste ${data.item.name} en el mercado.`);
        setFeedback(bankActionFeedback, `Compra realizada en mercado: ${data.item.name}.`, false);
      } catch (error) {
        const messageMap = {
          insufficient_funds: "No tienes saldo suficiente para comprar este articulo.",
          same_user: "No puedes comprar tu propio articulo.",
          item_not_found: "Este articulo ya no esta disponible.",
          bank_not_found: "Primero debes crear tu cuenta bancaria.",
        };
        setFeedback(bankActionFeedback, messageMap[error.message] || "No se pudo comprar el articulo del mercado.", true);
      }
    });
  });

  marketGridNode.querySelectorAll("[data-market-delete]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const response = await fetch("/api/market/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ market_id: button.dataset.marketDelete }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "market_delete_failed");
        renderMarketItems(data.items || []);
        setFeedback(bankActionFeedback, "Publicacion eliminada del mercado.", false);
      } catch {
        setFeedback(bankActionFeedback, "No se pudo eliminar la publicacion.", true);
      }
    });
  });
}

function renderMunicipality(records = { fines: [], backgrounds: [], impounded_vehicles: [] }) {
  currentMunicipality = records;
  if (!municipalityListNode) return;
  const fines = records.fines || [];
  const backgrounds = records.backgrounds || [];
  const impoundedVehicles = (records.impounded_vehicles && records.impounded_vehicles.length)
    ? records.impounded_vehicles
    : buildImpoundedVehiclesFromBank(currentBank);
  const visibleItems = [
    ...fines.map((item) => ({ ...item, entryType: "fine" })),
    ...backgrounds.map((item) => ({ ...item, entryType: "background" })),
    ...impoundedVehicles.map((item) => ({ ...item, entryType: "impound" })),
  ];

  if (!visibleItems.length) {
    municipalityListNode.innerHTML = '<p class="transaction-empty">Todavia no tienes cobros municipales asociados.</p>';
    return;
  }

  municipalityListNode.innerHTML = visibleItems
    .map((item) => {
      if (item.entryType === "fine") {
        return `
          <article class="transaction-item ${item.paid ? "income" : "expense"}">
            <div class="transaction-item-head">
              <p class="transaction-item-title">Multa municipal</p>
              <strong class="transaction-item-amount">${formatMoney(item.amount || 0)}</strong>
            </div>
            <p class="transaction-item-description">${item.reason || "Sin motivo informado"}</p>
            <p class="transaction-item-meta">${item.paid ? `Pagada el ${formatDateTime(item.paid_at)}` : `Emitida el ${formatDateTime(item.created_at)}`}</p>
            ${item.paid ? "" : `<div class="portal-actions"><button type="button" class="portal-button primary" data-pay-fine="${item.id}">Pagar multa</button></div>`}
          </article>
        `;
      }
      if (item.entryType === "impound") {
        return `
          <article class="transaction-item expense">
            <div class="transaction-item-head">
              <p class="transaction-item-title">Vehiculo en corrales</p>
              <strong class="transaction-item-amount">${formatMoney(item.release_fee || 0)}</strong>
            </div>
            <p class="transaction-item-description">${item.name || "Vehiculo"} · Patente ${item.plate || "Sin patente"}</p>
            <p class="transaction-item-description">Motivo: ${item.reason || "Sin detalle"}</p>
            <p class="transaction-item-meta">Retenido el ${formatDateTime(item.impounded_at)}</p>
            <div class="portal-actions"><button type="button" class="portal-button primary" data-pay-impound="${item.inventory_id}">Sacar de corrales</button></div>
          </article>
        `;
      }
      return `
        <article class="transaction-item admin">
          <div class="transaction-item-head">
            <p class="transaction-item-title">Antecedente</p>
          </div>
          <p class="transaction-item-description">${item.reason || "Sin detalle"}</p>
          <p class="transaction-item-meta">Registrado el ${formatDateTime(item.created_at)}</p>
        </article>
      `;
    })
    .join("");

  municipalityListNode.querySelectorAll("[data-pay-fine]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const response = await fetch("/api/municipality/fines/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fine_id: button.dataset.payFine }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "fine_payment_failed");
        renderBank(data.bank);
        renderMunicipality({ fines: data.fines || [], backgrounds: data.backgrounds || [] });
        setFeedback(bankActionFeedback, "Multa pagada correctamente.", false);
      } catch (error) {
        const messageMap = {
          insufficient_funds: "No tienes saldo suficiente para pagar la multa.",
          fine_not_found: "No se encontro esa multa.",
          already_paid: "Esta multa ya fue pagada.",
          bank_not_found: "Primero debes crear tu cuenta bancaria.",
        };
        setFeedback(bankActionFeedback, messageMap[error.message] || "No se pudo pagar la multa.", true);
      }
    });
  });

  municipalityListNode.querySelectorAll("[data-pay-impound]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const response = await fetch("/api/municipality/impound/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inventory_id: button.dataset.payImpound }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "impound_payment_failed");
        renderBank(data.bank);
        renderMunicipality({
          fines: data.fines || [],
          backgrounds: data.backgrounds || [],
          impounded_vehicles: data.impounded_vehicles || [],
        });
        setFeedback(bankActionFeedback, "Vehiculo retirado de corrales correctamente.", false);
      } catch (error) {
        const messageMap = {
          insufficient_funds: "No tienes saldo suficiente para sacar este vehiculo de corrales.",
          vehicle_not_found: "No se encontro ese vehiculo.",
          vehicle_not_impounded: "Ese vehiculo ya no esta retenido.",
          bank_not_found: "Primero debes crear tu cuenta bancaria.",
        };
        setFeedback(bankActionFeedback, messageMap[error.message] || "No se pudo retirar el vehiculo de corrales.", true);
      }
    });
  });
}

async function loadStoreItems() {
  try {
    const response = await fetch("/api/store/items", { cache: "no-store" });
    const payload = await response.json();
    renderStoreItems(payload.items || []);
  } catch {
    renderStoreItems([]);
  }
}

async function loadMarketItems() {
  try {
    const response = await fetch("/api/market/items", { cache: "no-store" });
    const payload = await response.json();
    renderMarketItems(payload.items || []);
  } catch {
    renderMarketItems([]);
  }
}

async function loadMunicipality() {
  try {
    const response = await fetch("/api/municipality/records", { cache: "no-store" });
    if (!response.ok) {
      renderMunicipality({ fines: [], backgrounds: [], impounded_vehicles: [] });
      return;
    }
    const payload = await response.json();
    renderMunicipality(payload);
  } catch {
    renderMunicipality({ fines: [], backgrounds: [], impounded_vehicles: [] });
  }
}

async function loadBank() {
  try {
    const response = await fetch("/api/portal/bank", { cache: "no-store" });
    if (!response.ok) {
      renderBank(null);
      return;
    }

    const payload = await response.json();
    renderBank(payload.bank);
  } catch {
    renderBank(null);
  }
}

async function loadPortalSession() {
  try {
    if (portalLoaderNode) {
      portalLoaderNode.hidden = false;
      portalLoaderNode.classList.remove("is-hidden");
    }

    const response = await fetch("/api/portal/session", { cache: "no-store" });
    if (!response.ok) {
      setView("login");
      hidePortalLoader();
      return;
    }

    const payload = await response.json();
    currentUser = payload.user;
    currentIdentity = payload.identity;
    currentPermissions = payload.permissions || {};
    currentNotifications = payload.notifications || [];
    renderNotifications(currentNotifications);
    handleEmergencyAlert(currentNotifications);

    document.querySelectorAll("[data-requires-permission]").forEach((node) => {
      node.hidden = !currentPermissions[node.dataset.requiresPermission];
    });
    document.querySelectorAll("[data-requires-any-permission]").forEach((node) => {
      const keys = String(node.dataset.requiresAnyPermission || "").split(",").map((item) => item.trim()).filter(Boolean);
      node.hidden = !keys.some((key) => currentPermissions[key]);
    });

    if (!payload.identity) {
      if (portalUserNode) {
        portalUserNode.textContent = `Conectado como ${payload.user.global_name || payload.user.username}`;
      }
      setView("create");
      hidePortalLoader();
      return;
    }

    renderIdentity(payload.identity, payload.user);
    setView("app");
    setActiveTab("inicio");
    setActiveBankSubtab("resumen");
    await loadBank();
    await loadStoreItems();
    await loadMarketItems();
    await loadMunicipality();
    hidePortalLoader();
  } catch {
    setView("login");
    hidePortalLoader();
  }
}

identityForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const payload = {
    nombres: identityForm.elements.nombres.value.trim(),
    apellidos: identityForm.elements.apellidos.value.trim(),
    birth_date: identityForm.elements.birth_date.value,
    sex: identityForm.elements.sex.value,
    nationality: identityForm.elements.nationality.value.trim(),
  };

  try {
    const response = await fetch("/api/portal/identity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("identity_create_failed");
    setFeedback(feedbackNode, "DNI creado correctamente.");
    await loadPortalSession();
  } catch {
    setFeedback(feedbackNode, "No se pudo crear el DNI.", true);
  }
});

bankCreateForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    password: bankCreateForm.elements.password.value.trim(),
  };

  try {
    const response = await fetch("/api/portal/bank/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || data.error || "bank_create_failed");
    setFeedback(bankFeedback, "Cuenta bancaria creada correctamente.");
    bankCreateForm.reset();
    renderBank(data.bank);
  } catch (error) {
    const messageMap = {
      identity_required: "Primero debes tener un DNI creado.",
      weak_password: "La clave bancaria debe tener al menos 4 caracteres.",
    };
    setFeedback(bankFeedback, messageMap[error.message] || `No se pudo crear la cuenta bancaria. (${error.message})`, true);
  }
});

bankTransferForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    target: bankTransferForm.elements.target.value.trim(),
    amount: Number(bankTransferForm.elements.amount.value),
    password: bankTransferForm.elements.password.value.trim(),
  };

  try {
    const response = await fetch("/api/portal/bank/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "transfer_failed");
    }
    setFeedback(bankActionFeedback, `Transferencia enviada a ${data.target.nombres} ${data.target.apellidos}.`);
    bankTransferForm.reset();
    renderBank(data.bank);
  } catch (error) {
    const messageMap = {
      invalid_password: "La clave bancaria no coincide.",
      insufficient_funds: "No tienes saldo suficiente.",
      target_not_found: "No encontramos al destinatario.",
      target_bank_not_found: "El destinatario aun no tiene cuenta bancaria.",
      same_account: "No puedes transferirte a ti mismo.",
    };
    setFeedback(bankActionFeedback, messageMap[error.message] || "No se pudo completar la transferencia.", true);
  }
});

bankInternalTransferForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    from_account: bankInternalTransferForm.elements.from_account.value,
    to_account: bankInternalTransferForm.elements.to_account.value,
    amount: Number(bankInternalTransferForm.elements.amount.value),
    password: bankInternalTransferForm.elements.password.value.trim(),
  };

  try {
    const response = await fetch("/api/portal/bank/internal-transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "internal_transfer_failed");
    bankInternalTransferForm.reset();
    renderBank(data.bank);
    setFeedback(bankActionFeedback, "Transferencia interna realizada correctamente.");
  } catch (error) {
    const messageMap = {
      invalid_password: "La clave bancaria no coincide.",
      insufficient_funds: "No tienes saldo suficiente en la cuenta origen.",
      investment_not_enabled: "Primero debes crear la cuenta de inversion.",
      same_account: "Debes elegir cuentas distintas.",
    };
    setFeedback(bankActionFeedback, messageMap[error.message] || "No se pudo mover el dinero.", true);
  }
});

claimSalaryButton?.addEventListener("click", async () => {
  try {
    const response = await fetch("/api/portal/bank/claim-salary", { method: "POST" });
    const data = await response.json();
    if (!response.ok) {
      if (data.error === "salary_cooldown") {
        const nextClaim = new Date(Number(data.next_claim_at));
        throw new Error(`Puedes volver a cobrar el ${nextClaim.toLocaleString("es-CL")}.`);
      }
      throw new Error("salary_failed");
    }
    renderBank(data.bank);
    setFeedback(bankActionFeedback, `Sueldo cobrado: ${formatMoney(data.salary_amount)} liquidos.`);
  } catch (error) {
    setFeedback(bankActionFeedback, error.message || "No se pudo cobrar el sueldo.", true);
  }
});

bankInvestmentCreateButton?.addEventListener("click", async () => {
  try {
    const response = await fetch("/api/portal/bank/investment/create", { method: "POST" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "investment_create_failed");
    renderBank(data.bank);
    setFeedback(bankActionFeedback, "Cuenta de inversion creada correctamente.");
  } catch (error) {
    setFeedback(bankActionFeedback, "No se pudo crear la cuenta de inversion.", true);
  }
});

creditForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    amount: Number(creditForm.elements.amount.value),
    months: Number(creditForm.elements.months.value),
    reason: creditForm.elements.reason.value.trim(),
  };

  try {
    const response = await fetch("/api/portal/bank/credit/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "credit_failed");
    creditForm.reset();
    setFeedback(creditFeedback, "Solicitud de credito enviada correctamente.");
    await loadPortalSession();
  } catch (error) {
    const messageMap = {
      invalid_credit_request: "Completa bien el monto, el plazo y el motivo.",
    };
    setFeedback(creditFeedback, messageMap[error.message] || "No se pudo enviar la solicitud de credito.", true);
  }
});

storeCancelButton?.addEventListener("click", () => {
  closeStoreConfirmation();
});

sellCancelButton?.addEventListener("click", () => {
  closeSellConfirmation();
});

storeConfirmationNode?.addEventListener("click", (event) => {
  if (event.target === storeConfirmationNode) {
    closeStoreConfirmation();
  }
});

sellConfirmationNode?.addEventListener("click", (event) => {
  if (event.target === sellConfirmationNode) {
    closeSellConfirmation();
  }
});

storeConfirmButton?.addEventListener("click", async () => {
  if (!pendingStoreItem) return;

  try {
    const payload = { item_id: pendingStoreItem.id };
    if (String(pendingStoreItem.category || "vehiculos").toLowerCase() === "vehiculos") {
      payload.vehicle_color = String(storeConfirmationColorInput?.value || "").trim();
      payload.vehicle_plate = String(storeConfirmationPlateInput?.value || "").trim();
    }
    const response = await fetch("/api/store/buy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "buy_failed");
    renderBank(data.bank);
    playPurchaseSound();
    showPurchaseTicket(`Compraste ${data.item.name} correctamente.`);
    setFeedback(bankActionFeedback, `Compra realizada: ${data.item.name}.`, false);
    closeStoreConfirmation();
  } catch (error) {
    const messageMap = {
      insufficient_funds: "No tienes saldo suficiente para comprar este articulo.",
      bank_not_found: "Primero debes crear tu cuenta bancaria.",
      item_not_found: "Este articulo ya no esta disponible.",
      vehicle_color_required: "Debes elegir un color para el vehiculo.",
      invalid_plate_format: "La patente debe tener formato ABC-123.",
      plate_in_use: "Esa patente ya esta en uso.",
    };
    if (storeConfirmationDescription) {
      storeConfirmationDescription.textContent = messageMap[error.message] || "No se pudo completar la compra.";
    }
  }
});

sellConfirmButton?.addEventListener("click", async () => {
  if (!pendingInventoryItem) return;
  const price = Number(sellConfirmationPriceInput?.value || 0);

  try {
    const response = await fetch("/api/market/list", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inventory_id: pendingInventoryItem.id,
        price,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "market_list_failed");
    renderBank(data.bank);
    await loadMarketItems();
    closeSellConfirmation();
    setFeedback(bankActionFeedback, `Articulo publicado en mercado por ${formatMoney(data.listing_price)}.`, false);
  } catch (error) {
    const messageMap = {
      invalid_item: "Debes ingresar un precio valido para publicar.",
      item_not_found: "No se encontro el articulo en tu inventario.",
    };
    if (sellConfirmationDescription) {
      sellConfirmationDescription.textContent = messageMap[error.message] || "No se pudo publicar el articulo.";
    }
  }
});

bankCardToggle?.addEventListener("click", () => {
  bankCardNode?.classList.toggle("is-flipped");
});

document.querySelectorAll("[data-portal-tab-button]").forEach((button) => {
  button.addEventListener("click", () => {
    setActiveTab(button.dataset.portalTabButton);
  });
});

document.querySelectorAll("[data-portal-open-page]").forEach((button) => {
  button.addEventListener("click", () => {
    showPortalLoader(600);
    window.location.href = button.dataset.portalOpenPage;
  });
});

notificationsToggleButton?.addEventListener("click", () => {
  if (!notificationsPanel) return;
  notificationsPanel.hidden = false;
  notificationsPanel.classList.toggle("is-open");
  if (notificationsPanel.classList.contains("is-open")) {
    markNotificationsRead();
  }
});

notificationsCloseButton?.addEventListener("click", () => {
  if (!notificationsPanel) return;
  notificationsPanel.classList.remove("is-open");
  window.setTimeout(() => {
    notificationsPanel.hidden = true;
  }, 180);
});

emergencyAcceptButton?.addEventListener("click", () => {
  if (activeEmergencyAlert?.id) {
    window.localStorage.setItem("vcrp_seen_emergency_alert", activeEmergencyAlert.id);
  }
  if (emergencyAlertNode) emergencyAlertNode.hidden = true;
  activeEmergencyAlert = null;
});

document.querySelectorAll("[data-bank-subtab-button]").forEach((button) => {
  button.addEventListener("click", () => {
    setActiveBankSubtab(button.dataset.bankSubtabButton);
  });
});

document.querySelectorAll("[data-store-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    activeStoreFilter = button.dataset.storeFilter;
    renderStoreItems(currentStoreItems);
  });
});

document.querySelectorAll("[data-market-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    activeMarketFilter = button.dataset.marketFilter;
    renderMarketItems(currentMarketItems);
  });
});

storeConfirmationPlateInput?.addEventListener("input", () => {
  const raw = String(storeConfirmationPlateInput.value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
  const letters = raw.slice(0, 3).replace(/[^A-Z]/g, "");
  const numbers = raw.slice(3).replace(/\D/g, "");
  storeConfirmationPlateInput.value = numbers ? `${letters}${letters.length === 3 ? "-" : ""}${numbers}` : letters;
});

document.querySelectorAll('a[href]').forEach((link) => {
  const href = link.getAttribute('href') || '';
  const isInternalPage = href && !href.startsWith('#') && !href.startsWith('http') && !link.target;
  if (!isInternalPage) return;
  link.addEventListener('click', () => {
    if (portalLoaderNode) {
      portalLoaderNode.hidden = false;
      portalLoaderNode.classList.remove('is-hidden');
    }
  });
});

logoutButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    await fetch("/api/portal/logout", { method: "POST" });
    window.localStorage.removeItem("vcrp_user_session");
    window.location.href = "/portal.html";
  });
});

loadPortalSession();
