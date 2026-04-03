const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL, URLSearchParams } = require("url");

const ROOT = __dirname;

function loadEnvFile() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

const DATA_ROOT = path.resolve(process.env.DATA_DIR || ROOT);
if (!fs.existsSync(DATA_ROOT)) {
  fs.mkdirSync(DATA_ROOT, { recursive: true });
}

const STATS_PATH = path.join(DATA_ROOT, "stats.json");
const IDENTITY_PATH = path.join(DATA_ROOT, "identity-records.json");
const BANK_PATH = path.join(DATA_ROOT, "bank-records.json");
const STORE_ITEMS_PATH = path.join(DATA_ROOT, "store-items.json");
const SECONDHAND_MARKET_PATH = path.join(DATA_ROOT, "secondhand-market.json");
const NOTIFICATIONS_PATH = path.join(DATA_ROOT, "notifications.json");
const ANNOUNCEMENTS_PATH = path.join(DATA_ROOT, "announcements.json");
const CREDIT_APPLICATIONS_PATH = path.join(DATA_ROOT, "credit-applications.json");
const POLICE_RECORDS_PATH = path.join(DATA_ROOT, "police-records.json");
const SERVICE_HOURS_PATH = path.join(DATA_ROOT, "service-hours.json");
const KAME_REQUESTS_PATH = path.join(DATA_ROOT, "kame-requests.json");
const KAME_FLEET_PATH = path.join(DATA_ROOT, "kame-fleet.json");
const USER_SESSIONS_PATH = path.join(DATA_ROOT, "user-sessions.json");
const MAINTENANCE_PATH = path.join(DATA_ROOT, "maintenance.json");
const SALARY_ROLE_OVERRIDES_PATH = path.join(DATA_ROOT, "salary-role-overrides.json");
const STORE_UPLOADS_DIR = path.join(ROOT, "assets", "tienda", "uploads");
const ADMIN_SESSIONS = new Map();
const USER_SESSIONS = new Map();
const STATE_CACHE = new Map();
const STATE_PERSIST_QUEUES = new Map();
const OAUTH_RATE_LIMITS = new Map();
const STATS_TOKEN = String(process.env.STATS_BOT_TOKEN || "").trim();
const DEFAULT_BANK_BALANCE = 5_000_000;
const SALARY_BASE = 250_000;
const SALARY_TAX = 35_000;
const SALARY_NET = SALARY_BASE - SALARY_TAX;
const SALARY_COOLDOWN_MS = 15 * 24 * 60 * 60 * 1000;
const VEHICLE_INSCRIPTION_MIN = 45_000;
const VEHICLE_PLATE_FEE = 38_000;
const VEHICLE_CIRCULATION_MIN = 35_000;
const SALARY_ROLE_MAP = new Map([
  ["carabinero", { rank: "Carabinero", base: 828_907 }],
  ["cabo 2°", { rank: "Cabo 2°", base: 1_027_788 }],
  ["cabo 1°", { rank: "Cabo 1°", base: 1_248_241 }],
  ["sargento 2°", { rank: "Sargento 2°", base: 1_673_881 }],
  ["sargento 1°", { rank: "Sargento 1°", base: 1_874_372 }],
  ["suboficial", { rank: "Suboficial", base: 2_014_307 }],
  ["suboficial mayor", { rank: "Suboficial Mayor", base: 2_266_887 }],
  ["subteniente", { rank: "Subteniente", base: 1_400_000 }],
  ["teniente", { rank: "Teniente", base: 1_800_000 }],
  ["capitan", { rank: "Capitán", base: 2_450_000 }],
  ["capitán", { rank: "Capitán", base: 2_450_000 }],
  ["mayor", { rank: "Mayor", base: 3_200_000 }],
  ["coronel", { rank: "Coronel", base: 4_000_000 }],
  ["general", { rank: "General", base: 5_000_000 }],
  ["detective", { rank: "Detective", base: 1_317_538 }],
  ["subinspector", { rank: "Subinspector", base: 1_723_429 }],
  ["inspector", { rank: "Inspector", base: 2_145_224 }],
  ["subcomisario", { rank: "Subcomisario", base: 2_759_493 }],
  ["comisario", { rank: "Comisario", base: 3_847_509 }],
  ["subprefecto", { rank: "Subprefecto", base: 4_117_708 }],
  ["prefecto", { rank: "Prefecto", base: 5_228_000 }],
  ["prefecto general", { rank: "Prefecto General", base: 6_400_000 }],
  ["general inspector", { rank: "General Inspector", base: 5_800_000 }],
  ["inspector general", { rank: "General Inspector", base: 5_800_000 }],
  ["director general", { rank: "Director General", base: 6_593_369 }],
  ["aspirante", { rank: "Aspirante", base: 300_000 }],
  ["bombero", { rank: "Bombero", base: 500_000 }],
  ["ayudante", { rank: "Ayudante", base: 650_000 }],
  ["teniente 3°", { rank: "Teniente 3°", base: 900_000 }],
  ["teniente 2°", { rank: "Teniente 2°", base: 1_100_000 }],
  ["teniente 1°", { rank: "Teniente 1°", base: 1_300_000 }],
  ["director", { rank: "Director", base: 2_200_000 }],
  ["comandante", { rank: "Comandante", base: 3_000_000 }],
  ["superintendente", { rank: "Superintendente", base: 4_000_000 }],
  ["seguridad ciudadana", { rank: "Seguridad Ciudadana", base: 600_000 }],
  ["inspector municipal", { rank: "Inspector Municipal", base: 850_000 }],
  ["inspector encargado", { rank: "Inspector Encargado", base: 1_100_000 }],
  ["director de seguridad", { rank: "Director de Seguridad", base: 2_500_000 }],
  ["recepcionista", { rank: "Recepcionista", base: 550_000 }],
  ["tens", { rank: "TENS", base: 650_000 }],
  ["paramedico", { rank: "Paramédico", base: 750_000 }],
  ["paramédico", { rank: "Paramédico", base: 750_000 }],
  ["enfermero/a clinico", { rank: "Enfermero/a clínico", base: 1_200_000 }],
  ["enfermero/a clínico", { rank: "Enfermero/a clínico", base: 1_200_000 }],
  ["enfermero/a jefe", { rank: "Enfermero/a jefe", base: 1_800_000 }],
  ["medico general", { rank: "Médico general", base: 2_200_000 }],
  ["médico general", { rank: "Médico general", base: 2_200_000 }],
  ["medico cirujano", { rank: "Médico cirujano", base: 3_000_000 }],
  ["médico cirujano", { rank: "Médico cirujano", base: 3_000_000 }],
  ["medico especialista", { rank: "Médico especialista", base: 4_000_000 }],
  ["médico especialista", { rank: "Médico especialista", base: 4_000_000 }],
  ["subdirector medico", { rank: "Subdirector médico", base: 4_500_000 }],
  ["subdirector médico", { rank: "Subdirector médico", base: 4_500_000 }],
  ["director medico", { rank: "Director médico", base: 5_500_000 }],
  ["director médico", { rank: "Director médico", base: 5_500_000 }],
  ["administrador/a", { rank: "Administrador/a", base: 1_500_000 }],
  ["subgerente", { rank: "Subgerente", base: 3_500_000 }],
  ["gerente general", { rank: "Gerente General", base: 6_000_000 }],
]);
const SALARY_ROLE_MATCHERS = [
  { match: "general director de", rank: "General Director de Carabineros", base: 6_800_000 },
  { match: "general sub director", rank: "General Sub Director", base: 6_100_000 },
  { match: "general inspector", rank: "General Inspector", base: 5_800_000 },
  { match: "general", rank: "General", base: 5_000_000 },
  { match: "coronel", rank: "Coronel", base: 4_221_892 },
  { match: "teniente coronel", rank: "Teniente Coronel", base: 3_885_704 },
  { match: "mayor", rank: "Mayor", base: 3_443_528 },
  { match: "capitan", rank: "Capitán", base: 2_450_137 },
  { match: "capitán", rank: "Capitán", base: 2_450_137 },
  { match: "teniente", rank: "Teniente", base: 1_800_090 },
  { match: "sub teniente", rank: "Sub Teniente", base: 1_419_293 },
  { match: "sub oficial mayor", rank: "Sub Oficial Mayor", base: 2_266_887 },
  { match: "sub oficial", rank: "Sub Oficial", base: 2_014_307 },
  { match: "sargento 1°", rank: "Sargento 1°", base: 1_874_372 },
  { match: "sargento 2°", rank: "Sargento 2°", base: 1_673_881 },
  { match: "cabo 1°", rank: "Cabo 1°", base: 1_248_241 },
  { match: "cabo 2°", rank: "Cabo 2°", base: 1_027_788 },
  { match: "carabinero", rank: "Carabinero", base: 828_907 },

  { match: "director general de", rank: "Director General de la PDI", base: 6_593_369 },
  { match: "prefecto general", rank: "Prefecto General", base: 6_431_742 },
  { match: "prefecto inspector", rank: "Prefecto Inspector", base: 6_334_951 },
  { match: "prefecto", rank: "Prefecto", base: 5_228_000 },
  { match: "sub prefecto", rank: "Sub Prefecto", base: 4_117_708 },
  { match: "comisario", rank: "Comisario", base: 3_847_509 },
  { match: "sub comisario", rank: "Sub Comisario", base: 2_759_493 },
  { match: "inspector general", rank: "Inspector General", base: 5_800_000 },
  { match: "inspector", rank: "Inspector", base: 2_145_224 },
  { match: "sub inspector", rank: "Sub Inspector", base: 1_723_429 },
  { match: "detective", rank: "Detective", base: 1_317_538 },

  { match: "director de samu", rank: "Director de SAMU", base: 3_600_000 },
  { match: "sub-director samu", rank: "Sub-Director SAMU", base: 2_900_000 },
  { match: "sub director samu", rank: "Sub-Director SAMU", base: 2_900_000 },
  { match: "jefe de samu", rank: "Jefe de SAMU", base: 1_800_000 },
  { match: "supervisor", rank: "Supervisor SAMU", base: 1_250_000 },
  { match: "instructor", rank: "Instructor SAMU", base: 1_050_000 },
  { match: "tecnico paramedico avanzado", rank: "Tecnico Paramedico Avanzado", base: 900_000 },
  { match: "tecnico paramedico", rank: "Tecnico Paramedico", base: 780_000 },
  { match: "tecnico practicante", rank: "Tecnico Practicante", base: 420_000 },

  { match: "presidente nacional", rank: "Presidente Nacional", base: 4_800_000 },
  { match: "superintendente", rank: "Superintendente", base: 4_000_000 },
  { match: "vicesuperintendente", rank: "Vicesuperintendente", base: 3_500_000 },
  { match: "comandante", rank: "Comandante", base: 3_000_000 },
  { match: "segundo comandante", rank: "Segundo Comandante", base: 2_500_000 },
  { match: "tercer comandante", rank: "Tercer Comandante", base: 2_200_000 },
  { match: "director", rank: "Director", base: 2_000_000 },
  { match: "teniente 1°", rank: "Teniente 1°", base: 1_300_000 },
  { match: "teniente 2°", rank: "Teniente 2°", base: 1_100_000 },
  { match: "teniente 3°", rank: "Teniente 3°", base: 900_000 },
  { match: "ayudante", rank: "Ayudante", base: 650_000 },
  { match: "voluntario", rank: "Voluntario", base: 500_000 },

  { match: "director de seguridad", rank: "Director de Seguridad", base: 2_500_000 },
  { match: "inspector encargado", rank: "Inspector Encargado", base: 1_100_000 },
  { match: "inspector municipal", rank: "Inspector Municipal", base: 850_000 },
  { match: "seguridad ciudadana", rank: "Seguridad Ciudadana", base: 600_000 },

  { match: "gerente general clin", rank: "Gerente General Clinica", base: 6_000_000 },
  { match: "sub gerente", rank: "Sub Gerente", base: 3_500_000 },
  { match: "director medico gen", rank: "Director Medico General", base: 5_500_000 },
  { match: "sub director medico", rank: "Sub Director Medico", base: 4_500_000 },
  { match: "jefe de calidad y ge", rank: "Jefe de Calidad y Gestion", base: 2_400_000 },
  { match: "jefe de servicio", rank: "Jefe de Servicio", base: 2_200_000 },
  { match: "jefe de area", rank: "Jefe de Area", base: 1_700_000 },
  { match: "medico especialista", rank: "Medico Especialista", base: 4_000_000 },
  { match: "medico cirujano", rank: "Medico Cirujano", base: 3_000_000 },
  { match: "medico general", rank: "Medico General", base: 2_200_000 },
  { match: "residente", rank: "Residente", base: 1_400_000 },
  { match: "enfermero/a en jefe", rank: "Enfermero/a en Jefe", base: 1_800_000 },
  { match: "enfermero/a clinico", rank: "Enfermero/a Clinico", base: 1_200_000 },
  { match: "enfermero/a clínico", rank: "Enfermero/a Clinico", base: 1_200_000 },
  { match: "tens", rank: "TENS", base: 650_000 },
  { match: "paramedico", rank: "Paramedico", base: 750_000 },
  { match: "paramédico", rank: "Paramedico", base: 750_000 },
  { match: "reanimador", rank: "Reanimador", base: 900_000 },
  { match: "secretaria medica", rank: "Secretaria Medica", base: 600_000 },
  { match: "secretaria médica", rank: "Secretaria Medica", base: 600_000 },
  { match: "recepcionista", rank: "Recepcionista", base: 550_000 },
  { match: "administrativo/a", rank: "Administrativo/a", base: 700_000 },
];
const DEFAULT_KAME_FLEET = [
  {
    id: "kame-chevlon-captain-1992",
    name: "Chevlon captain 1992",
    type: "Sedan clasico",
    description: "Arriendo urbano economico para traslados simples y diligencias.",
    image: "assets/tienda/autos/Chevlon_captain_1992.png",
  },
  {
    id: "kame-chevlon-captain-ltz-1994",
    name: "chevlon captain ltz 1994",
    type: "Sedan clasico premium",
    description: "Version mas comoda para uso ejecutivo o recorridos mas largos.",
    image: "assets/tienda/autos/chevlon_captain_ltz_1994.png",
  },
  {
    id: "kame-chevlon-camion-2002",
    name: "Chevlon Camion 2002",
    type: "Camioneta utilitaria",
    description: "Ideal para carga ligera, apoyos logisticos y trabajo operativo.",
    image: "assets/tienda/autos/Chevlon_Camion_2002.png",
  },
];
const MAINTENANCE_SECTION_LABELS = {
  inicio: "Inicio",
  portal: "Portal de identidad",
  tienda: "Tienda oficial",
  comisaria: "Comisaria virtual",
  casino: "Casino",
  kame: "Kame Motors",
  staff: "Panel de staff",
  policial: "Portal policial",
  banco_funcionarios: "Banco funcionarios",
};
const MAINTENANCE_ROUTE_SECTIONS = {
  "/": "inicio",
  "/index.html": "inicio",
  "/portal.html": "portal",
  "/tienda.html": "tienda",
  "/comisaria-virtual/index.html": "comisaria",
  "/casino.html": "casino",
  "/kame-motors.html": "kame",
  "/staff.html": "staff",
  "/policial.html": "policial",
  "/banco-funcionarios.html": "banco_funcionarios",
};

