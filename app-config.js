const currentOrigin = window.location.origin;
const isRenderFrontend = /vivachilerpcm\.onrender\.com$/i.test(window.location.hostname);
const defaultAppBase = isRenderFrontend ? "https://vivachilerpcm.onrender.com" : currentOrigin;
const defaultBackendBase = isRenderFrontend ? "https://vivachile-backend2.onrender.com" : "";

window.VCRP_CONFIG = Object.assign(
  {
    appBase: defaultAppBase,
    apiBase: defaultBackendBase,
    authBase: defaultBackendBase,
  },
  window.VCRP_CONFIG || {}
);

(function () {
  const config = Object.assign(
    {
      appBase: defaultAppBase,
      apiBase: defaultBackendBase,
      authBase: defaultBackendBase,
    },
    window.VCRP_CONFIG || {}
  );

  function normalizeBase(value) {
    return String(value || "").trim().replace(/\/+$/, "");
  }

  function join(base, path) {
    const safePath = String(path || "").startsWith("/") ? String(path) : `/${String(path || "")}`;
    return `${normalizeBase(base)}${safePath}`;
  }

  const appBase = normalizeBase(config.appBase || window.location.origin);
  const apiBase = normalizeBase(config.apiBase || "");
  const authBase = normalizeBase(config.authBase || apiBase || "");

  window.VCRP = {
    appBase,
    apiBase,
    authBase,
    app(path) {
      return appBase ? join(appBase, path) : path;
    },
    api(path) {
      return apiBase ? join(apiBase, path) : path;
    },
    auth(path) {
      return authBase ? join(authBase, path) : path;
    },
  };

  function storeSessionTokensFromUrl() {
    const currentUrl = new URL(window.location.href);
    const portalSession = currentUrl.searchParams.get("portal_session");
    const adminSession = currentUrl.searchParams.get("admin_session");
    let changed = false;

    if (portalSession) {
      try {
        window.localStorage.setItem("vcrp_user_session", portalSession);
      } catch {}
      document.cookie = `vcrp_user_session=${encodeURIComponent(portalSession)}; Path=/; SameSite=Lax; Secure`;
      currentUrl.searchParams.delete("portal_session");
      changed = true;
    }

    if (adminSession) {
      try {
        window.localStorage.setItem("vcrp_admin_session", adminSession);
      } catch {}
      document.cookie = `vcrp_admin_session=${encodeURIComponent(adminSession)}; Path=/; SameSite=Lax; Secure`;
      currentUrl.searchParams.delete("admin_session");
      changed = true;
    }

    if (changed) {
      window.history.replaceState({}, document.title, `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
    }
  }

  storeSessionTokensFromUrl();

  const nativeFetch = window.fetch ? window.fetch.bind(window) : null;
  if (nativeFetch) {
    window.fetch = function patchedFetch(input, init) {
      let nextInput = input;
      const nextInit = Object.assign({}, init || {});

      if (typeof nextInput === "string" && nextInput.startsWith("/api/")) {
        nextInput = window.VCRP.api(nextInput);
        if (!nextInit.credentials) nextInit.credentials = "include";
        nextInit.headers = Object.assign({}, nextInit.headers || {});
        let userSession = "";
        let adminSession = "";
        try {
          userSession = window.localStorage.getItem("vcrp_user_session") || "";
          adminSession = window.localStorage.getItem("vcrp_admin_session") || "";
        } catch {}
        if (userSession && !nextInit.headers["x-vcrp-user-session"]) {
          nextInit.headers["x-vcrp-user-session"] = userSession;
        }
        if (adminSession && !nextInit.headers["x-vcrp-admin-session"]) {
          nextInit.headers["x-vcrp-admin-session"] = adminSession;
        }
      }

      return nativeFetch(nextInput, nextInit);
    };
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-auth-path]").forEach((node) => {
      const path = node.getAttribute("data-auth-path");
      if (path) node.setAttribute("href", window.VCRP.auth(path));
    });
  });
})();
