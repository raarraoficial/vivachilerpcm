const loaderNode = document.querySelector("[data-casino-loader]");
const appNode = document.querySelector("[data-casino-app]");
const deniedNode = document.querySelector("[data-casino-denied]");
const bankBalanceNode = document.querySelector("[data-bank-balance]");
const casinoBalanceNode = document.querySelector("[data-casino-balance]");
const lastResultNode = document.querySelector("[data-casino-last-result]");
const lastCopyNode = document.querySelector("[data-casino-last-copy]");
const marqueeNode = document.querySelector("[data-casino-marquee]");
const feedbackNode = document.querySelector("[data-casino-feedback]");
const activityListNode = document.querySelector("[data-casino-activity-list]");
const depositForm = document.querySelector("[data-casino-deposit-form]");
const withdrawButton = document.querySelector("[data-casino-withdraw]");
const coinflipForm = document.querySelector("[data-coinflip-form]");
const slotsForm = document.querySelector("[data-slots-form]");
const rouletteForm = document.querySelector("[data-roulette-form]");
const slotsReelNode = document.querySelector("[data-slots-reel]");
const rouletteResultNode = document.querySelector("[data-roulette-result]");
const rouletteWheelNode = document.querySelector("[data-roulette-wheel]");
const coinflipCoinNode = document.querySelector("[data-coinflip-coin]");
const coinflipResultCopyNode = document.querySelector("[data-coinflip-result-copy]");

let currentSession = null;
let currentBank = null;
let activityStorageKey = "casino-activity-anon";
let rouletteRotation = 0;

function formatMoney(value) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleString("es-CL");
}

function setFeedback(message, isError = false) {
  if (!feedbackNode) return;
  feedbackNode.textContent = message || "";
  feedbackNode.classList.toggle("is-error", !!isError);
  feedbackNode.classList.toggle("is-ok", !isError && !!message);
}

function setLastResult(title, copy) {
  if (lastResultNode) lastResultNode.textContent = title;
  if (lastCopyNode) lastCopyNode.textContent = copy;
}