function cloneJson(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

const PORT = Number(process.env.PORT || 3000);

const env = {
  discordClientId: process.env.DISCORD_CLIENT_ID || "",
  discordClientSecret: process.env.DISCORD_CLIENT_SECRET || "",
  discordBotToken: process.env.DISCORD_BOT_TOKEN || "",
  discordGuildId: process.env.DISCORD_GUILD_ID || "",
  discordRedirectUri: process.env.DISCORD_REDIRECT_URI || `http://localhost:${PORT}/auth/discord/callback`,
  discordPortalRedirectUri: process.env.DISCORD_PORTAL_REDIRECT_URI || `http://localhost:${PORT}/auth/discord/portal-callback`,
  allowedRoleNames: (process.env.ALLOWED_ROLE_NAMES || "CEO,Fundador")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
  departmentAdminRoleName: String(process.env.DEPARTMENT_ADMIN_ROLE_NAME || "Departamento Administrativo").trim().toLowerCase(),
  bankRoleName: String(process.env.BANK_ROLE_NAME || "Banco de chile").trim().toLowerCase(),
  kameRoleName: String(process.env.KAME_ROLE_NAME || "Kame motors").trim().toLowerCase(),
  carabinerosRoleName: String(process.env.CARABINEROS_ROLE_NAME || "Carabineros de Chile").trim().toLowerCase(),
  pdiRoleName: String(process.env.PDI_ROLE_NAME || "Policia de investigaciones").trim().toLowerCase(),
  disasterRoleName: String(process.env.DISASTER_ROLE_NAME || "Desastres Naturales").trim().toLowerCase(),
  carabinerosAdminRoleName: String(process.env.CARABINEROS_ADMIN_ROLE_NAME || "Administrador carabineros").trim().toLowerCase(),
  pdiAdminRoleName: String(process.env.PDI_ADMIN_ROLE_NAME || "Administrador pdi").trim().toLowerCase(),
  sessionSecret: process.env.SESSION_SECRET || crypto.randomBytes(24).toString("hex"),
  frontendOrigin: String(process.env.FRONTEND_ORIGIN || "").trim(),
  publicBaseUrl: String(process.env.PUBLIC_BASE_URL || `http://localhost:${PORT}`).trim(),
  supabaseUrl: String(process.env.SUPABASE_URL || "").trim(),
  supabaseServiceRoleKey: String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim(),
};

function normalizeOrigin(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

env.frontendOrigin = normalizeOrigin(env.frontendOrigin);
env.publicBaseUrl = normalizeOrigin(env.publicBaseUrl);
env.supabaseUrl = normalizeOrigin(env.supabaseUrl);

const DEFAULT_STATS = () => ({
  discord_members: 0,
  server_staff: 20,
  server_status: "Cerrado",
  general_status: "En linea",
  updated_at: "sin datos",
});

const STATE_DEFINITIONS = {
  stats: { path: STATS_PATH, fallback: DEFAULT_STATS },
  identities: { path: IDENTITY_PATH, fallback: () => ({}) },
  bank_records: { path: BANK_PATH, fallback: () => ({}) },
  user_sessions: { path: USER_SESSIONS_PATH, fallback: () => ({}) },
  notifications: { path: NOTIFICATIONS_PATH, fallback: () => ({}) },
  announcements: { path: ANNOUNCEMENTS_PATH, fallback: () => ([]) },
  credit_applications: { path: CREDIT_APPLICATIONS_PATH, fallback: () => ([]) },
  police_records: { path: POLICE_RECORDS_PATH, fallback: () => ({}) },
  service_hours: { path: SERVICE_HOURS_PATH, fallback: () => ({}) },
  kame_requests: { path: KAME_REQUESTS_PATH, fallback: () => ([]) },
  kame_fleet: { path: KAME_FLEET_PATH, fallback: () => cloneJson(DEFAULT_KAME_FLEET) },
  maintenance: { path: MAINTENANCE_PATH, fallback: createDefaultMaintenanceState },
  store_items: { path: STORE_ITEMS_PATH, fallback: () => ([]) },
  secondhand_market: { path: SECONDHAND_MARKET_PATH, fallback: () => ([]) },
  salary_role_overrides: { path: SALARY_ROLE_OVERRIDES_PATH, fallback: () => ([]) },
};

function hydrateUserSessionsFromStore() {
  USER_SESSIONS.clear();
  Object.entries(readUserSessions()).forEach(([sessionId, session]) => {
    if (!sessionId || !session || typeof session !== "object" || !session.user) return;
    USER_SESSIONS.set(sessionId, session);
  });
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".txt": "text/plain; charset=utf-8",
  ".wav": "audio/wav",
};

function readStateFromFile(definition) {
  try {
    return JSON.parse(fs.readFileSync(definition.path, "utf8"));
  } catch {
    return definition.fallback();
  }
}

async function loadStateFromSupabase() {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) return false;
  const response = await fetch(`${env.supabaseUrl}/rest/v1/app_state?select=state_key,payload`, {
    headers: {
      apikey: env.supabaseServiceRoleKey,
      Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
    },
  });
  if (!response.ok) {
    throw new Error(`supabase_load_failed:${response.status}`);
  }
  const rows = await response.json();
  const byKey = new Map((Array.isArray(rows) ? rows : []).map((row) => [row.state_key, row.payload]));
  for (const [key, definition] of Object.entries(STATE_DEFINITIONS)) {
    const value = byKey.has(key) ? byKey.get(key) : readStateFromFile(definition);
    STATE_CACHE.set(key, cloneJson(value));
  }
  return true;
}

function ensureStateCacheLoaded() {
  for (const [key, definition] of Object.entries(STATE_DEFINITIONS)) {
    if (!STATE_CACHE.has(key)) {
      STATE_CACHE.set(key, cloneJson(readStateFromFile(definition)));
    }
  }
}

function readState(key) {
  ensureStateCacheLoaded();
  return cloneJson(STATE_CACHE.get(key));
}

function queueStatePersist(key) {
  const definition = STATE_DEFINITIONS[key];
  if (!definition) return;
  const payload = cloneJson(STATE_CACHE.get(key));
  const previous = STATE_PERSIST_QUEUES.get(key) || Promise.resolve();
  const next = previous
    .catch(() => {})
    .then(async () => {
      if (env.supabaseUrl && env.supabaseServiceRoleKey) {
        const response = await fetch(`${env.supabaseUrl}/rest/v1/app_state?on_conflict=state_key`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: env.supabaseServiceRoleKey,
            Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify([{ state_key: key, payload }]),
        });
        if (!response.ok) {
          throw new Error(`supabase_write_failed:${key}:${response.status}`);
        }
        return;
      }
      fs.writeFileSync(definition.path, JSON.stringify(payload, null, 2), "utf8");
    })
    .catch((error) => {
      console.error(`[state] ${error.message || error}`);
    });
  STATE_PERSIST_QUEUES.set(key, next);
}

function writeState(key, value) {
  STATE_CACHE.set(key, cloneJson(value));
  queueStatePersist(key);
}

function readStats() {
  return readState("stats") || DEFAULT_STATS();
}

function writeStats(stats) {
  writeState("stats", stats);
}

function readIdentityRecords() {
  return readState("identities") || {};
}

function writeIdentityRecords(records) {
  writeState("identities", records);
}

function readBankRecords() {
  return readState("bank_records") || {};
}

function writeBankRecords(records) {
  writeState("bank_records", records);
}

function readUserSessions() {
  const payload = readState("user_sessions");
  return payload && typeof payload === "object" ? payload : {};
}

function writeUserSessions() {
  const records = Object.fromEntries(USER_SESSIONS.entries());
  writeState("user_sessions", records);
}

function readNotifications() {
  const payload = readState("notifications");
  return payload && typeof payload === "object" ? payload : {};
}

function writeNotifications(records) {
  writeState("notifications", records);
}

function readAnnouncements() {
  const payload = readState("announcements");
  return Array.isArray(payload) ? payload : [];
}

function writeAnnouncements(items) {
  writeState("announcements", items);
}

function readCreditApplications() {
  const payload = readState("credit_applications");
  return Array.isArray(payload) ? payload : [];
}

function writeCreditApplications(items) {
  writeState("credit_applications", items);
}

function readPoliceRecords() {
  const payload = readState("police_records");
  return payload && typeof payload === "object" ? payload : {};
}

function writePoliceRecords(records) {
  writeState("police_records", records);
}

function readServiceHours() {
  const payload = readState("service_hours");
  return payload && typeof payload === "object" ? payload : {};
}

function writeServiceHours(records) {
  writeState("service_hours", records);
}

function readKameRequests() {
  const payload = readState("kame_requests");
  return Array.isArray(payload) ? payload : [];
}

function writeKameRequests(items) {
  writeState("kame_requests", items);
}

function readKameFleet() {
  const payload = readState("kame_fleet");
  if (!Array.isArray(payload) || !payload.length) {
    const fallback = cloneJson(DEFAULT_KAME_FLEET);
    writeKameFleet(fallback);
    return fallback;
  }
  return payload;
}

function writeKameFleet(items) {
  writeState("kame_fleet", items);
}

function createDefaultMaintenanceState() {
  return Object.fromEntries(
    Object.entries(MAINTENANCE_SECTION_LABELS).map(([key, label]) => [
      key,
      {
        enabled: false,
        label,
        title: `${label} en mantenimiento`,
        message: "Estamos realizando ajustes internos. Intenta entrar nuevamente en unos minutos.",
        updated_at: "",
      },
    ])
  );
}

function readMaintenanceState() {
  const fallback = createDefaultMaintenanceState();
  const payload = readState("maintenance");
  if (!payload || typeof payload !== "object") return fallback;
  const merged = { ...fallback };
  for (const [key, value] of Object.entries(payload)) {
    if (!merged[key] || !value || typeof value !== "object") continue;
    merged[key] = {
      ...merged[key],
      enabled: Boolean(value.enabled),
      title: String(value.title || merged[key].title),
      message: String(value.message || merged[key].message),
      updated_at: String(value.updated_at || ""),
    };
  }
  return merged;
}

function writeMaintenanceState(state) {
  writeState("maintenance", state);
}

function readSalaryRoleOverrides() {
  const payload = readState("salary_role_overrides");
  return Array.isArray(payload) ? payload : [];
}

function writeSalaryRoleOverrides(items) {
  writeState("salary_role_overrides", items);
}

function hydrateKameFleetImages(items) {
  const storeItems = readStoreItems();
  return items.map((item) => {
    const match = storeItems.find(
      (storeItem) => String(storeItem.name || "").trim().toLowerCase() === String(item.name || "").trim().toLowerCase()
    );
    if (match?.image) {
      return { ...item, image: match.image };
    }
    return item;
  });
}

function readStoreItems() {
  const items = readState("store_items");
  if (!Array.isArray(items)) return [];
  let changed = false;
  const normalized = items.map((item) => {
    let nextItem = item;
    if (!nextItem.category) {
      changed = true;
      nextItem = { ...nextItem, category: "vehiculos" };
    }

    const imagePath = String(nextItem.image || "").trim();
    if (imagePath && imagePath.startsWith("assets/tienda/autos/")) {
      const absoluteCurrent = path.join(ROOT, imagePath);
      if (!fs.existsSync(absoluteCurrent)) {
        const fileName = path.basename(imagePath);
        const fallbackPath = `assets/tienda/${fileName}`;
        const absoluteFallback = path.join(ROOT, fallbackPath);
        if (fs.existsSync(absoluteFallback)) {
          changed = true;
          nextItem = { ...nextItem, image: fallbackPath };
        }
      }
    }

    return nextItem;
  });
  if (changed) {
    writeStoreItems(normalized);
  }
  return normalized;
}

function writeStoreItems(items) {
  writeState("store_items", items);
}

function ensureDirectory(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function normalizeItemImage(image, fallback = "assets/tienda/placeholder-auto.svg") {
  const value = String(image || "").trim();
  if (!value) return fallback;

  if (/^https?:\/\/(media|cdn)\.discordapp\.(net|com)\//i.test(value)) {
    return value.replace(/^http:\/\//i, "https://");
  }

  if (/^https?:\/\//i.test(value)) {
    return value.replace(/^http:\/\//i, "https://");
  }

  return value;
}

function shouldIgnoreBulkImportLine(line) {
  const value = String(line || "").trim();
  if (!value) return true;
  if (/^imagen$/i.test(value)) return true;
  if (/^gama\s+/i.test(value)) return true;
  if (/^[^-]+â€”\s*\d{1,2}:\d{2}$/u.test(value)) return true;
  if (/^\d{1,2}:\d{2}$/.test(value)) return true;
  return false;
}

function buildAutoVehicleImagePath(name) {
  const fileName = String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `assets/tienda/autos/${fileName || "vehiculo"}.png`;
}

function saveStoreUpload(filename, dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i);
  if (!match) {
    throw new Error("invalid_image");
  }

  const mime = match[1].toLowerCase();
  const extension = mime === "image/png" ? ".png" : mime === "image/webp" ? ".webp" : ".jpg";
  const safeBaseName = slugify(path.parse(String(filename || "imagen")).name) || `imagen-${Date.now()}`;
  const finalName = `${safeBaseName}-${Date.now()}${extension}`;
  const buffer = Buffer.from(match[2], "base64");

  ensureDirectory(STORE_UPLOADS_DIR);
  fs.writeFileSync(path.join(STORE_UPLOADS_DIR, finalName), buffer);
  return `assets/tienda/uploads/${finalName}`;
}

function estimateChileanVehiclePrice(name) {
  const source = String(name || "");
  const normalized = source
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const yearMatch = normalized.match(/\b(19\d{2}|20\d{2})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : 2016;
  const currentYear = new Date().getFullYear();
  const age = Math.max(0, currentYear - year);

  let basePrice = 9500000;

  if (/lawn mower/.test(normalized)) {
    basePrice = 650000;
  } else if (/4[_\-\s]?wheeler|atv|quad/.test(normalized)) {
    basePrice = 4200000;
  } else if (/commuter van|van|traveller/.test(normalized)) {
    basePrice = 13800000;
  } else if (/camion|captain|apache|buckaro|boundary|landslide|determinator|prancer|amigo|terrain traveller/.test(normalized)) {
    basePrice = 25500000;
  } else if (/vault|q8|rs3|bremen|vierturig|munich|jalapeno|platoro/.test(normalized)) {
    basePrice = 34800000;
  } else if (/corbeta|stallion|riptide|revver|rampage|phoenix|coupe|antelope ss|sfp fury/.test(normalized)) {
    basePrice = 27500000;
  } else if (/evert|prima|renabout|everest|imperium|ranger|sedan|traveller|advance|amigo s|captain ltz|captain/.test(normalized)) {
    basePrice = 14200000;
  }

  if (/v8|ss|max|beast|garde|fury/.test(normalized)) {
    basePrice += 6500000;
  }

  if (/classic|195|196|197|198/.test(normalized)) {
    basePrice *= 1.18;
  }

  let depreciationFactor = 1;
  if (age <= 1) depreciationFactor = 0.98;
  else if (age <= 3) depreciationFactor = 0.9;
  else if (age <= 6) depreciationFactor = 0.78;
  else if (age <= 10) depreciationFactor = 0.63;
  else if (age <= 16) depreciationFactor = 0.48;
  else if (age <= 24) depreciationFactor = 0.36;
  else depreciationFactor = 0.28;

  const estimated = Math.max(basePrice * depreciationFactor, 900000);
  return Math.round(estimated / 50000) * 50000;
}

function parseBulkStoreLines(raw) {
  const lines = String(raw || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !shouldIgnoreBulkImportLine(line));

  return lines.map((line) => {
    const parts = line.includes("|")
      ? line.split("|").map((part) => part.trim())
      : line.includes("\t")
        ? line.split("\t").map((part) => part.trim())
        : [line];

    if (!parts.length) {
      throw new Error("invalid_bulk_line");
    }

    const [name, priceRaw = "", descriptionRaw = "", imageRaw = ""] = parts;
    const hasExplicitPrice = String(priceRaw).trim().length > 0;
    const numericPrice = hasExplicitPrice
      ? Number(String(priceRaw).replace(/[^\d]/g, ""))
      : estimateChileanVehiclePrice(name);

    if (!name || !Number.isFinite(numericPrice)) {
      throw new Error("invalid_bulk_line");
    }

    return {
      id: crypto.randomBytes(8).toString("hex"),
      slug: slugify(name),
      name,
      description: descriptionRaw || (hasExplicitPrice ? "Vehiculo agregado por importacion masiva." : "Vehiculo con valor referencial estimado para Chile."),
      price: numericPrice,
      image: normalizeItemImage(imageRaw, buildAutoVehicleImagePath(name)),
      category: "vehiculos",
      created_at: new Date().toISOString(),
    };
  });
}

function readSecondhandMarket() {
  const items = readState("secondhand_market");
  return Array.isArray(items) ? items : [];
}

function writeSecondhandMarket(items) {
  writeState("secondhand_market", items);
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
  });
  response.end(text);
}

function sendHtml(response, statusCode, html) {
  response.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(html);
}

function redirect(response, location) {
  response.writeHead(302, { Location: location });
  response.end();
}

function applyCorsHeaders(request, response) {
  const origin = String(request.headers.origin || "");
  if (env.frontendOrigin && origin === env.frontendOrigin) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Credentials", "true");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type, X-VCRP-User-Session, X-VCRP-Admin-Session");
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    response.setHeader("Vary", "Origin");
  }
}

function getCookieSecurityOptions() {
  const frontendOrigin = env.frontendOrigin;
  const backendOrigin = env.publicBaseUrl;
  if (!frontendOrigin || !backendOrigin) {
    return { sameSite: "Lax", secure: false };
  }
  return frontendOrigin !== backendOrigin
    ? { sameSite: "None", secure: true }
    : { sameSite: "Lax", secure: false };
}

function parseCookies(request) {
  const header = request.headers.cookie || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => {
        const [key, ...rest] = chunk.split("=");
        return [key, decodeURIComponent(rest.join("="))];
      })
  );
}

function getClientIp(request) {
  const forwarded = String(request.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || String(request.socket?.remoteAddress || "").trim() || "unknown";
}

function rateLimitOAuth(request, scope, limit = 8, windowMs = 60_000) {
  const key = `${scope}:${getClientIp(request)}`;
  const now = Date.now();
  const entry = OAUTH_RATE_LIMITS.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }
  entry.count += 1;
  OAUTH_RATE_LIMITS.set(key, entry);
  if (entry.count > limit) {
    return Math.ceil((entry.resetAt - now) / 1000);
  }
  return 0;
}

function setCookie(response, name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path || "/"}`);
  if (options.httpOnly !== false) parts.push("HttpOnly");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.secure) parts.push("Secure");
  if (options.maxAge) parts.push(`Max-Age=${options.maxAge}`);
  response.setHeader("Set-Cookie", parts.join("; "));
}

function clearCookie(response, name) {
  const cookieOptions = getCookieSecurityOptions();
  const parts = [`${name}=`, "Path=/", "HttpOnly", "Max-Age=0", `SameSite=${cookieOptions.sameSite}`];
  if (cookieOptions.secure) parts.push("Secure");
  response.setHeader("Set-Cookie", parts.join("; "));
}

function getAdminSession(request) {
  const cookies = parseCookies(request);
  const requestUrl = new URL(request.url, env.publicBaseUrl || `http://localhost:${PORT}`);
  const sessionId =
    cookies.vcrp_admin_session ||
    String(request.headers["x-vcrp-admin-session"] || "").trim() ||
    String(requestUrl.searchParams.get("admin_session") || "").trim();
  if (!sessionId) return null;
  return ADMIN_SESSIONS.get(sessionId) || null;
}

function getUserSession(request) {
  const cookies = parseCookies(request);
  const requestUrl = new URL(request.url, env.publicBaseUrl || `http://localhost:${PORT}`);
  const sessionId =
    cookies.vcrp_user_session ||
    String(request.headers["x-vcrp-user-session"] || "").trim() ||
    String(requestUrl.searchParams.get("portal_session") || "").trim();
  if (!sessionId) return null;
  return USER_SESSIONS.get(sessionId) || null;
}

