/*
  Produccion:
  window.VCRP_CONFIG = {
    appBase: "https://vivachilerpcm.netlify.app",
    apiBase: "https://TU-BACKEND.com",
    authBase: "https://TU-BACKEND.com"
  };
*/
(function () {
  const config = Object.assign(
    {
      appBase: window.location.origin,
      apiBase: "",
      authBase: "",
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

  const nativeFetch = window.fetch ? window.fetch.bind(window) : null;
  if (nativeFetch) {
    window.fetch = function patchedFetch(input, init) {
      let nextInput = input;
      const nextInit = Object.assign({}, init || {});

      if (typeof nextInput === "string" && nextInput.startsWith("/api/")) {
        nextInput = window.VCRP.api(nextInput);
        if (!nextInit.credentials) nextInit.credentials = "include";
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