function getStoredActivity() {
  try {
    const parsed = JSON.parse(localStorage.getItem(activityStorageKey) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredActivity(items) {
  localStorage.setItem(activityStorageKey, JSON.stringify(items.slice(0, 20)));
}

function addActivity({ title, description, amount = 0, variant = "neutral" }) {
  const items = getStoredActivity();
  items.unshift({
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    title,
    description,
    amount,
    variant,
    created_at: new Date().toISOString(),
  });
  saveStoredActivity(items);
  renderActivity();
}

function renderActivity() {
  if (!activityListNode) return;
  const items = getStoredActivity();
  if (!items.length) {
    activityListNode.innerHTML = '<p class="transaction-empty">Todavia no hay jugadas ni movimientos registrados en esta sesion.</p>';
    return;
  }
  activityListNode.innerHTML = items.map((item) => {
    const sign = Number(item.amount || 0) > 0 ? "+" : Number(item.amount || 0) < 0 ? "-" : "";
    const amountClass = item.variant === "win" ? "is-win" : item.variant === "loss" ? "is-loss" : "";
    const amountText = sign ? `${sign}${formatMoney(Math.abs(Number(item.amount || 0)))}` : "Movimiento";
    return `
      <article class="casino-activity-item">
        <div class="casino-activity-head">
          <p class="casino-activity-title">${item.title}</p>
          <span class="casino-activity-amount ${amountClass}">${amountText}</span>
        </div>
        <p class="casino-activity-meta">${item.description}</p>
        <p class="casino-activity-meta">${formatDate(item.created_at)}</p>
      </article>
    `;
  }).join("");
}

function renderBank(bank) {
  currentBank = bank;
  if (bankBalanceNode) bankBalanceNode.textContent = formatMoney(bank?.balance || 0);
  if (casinoBalanceNode) casinoBalanceNode.textContent = formatMoney(bank?.casino_balance || 0);

  const hasBank = !!bank;
  [depositForm, coinflipForm, slotsForm, rouletteForm].forEach((form) => {
    form?.querySelectorAll("input, select, button").forEach((node) => {
      node.disabled = !hasBank;
    });
  });
  if (withdrawButton) withdrawButton.disabled = !hasBank;

  if (!hasBank) {
    setFeedback("Primero necesitas crear tu cuenta bancaria en el portal.", true);
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    const error = new Error(data?.error || "request_failed");
    error.payload = data;
    throw error;
  }
  return data;
}

function normalizeSlotSymbol(value) {
  const raw = String(value || "").trim();
  if (!raw) return "?";
  if (raw === "seven" || raw.includes("7")) return "7";
  if (raw === "star" || raw.includes("★")) return "★";
  if (raw === "diamond" || raw.includes("💎")) return "💎";
  if (raw === "clover" || raw.includes("🍀")) return "🍀";
  if (raw === "cherry" || raw.includes("🍒")) return "🍒";
  if (raw.length <= 3) return raw;
  return "★";
}

function renderSlotsReel(reel) {
  if (!slotsReelNode) return;
  const values = Array.isArray(reel) && reel.length ? reel : ["?", "?", "?"];
  slotsReelNode.innerHTML = values.map((symbol) => `<span>${normalizeSlotSymbol(symbol)}</span>`).join("");
}

function renderRouletteResult(color, label) {
  if (!rouletteResultNode) return;
  const colorClass = color === "verde" ? "is-green" : color === "negro" ? "is-black" : "is-red";
  rouletteResultNode.innerHTML = `<span class="roulette-chip ${colorClass}"></span><strong>${label}</strong>`;
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function animateCoinflip(result) {
  if (!coinflipCoinNode) return;
  coinflipCoinNode.classList.remove("is-flipping");
  void coinflipCoinNode.offsetWidth;
  coinflipCoinNode.classList.add("is-flipping");
  if (coinflipResultCopyNode) {
    coinflipResultCopyNode.textContent = "La moneda esta girando...";
  }
  await wait(1120);
  coinflipCoinNode.classList.remove("is-flipping");
  coinflipCoinNode.style.transform = result === "sello" ? "rotateY(180deg)" : "rotateY(0deg)";
}

async function animateSlots() {
  if (!slotsReelNode) return;
  slotsReelNode.classList.add("is-spinning");
  const cycleSymbols = ["7", "★", "💎", "🍀", "🍒"];
  for (let step = 0; step < 10; step += 1) {
    const offset = step % cycleSymbols.length;
    const frame = [cycleSymbols[offset], cycleSymbols[(offset + 1) % cycleSymbols.length], cycleSymbols[(offset + 2) % cycleSymbols.length]];
    renderSlotsReel(frame);
    await wait(95);
  }
  slotsReelNode.classList.remove("is-spinning");
}

async function animateRoulette(result) {
  if (!rouletteWheelNode) return;
  const targetAngles = { rojo: 25, negro: 155, verde: 265 };
  const target = targetAngles[result] ?? 25;
  const currentNormalized = ((rouletteRotation % 360) + 360) % 360;
  const adjustment = (360 - currentNormalized + target) % 360;
  rouletteRotation += 1080 + adjustment;
  rouletteWheelNode.style.transform = `rotate(${rouletteRotation}deg)`;
  renderRouletteResult("rojo", "Girando...");
  await wait(2400);
}

async function loadSessionAndBank() {
  const [sessionData, bankData] = await Promise.all([
    fetchJson("/api/portal/session", { cache: "no-store" }),
    fetchJson("/api/portal/bank", { cache: "no-store" }),
  ]);
  currentSession = sessionData;
  currentBank = bankData.bank || null;
  activityStorageKey = `casino-activity-${currentSession.user?.id || "anon"}`;
  const announcement = Array.isArray(sessionData.notifications)
    ? sessionData.notifications.find((item) => String(item.kind || "").toLowerCase() === "announcement")
    : null;
  if (marqueeNode) {
    marqueeNode.textContent = announcement?.message || "Publicidad no disponible";
  }
  renderBank(currentBank);
  renderActivity();
}

function showApp() {
  if (appNode) appNode.hidden = false;
  if (deniedNode) deniedNode.hidden = true;
}

function showDenied() {
  if (appNode) appNode.hidden = true;
  if (deniedNode) deniedNode.hidden = false;
}

function hideLoader() {
  if (!loaderNode) return;
  loaderNode.classList.add("is-hidden");
  window.setTimeout(() => {
    loaderNode.hidden = true;
  }, 260);
}

depositForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const amount = Number(depositForm.elements.amount.value || 0);
  try {
    const data = await fetchJson("/api/casino/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    depositForm.reset();
    renderBank(data.bank);
    setLastResult("Deposito completado", `Se movieron ${formatMoney(amount)} al saldo casino.`);
    addActivity({
      title: "Deposito al casino",
      description: "Fondos transferidos desde tu cuenta principal a la caja del casino.",
      amount: -amount,
      variant: "loss",
    });
    setFeedback(`Deposito realizado por ${formatMoney(amount)}.`);
  } catch (error) {
    const messageMap = {
      invalid_amount: "Ingresa un monto valido para depositar.",
      bank_not_found: "Primero debes crear tu cuenta bancaria en el portal.",
      insufficient_funds: "No tienes saldo suficiente en tu cuenta principal.",
    };
    setFeedback(messageMap[error.message] || "No se pudo mover el dinero al casino.", true);
  }
});

withdrawButton?.addEventListener("click", async () => {
  try {
    const data = await fetchJson("/api/casino/withdraw", {
      method: "POST",
    });
    renderBank(data.bank);
    setLastResult("Retiro completado", `Se retiraron ${formatMoney(data.amount)} del saldo casino al banco.`);
    addActivity({
      title: "Retiro del casino",
      description: "Fondos devueltos a la cuenta principal.",
      amount: Number(data.amount || 0),
      variant: "win",
    });
    setFeedback(`Retiraste ${formatMoney(data.amount)} a tu cuenta principal.`);
  } catch (error) {
    const messageMap = {
      bank_not_found: "No tienes una cuenta bancaria disponible.",
      no_casino_balance: "No tienes saldo casino para retirar.",
    };
    setFeedback(messageMap[error.message] || "No se pudo retirar el saldo casino.", true);
  }
});

coinflipForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const amount = Number(coinflipForm.elements.amount.value || 0);
  const side = String(coinflipForm.elements.side.value || "cara");
  try {
    coinflipForm.querySelectorAll("input, select, button").forEach((node) => { node.disabled = true; });
    const data = await fetchJson("/api/casino/coinflip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, side }),
    });
    await animateCoinflip(data.result);
    renderBank(data.bank);
    const net = data.won ? Number(data.payout || 0) - amount : -amount;
    setLastResult(
      data.won ? "Coinflip ganado" : "Coinflip perdido",
      data.won
        ? `Salio ${data.result}. Ganancia neta: ${formatMoney(net)}.`
        : `Salio ${data.result}. Perdiste ${formatMoney(amount)}.`
    );
    addActivity({
      title: "Coinflip",
      description: data.won ? `Ganaste apostando a ${side}. Resultado: ${data.result}.` : `Perdiste apostando a ${side}. Resultado: ${data.result}.`,
      amount: net,
      variant: data.won ? "win" : "loss",
    });
    if (coinflipResultCopyNode) {
      coinflipResultCopyNode.textContent = data.won
        ? `Salio ${data.result}. Tu jugada si conecto.`
        : `Salio ${data.result}. Esta vez no se dio.`;
    }
    setFeedback(data.won ? `Ganaste ${formatMoney(net)} en coinflip.` : `Perdiste ${formatMoney(amount)} en coinflip.`, !data.won);
  } catch (error) {
    const messageMap = {
      invalid_bet: "Define un monto valido y el lado de la moneda.",
      bank_not_found: "No tienes cuenta bancaria habilitada.",
      insufficient_funds: "Tu saldo casino no alcanza para esa apuesta.",
    };
    if (coinflipResultCopyNode) {
      coinflipResultCopyNode.textContent = "La moneda esta lista para el siguiente lanzamiento.";
    }
    setFeedback(messageMap[error.message] || "No se pudo jugar coinflip.", true);
  } finally {
    coinflipForm.querySelectorAll("input, select, button").forEach((node) => { node.disabled = !currentBank; });
  }
});

slotsForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const amount = Number(slotsForm.elements.amount.value || 0);
  try {
    slotsForm.querySelectorAll("input, button").forEach((node) => { node.disabled = true; });
    await animateSlots();
    const data = await fetchJson("/api/casino/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    renderBank(data.bank);
    renderSlotsReel(data.reel);
    const net = data.won ? Number(data.payout || 0) - amount : -amount;
    setLastResult(
      data.won ? "Slots pagaron" : "Slots sin premio",
      data.won
        ? `Multiplicador ${data.multiplier}x. Ganancia neta: ${formatMoney(net)}.`
        : `No hubo combinacion ganadora. Perdiste ${formatMoney(amount)}.`
    );
    addActivity({
      title: "Slots",
      description: data.won
        ? `Premio recibido con multiplicador ${data.multiplier}x.`
        : "La maquina no entrego premio en esta tirada.",
      amount: net,
      variant: data.won ? "win" : "loss",
    });
    setFeedback(data.won ? `Ganaste ${formatMoney(net)} en slots.` : `Perdiste ${formatMoney(amount)} en slots.`, !data.won);
  } catch (error) {
    const messageMap = {
      invalid_bet: "Ingresa un monto valido para las tragamonedas.",
      bank_not_found: "No tienes cuenta bancaria habilitada.",
      insufficient_funds: "Tu saldo casino no alcanza para esa jugada.",
    };
    setFeedback(messageMap[error.message] || "No se pudo girar la maquina.", true);
  } finally {
    slotsForm.querySelectorAll("input, button").forEach((node) => { node.disabled = !currentBank; });
  }
});

rouletteForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const amount = Number(rouletteForm.elements.amount.value || 0);
  const color = String(rouletteForm.elements.color.value || "rojo");
  try {
    rouletteForm.querySelectorAll("input, select, button").forEach((node) => { node.disabled = true; });
    const data = await fetchJson("/api/casino/roulette", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, color }),
    });
    await animateRoulette(data.result);
    renderBank(data.bank);
    renderRouletteResult(data.result, `Salio ${data.result}`);
    const net = data.won ? Number(data.payout || 0) - amount : -amount;
    setLastResult(
      data.won ? "Ruleta ganada" : "Ruleta perdida",
      data.won
        ? `Acertaste al ${color}. Ganancia neta: ${formatMoney(net)}.`
        : `La ruleta salio ${data.result}. Perdiste ${formatMoney(amount)}.`
    );
    addActivity({
      title: "Ruleta",
      description: data.won
        ? `Apostaste a ${color} y ganaste con pago ${data.multiplier}x.`
        : `Apostaste a ${color} y la ruleta salio ${data.result}.`,
      amount: net,
      variant: data.won ? "win" : "loss",
    });
    setFeedback(data.won ? `Ganaste ${formatMoney(net)} en ruleta.` : `Perdiste ${formatMoney(amount)} en ruleta.`, !data.won);
  } catch (error) {
    const messageMap = {
      invalid_bet: "Define un monto valido y un color para la ruleta.",
      bank_not_found: "No tienes cuenta bancaria habilitada.",
      insufficient_funds: "Tu saldo casino no alcanza para esa jugada.",
    };
    setFeedback(messageMap[error.message] || "No se pudo lanzar la ruleta.", true);
  } finally {
    rouletteForm.querySelectorAll("input, select, button").forEach((node) => { node.disabled = !currentBank; });
  }
});

(async () => {
  const minimumLoaderMs = 950;
  const start = Date.now();
  try {
    await loadSessionAndBank();
    showApp();
  } catch {
    showDenied();
  } finally {
    const elapsed = Date.now() - start;
    const wait = Math.max(0, minimumLoaderMs - elapsed);
    window.setTimeout(hideLoader, wait);
  }
})();