async function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("body_too_large"));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

async function discordFetch(url, options = {}, label = "discord_request") {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${label}_failed:${response.status}:${text}`);
  }
  return response.json();
}

async function exchangeDiscordCode(code, redirectUri) {
  const body = new URLSearchParams({
    client_id: env.discordClientId,
    client_secret: env.discordClientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  return discordFetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  }, "discord_token_exchange");
}

async function fetchDiscordUser(accessToken) {
  return discordFetch("https://discord.com/api/users/@me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }, "discord_fetch_user");
}

async function fetchGuildRoles() {
  return discordFetch(`https://discord.com/api/guilds/${env.discordGuildId}/roles`, {
    headers: {
      Authorization: `Bot ${env.discordBotToken}`,
    },
  }, "discord_fetch_roles");
}

async function fetchGuildMember(userId) {
  return discordFetch(`https://discord.com/api/guilds/${env.discordGuildId}/members/${userId}`, {
    headers: {
      Authorization: `Bot ${env.discordBotToken}`,
    },
  }, "discord_fetch_member");
}

async function verifyAllowedRole(userId) {
  const roleNames = (await fetchMemberRoles(userId)).map((role) => role.name);

  return env.allowedRoleNames.some((name) => roleNames.includes(name));
}

async function fetchMemberRoles(userId) {
  const [member, roles] = await Promise.all([fetchGuildMember(userId), fetchGuildRoles()]);
  return roles
    .filter((role) => member.roles.includes(role.id))
    .map((role) => ({
      id: String(role.id || "").trim(),
      name: String(role.name || "").trim().toLowerCase(),
    }));
}

async function fetchMemberRoleNames(userId) {
  const roles = await fetchMemberRoles(userId);
  return roles.map((role) => role.name);
}

function createSession(user) {
  const sessionId = crypto.randomBytes(24).toString("hex");
  ADMIN_SESSIONS.set(sessionId, {
    user,
    createdAt: Date.now(),
  });
  return sessionId;
}

function createUserSession(user) {
  const sessionId = crypto.randomBytes(24).toString("hex");
  USER_SESSIONS.set(sessionId, {
    user,
    createdAt: Date.now(),
  });
  writeUserSessions();
  return sessionId;
}

function resolveSalaryProfile(roleNames = [], roleIds = []) {
  const normalizedRoles = roleNames.map((role) => normalizeLookup(role));
  const normalizedRoleIds = roleIds.map((roleId) => String(roleId || "").trim()).filter(Boolean);
  let bestMatch = null;

  const overrides = readSalaryRoleOverrides();
  for (const override of overrides) {
    if (!normalizedRoleIds.includes(String(override.role_id || "").trim())) continue;
    if (!bestMatch || Number(override.base || 0) > Number(bestMatch.base || 0)) {
      bestMatch = {
        rank: String(override.rank || override.role_name || "Cargo personalizado"),
        base: Number(override.base || 0),
      };
    }
  }

  for (const role of normalizedRoles) {
    const profile = SALARY_ROLE_MAP.get(role);
    if (!profile) continue;
    if (!bestMatch || Number(profile.base || 0) > Number(bestMatch.base || 0)) {
      bestMatch = profile;
    }
  }

  for (const role of normalizedRoles) {
    for (const matcher of SALARY_ROLE_MATCHERS) {
      if (!role.includes(normalizeLookup(matcher.match))) continue;
      if (!bestMatch || Number(matcher.base || 0) > Number(bestMatch.base || 0)) {
        bestMatch = matcher;
      }
    }
  }

  const base = Number(bestMatch?.base || SALARY_BASE);
  const tax = Math.min(SALARY_TAX, base);
  return {
    rank: bestMatch?.rank || "Sin cargo asignado",
    base,
    tax,
    net: Math.max(0, base - tax),
  };
}

function applySalaryProfile(bank, roleNames = [], roleIds = []) {
  const salary = resolveSalaryProfile(roleNames, roleIds);
  bank.salary = {
    rank: salary.rank,
    base: salary.base,
    tax: salary.tax,
    net: salary.net,
  };
  return bank.salary;
}

async function resolveSessionRoleContext(session) {
  if (!session?.user?.id) return { names: [], ids: [] };
  if (Array.isArray(session.user.role_names) && Array.isArray(session.user.role_ids) && session.user.role_ids.length) {
    return {
      names: session.user.role_names,
      ids: session.user.role_ids,
    };
  }
  if (!env.discordBotToken || !env.discordGuildId) {
    return {
      names: Array.isArray(session.user.role_names) ? session.user.role_names : [],
      ids: Array.isArray(session.user.role_ids) ? session.user.role_ids : [],
    };
  }

  const roles = await fetchMemberRoles(session.user.id).catch(() => []);
  const roleNames = roles.map((role) => role.name);
  const roleIds = roles.map((role) => role.id);
  session.user.role_names = roleNames;
  session.user.role_ids = roleIds;
  writeUserSessions();
  return { names: roleNames, ids: roleIds };
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(`${env.sessionSecret}:${password}`).digest("hex");
}

