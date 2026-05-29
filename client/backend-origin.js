(function () {
  const STORAGE_KEY = "cya-api-origin";

  function normalizeOrigin(value) {
    if (typeof value !== "string") {
      return "";
    }

    const trimmed = value.trim().replace(/\/+$/, "");
    if (!trimmed) {
      return "";
    }

    try {
      const url = new URL(trimmed);
      if (!/^https?:$/.test(url.protocol)) {
        return "";
      }

      return url.origin;
    } catch (error) {
      return "";
    }
  }

  function isLocalHost(hostname) {
    return hostname === "localhost" || hostname === "127.0.0.1";
  }

  function storeOrigin(origin) {
    if (!origin) {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, origin);
    } catch (error) {
      // Ignore localStorage failures in locked-down browsers.
    }
  }

  function readOriginFromQuery() {
    try {
      const params = new URLSearchParams(window.location.search);
      const origin = normalizeOrigin(params.get("apiOrigin") || "");
      if (origin) {
        storeOrigin(origin);
      }

      return origin;
    } catch (error) {
      return "";
    }
  }

  function readOriginFromRuntimeConfig() {
    const origin = normalizeOrigin(window.__CYA_RUNTIME_CONFIG__?.apiOrigin || "");
    if (origin) {
      storeOrigin(origin);
    }

    return origin;
  }

  function readOriginFromMetaTag() {
    const metaTag = document.querySelector('meta[name="cya-api-origin"]');
    const origin = normalizeOrigin(metaTag?.content || "");
    if (origin) {
      storeOrigin(origin);
    }

    return origin;
  }

  function readOriginFromStorage() {
    try {
      return normalizeOrigin(window.localStorage.getItem(STORAGE_KEY) || "");
    } catch (error) {
      return "";
    }
  }

  function readSameOriginBackend() {
    const { protocol, hostname, port, origin } = window.location;

    if (protocol.startsWith("http") && (!isLocalHost(hostname) || port === "3000")) {
      return normalizeOrigin(origin);
    }

    return "";
  }

  function resolveBackendOrigin(options) {
    const localFallback = normalizeOrigin(options?.localFallback || "") || "http://localhost:3000";

    return (
      readOriginFromQuery() ||
      readOriginFromRuntimeConfig() ||
      readOriginFromMetaTag() ||
      readOriginFromStorage() ||
      readSameOriginBackend() ||
      localFallback
    );
  }

  function buildBackendUrl(path, backendOrigin) {
    return new URL(path, backendOrigin || resolveBackendOrigin()).toString();
  }

  window.resolveBackendOrigin = resolveBackendOrigin;
  window.buildBackendUrl = buildBackendUrl;
})();
