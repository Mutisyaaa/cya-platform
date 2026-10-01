(function initializePwa() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" })
      .then((registration) => {
        registration.update().catch(() => {});
      })
      .catch((error) => {
        console.warn("CYA PWA service worker registration failed:", error);
      });
  });

  const DISMISS_KEY = "cya_pwa_dismissed_until";
  const INSTALLED_KEY = "cya_pwa_installed";

  function safeStorageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function safeStorageSet(key, val) {
    try {
      localStorage.setItem(key, val);
    } catch {}
  }

  function isRunningStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true ||
      document.referrer.includes("android-app://")
    );
  }

  function isDismissed() {
    const until = safeStorageGet(DISMISS_KEY);
    if (!until) return false;
    return Date.now() < Number(until);
  }

  function dismissBanner(days = 7) {
    safeStorageSet(DISMISS_KEY, String(Date.now() + days * 24 * 60 * 60 * 1000));
    hideBanner();
  }

  function isIos() {
    const ua = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(ua) && !window.MSStream;
  }

  let deferredPrompt = null;
  let bannerEl = null;
  let iosModalEl = null;

  function injectStyles() {
    if (document.getElementById("cyaPwaStyles")) return;
    const style = document.createElement("style");
    style.id = "cyaPwaStyles";
    style.textContent = `
      .cya-install-banner {
        position: fixed;
        bottom: calc(18px + env(safe-area-inset-bottom, 0px));
        left: 50%;
        transform: translate(-50%, 160%);
        width: calc(100% - 28px);
        max-width: 440px;
        background: rgba(255, 255, 255, 0.98);
        color: #171717;
        border-radius: 18px;
        box-shadow: 0 14px 40px rgba(0, 0, 0, 0.16), 0 2px 8px rgba(0, 0, 0, 0.08);
        border: 1px solid rgba(0, 0, 0, 0.08);
        padding: 12px 14px;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 99999;
        opacity: 0;
        pointer-events: none;
        transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        box-sizing: border-box;
      }
      [data-theme="dark"] .cya-install-banner {
        background: rgba(26, 26, 26, 0.98);
        color: #f0f0f0;
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 16px 42px rgba(0, 0, 0, 0.55);
      }
      .cya-install-banner.cya-visible {
        transform: translate(-50%, 0);
        opacity: 1;
        pointer-events: auto;
      }
      .cya-install-icon {
        width: 44px;
        height: 44px;
        border-radius: 11px;
        object-fit: cover;
        flex-shrink: 0;
        background: #ffffff;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(0, 0, 0, 0.06);
      }
      .cya-install-text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .cya-install-title {
        font-weight: 700;
        font-size: 14px;
        line-height: 1.2;
        color: inherit;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .cya-install-desc {
        font-size: 12px;
        line-height: 1.3;
        color: #666666;
      }
      [data-theme="dark"] .cya-install-desc {
        color: #aaaaaa;
      }
      .cya-install-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }
      .cya-install-btn {
        background: #c8102e;
        color: #ffffff;
        border: none;
        border-radius: 999px;
        padding: 8px 16px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        line-height: 1;
        transition: background 0.18s ease, transform 0.15s ease;
        font-family: inherit;
      }
      .cya-install-btn:hover {
        background: #9e0d23;
      }
      .cya-install-btn:active {
        transform: scale(0.96);
      }
      .cya-install-dismiss {
        background: transparent;
        border: none;
        color: #888888;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        line-height: 1;
        padding: 0;
        transition: background 0.18s ease, color 0.18s ease;
        font-family: inherit;
      }
      .cya-install-dismiss:hover {
        background: rgba(0, 0, 0, 0.06);
        color: #222222;
      }
      [data-theme="dark"] .cya-install-dismiss {
        color: #888888;
      }
      [data-theme="dark"] .cya-install-dismiss:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #ffffff;
      }
      .cya-ios-modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        z-index: 100000;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding: 16px;
        box-sizing: border-box;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s ease;
      }
      .cya-ios-modal-overlay.cya-visible {
        opacity: 1;
        pointer-events: auto;
      }
      .cya-ios-card {
        background: #ffffff;
        color: #171717;
        border-radius: 20px;
        width: 100%;
        max-width: 400px;
        padding: 22px 20px 20px;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        box-sizing: border-box;
        text-align: center;
        position: relative;
      }
      [data-theme="dark"] .cya-ios-card {
        background: #202020;
        color: #f0f0f0;
        border: 1px solid rgba(255, 255, 255, 0.12);
      }
      .cya-ios-title {
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 12px;
      }
      .cya-ios-step {
        font-size: 14px;
        line-height: 1.45;
        color: #444444;
        margin-bottom: 10px;
        text-align: left;
        display: flex;
        align-items: flex-start;
        gap: 10px;
      }
      [data-theme="dark"] .cya-ios-step {
        color: #bbbbbb;
      }
      .cya-ios-badge {
        background: #c8102e;
        color: #ffffff;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 700;
        flex-shrink: 0;
        margin-top: 1px;
      }
      .cya-ios-btn {
        margin-top: 14px;
        width: 100%;
        background: #c8102e;
        color: #ffffff;
        border: none;
        border-radius: 12px;
        padding: 10px 16px;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }

  function createBanner() {
    if (bannerEl) return bannerEl;
    injectStyles();

    bannerEl = document.createElement("div");
    bannerEl.className = "cya-install-banner";
    bannerEl.setAttribute("role", "region");
    bannerEl.setAttribute("aria-label", "App installation prompt");
    bannerEl.innerHTML = `
      <img src="/icon-192.png" alt="CYA Icon" class="cya-install-icon" />
      <div class="cya-install-text">
        <div class="cya-install-title">AIC Ziwani CYA</div>
        <div class="cya-install-desc">Install app for faster access and offline use</div>
      </div>
      <div class="cya-install-actions">
        <button type="button" class="cya-install-btn" id="cyaInstallActionBtn">Install</button>
        <button type="button" class="cya-install-dismiss" id="cyaDismissActionBtn" aria-label="Dismiss">✕</button>
      </div>
    `;

    document.body.appendChild(bannerEl);

    const installBtn = bannerEl.querySelector("#cyaInstallActionBtn");
    const dismissBtn = bannerEl.querySelector("#cyaDismissActionBtn");

    installBtn.addEventListener("click", async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        try {
          const choice = await deferredPrompt.userChoice;
          if (choice && choice.outcome === "accepted") {
            safeStorageSet(INSTALLED_KEY, "true");
          }
        } catch {}
        deferredPrompt = null;
        hideBanner();
      } else if (isIos()) {
        showIosInstructions();
      } else {
        hideBanner();
      }
    });

    dismissBtn.addEventListener("click", () => {
      dismissBanner(7);
    });

    return bannerEl;
  }

  function showBanner() {
    if (isRunningStandalone() || isDismissed() || safeStorageGet(INSTALLED_KEY) === "true") {
      return;
    }
    const el = createBanner();
    requestAnimationFrame(() => {
      el.classList.add("cya-visible");
    });
  }

  function hideBanner() {
    if (bannerEl) {
      bannerEl.classList.remove("cya-visible");
    }
  }

  function showIosInstructions() {
    if (iosModalEl) {
      iosModalEl.classList.add("cya-visible");
      return;
    }
    injectStyles();

    iosModalEl = document.createElement("div");
    iosModalEl.className = "cya-ios-modal-overlay";
    iosModalEl.innerHTML = `
      <div class="cya-ios-card">
        <div class="cya-ios-title">Install AIC Ziwani CYA</div>
        <div class="cya-ios-step">
          <span class="cya-ios-badge">1</span>
          <span>Tap the <strong>Share</strong> button at the bottom of Safari (the square with an arrow pointing up).</span>
        </div>
        <div class="cya-ios-step">
          <span class="cya-ios-badge">2</span>
          <span>Scroll down and select <strong>Add to Home Screen</strong>.</span>
        </div>
        <div class="cya-ios-step">
          <span class="cya-ios-badge">3</span>
          <span>Tap <strong>Add</strong> in the top-right corner.</span>
        </div>
        <button type="button" class="cya-ios-btn" id="cyaIosDoneBtn">Got It</button>
      </div>
    `;

    document.body.appendChild(iosModalEl);

    const doneBtn = iosModalEl.querySelector("#cyaIosDoneBtn");
    doneBtn.addEventListener("click", () => {
      iosModalEl.classList.remove("cya-visible");
      dismissBanner(7);
    });

    iosModalEl.addEventListener("click", (e) => {
      if (e.target === iosModalEl) {
        iosModalEl.classList.remove("cya-visible");
      }
    });

    requestAnimationFrame(() => {
      iosModalEl.classList.add("cya-visible");
    });
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        setTimeout(showBanner, 1500);
      });
    } else {
      setTimeout(showBanner, 1500);
    }
  });

  window.addEventListener("appinstalled", () => {
    safeStorageSet(INSTALLED_KEY, "true");
    deferredPrompt = null;
    hideBanner();
  });

  if (isIos() && !isRunningStandalone() && !isDismissed() && safeStorageGet(INSTALLED_KEY) !== "true") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        setTimeout(showBanner, 3000);
      });
    } else {
      setTimeout(showBanner, 3000);
    }
  }

  function urlB64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  window.cyaPush = {
    isSupported() {
      return (
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window
      );
    },

    getPermissionState() {
      if (!("Notification" in window)) return "unsupported";
      return Notification.permission;
    },

    async getSubscription() {
      if (!this.isSupported()) return null;
      try {
        const reg = await navigator.serviceWorker.ready;
        return await reg.pushManager.getSubscription();
      } catch {
        return null;
      }
    },

    async subscribe() {
      if (!this.isSupported()) {
        throw new Error("Push notifications are not supported on this device.");
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Notification permission was not granted.");
      }

      const keyRes = await fetch("/api/push/public-key");
      const { publicKey } = await keyRes.json();
      if (!publicKey) {
        throw new Error("Server push key is unavailable.");
      }

      const reg = await navigator.serviceWorker.ready;
      let subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(publicKey)
        });
      }

      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent
        })
      });

      if (!saveRes.ok) {
        throw new Error("Failed to register subscription with server.");
      }

      return subscription;
    },

    async unsubscribe() {
      if (!this.isSupported()) return false;
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        }).catch(() => {});
        return await subscription.unsubscribe();
      }
      return true;
    }
  };
})();

