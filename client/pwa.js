(function initializePwa() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.warn("CYA PWA service worker registration failed:", error);
    });
  });
})();
