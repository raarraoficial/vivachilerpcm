const currentOrigin = window.location.origin;
const isRenderFrontend = /vivachilerpcm-mfbn\.onrender\.com$/i.test(window.location.hostname);
const defaultAppBase = isRenderFrontend ? "https://vivachilerpcm-mfbn.onrender.com" : currentOrigin;
const defaultBackendBase = isRenderFrontend ? "https://vivachile-backend2-chqh.onrender.com" : "";

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

  function ensureGlobalFooter() {
    if (!document.body) return;
    if (document.querySelector(".vcrp-global-footer, .site-footer")) return;

    if (!document.getElementById("vcrp-global-footer-style")) {
      const style = document.createElement("style");
      style.id = "vcrp-global-footer-style";
      style.textContent = `
        .vcrp-global-footer {
          position: relative;
          z-index: 2;
          width: 100%;
          margin-top: 34px;
          border-top: 1px solid rgba(255,255,255,0.12);
          background: linear-gradient(180deg, rgba(8, 14, 22, 0.74) 0%, rgba(8, 14, 22, 0.92) 100%);
          backdrop-filter: blur(12px);
        }
        .vcrp-global-footer__inner {
          width: min(100%, 1180px);
          margin: 0 auto;
          padding: 22px 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }
        .vcrp-global-footer__brand {
          margin: 0;
          color: rgba(244,247,251,0.78);
          font-size: 1rem;
        }
        .vcrp-global-footer__nav {
          display: flex;
          align-items: center;
          gap: 28px;
          flex-wrap: wrap;
        }
        .vcrp-global-footer__nav a {
          color: rgba(244,247,251,0.84);
          font-size: 0.98rem;
          text-decoration: none;
        }
        .vcrp-global-footer__nav a:hover {
          color: #ffffff;
        }
        @media (max-width: 900px) {
          .vcrp-global-footer__inner {
            padding-left: 24px;
            padding-right: 24px;
            flex-direction: column;
            align-items: flex-start;
          }
          .vcrp-global-footer__nav {
            gap: 18px;
          }
        }
        @media (max-width: 640px) {
          .vcrp-global-footer {
            margin-top: 24px;
          }
          .vcrp-global-footer__inner {
            padding: 18px 16px 22px;
          }
          .vcrp-global-footer__brand,
          .vcrp-global-footer__nav a {
            font-size: 0.92rem;
          }
        }
      `;
      document.head.appendChild(style);
    }

    const footer = document.createElement("footer");
    footer.className = "vcrp-global-footer";
    footer.innerHTML = `
      <div class="vcrp-global-footer__inner">
        <p class="vcrp-global-footer__brand">© 2026 Viva Chile Roleplay Community</p>
        <nav class="vcrp-global-footer__nav" aria-label="Enlaces del pie de pagina">
          <a href="https://docs.google.com/document/d/1AjvkBFs6kni7d8MdOYzj85oM1V0fXmZWvPU3ekUJeew/edit?usp=sharing" target="_blank" rel="noreferrer">Terminos</a>
          <a href="${join(appBase, "/portal.html")}">Privacidad</a>
          <a href="https://discord.gg/vrcrp" target="_blank" rel="noreferrer">Contacto</a>
        </nav>
      </div>
    `;
    document.body.appendChild(footer);
  }

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
    ensureGlobalFooter();
  });
})();