function calculateRutDv(body) {
  let sum = 0;
  let multiplier = 2;
  const digits = String(body).split("").reverse();

  for (const digit of digits) {
    sum += Number(digit) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  if (remainder === 11) return "0";
  if (remainder === 10) return "K";
  return String(remainder);
}

function formatRut(body, dv) {
  const formattedBody = String(body).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${formattedBody}-${dv}`;
}

function generateUniqueRut(records) {
  const used = new Set(Object.values(records).map((record) => record.rut));

  while (true) {
    const body = Math.floor(10000000 + Math.random() * 89999999);
    const dv = calculateRutDv(body);
    const rut = formatRut(body, dv);
    if (!used.has(rut)) {
      return rut;
    }
  }
}

function generateDocumentNumber(records) {
  const used = new Set(Object.values(records).map((record) => record.document_number));

  while (true) {
    const documentNumber = String(Math.floor(100000000 + Math.random() * 900000000));
    if (!used.has(documentNumber)) {
      return documentNumber;
    }
  }
}

function generateCardNumber(records) {
  const used = new Set(Object.values(records).map((record) => record.card_number));
  while (true) {
    const candidate = `5281 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`;
    if (!used.has(candidate)) return candidate;
  }
}

function generateCardCvv(records) {
  const used = new Set(
    Object.values(records)
      .map((record) => record.card_cvv)
      .filter(Boolean)
  );
  while (true) {
    const candidate = String(Math.floor(100 + Math.random() * 900));
    if (!used.has(candidate)) return candidate;
  }
}

function createDefaultBankRecord(userId, allRecords) {
  return {
    user_id: userId,
    balance: DEFAULT_BANK_BALANCE,
    investment_account: { enabled: false, balance: 0 },
    card_number: generateCardNumber(allRecords),
    card_cvv: generateCardCvv(allRecords),
    transactions: [],
    inventory: [],
    loans: [],
    pending_claims: [],
    casino_balance: 0,
    salary: {
      base: SALARY_BASE,
      tax: SALARY_TAX,
      net: SALARY_NET,
    },
    last_salary_claim_at: 0,
  };
}

function pushTransaction(bank, entry) {
  if (!Array.isArray(bank.transactions)) bank.transactions = [];
  bank.transactions.push({
    id: crypto.randomBytes(8).toString("hex"),
    created_at: new Date().toISOString(),
    ...entry,
  });
  if (bank.transactions.length > 100) {
    bank.transactions = bank.transactions.slice(-100);
  }
}

function pushNotification(userId, entry) {
  const notifications = readNotifications();
  if (!Array.isArray(notifications[userId])) {
    notifications[userId] = [];
  }
  notifications[userId].push({
    id: crypto.randomBytes(8).toString("hex"),
    created_at: new Date().toISOString(),
    read: false,
    ...entry,
  });
  if (notifications[userId].length > 80) {
    notifications[userId] = notifications[userId].slice(-80);
  }
  writeNotifications(notifications);
}

function listNotificationsForUser(userId, permissions = {}) {
  const personal = readNotifications()[userId] || [];
  const announcements = readAnnouncements()
    .map((item) => ({
      ...item,
      kind: item.kind || "announcement",
      read: true,
    }));
  return [...announcements, ...personal]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 100);
}

function markNotificationsRead(userId) {
  const notifications = readNotifications();
  if (!Array.isArray(notifications[userId])) return [];
  notifications[userId] = notifications[userId].map((item) => ({ ...item, read: true }));
  writeNotifications(notifications);
  return notifications[userId];
}

function serializeLoan(loan) {
  const now = Date.now();
  const dueAt = Number(loan?.due_at || 0);
  const balance = Number(loan?.remaining_balance || 0);
  return {
    ...loan,
    is_overdue: Boolean(dueAt && balance > 0 && dueAt < now),
  };
}

function canAccessPolice(session) {
  return Boolean(session?.user?.permissions?.isCarabineros || session?.user?.permissions?.isPdi);
}

function canAccessStaff(session) {
  return Boolean(session?.user?.permissions?.canAccessStaff);
}

function canAccessPoliceHighCommand(session) {
  return Boolean(session?.user?.permissions?.isCarabinerosAdmin || session?.user?.permissions?.isPdiAdmin);
}

function canAccessKame(session) {
  return Boolean(session?.user?.permissions?.canAccessKame);
}

function canAccessShiftPanel(session, panel) {
  if (!session?.user?.permissions) return false;
  if (panel === "police") return canAccessPolice(session);
  if (panel === "bank") return Boolean(session.user.permissions.canManageBank);
  if (panel === "staff") return Boolean(session.user.permissions.canAccessStaff);
  return false;
}

function ensureShiftRecordShape(record) {
  let changed = false;
  if (!Array.isArray(record.sessions)) {
    record.sessions = [];
    changed = true;
  }
  if (record.active_shift && typeof record.active_shift !== "object") {
    record.active_shift = null;
    changed = true;
  }
  return changed;
}

function getShiftRecord(records, userId, panel) {
  if (!records[userId]) {
    records[userId] = {};
  }
  if (!records[userId][panel]) {
    records[userId][panel] = { active_shift: null, sessions: [] };
  }
  ensureShiftRecordShape(records[userId][panel]);
  return records[userId][panel];
}

function summarizeShiftRecord(record) {
  const now = Date.now();
  const sessions = Array.isArray(record.sessions) ? record.sessions : [];
  const completedMs = sessions.reduce((sum, item) => sum + Number(item.duration_ms || 0), 0);
  const activeMs = record.active_shift?.started_at ? Math.max(0, now - Number(record.active_shift.started_at)) : 0;
  return {
    active_shift: record.active_shift || null,
    total_ms: completedMs + activeMs,
    sessions: sessions.slice(0, 20),
  };
}

function buildPoliceHoursRanking() {
  const serviceHours = readServiceHours();
  const identityRecords = readIdentityRecords();
  const rows = [];
  for (const [userId, panelMap] of Object.entries(serviceHours)) {
    const policeRecord = panelMap?.police;
    if (!policeRecord) continue;
    ensureShiftRecordShape(policeRecord);
    const summary = summarizeShiftRecord(policeRecord);
    rows.push({
      user_id: userId,
      name: currentIdentityNameFromRecords(identityRecords, userId),
      rut: identityRecords[userId]?.rut || "",
      total_ms: summary.total_ms,
      active_shift: summary.active_shift || null,
      sessions_count: Array.isArray(policeRecord.sessions) ? policeRecord.sessions.length : 0,
    });
  }
  rows.sort((a, b) => b.total_ms - a.total_ms);
  return rows;
}

function ensurePoliceRecordShape(record) {
  let changed = false;
  if (!Array.isArray(record.fines)) {
    record.fines = [];
    changed = true;
  }
  if (!Array.isArray(record.backgrounds)) {
    record.backgrounds = [];
    changed = true;
  }
  if (!Array.isArray(record.wanted_orders)) {
    record.wanted_orders = [];
    changed = true;
  }
  return changed;
}

function getPoliceRecord(records, userId) {
  if (!records[userId]) {
    records[userId] = { fines: [], backgrounds: [], wanted_orders: [] };
  }
  ensurePoliceRecordShape(records[userId]);
  return records[userId];
}

function serializePolicePerson(userId, identity, bank, policeRecord) {
  const activeWanted = (policeRecord.wanted_orders || []).filter((item) => item.active !== false);
  const unpaidFines = (policeRecord.fines || []).filter((item) => !item.paid);
  return {
    user_id: userId,
    identity,
    bank: bank ? serializeBank(bank) : null,
    police: {
      fines: policeRecord.fines || [],
      backgrounds: policeRecord.backgrounds || [],
      wanted_orders: activeWanted,
      unpaid_fines_count: unpaidFines.length,
    },
  };
}

function findVehicleByPlate(bankRecords, identityRecords, plate) {
  const needle = normalizeLookup(plate).replace(/\s+/g, "");
  for (const [userId, bank] of Object.entries(bankRecords)) {
    ensureBankRecordShape(bank, bankRecords);
    for (const item of bank.inventory || []) {
      const vehicle = item.vehicle_record;
      if (!vehicle?.plate) continue;
      const currentPlate = normalizeLookup(vehicle.plate).replace(/\s+/g, "");
      if (currentPlate !== needle) continue;
      return {
        owner_user_id: userId,
        owner_name: currentIdentityNameFromRecords(identityRecords, userId),
        owner_identity: identityRecords[userId] || null,
        item,
        vehicle,
      };
    }
  }
  return null;
}

function findOwnedVehicleByPlate(bank, plate) {
  const normalized = normalizeVehiclePlate(plate);
  if (!normalized || !Array.isArray(bank?.inventory)) return null;
  return bank.inventory.find((item) => normalizeVehiclePlate(item.vehicle_record?.plate) === normalized) || null;
}

function ensureBankRecordShape(bank, allRecords) {
  let changed = false;

  if (!bank.card_cvv) {
    bank.card_cvv = generateCardCvv(allRecords);
    changed = true;
  }

  if (!bank.investment_account || typeof bank.investment_account !== "object") {
    bank.investment_account = { enabled: false, balance: 0 };
    changed = true;
  }

  if (!Array.isArray(bank.transactions)) {
    bank.transactions = [];
    changed = true;
  }

  if (!Array.isArray(bank.inventory)) {
    bank.inventory = [];
    changed = true;
  }

  if (!Array.isArray(bank.loans)) {
    bank.loans = [];
    changed = true;
  }

  if (!Array.isArray(bank.pending_claims)) {
    bank.pending_claims = [];
    changed = true;
  }

  if (typeof bank.casino_balance !== "number") {
    bank.casino_balance = Number(bank.casino_balance || 0);
    changed = true;
  }

  if (!bank.salary || typeof bank.salary !== "object") {
    bank.salary = {
      rank: "Sin cargo asignado",
      base: SALARY_BASE,
      tax: SALARY_TAX,
      net: SALARY_NET,
    };
    changed = true;
  }

  if (typeof bank.last_salary_claim_at !== "number") {
    bank.last_salary_claim_at = Number(bank.last_salary_claim_at || 0);
    changed = true;
  }

  return changed;
}

function serializeBank(bank) {
  const nextSalaryAvailableAt =
    Number(bank.last_salary_claim_at || 0) > 0
      ? bank.last_salary_claim_at + SALARY_COOLDOWN_MS
      : 0;

  return {
    ...bank,
    loans: Array.isArray(bank.loans) ? bank.loans.map(serializeLoan) : [],
    password_hash: undefined,
    next_salary_available_at: nextSalaryAvailableAt,
  };
}

function normalizeLookup(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function findIdentityEntry(records, identifier) {
  const needle = normalizeLookup(identifier);
  return Object.entries(records).find(([, identity]) => {
    const fullName = normalizeLookup(`${identity.nombres} ${identity.apellidos}`);
    const rut = normalizeLookup(identity.rut);
    const documentNumber = normalizeLookup(identity.document_number);
    return needle === fullName
      || fullName.includes(needle)
      || needle === rut
      || needle === documentNumber;
  }) || null;
}

function currentIdentityNameFromRecords(records, userId) {
  const identity = records[userId];
  if (!identity) return "Vendedor desconocido";
  return `${identity.nombres} ${identity.apellidos}`.trim();
}

function formatMoneyCL(value) {
  return `$${Number(value || 0).toLocaleString("es-CL")}`;
}

function generatePlate() {
  const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
  let plate = "";
  for (let index = 0; index < 3; index += 1) {
    plate += letters[Math.floor(Math.random() * letters.length)];
  }
  plate += "-";
  for (let index = 0; index < 3; index += 1) {
    plate += String(Math.floor(Math.random() * 10));
  }
  return plate;
}

function normalizeVehiclePlate(value) {
  const raw = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (raw.length !== 6) return "";
  const letters = raw.slice(0, 3);
  const digits = raw.slice(3);
  if (!/^[A-Z]{3}$/.test(letters) || !/^\d{3}$/.test(digits)) return "";
  return `${letters}-${digits}`;
}

function isPlateInUse(bankRecords, plate, excludeInventoryId = "") {
  const normalized = normalizeVehiclePlate(plate);
  if (!normalized) return false;
  for (const bank of Object.values(bankRecords)) {
    ensureBankRecordShape(bank, bankRecords);
    for (const item of bank.inventory || []) {
      if (excludeInventoryId && item.id === excludeInventoryId) continue;
      const current = normalizeVehiclePlate(item.vehicle_record?.plate);
      if (current && current === normalized) return true;
    }
  }
  return false;
}

function generateRegistrationNumber() {
  return `RVC-${Math.floor(100000 + Math.random() * 900000)}`;
}

function getVehicleFees(price) {
  const numericPrice = Number(price || 0);
  const inscription = Math.max(VEHICLE_INSCRIPTION_MIN, Math.round(numericPrice * 0.025));
  const plate = VEHICLE_PLATE_FEE;
  const circulation = Math.max(VEHICLE_CIRCULATION_MIN, Math.round(numericPrice * 0.018));
  return {
    inscription,
    plate,
    circulation,
    total: inscription + plate + circulation,
  };
}

function createVehicleRecord(price, options = {}) {
  const fees = getVehicleFees(price);
  return {
    registered: false,
    inscription_fee: fees.inscription,
    plate_fee: fees.plate,
    circulation_fee: fees.circulation,
    total_fee: fees.total,
    registration_number: null,
    plate: normalizeVehiclePlate(options.plate || "") || null,
    color: String(options.color || "").trim() || null,
    registered_at: null,
    circulation_valid_until: null,
    technical_review_due_at: null,
    technical_review_enabled: false,
  };
}

function randomChoice(values) {
  return values[crypto.randomInt(values.length)];
}

function randomFloat() {
  return crypto.randomInt(0, 1000000) / 1000000;
}

function getStaticPath(urlPathname) {
  let relativePath = decodeURIComponent(urlPathname === "/" ? "/index.html" : urlPathname);
  relativePath = relativePath.replace(/^\/+/, "");
  const filePath = path.join(ROOT, relativePath);
  if (!filePath.startsWith(ROOT)) return null;
  return filePath;
}

function getMaintenanceSectionForPath(urlPathname) {
  const normalized = decodeURIComponent(urlPathname || "/");
  return MAINTENANCE_ROUTE_SECTIONS[normalized] || "";
}

function buildMaintenanceHtml(sectionState) {
  const title = String(sectionState?.title || "Seccion en mantenimiento");
  const message = String(
    sectionState?.message || "Estamos realizando ajustes internos. Intenta nuevamente en unos minutos."
  );
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Viva Chile RP</title>
  <style>
    :root {
      --bg: #08111a;
      --panel: rgba(12, 22, 34, 0.9);
      --line: rgba(255,255,255,0.1);
      --text: #f2f6fb;
      --muted: #aab9c8;
      --accent: #f0a64b;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      font-family: Outfit, system-ui, sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at top left, rgba(240,166,75,.12), transparent 24%),
        radial-gradient(circle at bottom right, rgba(55,132,217,.12), transparent 24%),
        linear-gradient(180deg, #071018 0%, #0b1620 100%);
    }
    .maintenance-card {
      width: min(100%, 720px);
      padding: 36px;
      border-radius: 30px;
      border: 1px solid var(--line);
      background: var(--panel);
      box-shadow: 0 30px 80px rgba(0,0,0,.35);
      text-align: center;
    }
    .maintenance-logo {
      width: 96px;
      height: 96px;
      object-fit: contain;
      margin-bottom: 18px;
    }
    .maintenance-kicker {
      margin: 0 0 10px;
      color: var(--accent);
      font-size: .82rem;
      font-weight: 700;
      letter-spacing: .18em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0;
      font-family: Oswald, system-ui, sans-serif;
      font-size: clamp(2.4rem, 7vw, 4.8rem);
      line-height: .92;
    }
    p {
      margin: 18px auto 0;
      max-width: 54ch;
      color: var(--muted);
      line-height: 1.8;
      font-size: 1.02rem;
    }
    .maintenance-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 52px;
      margin-top: 24px;
      padding: 0 24px;
      border-radius: 999px;
      border: 1px solid var(--line);
      color: var(--text);
      text-decoration: none;
      font-weight: 700;
      background: rgba(255,255,255,.05);
    }
  </style>
</head>
<body>
  <main class="maintenance-card">
    <img class="maintenance-logo" src="/assets/logo.png" alt="Logo Viva Chile RP">
    <p class="maintenance-kicker">Mantenimiento activo</p>
    <h1>${title}</h1>
    <p>${message}</p>
    <a class="maintenance-button" href="/index.html">Volver al inicio</a>
  </main>
</body>
</html>`;
}

function maybeServeMaintenancePage(request, response, pathname) {
  if (request.method !== "GET") return false;
  const section = getMaintenanceSectionForPath(pathname);
  if (!section) return false;
  const maintenanceState = readMaintenanceState();
  const sectionState = maintenanceState[section];
  if (!sectionState?.enabled) return false;
  sendHtml(response, 503, buildMaintenanceHtml(sectionState));
  return true;
}

function serveStaticFile(request, response, pathname) {
  if (maybeServeMaintenancePage(request, response, pathname)) {
    return;
  }
  const filePath = getStaticPath(pathname);
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendText(response, 404, "Not found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  response.writeHead(200, {
    "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
  });
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  applyCorsHeaders(request, response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (url.pathname === "/api/stats" && request.method === "GET") {
    sendJson(response, 200, readStats());
    return;
  }

  if (url.pathname === "/api/admin/session" && request.method === "GET") {
    const session = getAdminSession(request);
    if (!session) {
      sendJson(response, 401, { authenticated: false });
      return;
    }

    sendJson(response, 200, {
      authenticated: true,
      user: session.user,
      allowedRoles: env.allowedRoleNames,
      stats: readStats(),
      storeItems: readStoreItems(),
      maintenance: readMaintenanceState(),
      salaryRoleOverrides: readSalaryRoleOverrides(),
    });
    return;
  }

  if (url.pathname === "/api/admin/maintenance" && request.method === "POST") {
    const session = getAdminSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const payload = JSON.parse(rawBody || "{}");
      const section = String(payload.section || "").trim();
      const title = String(payload.title || "").trim();
      const message = String(payload.message || "").trim();
      const enabled = Boolean(payload.enabled);
      const state = readMaintenanceState();

      if (!state[section]) {
        sendJson(response, 400, { error: "invalid_section" });
        return;
      }

      state[section] = {
        ...state[section],
        enabled,
        title: title || `${state[section].label} en mantenimiento`,
        message: message || "Estamos realizando ajustes internos. Intenta entrar nuevamente en unos minutos.",
        updated_at: new Date().toLocaleString("es-CL"),
      };

      writeMaintenanceState(state);
      sendJson(response, 200, { ok: true, maintenance: state });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/admin/store/grant" && request.method === "POST") {
    const session = getAdminSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const identifier = String(incoming.identifier || "").trim();
      const itemId = String(incoming.item_id || "").trim();
      if (!identifier || !itemId) {
        sendJson(response, 400, { error: "invalid_grant" });
        return;
      }

      const identityRecords = readIdentityRecords();
      const entry = findIdentityEntry(identityRecords, identifier);
      if (!entry) {
        sendJson(response, 404, { error: "person_not_found" });
        return;
      }

      const items = readStoreItems();
      const item = items.find((entryItem) => entryItem.id === itemId);
      if (!item) {
        sendJson(response, 404, { error: "item_not_found" });
        return;
      }

      const [userId, identity] = entry;
      const bankRecords = readBankRecords();
      if (!bankRecords[userId]) {
        bankRecords[userId] = createDefaultBankRecord(userId, bankRecords);
      }

      const bank = bankRecords[userId];
      ensureBankRecordShape(bank, bankRecords);
      bank.pending_claims.unshift({
        id: crypto.randomBytes(8).toString("hex"),
        granted_at: new Date().toISOString(),
        granted_by: session.user.global_name || session.user.username,
        item_id: item.id,
        name: item.name,
        description: item.description,
        image: item.image,
        price: Number(item.price || 0),
        category: item.category || "vehiculos",
      });
      bank.pending_claims = bank.pending_claims.slice(0, 60);
      writeBankRecords(bankRecords);

      pushNotification(userId, {
        kind: "grant",
        title: "Entrega disponible",
        message: `Tienes un articulo pendiente por reclamar en la tienda: ${item.name}.`,
      });

      sendJson(response, 200, {
        ok: true,
        target: {
          user_id: userId,
          name: `${identity.nombres} ${identity.apellidos}`.trim(),
        },
        item,
      });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/admin/bank/grant-all" && request.method === "POST") {
    const session = getAdminSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const amount = Number(incoming.amount);
      const reason = String(incoming.reason || "").trim() || "Abono administrativo masivo";
      if (!Number.isFinite(amount) || amount <= 0) {
        sendJson(response, 400, { error: "invalid_bulk_amount" });
        return;
      }

      const identityRecords = readIdentityRecords();
      const bankRecords = readBankRecords();
      const entries = Object.entries(identityRecords);
      if (!entries.length) {
        sendJson(response, 400, { error: "no_registered_players" });
        return;
      }

      const actor = session.user.global_name || session.user.username;
      for (const [userId, identity] of entries) {
        if (!bankRecords[userId]) {
          bankRecords[userId] = createDefaultBankRecord(userId, bankRecords);
        }
        const bank = bankRecords[userId];
        ensureBankRecordShape(bank, bankRecords);
        bank.balance = Number(bank.balance || 0) + amount;
        pushTransaction(bank, {
          type: "administrative_adjustment",
          direction: "in",
          amount,
          title: "Ajuste administrativo",
          description: `${reason}. Aplicado por ${actor}.`,
        });
        pushNotification(userId, {
          kind: "admin",
          title: "Abono administrativo",
          message: `Recibiste ${formatMoneyCL(amount)}. Motivo: ${reason}.`,
        });
      }

      writeBankRecords(bankRecords);
      sendJson(response, 200, {
        ok: true,
        affected: entries.length,
        amount,
        reason,
      });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/admin/stats" && request.method === "POST") {
    const session = getAdminSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const nextStats = {
        discord_members: Number(incoming.discord_members) || 0,
        server_staff: Number(incoming.server_staff) || 20,
        server_status: String(incoming.server_status || "Cerrado").trim() || "Cerrado",
        general_status: String(incoming.general_status || "En linea").trim() || "En linea",
        updated_at: String(incoming.updated_at || new Date().toLocaleString("es-CL")).trim(),
      };

      writeStats(nextStats);
      sendJson(response, 200, { ok: true, stats: nextStats });
    } catch (error) {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/bot/stats" && request.method === "POST") {
    if (!STATS_TOKEN) {
      sendJson(response, 500, { error: "stats_token_missing" });
      return;
    }
    const token = String(request.headers["x-stats-token"] || "").trim();
    if (!token || token !== STATS_TOKEN) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const payload = JSON.parse(rawBody || "{}");
      const stats = readStats();
      const nextStats = {
        ...stats,
        discord_members: Number(payload.discord_members ?? stats.discord_members ?? 0),
        server_staff: Number(payload.server_staff ?? stats.server_staff ?? 0),
        server_status: String(payload.server_status ?? stats.server_status ?? "").trim() || "Cerrado",
        general_status: String(payload.general_status ?? stats.general_status ?? "").trim() || "En linea",
        updated_at: String(payload.updated_at ?? stats.updated_at ?? "").trim() || new Date().toLocaleString("es-CL"),
      };

      writeStats(nextStats);
      sendJson(response, 200, { ok: true, stats: nextStats });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/admin/announcements" && request.method === "POST") {
    const session = getAdminSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const title = String(incoming.title || "").trim();
      const message = String(incoming.message || "").trim();
      const kind = String(incoming.kind || "announcement").trim() || "announcement";
      if (!title || !message) {
        sendJson(response, 400, { error: "invalid_announcement" });
        return;
      }

      const announcements = readAnnouncements();
      const nextAnnouncements = kind === "emergency_alert"
        ? announcements.filter((item) => (item.kind || "announcement") !== "emergency_alert")
        : announcements;
      nextAnnouncements.unshift({
        id: crypto.randomBytes(8).toString("hex"),
        kind,
        title,
        message,
        created_at: new Date().toISOString(),
      });
      writeAnnouncements(nextAnnouncements.slice(0, 50));
      sendJson(response, 200, { ok: true, announcements: nextAnnouncements.slice(0, 50) });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/admin/identities" && request.method === "GET") {
    const session = getAdminSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    const identities = Object.values(readIdentityRecords());
    sendJson(response, 200, { identities });
    return;
  }

  if (url.pathname === "/api/admin/identity/update" && request.method === "POST") {
    const session = getAdminSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const records = readIdentityRecords();
      const entry = findIdentityEntry(records, incoming.identifier);

      if (!entry) {
        sendJson(response, 404, { error: "identity_not_found" });
        return;
      }

      const [userId, identity] = entry;
      const allowedFields = ["nombres", "apellidos", "birth_date", "sex", "nationality", "rut"];
      for (const field of allowedFields) {
        if (typeof incoming[field] === "string" && incoming[field].trim()) {
          identity[field] = incoming[field].trim();
        }
      }

      records[userId] = identity;
      writeIdentityRecords(records);
      sendJson(response, 200, { ok: true, identity });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/admin/identity/delete" && request.method === "POST") {
    const session = getAdminSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const identityRecords = readIdentityRecords();
      const bankRecords = readBankRecords();
      const entry = findIdentityEntry(identityRecords, incoming.identifier);

      if (!entry) {
        sendJson(response, 404, { error: "identity_not_found" });
        return;
      }

      const [userId] = entry;
      delete identityRecords[userId];
      delete bankRecords[userId];
      writeIdentityRecords(identityRecords);
      writeBankRecords(bankRecords);
      sendJson(response, 200, { ok: true });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/admin/bank/update-balance" && request.method === "POST") {
    const session = getAdminSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const amount = Number(incoming.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        sendJson(response, 400, { error: "invalid_amount" });
        return;
      }

      const identityRecords = readIdentityRecords();
      const bankRecords = readBankRecords();
      const entry = findIdentityEntry(identityRecords, incoming.identifier);
      if (!entry) {
        sendJson(response, 404, { error: "identity_not_found" });
        return;
      }

      const [userId, identity] = entry;
      if (!bankRecords[userId]) {
        sendJson(response, 404, { error: "bank_not_found" });
        return;
      }

      ensureBankRecordShape(bankRecords[userId], bankRecords);

      let appliedAmount = amount;
      if (incoming.mode === "remove") {
        const currentBalance = Number(bankRecords[userId].balance || 0);
        appliedAmount = Math.min(currentBalance, amount);
        bankRecords[userId].balance = Math.max(0, currentBalance - amount);
      } else {
        bankRecords[userId].balance = Number(bankRecords[userId].balance || 0) + amount;
      }

      pushTransaction(bankRecords[userId], {
        type: "admin_adjustment",
        direction: incoming.mode === "remove" ? "out" : "in",
        amount: appliedAmount,
        title: "Ajuste administrativo",
        description: `${incoming.mode === "remove" ? "Descuento" : "Abono"} realizado desde panel administrativo.`,
      });

      writeBankRecords(bankRecords);
      sendJson(response, 200, { ok: true, identity, bank: serializeBank(bankRecords[userId]) });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/admin/logout" && request.method === "POST") {
    const cookies = parseCookies(request);
    if (cookies.vcrp_admin_session) {
      ADMIN_SESSIONS.delete(cookies.vcrp_admin_session);
    }
    clearCookie(response, "vcrp_admin_session");
    sendJson(response, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/admin/store/items" && request.method === "POST") {
    const session = getAdminSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const name = String(incoming.name || "").trim();
      const description = String(incoming.description || "").trim();
      const price = Number(incoming.price);
      const image = normalizeItemImage(incoming.image, "");

      if (!name || !description || !Number.isFinite(price) || price < 0 || !image) {
        sendJson(response, 400, { error: "invalid_item" });
        return;
      }

      const items = readStoreItems();
      const item = {
        id: crypto.randomBytes(8).toString("hex"),
        name,
        description,
        price,
        image,
        category: String(incoming.category || "vehiculos").trim().toLowerCase() || "vehiculos",
        created_at: new Date().toISOString(),
      };

      items.unshift(item);
      writeStoreItems(items);
      sendJson(response, 200, { ok: true, item, items });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/admin/store/items" && request.method === "GET") {
    const session = getAdminSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    sendJson(response, 200, { items: readStoreItems() });
    return;
  }

  if (url.pathname === "/api/admin/store/upload-image" && request.method === "POST") {
    const session = getAdminSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const imagePath = saveStoreUpload(incoming.filename, incoming.data_url);
      sendJson(response, 200, { ok: true, path: imagePath });
    } catch (error) {
      sendJson(response, 400, { error: error?.message || "invalid_image" });
    }
    return;
  }

  if (url.pathname === "/api/admin/store/items/update" && request.method === "POST") {
    const session = getAdminSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const itemId = String(incoming.id || "").trim();
      const name = String(incoming.name || "").trim();
      const description = String(incoming.description || "").trim();
      const price = Number(incoming.price);
      const image = normalizeItemImage(incoming.image, "");
      const category = String(incoming.category || "vehiculos").trim().toLowerCase() || "vehiculos";

      if (!itemId || !name || !description || !Number.isFinite(price) || price < 0 || !image) {
        sendJson(response, 400, { error: "invalid_item" });
        return;
      }

      const items = readStoreItems();
      const itemIndex = items.findIndex((item) => item.id === itemId);
      if (itemIndex === -1) {
        sendJson(response, 404, { error: "item_not_found" });
        return;
      }

      items[itemIndex] = {
        ...items[itemIndex],
        name,
        description,
        price,
        image,
        category,
      };

      writeStoreItems(items);
      sendJson(response, 200, { ok: true, item: items[itemIndex], items });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/admin/store/items/reorder" && request.method === "POST") {
    const session = getAdminSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const itemId = String(incoming.id || "").trim();
      const direction = String(incoming.direction || "").trim().toLowerCase();
      if (!itemId || !["up", "down"].includes(direction)) {
        sendJson(response, 400, { error: "invalid_reorder" });
        return;
      }

      const items = readStoreItems();
      const itemIndex = items.findIndex((item) => item.id === itemId);
      if (itemIndex === -1) {
        sendJson(response, 404, { error: "item_not_found" });
        return;
      }

      const targetIndex = direction === "up" ? itemIndex - 1 : itemIndex + 1;
      if (targetIndex < 0 || targetIndex >= items.length) {
        sendJson(response, 200, { ok: true, items });
        return;
      }

      const reordered = [...items];
      const [movedItem] = reordered.splice(itemIndex, 1);
      reordered.splice(targetIndex, 0, movedItem);
      writeStoreItems(reordered);
      sendJson(response, 200, { ok: true, items: reordered });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/admin/store/import" && request.method === "POST") {
    const session = getAdminSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const importedItems = parseBulkStoreLines(incoming.raw);
      const items = readStoreItems();
      const merged = [...importedItems, ...items];
      writeStoreItems(merged);
      sendJson(response, 200, { ok: true, count: importedItems.length, items: merged });
    } catch (error) {
      sendJson(response, 400, { error: error?.message || "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/admin/store/items/delete" && request.method === "POST") {
    const session = getAdminSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const itemId = String(incoming.id || "").trim();
      if (!itemId) {
        sendJson(response, 400, { error: "invalid_item" });
        return;
      }

      const items = readStoreItems();
      const nextItems = items.filter((item) => item.id !== itemId);
      if (nextItems.length === items.length) {
        sendJson(response, 404, { error: "item_not_found" });
        return;
      }

      writeStoreItems(nextItems);
      sendJson(response, 200, { ok: true, items: nextItems });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/admin/salaries" && request.method === "POST") {
    const session = getAdminSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const roleId = String(incoming.role_id || "").trim();
      const roleName = String(incoming.role_name || "").trim();
      const rank = String(incoming.rank || roleName || "Cargo personalizado").trim();
      const amount = Number(incoming.amount);

      if (!roleId || !Number.isFinite(amount) || amount <= 0) {
        sendJson(response, 400, { error: "invalid_salary_override" });
        return;
      }

      const items = readSalaryRoleOverrides();
      const nextItem = {
        role_id: roleId,
        role_name: roleName,
        rank,
        base: Math.round(amount),
        updated_at: new Date().toISOString(),
      };
      const existingIndex = items.findIndex((item) => String(item.role_id || "").trim() === roleId);
      if (existingIndex >= 0) {
        items[existingIndex] = {
          ...items[existingIndex],
          ...nextItem,
        };
      } else {
        items.unshift(nextItem);
      }
      writeSalaryRoleOverrides(items);
      sendJson(response, 200, { ok: true, items });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/admin/salaries/delete" && request.method === "POST") {
    const session = getAdminSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const roleId = String(incoming.role_id || "").trim();
      if (!roleId) {
        sendJson(response, 400, { error: "invalid_salary_override" });
        return;
      }

      const items = readSalaryRoleOverrides();
      const nextItems = items.filter((item) => String(item.role_id || "").trim() !== roleId);
      writeSalaryRoleOverrides(nextItems);
      sendJson(response, 200, { ok: true, items: nextItems });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/portal/session" && request.method === "GET") {
    const session = getUserSession(request);
    if (!session) {
      sendJson(response, 401, { authenticated: false });
      return;
    }

    const identities = readIdentityRecords();
    const identity = identities[session.user.id] || null;

    sendJson(response, 200, {
      authenticated: true,
      user: session.user,
      identity,
      permissions: session.user.permissions || {},
      notifications: listNotificationsForUser(session.user.id, session.user.permissions || {}),
    });
    return;
  }

  if (url.pathname === "/api/kame/dashboard" && request.method === "GET") {
    const session = getUserSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    const identities = readIdentityRecords();
    const bankRecords = readBankRecords();
    const requests = readKameRequests();
    const fleet = hydrateKameFleetImages(readKameFleet());
    const identity = identities[session.user.id] || null;
    const bank = bankRecords[session.user.id] || null;
    const vehicles = Array.isArray(bank?.inventory)
      ? bank.inventory
          .filter((item) => (item.category || "vehiculos") === "vehiculos")
          .map((item) => ({
            inventory_id: item.id,
            name: item.name,
            plate: item.vehicle_record?.plate || "",
            color: item.vehicle_record?.color || "",
            registered: Boolean(item.vehicle_record?.registered),
            technical_review_due_at: item.vehicle_record?.technical_review_due_at || null,
          }))
      : [];

    sendJson(response, 200, {
      identity,
      permissions: session.user.permissions || {},
      vehicles,
      fleet,
      my_requests: requests.filter((item) => item.user_id === session.user.id),
      employee_requests: canAccessKame(session) ? requests : [],
    });
    return;
  }

  if (url.pathname === "/api/kame/request" && request.method === "POST") {
    const session = getUserSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const category = String(incoming.category || "").trim();
      const serviceType = String(incoming.service_type || "").trim();
      const preferredDate = String(incoming.preferred_date || "").trim();
      const note = String(incoming.note || "").trim();
      const plate = String(incoming.plate || "").trim();
      const rentalModel = String(incoming.rental_model || "").trim();
      const fleet = hydrateKameFleetImages(readKameFleet());

      if (!category || !serviceType || !preferredDate) {
        sendJson(response, 400, { error: "invalid_request" });
        return;
      }

      const identities = readIdentityRecords();
      const identity = identities[session.user.id];
      if (!identity) {
        sendJson(response, 400, { error: "identity_required" });
        return;
      }

      const bankRecords = readBankRecords();
      const bank = bankRecords[session.user.id] || null;
      let linkedVehicle = null;
      if (category !== "rental") {
        if (!bank) {
          sendJson(response, 404, { error: "bank_not_found" });
          return;
        }
        linkedVehicle = findOwnedVehicleByPlate(bank, plate);
        if (!linkedVehicle) {
          sendJson(response, 404, { error: "vehicle_not_found" });
          return;
        }
      } else if (!fleet.some((item) => String(item.name || "").trim().toLowerCase() === rentalModel.toLowerCase())) {
        sendJson(response, 404, { error: "rental_not_found" });
        return;
      }

      const requests = readKameRequests();
      const item = {
        id: crypto.randomBytes(8).toString("hex"),
        user_id: session.user.id,
        owner_name: `${identity.nombres} ${identity.apellidos}`.trim(),
        owner_rut: identity.rut,
        category,
        service_type: serviceType,
        preferred_date: preferredDate,
        note,
        plate: linkedVehicle?.vehicle_record?.plate || (category === "rental" ? "" : normalizeVehiclePlate(plate)),
        vehicle_name: linkedVehicle?.name || "",
        rental_model: rentalModel,
        status: "pending",
        created_at: new Date().toISOString(),
        staff_note: "",
        scheduled_for: "",
      };
      requests.unshift(item);
      writeKameRequests(requests);

      pushNotification(session.user.id, {
        kind: "kame",
        title: "Solicitud enviada a Kame Motors",
        message: `Tu solicitud de ${serviceType.replace(/_/g, " ")} fue enviada correctamente.`,
      });

      sendJson(response, 200, { ok: true, request: item, my_requests: requests.filter((entry) => entry.user_id === session.user.id) });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/kame/request/update" && request.method === "POST") {
    const session = getUserSession(request);
    if (!canAccessKame(session)) {
      sendJson(response, 403, { error: "forbidden" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const requestId = String(incoming.request_id || "").trim();
      const status = String(incoming.status || "").trim();
      const staffNote = String(incoming.staff_note || "").trim();
      const scheduledFor = String(incoming.scheduled_for || "").trim();
      if (!requestId || !status) {
        sendJson(response, 400, { error: "invalid_update" });
        return;
      }

      const requests = readKameRequests();
      const item = requests.find((entry) => entry.id === requestId);
      if (!item) {
        sendJson(response, 404, { error: "request_not_found" });
        return;
      }

      item.status = status;
      item.staff_note = staffNote;
      item.scheduled_for = scheduledFor;
      item.updated_at = new Date().toISOString();
      item.handled_by = session.user.global_name || session.user.username;
      writeKameRequests(requests);

      const statusMap = {
        accepted: "aceptada",
        rejected: "rechazada",
        scheduled: "agendada",
        completed: "completada",
      };
      pushNotification(item.user_id, {
        kind: "kame",
        title: "Actualizacion de Kame Motors",
        message: `Tu solicitud fue ${statusMap[status] || status}.`,
      });

      sendJson(response, 200, { ok: true, employee_requests: requests });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/kame/fleet" && request.method === "POST") {
    const session = getUserSession(request);
    if (!canAccessKame(session)) {
      sendJson(response, 403, { error: "forbidden" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const action = String(incoming.action || "").trim();
      const fleet = hydrateKameFleetImages(readKameFleet());

      if (action === "add") {
        const name = String(incoming.name || "").trim();
        const type = String(incoming.type || "").trim();
        const description = String(incoming.description || "").trim();
        const image = String(incoming.image || "").trim();
        if (!name || !type || !description) {
          sendJson(response, 400, { error: "invalid_fleet_item" });
          return;
        }
        fleet.unshift({
          id: crypto.randomBytes(8).toString("hex"),
          name,
          type,
          description,
          image,
        });
        writeKameFleet(fleet);
        sendJson(response, 200, { ok: true, fleet: hydrateKameFleetImages(fleet) });
        return;
      }

      if (action === "remove") {
        const fleetId = String(incoming.fleet_id || "").trim();
        const nextFleet = fleet.filter((item) => item.id !== fleetId);
        writeKameFleet(nextFleet);
        sendJson(response, 200, { ok: true, fleet: hydrateKameFleetImages(nextFleet) });
        return;
      }

      sendJson(response, 400, { error: "invalid_action" });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/portal/notifications/read-all" && request.method === "POST") {
    const session = getUserSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    markNotificationsRead(session.user.id);
    sendJson(response, 200, { ok: true, notifications: listNotificationsForUser(session.user.id, session.user.permissions || {}) });
    return;
  }

  if (url.pathname === "/api/municipality/records" && request.method === "GET") {
    const session = getUserSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    const policeRecords = readPoliceRecords();
    const record = getPoliceRecord(policeRecords, session.user.id);
    const bankRecords = readBankRecords();
    const bank = bankRecords[session.user.id] || null;
    const impoundedVehicles = Array.isArray(bank?.inventory)
      ? bank.inventory
          .filter((item) => item.impounded?.active)
          .map((item) => ({
            inventory_id: item.id,
            name: item.name,
            image: item.image,
            plate: item.vehicle_record?.plate || "Sin patente",
            reason: item.impounded?.reason || "Sin detalle",
            impounded_at: item.impounded?.created_at || null,
            release_fee: Math.max(85000, Math.round(Number(item.price || 0) * 0.02)),
          }))
      : [];
    writePoliceRecords(policeRecords);
    sendJson(response, 200, {
      fines: record.fines || [],
      backgrounds: record.backgrounds || [],
      impounded_vehicles: impoundedVehicles,
    });
    return;
  }

  if (url.pathname === "/api/municipality/fines/pay" && request.method === "POST") {
    const session = getUserSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const fineId = String(incoming.fine_id || "").trim();
      if (!fineId) {
        sendJson(response, 400, { error: "invalid_fine" });
        return;
      }

      const bankRecords = readBankRecords();
      const policeRecords = readPoliceRecords();
      const bank = bankRecords[session.user.id];
      const record = getPoliceRecord(policeRecords, session.user.id);
      if (!bank) {
        sendJson(response, 404, { error: "bank_not_found" });
        return;
      }

      ensureBankRecordShape(bank, bankRecords);
      const fine = (record.fines || []).find((item) => item.id === fineId);
      if (!fine) {
        sendJson(response, 404, { error: "fine_not_found" });
        return;
      }
      if (fine.paid) {
        sendJson(response, 400, { error: "already_paid" });
        return;
      }
      if (Number(bank.balance || 0) < Number(fine.amount || 0)) {
        sendJson(response, 400, { error: "insufficient_funds" });
        return;
      }

      bank.balance = Number(bank.balance || 0) - Number(fine.amount || 0);
      fine.paid = true;
      fine.paid_at = new Date().toISOString();
      pushTransaction(bank, {
        type: "municipality_fine_payment",
        direction: "out",
        amount: fine.amount,
        title: "Pago de multa municipal",
        description: `Pago realizado por multa: ${fine.reason}.`,
      });
      writeBankRecords(bankRecords);
      writePoliceRecords(policeRecords);
      sendJson(response, 200, {
        ok: true,
        fines: record.fines || [],
        backgrounds: record.backgrounds || [],
        bank: serializeBank(bank),
      });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/municipality/impound/pay" && request.method === "POST") {
    const session = getUserSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const inventoryId = String(incoming.inventory_id || "").trim();
      if (!inventoryId) {
        sendJson(response, 400, { error: "invalid_vehicle" });
        return;
      }

      const bankRecords = readBankRecords();
      const bank = bankRecords[session.user.id];
      if (!bank) {
        sendJson(response, 404, { error: "bank_not_found" });
        return;
      }

      ensureBankRecordShape(bank, bankRecords);
      const item = bank.inventory.find((entry) => entry.id === inventoryId);
      if (!item) {
        sendJson(response, 404, { error: "vehicle_not_found" });
        return;
      }
      if (!item.impounded?.active) {
        sendJson(response, 400, { error: "vehicle_not_impounded" });
        return;
      }

      const releaseFee = Math.max(85000, Math.round(Number(item.price || 0) * 0.02));
      if (Number(bank.balance || 0) < releaseFee) {
        sendJson(response, 400, { error: "insufficient_funds" });
        return;
      }

      bank.balance = Number(bank.balance || 0) - releaseFee;
      item.impounded = {
        ...item.impounded,
        active: false,
        released_at: new Date().toISOString(),
      };
      pushTransaction(bank, {
        type: "municipality_impound_release",
        direction: "out",
        amount: releaseFee,
        title: "Salida de corrales",
        description: `Retiro de corrales para ${item.name}.`,
      });
      writeBankRecords(bankRecords);

      const policeRecords = readPoliceRecords();
      const record = getPoliceRecord(policeRecords, session.user.id);
      const impoundedVehicles = Array.isArray(bank.inventory)
        ? bank.inventory
            .filter((entry) => entry.impounded?.active)
            .map((entry) => ({
              inventory_id: entry.id,
              name: entry.name,
              image: entry.image,
              plate: entry.vehicle_record?.plate || "Sin patente",
              reason: entry.impounded?.reason || "Sin detalle",
              impounded_at: entry.impounded?.created_at || null,
              release_fee: Math.max(85000, Math.round(Number(entry.price || 0) * 0.02)),
            }))
        : [];

      sendJson(response, 200, {
        ok: true,
        bank: serializeBank(bank),
        fines: record.fines || [],
        backgrounds: record.backgrounds || [],
        impounded_vehicles: impoundedVehicles,
      });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/staff/search/person" && request.method === "GET") {
    const session = getUserSession(request);
    if (!canAccessStaff(session)) {
      sendJson(response, 403, { error: "forbidden" });
      return;
    }

    const identifier = String(url.searchParams.get("identifier") || "").trim();
    if (!identifier) {
      sendJson(response, 400, { error: "invalid_identifier" });
      return;
    }

    const identityRecords = readIdentityRecords();
    const bankRecords = readBankRecords();
    const policeRecords = readPoliceRecords();
    const entry = findIdentityEntry(identityRecords, identifier);
    if (!entry) {
      sendJson(response, 404, { error: "person_not_found" });
      return;
    }

    const [userId, identity] = entry;
    const bank = bankRecords[userId] || null;
    const police = getPoliceRecord(policeRecords, userId);
    writePoliceRecords(policeRecords);
    sendJson(response, 200, {
      person: serializePolicePerson(userId, identity, bank, police),
    });
    return;
  }

  if (url.pathname === "/api/staff/search/vehicle" && request.method === "GET") {
    const session = getUserSession(request);
    if (!canAccessStaff(session)) {
      sendJson(response, 403, { error: "forbidden" });
      return;
    }

    const plate = String(url.searchParams.get("plate") || "").trim();
    if (!plate) {
      sendJson(response, 400, { error: "invalid_plate" });
      return;
    }

    const identityRecords = readIdentityRecords();
    const bankRecords = readBankRecords();
    const match = findVehicleByPlate(bankRecords, identityRecords, plate);
    if (!match) {
      sendJson(response, 404, { error: "vehicle_not_found" });
      return;
    }

    const circulationDue = match.vehicle.circulation_valid_until ? new Date(match.vehicle.circulation_valid_until).getTime() : 0;
    const reviewDue = match.vehicle.technical_review_due_at ? new Date(match.vehicle.technical_review_due_at).getTime() : 0;
    sendJson(response, 200, {
      vehicle: {
        owner_user_id: match.owner_user_id,
        owner_name: match.owner_name,
        owner_identity: match.owner_identity,
        item_name: match.item.name,
        plate: match.vehicle.plate,
        color: match.vehicle.color || "",
        registration_number: match.vehicle.registration_number,
        circulation_valid_until: match.vehicle.circulation_valid_until,
        technical_review_due_at: match.vehicle.technical_review_due_at,
        registered: match.vehicle.registered,
        circulation_up_to_date: Boolean(circulationDue && circulationDue > Date.now()),
        technical_review_up_to_date: Boolean(reviewDue && reviewDue > Date.now()),
        impounded: match.item.impounded || null,
      },
    });
    return;
  }

  if (url.pathname === "/api/police/search/person" && request.method === "GET") {
    const session = getUserSession(request);
    if (!canAccessPolice(session)) {
      sendJson(response, 403, { error: "forbidden" });
      return;
    }

    const identifier = String(url.searchParams.get("identifier") || "").trim();
    if (!identifier) {
      sendJson(response, 400, { error: "invalid_identifier" });
      return;
    }

    const identityRecords = readIdentityRecords();
    const bankRecords = readBankRecords();
    const policeRecords = readPoliceRecords();
    const entry = findIdentityEntry(identityRecords, identifier);
    if (!entry) {
      sendJson(response, 404, { error: "person_not_found" });
      return;
    }

    const [userId, identity] = entry;
    const bank = bankRecords[userId] || null;
    const police = getPoliceRecord(policeRecords, userId);
    writePoliceRecords(policeRecords);
    sendJson(response, 200, {
      person: serializePolicePerson(userId, identity, bank, police),
    });
    return;
  }

  if (url.pathname === "/api/police/search/vehicle" && request.method === "GET") {
    const session = getUserSession(request);
    if (!canAccessPolice(session)) {
      sendJson(response, 403, { error: "forbidden" });
      return;
    }

    const plate = String(url.searchParams.get("plate") || "").trim();
    if (!plate) {
      sendJson(response, 400, { error: "invalid_plate" });
      return;
    }

    const identityRecords = readIdentityRecords();
    const bankRecords = readBankRecords();
    const match = findVehicleByPlate(bankRecords, identityRecords, plate);
    if (!match) {
      sendJson(response, 404, { error: "vehicle_not_found" });
      return;
    }

    sendJson(response, 200, {
      vehicle: {
        owner_user_id: match.owner_user_id,
        owner_name: match.owner_name,
        owner_identity: match.owner_identity,
        item_name: match.item.name,
        plate: match.vehicle.plate,
        registration_number: match.vehicle.registration_number,
        circulation_valid_until: match.vehicle.circulation_valid_until,
        technical_review_due_at: match.vehicle.technical_review_due_at,
        registered: match.vehicle.registered,
        impounded: match.item.impounded || null,
      },
    });
    return;
  }

  if (url.pathname === "/api/police/fines" && request.method === "POST") {
    const session = getUserSession(request);
    if (!canAccessPolice(session)) {
      sendJson(response, 403, { error: "forbidden" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const identifier = String(incoming.identifier || "").trim();
      const reason = String(incoming.reason || "").trim();
      const amount = Number(incoming.amount);
      if (!identifier || !reason || !Number.isFinite(amount) || amount <= 0) {
        sendJson(response, 400, { error: "invalid_fine" });
        return;
      }

      const identityRecords = readIdentityRecords();
      const policeRecords = readPoliceRecords();
      const entry = findIdentityEntry(identityRecords, identifier);
      if (!entry) {
        sendJson(response, 404, { error: "person_not_found" });
        return;
      }

      const [userId] = entry;
      const record = getPoliceRecord(policeRecords, userId);
      record.fines.unshift({
        id: crypto.randomBytes(8).toString("hex"),
        amount,
        reason,
        paid: false,
        created_at: new Date().toISOString(),
        officer: session.user.global_name || session.user.username,
      });
      writePoliceRecords(policeRecords);
      pushNotification(userId, {
        kind: "police",
        title: "Multa registrada",
        message: `Se registro una multa por ${formatMoneyCL(amount)}. Motivo: ${reason}.`,
      });
      sendJson(response, 200, { ok: true, fines: record.fines });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/police/backgrounds" && request.method === "POST") {
    const session = getUserSession(request);
    if (!canAccessPolice(session)) {
      sendJson(response, 403, { error: "forbidden" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const identifier = String(incoming.identifier || "").trim();
      const reason = String(incoming.reason || "").trim();
      if (!identifier || !reason) {
        sendJson(response, 400, { error: "invalid_background" });
        return;
      }

      const identityRecords = readIdentityRecords();
      const policeRecords = readPoliceRecords();
      const entry = findIdentityEntry(identityRecords, identifier);
      if (!entry) {
        sendJson(response, 404, { error: "person_not_found" });
        return;
      }

      const [userId] = entry;
      const record = getPoliceRecord(policeRecords, userId);
      record.backgrounds.unshift({
        id: crypto.randomBytes(8).toString("hex"),
        reason,
        created_at: new Date().toISOString(),
        officer: session.user.global_name || session.user.username,
      });
      writePoliceRecords(policeRecords);
      pushNotification(userId, {
        kind: "police",
        title: "Antecedente agregado",
        message: `Se agrego un antecedente policial: ${reason}.`,
      });
      sendJson(response, 200, { ok: true, backgrounds: record.backgrounds });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/police/wanted" && request.method === "POST") {
    const session = getUserSession(request);
    if (!canAccessPolice(session)) {
      sendJson(response, 403, { error: "forbidden" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const identifier = String(incoming.identifier || "").trim();
      const reason = String(incoming.reason || "").trim();
      if (!identifier || !reason) {
        sendJson(response, 400, { error: "invalid_wanted_order" });
        return;
      }

      const identityRecords = readIdentityRecords();
      const policeRecords = readPoliceRecords();
      const entry = findIdentityEntry(identityRecords, identifier);
      if (!entry) {
        sendJson(response, 404, { error: "person_not_found" });
        return;
      }

      const [userId] = entry;
      const record = getPoliceRecord(policeRecords, userId);
      record.wanted_orders.unshift({
        id: crypto.randomBytes(8).toString("hex"),
        reason,
        active: true,
        created_at: new Date().toISOString(),
        officer: session.user.global_name || session.user.username,
      });
      writePoliceRecords(policeRecords);
      sendJson(response, 200, { ok: true, wanted_orders: record.wanted_orders });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/police/wanted/close" && request.method === "POST") {
    const session = getUserSession(request);
    if (!canAccessPolice(session)) {
      sendJson(response, 403, { error: "forbidden" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const identifier = String(incoming.identifier || "").trim();
      const orderId = String(incoming.order_id || "").trim();
      if (!identifier || !orderId) {
        sendJson(response, 400, { error: "invalid_wanted_close" });
        return;
      }

      const identityRecords = readIdentityRecords();
      const policeRecords = readPoliceRecords();
      const entry = findIdentityEntry(identityRecords, identifier);
      if (!entry) {
        sendJson(response, 404, { error: "person_not_found" });
        return;
      }

      const [userId] = entry;
      const record = getPoliceRecord(policeRecords, userId);
      const order = (record.wanted_orders || []).find((item) => item.id === orderId && item.active !== false);
      if (!order) {
        sendJson(response, 404, { error: "wanted_not_found" });
        return;
      }

      order.active = false;
      order.closed_at = new Date().toISOString();
      order.closed_by = session.user.global_name || session.user.username;
      writePoliceRecords(policeRecords);
      sendJson(response, 200, { ok: true, wanted_orders: record.wanted_orders.filter((item) => item.active !== false) });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/police/impound" && request.method === "POST") {
    const session = getUserSession(request);
    if (!canAccessPolice(session)) {
      sendJson(response, 403, { error: "forbidden" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const plate = String(incoming.plate || "").trim();
      const reason = String(incoming.reason || "").trim();
      if (!plate || !reason) {
        sendJson(response, 400, { error: "invalid_impound" });
        return;
      }

      const identityRecords = readIdentityRecords();
      const bankRecords = readBankRecords();
      const match = findVehicleByPlate(bankRecords, identityRecords, plate);
      if (!match) {
        sendJson(response, 404, { error: "vehicle_not_found" });
        return;
      }

      match.item.impounded = {
        active: true,
        reason,
        created_at: new Date().toISOString(),
        officer: session.user.global_name || session.user.username,
      };
      writeBankRecords(bankRecords);
      pushNotification(match.owner_user_id, {
        kind: "police",
        title: "Vehiculo enviado a corrales",
        message: `Tu vehiculo patente ${match.vehicle.plate} fue enviado a corrales. Motivo: ${reason}.`,
      });
      sendJson(response, 200, { ok: true, vehicle: match.vehicle, item: match.item });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/police/impound/release" && request.method === "POST") {
    const session = getUserSession(request);
    if (!canAccessPolice(session)) {
      sendJson(response, 403, { error: "forbidden" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const plate = String(incoming.plate || "").trim();
      if (!plate) {
        sendJson(response, 400, { error: "invalid_release" });
        return;
      }

      const identityRecords = readIdentityRecords();
      const bankRecords = readBankRecords();
      const match = findVehicleByPlate(bankRecords, identityRecords, plate);
      if (!match) {
        sendJson(response, 404, { error: "vehicle_not_found" });
        return;
      }

      if (!match.item.impounded?.active) {
        sendJson(response, 400, { error: "vehicle_not_impounded" });
        return;
      }

      match.item.impounded = {
        ...match.item.impounded,
        active: false,
        released_at: new Date().toISOString(),
        released_by: session.user.global_name || session.user.username,
      };
      writeBankRecords(bankRecords);
      pushNotification(match.owner_user_id, {
        kind: "police",
        title: "Vehiculo liberado de corrales",
        message: `Tu vehiculo patente ${match.vehicle.plate} fue liberado de corrales.`,
      });
      sendJson(response, 200, { ok: true, vehicle: match.vehicle, item: match.item });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/service-hours" && request.method === "GET") {
    const session = getUserSession(request);
    const panel = String(url.searchParams.get("panel") || "").trim().toLowerCase();
    if (!canAccessShiftPanel(session, panel)) {
      sendJson(response, 403, { error: "forbidden" });
      return;
    }

    const records = readServiceHours();
    const record = getShiftRecord(records, session.user.id, panel);
    writeServiceHours(records);
    sendJson(response, 200, { panel, summary: summarizeShiftRecord(record) });
    return;
  }

  if (url.pathname === "/api/service-hours/start" && request.method === "POST") {
    const session = getUserSession(request);
    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const panel = String(incoming.panel || "").trim().toLowerCase();
      if (!canAccessShiftPanel(session, panel)) {
        sendJson(response, 403, { error: "forbidden" });
        return;
      }

      const records = readServiceHours();
      const record = getShiftRecord(records, session.user.id, panel);
      if (!record.active_shift) {
        record.active_shift = {
          id: crypto.randomBytes(8).toString("hex"),
          started_at: Date.now(),
        };
        writeServiceHours(records);
      }

      sendJson(response, 200, { ok: true, panel, summary: summarizeShiftRecord(record) });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/service-hours/stop" && request.method === "POST") {
    const session = getUserSession(request);
    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const panel = String(incoming.panel || "").trim().toLowerCase();
      if (!canAccessShiftPanel(session, panel)) {
        sendJson(response, 403, { error: "forbidden" });
        return;
      }

      const records = readServiceHours();
      const record = getShiftRecord(records, session.user.id, panel);
      if (record.active_shift?.started_at) {
        const startedAt = Number(record.active_shift.started_at);
        const finishedAt = Date.now();
        record.sessions.unshift({
          id: record.active_shift.id || crypto.randomBytes(8).toString("hex"),
          started_at: startedAt,
          ended_at: finishedAt,
          duration_ms: Math.max(0, finishedAt - startedAt),
        });
        record.sessions = record.sessions.slice(0, 50);
        record.active_shift = null;
        writeServiceHours(records);
      }

      sendJson(response, 200, { ok: true, panel, summary: summarizeShiftRecord(record) });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/police/admin/hours" && request.method === "GET") {
    const session = getUserSession(request);
    if (!canAccessPoliceHighCommand(session)) {
      sendJson(response, 403, { error: "forbidden" });
      return;
    }

    sendJson(response, 200, { items: buildPoliceHoursRanking() });
    return;
  }

  if (url.pathname === "/api/police/admin/hours/add" && request.method === "POST") {
    const session = getUserSession(request);
    if (!canAccessPoliceHighCommand(session)) {
      sendJson(response, 403, { error: "forbidden" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const identifier = String(incoming.identifier || "").trim();
      const hours = Number(incoming.hours || 0);
      const minutes = Number(incoming.minutes || 0);
      const note = String(incoming.note || "").trim();
      const durationMs = Math.max(0, (hours * 60 + minutes) * 60 * 1000);
      if (!identifier || !durationMs) {
        sendJson(response, 400, { error: "invalid_manual_hours" });
        return;
      }

      const identityRecords = readIdentityRecords();
      const entry = findIdentityEntry(identityRecords, identifier);
      if (!entry) {
        sendJson(response, 404, { error: "person_not_found" });
        return;
      }

      const [userId] = entry;
      const serviceHours = readServiceHours();
      const record = getShiftRecord(serviceHours, userId, "police");
      const endedAt = Date.now();
      record.sessions.unshift({
        id: crypto.randomBytes(8).toString("hex"),
        started_at: endedAt - durationMs,
        ended_at: endedAt,
        duration_ms: durationMs,
        source: "manual_admin",
        note,
        officer: session.user.global_name || session.user.username,
      });
      record.sessions = record.sessions.slice(0, 80);
      writeServiceHours(serviceHours);
      pushNotification(userId, {
        kind: "police",
        title: "Horas de servicio agregadas",
        message: `Se agregaron ${Math.floor(durationMs / 3600000)}h ${Math.floor((durationMs % 3600000) / 60000)}m a tu registro policial.`,
      });

      sendJson(response, 200, { ok: true, items: buildPoliceHoursRanking() });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/store/items" && request.method === "GET") {
    sendJson(response, 200, { items: readStoreItems() });
    return;
  }

  if (url.pathname === "/api/market/items" && request.method === "GET") {
    sendJson(response, 200, { items: readSecondhandMarket() });
    return;
  }

  if (url.pathname === "/api/market/delete" && request.method === "POST") {
    const session = getUserSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    if (!session.user.permissions?.canModerateMarket) {
      sendJson(response, 403, { error: "forbidden" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const marketId = String(incoming.market_id || "").trim();
      if (!marketId) {
        sendJson(response, 400, { error: "invalid_item" });
        return;
      }

      const marketItems = readSecondhandMarket();
      const nextItems = marketItems.filter((entry) => entry.id !== marketId);
      if (nextItems.length === marketItems.length) {
        sendJson(response, 404, { error: "item_not_found" });
        return;
      }

      writeSecondhandMarket(nextItems);
      sendJson(response, 200, { ok: true, items: nextItems });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/store/buy" && request.method === "POST") {
    const session = getUserSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const itemId = String(incoming.item_id || "").trim();
      if (!itemId) {
        sendJson(response, 400, { error: "invalid_item" });
        return;
      }

      const items = readStoreItems();
      const item = items.find((entry) => entry.id === itemId);
      if (!item) {
        sendJson(response, 404, { error: "item_not_found" });
        return;
      }

      const bankRecords = readBankRecords();
      const bank = bankRecords[session.user.id];
      if (!bank) {
        sendJson(response, 404, { error: "bank_not_found" });
        return;
      }

      ensureBankRecordShape(bank, bankRecords);
      const price = Number(item.price || 0);
      if (price <= 0) {
        sendJson(response, 400, { error: "price_pending" });
        return;
      }

      const isVehicle = (item.category || "vehiculos") === "vehiculos";
      const customColor = String(incoming.vehicle_color || "").trim();
      const customPlate = normalizeVehiclePlate(incoming.vehicle_plate || "");
      if (isVehicle) {
        if (!customColor) {
          sendJson(response, 400, { error: "vehicle_color_required" });
          return;
        }
        if (!customPlate) {
          sendJson(response, 400, { error: "invalid_plate_format" });
          return;
        }
        if (isPlateInUse(bankRecords, customPlate)) {
          sendJson(response, 400, { error: "plate_in_use" });
          return;
        }
      }

      if (Number(bank.balance || 0) < price) {
        sendJson(response, 400, { error: "insufficient_funds" });
        return;
      }

      bank.balance = Number(bank.balance || 0) - price;
      bank.inventory.push({
        id: crypto.randomBytes(8).toString("hex"),
        item_id: item.id,
        name: item.name,
        description: item.description,
        image: item.image,
        price,
        category: item.category || "vehiculos",
        vehicle_record: isVehicle ? createVehicleRecord(price, { color: customColor, plate: customPlate }) : null,
        purchased_at: new Date().toISOString(),
      });
      pushTransaction(bank, {
        type: "store_purchase",
        direction: "out",
        amount: price,
        title: "Compra en tienda",
        description: `Compra realizada: ${item.name}.`,
      });
      writeBankRecords(bankRecords);

      sendJson(response, 200, {
        ok: true,
        item,
        bank: serializeBank(bank),
      });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/store/claim" && request.method === "POST") {
    const session = getUserSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const claimId = String(incoming.claim_id || "").trim();
      if (!claimId) {
        sendJson(response, 400, { error: "invalid_claim" });
        return;
      }

      const bankRecords = readBankRecords();
      const bank = bankRecords[session.user.id];
      if (!bank) {
        sendJson(response, 404, { error: "bank_not_found" });
        return;
      }

      ensureBankRecordShape(bank, bankRecords);
      const claimIndex = bank.pending_claims.findIndex((entry) => entry.id === claimId);
      if (claimIndex === -1) {
        sendJson(response, 404, { error: "claim_not_found" });
        return;
      }

      const claim = bank.pending_claims[claimIndex];
      bank.pending_claims.splice(claimIndex, 1);
      bank.inventory.push({
        id: crypto.randomBytes(8).toString("hex"),
        item_id: claim.item_id,
        name: claim.name,
        description: claim.description,
        image: claim.image,
        price: Number(claim.price || 0),
        category: claim.category || "vehiculos",
        vehicle_record: (claim.category || "vehiculos") === "vehiculos" ? createVehicleRecord(Number(claim.price || 0)) : null,
        purchased_at: new Date().toISOString(),
        source: "admin_grant_claim",
      });
      writeBankRecords(bankRecords);

      sendJson(response, 200, {
        ok: true,
        claimed_item: {
          name: claim.name,
        },
        bank: serializeBank(bank),
      });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/market/buy" && request.method === "POST") {
    const session = getUserSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const marketId = String(incoming.market_id || "").trim();
      if (!marketId) {
        sendJson(response, 400, { error: "invalid_item" });
        return;
      }

      const marketItems = readSecondhandMarket();
      const marketIndex = marketItems.findIndex((entry) => entry.id === marketId);
      if (marketIndex === -1) {
        sendJson(response, 404, { error: "item_not_found" });
        return;
      }

      const listing = marketItems[marketIndex];
      if (listing.seller_id === session.user.id) {
        sendJson(response, 400, { error: "same_user" });
        return;
      }

      const bankRecords = readBankRecords();
      const buyerBank = bankRecords[session.user.id];
      const sellerBank = bankRecords[listing.seller_id];
      if (!buyerBank || !sellerBank) {
        sendJson(response, 404, { error: "bank_not_found" });
        return;
      }

      ensureBankRecordShape(buyerBank, bankRecords);
      ensureBankRecordShape(sellerBank, bankRecords);

      if (Number(buyerBank.balance || 0) < Number(listing.price || 0)) {
        sendJson(response, 400, { error: "insufficient_funds" });
        return;
      }

      buyerBank.balance = Number(buyerBank.balance || 0) - Number(listing.price || 0);
      sellerBank.balance = Number(sellerBank.balance || 0) + Number(listing.price || 0);
      buyerBank.inventory.push({
        id: crypto.randomBytes(8).toString("hex"),
        item_id: listing.id,
        name: listing.name,
        description: listing.description,
        image: listing.image,
        price: listing.price,
        category: listing.category || "vehiculos",
        vehicle_record: (listing.category || "vehiculos") === "vehiculos"
          ? (listing.vehicle_record ? JSON.parse(JSON.stringify(listing.vehicle_record)) : createVehicleRecord(listing.price))
          : null,
        purchased_at: new Date().toISOString(),
      });

      pushTransaction(buyerBank, {
        type: "market_purchase",
        direction: "out",
        amount: listing.price,
        title: "Compra en mercado 2da mano",
        description: `Compra realizada: ${listing.name}.`,
      });

      pushTransaction(sellerBank, {
        type: "market_sale",
        direction: "in",
        amount: listing.price,
        title: "Venta en mercado 2da mano",
        description: `Venta realizada: ${listing.name}.`,
      });

      marketItems.splice(marketIndex, 1);
      writeSecondhandMarket(marketItems);
      writeBankRecords(bankRecords);

      sendJson(response, 200, {
        ok: true,
        item: listing,
        bank: serializeBank(buyerBank),
      });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/market/list" && request.method === "POST") {
    const session = getUserSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const inventoryId = String(incoming.inventory_id || "").trim();
      const price = Number(incoming.price);
      if (!inventoryId || !Number.isFinite(price) || price <= 0) {
        sendJson(response, 400, { error: "invalid_item" });
        return;
      }

      const bankRecords = readBankRecords();
      const bank = bankRecords[session.user.id];
      if (!bank) {
        sendJson(response, 404, { error: "bank_not_found" });
        return;
      }

      ensureBankRecordShape(bank, bankRecords);
      const inventoryIndex = bank.inventory.findIndex((entry) => entry.id === inventoryId);
      if (inventoryIndex === -1) {
        sendJson(response, 404, { error: "item_not_found" });
        return;
      }

      const item = bank.inventory[inventoryIndex];
      bank.inventory.splice(inventoryIndex, 1);
      const marketItems = readSecondhandMarket();
      marketItems.unshift({
        id: crypto.randomBytes(8).toString("hex"),
        seller_id: session.user.id,
        seller_name: `${currentIdentityNameFromRecords(readIdentityRecords(), session.user.id)}`,
        inventory_ref: item.id,
        name: item.name,
        description: item.description,
        image: item.image,
        category: item.category || "vehiculos",
        price,
        vehicle_record: item.vehicle_record || null,
        listed_at: new Date().toISOString(),
      });
      pushTransaction(bank, {
        type: "market_listing",
        direction: "out",
        amount: 0,
        title: "Articulo publicado",
        description: `${item.name} fue publicado en mercado de 2da mano por ${formatMoneyCL(price)}.`,
      });
      writeBankRecords(bankRecords);
      writeSecondhandMarket(marketItems);

      sendJson(response, 200, {
        ok: true,
        item,
        listing_price: price,
        bank: serializeBank(bank),
      });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/vehicle/register" && request.method === "POST") {
    const session = getUserSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const inventoryId = String(incoming.inventory_id || "").trim();
      if (!inventoryId) {
        sendJson(response, 400, { error: "invalid_item" });
        return;
      }

      const bankRecords = readBankRecords();
      const bank = bankRecords[session.user.id];
      if (!bank) {
        sendJson(response, 404, { error: "bank_not_found" });
        return;
      }

      ensureBankRecordShape(bank, bankRecords);
      const inventoryItem = bank.inventory.find((entry) => entry.id === inventoryId);
      if (!inventoryItem) {
        sendJson(response, 404, { error: "item_not_found" });
        return;
      }

      if ((inventoryItem.category || "vehiculos") !== "vehiculos") {
        sendJson(response, 400, { error: "not_vehicle" });
        return;
      }

      if (!inventoryItem.vehicle_record) {
        inventoryItem.vehicle_record = createVehicleRecord(inventoryItem.price);
      }

      if (inventoryItem.vehicle_record.registered) {
        sendJson(response, 400, { error: "already_registered" });
        return;
      }

      const total = Number(inventoryItem.vehicle_record.total_fee || 0);
      if (Number(bank.balance || 0) < total) {
        sendJson(response, 400, { error: "insufficient_funds" });
        return;
      }

      const now = new Date();
      const circulationValidUntil = new Date(now);
      circulationValidUntil.setFullYear(circulationValidUntil.getFullYear() + 1);
      const technicalDue = new Date(now);
      technicalDue.setMonth(technicalDue.getMonth() + 6);

      bank.balance = Number(bank.balance || 0) - total;
      inventoryItem.vehicle_record.registered = true;
      inventoryItem.vehicle_record.registration_number = generateRegistrationNumber();
      const chosenPlate = normalizeVehiclePlate(inventoryItem.vehicle_record.plate);
      if (chosenPlate && isPlateInUse(bankRecords, chosenPlate, inventoryItem.id)) {
        sendJson(response, 400, { error: "plate_in_use" });
        return;
      }
      inventoryItem.vehicle_record.plate = chosenPlate || generatePlate();
      inventoryItem.vehicle_record.registered_at = now.toISOString();
      inventoryItem.vehicle_record.circulation_valid_until = circulationValidUntil.toISOString();
      inventoryItem.vehicle_record.technical_review_due_at = technicalDue.toISOString();
      inventoryItem.vehicle_record.technical_review_enabled = false;

      pushTransaction(bank, {
        type: "vehicle_registration",
        direction: "out",
        amount: total,
        title: "Inscripcion de vehiculo",
        description: `Inscripcion, patente y permiso de circulacion pagados para ${inventoryItem.name}.`,
      });

      writeBankRecords(bankRecords);
      sendJson(response, 200, {
        ok: true,
        item: inventoryItem,
        bank: serializeBank(bank),
      });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/casino/coinflip" && request.method === "POST") {
    const session = getUserSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const amount = Number(incoming.amount);
      const side = String(incoming.side || "").trim().toLowerCase();
      if (!Number.isFinite(amount) || amount <= 0 || !["cara", "sello"].includes(side)) {
        sendJson(response, 400, { error: "invalid_bet" });
        return;
      }

      const bankRecords = readBankRecords();
      const bank = bankRecords[session.user.id];
      if (!bank) {
        sendJson(response, 404, { error: "bank_not_found" });
        return;
      }
      ensureBankRecordShape(bank, bankRecords);

      if (Number(bank.casino_balance || 0) < amount) {
        sendJson(response, 400, { error: "insufficient_funds" });
        return;
      }

      bank.casino_balance = Number(bank.casino_balance || 0) - amount;

      const result = randomFloat() < 0.5 ? "cara" : "sello";
      const won = result === side;
      let payout = 0;

      if (won) {
        payout = amount * 2;
        bank.casino_balance = Number(bank.casino_balance || 0) + payout;
      }

      writeBankRecords(bankRecords);
      sendJson(response, 200, { ok: true, won, result, payout, bank: serializeBank(bank) });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/casino/slots" && request.method === "POST") {
    const session = getUserSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const amount = Number(incoming.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        sendJson(response, 400, { error: "invalid_bet" });
        return;
      }

      const bankRecords = readBankRecords();
      const bank = bankRecords[session.user.id];
      if (!bank) {
        sendJson(response, 404, { error: "bank_not_found" });
        return;
      }
      ensureBankRecordShape(bank, bankRecords);

      if (Number(bank.casino_balance || 0) < amount) {
        sendJson(response, 400, { error: "insufficient_funds" });
        return;
      }

      bank.casino_balance = Number(bank.casino_balance || 0) - amount;

      const symbols = ["cherry", "diamond", "seven", "clover", "star"];
      const spinTypeRoll = randomFloat();
      let reel = [];
      let multiplier = 0;

      if (spinTypeRoll < 0.16) {
        const repeated = randomChoice(symbols);
        const different = randomChoice(symbols.filter((item) => item !== repeated));
        reel = [repeated, repeated, different];
        multiplier = 1.6;
      } else if (spinTypeRoll < 0.24) {
        const repeated = randomChoice(symbols);
        reel = [repeated, repeated, repeated];
        multiplier = 4;
      } else {
        do {
          reel = [randomChoice(symbols), randomChoice(symbols), randomChoice(symbols)];
        } while (new Set(reel).size < 3);
      }

      const won = multiplier > 0;
      const payout = won ? Math.round(amount * multiplier) : 0;

      if (won) {
        bank.casino_balance = Number(bank.casino_balance || 0) + payout;
      }

      writeBankRecords(bankRecords);
      sendJson(response, 200, { ok: true, won, reel, multiplier, payout, bank: serializeBank(bank) });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/casino/roulette" && request.method === "POST") {
    const session = getUserSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const amount = Number(incoming.amount);
      const color = String(incoming.color || "").trim().toLowerCase();
      if (!Number.isFinite(amount) || amount <= 0 || !["rojo", "negro", "verde"].includes(color)) {
        sendJson(response, 400, { error: "invalid_bet" });
        return;
      }

      const bankRecords = readBankRecords();
      const bank = bankRecords[session.user.id];
      if (!bank) {
        sendJson(response, 404, { error: "bank_not_found" });
        return;
      }
      ensureBankRecordShape(bank, bankRecords);

      if (Number(bank.casino_balance || 0) < amount) {
        sendJson(response, 400, { error: "insufficient_funds" });
        return;
      }

      bank.casino_balance = Number(bank.casino_balance || 0) - amount;

      const roll = randomFloat();
      const result = roll < 0.47 ? "rojo" : roll < 0.94 ? "negro" : "verde";
      const won = result === color;
      const multiplier = result === "verde" ? 14 : 2;
      const payout = won ? Math.round(amount * multiplier) : 0;

      if (won) {
        bank.casino_balance = Number(bank.casino_balance || 0) + payout;
      }

      writeBankRecords(bankRecords);
      sendJson(response, 200, {
        ok: true,
        won,
        result,
        multiplier,
        payout,
        bank: serializeBank(bank),
      });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/casino/deposit" && request.method === "POST") {
    const session = getUserSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const amount = Number(incoming.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        sendJson(response, 400, { error: "invalid_amount" });
        return;
      }

      const bankRecords = readBankRecords();
      const bank = bankRecords[session.user.id];
      if (!bank) {
        sendJson(response, 404, { error: "bank_not_found" });
        return;
      }
      ensureBankRecordShape(bank, bankRecords);

      if (Number(bank.balance || 0) < amount) {
        sendJson(response, 400, { error: "insufficient_funds" });
        return;
      }

      bank.balance = Number(bank.balance || 0) - amount;
      bank.casino_balance = Number(bank.casino_balance || 0) + amount;
      pushTransaction(bank, {
        type: "casino_deposit",
        direction: "out",
        amount,
        title: "Deposito a saldo casino",
        description: "Fondos movidos desde la cuenta principal al saldo casino.",
      });
      writeBankRecords(bankRecords);
      sendJson(response, 200, { ok: true, amount, bank: serializeBank(bank) });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/casino/withdraw" && request.method === "POST") {
    const session = getUserSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    const bankRecords = readBankRecords();
    const bank = bankRecords[session.user.id];
    if (!bank) {
      sendJson(response, 404, { error: "bank_not_found" });
      return;
    }
    ensureBankRecordShape(bank, bankRecords);

    const amount = Number(bank.casino_balance || 0);
    if (amount <= 0) {
      sendJson(response, 400, { error: "no_casino_balance" });
      return;
    }

    bank.casino_balance = 0;
    bank.balance = Number(bank.balance || 0) + amount;
    pushTransaction(bank, {
      type: "casino_withdraw",
      direction: "in",
      amount,
      title: "Retiro de saldo casino",
      description: "Fondos retirados del casino a la cuenta principal.",
    });
    writeBankRecords(bankRecords);
    sendJson(response, 200, { ok: true, amount, bank: serializeBank(bank) });
    return;
  }

  if (url.pathname === "/api/portal/bank/credit/apply" && request.method === "POST") {
    const session = getUserSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const amount = Number(incoming.amount);
      const months = Number(incoming.months);
      const reason = String(incoming.reason || "").trim();
      if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(months) || months <= 0 || !reason) {
        sendJson(response, 400, { error: "invalid_credit_request" });
        return;
      }

      const applications = readCreditApplications();
      applications.unshift({
        id: crypto.randomBytes(8).toString("hex"),
        user_id: session.user.id,
        amount,
        months,
        reason,
        status: "pending",
        created_at: new Date().toISOString(),
      });
      writeCreditApplications(applications);
      pushNotification(session.user.id, {
        kind: "credit",
        title: "Solicitud de credito enviada",
        message: `Tu solicitud por ${formatMoneyCL(amount)} fue enviada a evaluacion bancaria.`,
      });
      sendJson(response, 200, { ok: true });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/bank-officer/credits" && request.method === "GET") {
    const session = getUserSession(request);
    if (!session || !session.user.permissions?.canManageBank) {
      sendJson(response, 403, { error: "forbidden" });
      return;
    }
    sendJson(response, 200, { items: readCreditApplications() });
    return;
  }

  if (url.pathname === "/api/bank-officer/credits/review" && request.method === "POST") {
    const session = getUserSession(request);
    if (!session || !session.user.permissions?.canManageBank) {
      sendJson(response, 403, { error: "forbidden" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const applicationId = String(incoming.id || "").trim();
      const decision = String(incoming.decision || "").trim().toLowerCase();
      if (!applicationId || !["approved", "rejected"].includes(decision)) {
        sendJson(response, 400, { error: "invalid_review" });
        return;
      }

      const applications = readCreditApplications();
      const application = applications.find((item) => item.id === applicationId);
      if (!application) {
        sendJson(response, 404, { error: "credit_not_found" });
        return;
      }
      if (application.status !== "pending") {
        sendJson(response, 400, { error: "already_reviewed" });
        return;
      }

      application.status = decision;
      application.reviewed_at = new Date().toISOString();
      application.reviewed_by = session.user.global_name || session.user.username;
      application.review_note = String(incoming.note || "").trim();

      const bankRecords = readBankRecords();
      const userBank = bankRecords[application.user_id];
      if (decision === "approved" && userBank) {
        ensureBankRecordShape(userBank, bankRecords);
        const monthlyPayment = Math.round(application.amount / application.months);
        userBank.balance = Number(userBank.balance || 0) + application.amount;
        userBank.loans.push({
          id: crypto.randomBytes(8).toString("hex"),
          amount: application.amount,
          remaining_balance: application.amount,
          months: application.months,
          monthly_payment: monthlyPayment,
          reason: application.reason,
          approved_at: application.reviewed_at,
          due_at: Date.now() + application.months * 30 * 24 * 60 * 60 * 1000,
          status: "active",
        });
        pushTransaction(userBank, {
          type: "bank_credit",
          direction: "in",
          amount: application.amount,
          title: "Credito bancario aprobado",
          description: `Credito abonado por ${formatMoneyCL(application.amount)}.`,
        });
        writeBankRecords(bankRecords);
        pushNotification(application.user_id, {
          kind: "credit",
          title: "Credito aprobado",
          message: `Tu credito por ${formatMoneyCL(application.amount)} fue aprobado y abonado a tu cuenta.`,
        });
      } else {
        pushNotification(application.user_id, {
          kind: "credit",
          title: "Credito rechazado",
          message: `Tu solicitud de credito por ${formatMoneyCL(application.amount)} fue rechazada.`,
        });
      }

      writeCreditApplications(applications);
      sendJson(response, 200, { ok: true, items: applications });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/portal/identity" && request.method === "POST") {
    const session = getUserSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const records = readIdentityRecords();

      if (records[session.user.id]) {
        sendJson(response, 200, { ok: true, identity: records[session.user.id], existing: true });
        return;
      }

      const nombres = String(incoming.nombres || "").trim();
      const apellidos = String(incoming.apellidos || "").trim();
      const birthDate = String(incoming.birth_date || "").trim();
      const sex = String(incoming.sex || "").trim();
      const nationality = String(incoming.nationality || "").trim();

      if (!nombres || !apellidos || !birthDate || !sex || !nationality) {
        sendJson(response, 400, { error: "missing_fields" });
        return;
      }

      const identity = {
        discord_id: session.user.id,
        nombres,
        apellidos,
        birth_date: birthDate,
        sex,
        nationality,
        rut: generateUniqueRut(records),
        document_number: generateDocumentNumber(records),
        issued_at: new Date().toLocaleDateString("es-CL"),
      };

      records[session.user.id] = identity;
      writeIdentityRecords(records);

      sendJson(response, 200, { ok: true, identity, existing: false });
    } catch (error) {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/portal/logout" && request.method === "POST") {
    const cookies = parseCookies(request);
    if (cookies.vcrp_user_session) {
      USER_SESSIONS.delete(cookies.vcrp_user_session);
      writeUserSessions();
    }
    clearCookie(response, "vcrp_user_session");
    sendJson(response, 200, { ok: true });
    return;
  }

  if (url.pathname === "/api/portal/bank" && request.method === "GET") {
    const session = getUserSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    const bankRecords = readBankRecords();
    const bank = bankRecords[session.user.id] || null;
    if (bank) {
      const roleContext = await resolveSessionRoleContext(session);
      const changed = ensureBankRecordShape(bank, bankRecords);
      applySalaryProfile(bank, roleContext.names, roleContext.ids);
      if (changed) {
        bankRecords[session.user.id] = bank;
      }
      writeBankRecords(bankRecords);
    }

    if (bank) {
      const overdueLoan = (bank.loans || []).find((loan) => Number(loan.remaining_balance || 0) > 0 && Number(loan.due_at || 0) > 0 && Number(loan.due_at || 0) < Date.now());
      if (overdueLoan && !overdueLoan.overdue_notified_at) {
        overdueLoan.overdue_notified_at = new Date().toISOString();
        writeBankRecords(bankRecords);
        pushNotification(session.user.id, {
          kind: "credit",
          title: "Credito atrasado",
          message: "Tu credito esta atrasado. Si no regularizas el pago, podrias enfrentar una demanda.",
        });
      }
    }

    sendJson(response, 200, { bank: bank ? serializeBank(bank) : null });
    return;
  }

  if (url.pathname === "/api/portal/bank/create" && request.method === "POST") {
    const session = getUserSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const identities = readIdentityRecords();
      if (!identities[session.user.id]) {
        sendJson(response, 400, { error: "identity_required" });
        return;
      }

      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const password = String(incoming.password || "").trim();
      if (password.length < 4) {
        sendJson(response, 400, { error: "weak_password" });
        return;
      }

      const bankRecords = readBankRecords();
    if (bankRecords[session.user.id]) {
      ensureBankRecordShape(bankRecords[session.user.id], bankRecords);
      const roleContext = await resolveSessionRoleContext(session);
      applySalaryProfile(bankRecords[session.user.id], roleContext.names, roleContext.ids);
      writeBankRecords(bankRecords);
      sendJson(response, 200, { ok: true, bank: serializeBank(bankRecords[session.user.id]), existing: true });
      return;
      }

      const bank = {
        discord_id: session.user.id,
        balance: DEFAULT_BANK_BALANCE,
        casino_balance: 0,
        card_number: generateCardNumber(bankRecords),
        card_cvv: generateCardCvv(bankRecords),
        password_hash: hashPassword(password),
        investment_account: {
          enabled: false,
          balance: 0,
        },
        transactions: [],
        salary: {
          rank: "Sin cargo asignado",
          base: SALARY_BASE,
          tax: SALARY_TAX,
          net: SALARY_NET,
        },
        last_salary_claim_at: 0,
      };
      const roleContext = await resolveSessionRoleContext(session);
      applySalaryProfile(bank, roleContext.names, roleContext.ids);
      pushTransaction(bank, {
        type: "account_opening",
        direction: "in",
        amount: DEFAULT_BANK_BALANCE,
        title: "Apertura de cuenta",
        description: "Saldo inicial entregado al crear la cuenta bancaria.",
      });
      bankRecords[session.user.id] = bank;
      writeBankRecords(bankRecords);
      sendJson(response, 200, {
        ok: true,
        existing: false,
        bank: serializeBank(bank),
      });
    } catch (error) {
      sendJson(response, 400, {
        error: "invalid_payload",
        detail: error && error.message ? error.message : "unknown_error",
      });
    }
    return;
  }

  if (url.pathname === "/api/portal/bank/transfer" && request.method === "POST") {
    const session = getUserSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const target = String(incoming.target || "").trim();
      const password = String(incoming.password || "").trim();
      const amount = Number(incoming.amount);

      if (!target || !password || !Number.isFinite(amount) || amount <= 0) {
        sendJson(response, 400, { error: "invalid_transfer" });
        return;
      }

      const bankRecords = readBankRecords();
      const senderBank = bankRecords[session.user.id];
      if (!senderBank) {
        sendJson(response, 404, { error: "bank_not_found" });
        return;
      }
      ensureBankRecordShape(senderBank, bankRecords);

      if (senderBank.password_hash !== hashPassword(password)) {
        sendJson(response, 403, { error: "invalid_password" });
        return;
      }

      if (Number(senderBank.balance || 0) < amount) {
        sendJson(response, 400, { error: "insufficient_funds" });
        return;
      }

      const identities = readIdentityRecords();
      const targetEntry = findIdentityEntry(identities, target);
      if (!targetEntry) {
        sendJson(response, 404, { error: "target_not_found" });
        return;
      }

      const [targetUserId, targetIdentity] = targetEntry;
      if (targetUserId === session.user.id) {
        sendJson(response, 400, { error: "same_account" });
        return;
      }

      if (!bankRecords[targetUserId]) {
        sendJson(response, 404, { error: "target_bank_not_found" });
        return;
      }

      ensureBankRecordShape(bankRecords[targetUserId], bankRecords);
      senderBank.balance -= amount;
      bankRecords[targetUserId].balance = Number(bankRecords[targetUserId].balance || 0) + amount;

      pushTransaction(senderBank, {
        type: "third_party_transfer",
        direction: "out",
        amount,
        title: "Transferencia a tercero",
        description: `Envio a ${targetIdentity.nombres} ${targetIdentity.apellidos}.`,
      });

      pushTransaction(bankRecords[targetUserId], {
        type: "third_party_transfer",
        direction: "in",
        amount,
        title: "Transferencia recibida",
        description: `Recibido de ${identities[session.user.id].nombres} ${identities[session.user.id].apellidos}.`,
      });

      writeBankRecords(bankRecords);

      sendJson(response, 200, {
        ok: true,
        bank: serializeBank(senderBank),
        target: {
          nombres: targetIdentity.nombres,
          apellidos: targetIdentity.apellidos,
          rut: targetIdentity.rut,
        },
      });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/portal/bank/investment/create" && request.method === "POST") {
    const session = getUserSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    const bankRecords = readBankRecords();
    const bank = bankRecords[session.user.id];
    if (!bank) {
      sendJson(response, 404, { error: "bank_not_found" });
      return;
    }

    ensureBankRecordShape(bank, bankRecords);
    if (!bank.investment_account.enabled) {
      bank.investment_account.enabled = true;
      pushTransaction(bank, {
        type: "investment_opening",
        direction: "in",
        amount: 0,
        title: "Cuenta de inversion creada",
        description: "Tu cuenta de inversion ya esta disponible para mover fondos.",
      });
      writeBankRecords(bankRecords);
    }

    sendJson(response, 200, { ok: true, bank: serializeBank(bank) });
    return;
  }

  if (url.pathname === "/api/portal/bank/internal-transfer" && request.method === "POST") {
    const session = getUserSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    try {
      const rawBody = await readRequestBody(request);
      const incoming = JSON.parse(rawBody || "{}");
      const fromAccount = String(incoming.from_account || "").trim();
      const toAccount = String(incoming.to_account || "").trim();
      const password = String(incoming.password || "").trim();
      const amount = Number(incoming.amount);

      if (!fromAccount || !toAccount || !password || !Number.isFinite(amount) || amount <= 0) {
        sendJson(response, 400, { error: "invalid_transfer" });
        return;
      }

      if (fromAccount === toAccount) {
        sendJson(response, 400, { error: "same_account" });
        return;
      }

      const bankRecords = readBankRecords();
      const bank = bankRecords[session.user.id];
      if (!bank) {
        sendJson(response, 404, { error: "bank_not_found" });
        return;
      }

      ensureBankRecordShape(bank, bankRecords);

      if (bank.password_hash !== hashPassword(password)) {
        sendJson(response, 403, { error: "invalid_password" });
        return;
      }

      if ((fromAccount === "investment" || toAccount === "investment") && !bank.investment_account.enabled) {
        sendJson(response, 400, { error: "investment_not_enabled" });
        return;
      }

      const sourceBalance = fromAccount === "main" ? Number(bank.balance || 0) : Number(bank.investment_account.balance || 0);
      if (sourceBalance < amount) {
        sendJson(response, 400, { error: "insufficient_funds" });
        return;
      }

      if (fromAccount === "main") {
        bank.balance -= amount;
      } else {
        bank.investment_account.balance -= amount;
      }

      if (toAccount === "main") {
        bank.balance += amount;
      } else {
        bank.investment_account.balance += amount;
      }

      pushTransaction(bank, {
        type: "internal_transfer",
        direction: "in",
        amount,
        title: "Transferencia entre cuentas",
        description: `Movimiento desde ${fromAccount === "main" ? "cuenta principal" : "cuenta de inversion"} hacia ${toAccount === "main" ? "cuenta principal" : "cuenta de inversion"}.`,
      });

      writeBankRecords(bankRecords);
      sendJson(response, 200, { ok: true, bank: serializeBank(bank) });
    } catch {
      sendJson(response, 400, { error: "invalid_payload" });
    }
    return;
  }

  if (url.pathname === "/api/portal/bank/claim-salary" && request.method === "POST") {
    const session = getUserSession(request);
    if (!session) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }

    const bankRecords = readBankRecords();
    const bank = bankRecords[session.user.id];
    if (!bank) {
      sendJson(response, 404, { error: "bank_not_found" });
      return;
    }
    ensureBankRecordShape(bank, bankRecords);
    const roleContext = await resolveSessionRoleContext(session);
    const salaryProfile = applySalaryProfile(bank, roleContext.names, roleContext.ids);

    const now = Date.now();
    if (now - Number(bank.last_salary_claim_at || 0) < SALARY_COOLDOWN_MS) {
      sendJson(response, 400, {
        error: "salary_cooldown",
        next_claim_at: bank.last_salary_claim_at + SALARY_COOLDOWN_MS,
      });
      return;
    }

    bank.balance = Number(bank.balance || 0) + Number(salaryProfile.net || 0);
    bank.last_salary_claim_at = now;
    pushTransaction(bank, {
      type: "salary",
      direction: "in",
      amount: Number(salaryProfile.net || 0),
      title: `Sueldo ${salaryProfile.rank}`,
      description: `Liquido depositado tras descuento de impuesto por $${Number(salaryProfile.tax || 0).toLocaleString("es-CL")}.`,
    });
    writeBankRecords(bankRecords);
    sendJson(response, 200, {
      ok: true,
      bank: serializeBank(bank),
      salary_amount: Number(salaryProfile.net || 0),
    });
    return;
  }

  if (url.pathname === "/auth/discord/login" && request.method === "GET") {
    const existingAdmin = getAdminSession(request);
    if (existingAdmin) {
      redirect(response, `${env.frontendOrigin || env.publicBaseUrl}/admin.html`);
      return;
    }
    if (!env.discordClientId || !env.discordClientSecret || !env.discordBotToken || !env.discordGuildId) {
      sendText(response, 500, "Faltan variables de entorno de Discord para OAuth.");
      return;
    }

    const state = crypto.createHmac("sha256", env.sessionSecret).update(String(Date.now())).digest("hex");
    const cookieOptions = getCookieSecurityOptions();
    setCookie(response, "vcrp_oauth_state", state, { sameSite: cookieOptions.sameSite, secure: cookieOptions.secure, maxAge: 600 });

    const authUrl = new URL("https://discord.com/oauth2/authorize");
    authUrl.searchParams.set("client_id", env.discordClientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", env.discordRedirectUri);
    authUrl.searchParams.set("scope", "identify");
    authUrl.searchParams.set("state", state);

    redirect(response, authUrl.toString());
    return;
  }

  if (url.pathname === "/auth/discord/callback" && request.method === "GET") {
    try {
      const retryAfter = rateLimitOAuth(request, "admin");
      if (retryAfter) {
        response.setHeader("Retry-After", String(retryAfter));
        sendText(response, 429, "Demasiados intentos. Espera unos segundos e intenta otra vez.");
        return;
      }
      const cookies = parseCookies(request);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      if (!code || !state || state !== cookies.vcrp_oauth_state) {
        sendText(response, 400, "OAuth invalido.");
        return;
      }

      const tokenData = await exchangeDiscordCode(code, env.discordRedirectUri);
      const user = await fetchDiscordUser(tokenData.access_token);
      const allowed = await verifyAllowedRole(user.id);

      if (!allowed) {
        clearCookie(response, "vcrp_oauth_state");
        sendText(response, 403, "No tienes el rol requerido para entrar al panel.");
        return;
      }

      const sessionId = createSession({
        id: user.id,
        username: user.username,
        global_name: user.global_name || user.username,
      });

      clearCookie(response, "vcrp_oauth_state");
      const cookieOptions = getCookieSecurityOptions();
      setCookie(response, "vcrp_admin_session", sessionId, { sameSite: cookieOptions.sameSite, secure: cookieOptions.secure, maxAge: 60 * 60 * 8 });
      redirect(response, `${env.frontendOrigin || env.publicBaseUrl}/admin.html?admin_session=${encodeURIComponent(sessionId)}`);
    } catch (error) {
      const details = error && error.message ? error.message : "unknown_error";
      sendText(response, 500, `No se pudo completar el OAuth con Discord.\n\nDetalle: ${details}`);
    }
    return;
  }

  if (url.pathname === "/auth/discord/portal-login" && request.method === "GET") {
    const existingUser = getUserSession(request);
    if (existingUser) {
      redirect(response, `${env.frontendOrigin || env.publicBaseUrl}/portal.html`);
      return;
    }
    if (!env.discordClientId || !env.discordClientSecret) {
      sendText(response, 500, "Faltan variables de entorno de Discord para el portal.");
      return;
    }

    const state = crypto.createHmac("sha256", env.sessionSecret).update(`portal:${Date.now()}`).digest("hex");
    const cookieOptions = getCookieSecurityOptions();
    setCookie(response, "vcrp_portal_oauth_state", state, { sameSite: cookieOptions.sameSite, secure: cookieOptions.secure, maxAge: 600 });

    const authUrl = new URL("https://discord.com/oauth2/authorize");
    authUrl.searchParams.set("client_id", env.discordClientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("redirect_uri", env.discordPortalRedirectUri);
    authUrl.searchParams.set("scope", "identify");
    authUrl.searchParams.set("state", state);

    redirect(response, authUrl.toString());
    return;
  }

  if (url.pathname === "/auth/discord/portal-callback" && request.method === "GET") {
    try {
      const retryAfter = rateLimitOAuth(request, "portal");
      if (retryAfter) {
        response.setHeader("Retry-After", String(retryAfter));
        sendText(response, 429, "Demasiados intentos. Espera unos segundos e intenta otra vez.");
        return;
      }
      const cookies = parseCookies(request);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      if (!code || !state || state !== cookies.vcrp_portal_oauth_state) {
        sendText(response, 400, "OAuth del portal invalido.");
        return;
      }

      const tokenData = await exchangeDiscordCode(code, env.discordPortalRedirectUri);
      const user = await fetchDiscordUser(tokenData.access_token);
      const roles = env.discordBotToken && env.discordGuildId ? await fetchMemberRoles(user.id).catch(() => []) : [];
      const roleNames = roles.map((role) => role.name);
      const roleIds = roles.map((role) => role.id);
      const sessionId = createUserSession({
        id: user.id,
        username: user.username,
        global_name: user.global_name || user.username,
        avatar: user.avatar || "",
        role_names: roleNames,
        role_ids: roleIds,
        permissions: {
          canModerateMarket: roleNames.includes(env.departmentAdminRoleName),
          canAccessStaff: roleNames.includes(env.departmentAdminRoleName),
          canManageBank: roleNames.includes(env.bankRoleName),
          canAccessKame: roleNames.includes(env.kameRoleName),
          canReceiveEmergencyAlerts: true,
          isCarabineros: roleNames.includes(env.carabinerosRoleName),
          isPdi: roleNames.includes(env.pdiRoleName),
          isCarabinerosAdmin: roleNames.includes(env.carabinerosAdminRoleName),
          isPdiAdmin: roleNames.includes(env.pdiAdminRoleName),
        },
      });

      clearCookie(response, "vcrp_portal_oauth_state");
      const cookieOptions = getCookieSecurityOptions();
      setCookie(response, "vcrp_user_session", sessionId, { sameSite: cookieOptions.sameSite, secure: cookieOptions.secure, maxAge: 60 * 60 * 8 });
      redirect(response, `${env.frontendOrigin || env.publicBaseUrl}/portal.html?portal_session=${encodeURIComponent(sessionId)}`);
    } catch (error) {
      const details = error && error.message ? error.message : "unknown_error";
      sendText(response, 500, `No se pudo completar el OAuth del portal.\n\nDetalle: ${details}`);
    }
    return;
  }

serveStaticFile(request, response, url.pathname);
});

async function bootstrap() {
  try {
    if (env.supabaseUrl && env.supabaseServiceRoleKey) {
      await loadStateFromSupabase();
      console.log("[state] Supabase conectado.");
    } else {
      ensureStateCacheLoaded();
      console.log("[state] Usando almacenamiento local.");
    }
  } catch (error) {
    console.error(`[state] No se pudo cargar Supabase, usando almacenamiento local. ${error.message || error}`);
    ensureStateCacheLoaded();
  }

  hydrateUserSessionsFromStore();

  server.listen(PORT, () => {
    console.log(`Viva Chile web + OAuth escuchando en http://localhost:${PORT}`);
  });
}

bootstrap();


