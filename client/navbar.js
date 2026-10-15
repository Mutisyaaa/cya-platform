(function initializeMobileNav() {
  const mobileMediaQuery = window.matchMedia("(max-width: 640px)");

  document.querySelectorAll("nav").forEach((nav, index) => {
    const toggle = nav.querySelector(".nav-toggle");
    const navLinks = nav.querySelector(".nav-links");

    if (!toggle || !navLinks) {
      return;
    }

    if (!navLinks.id) {
      navLinks.id = `nav-links-${index + 1}`;
    }

    nav.dataset.navReady = "true";
    toggle.setAttribute("aria-controls", navLinks.id);

    const closeMenu = () => {
      navLinks.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");

      if (typeof window.closeProfileMenu === "function") {
        window.closeProfileMenu();
      }
    };

    const syncWithViewport = () => {
      if (!mobileMediaQuery.matches) {
        closeMenu();
      }
    };

    toggle.addEventListener("click", (event) => {
      event.stopPropagation();

      const shouldOpen = !navLinks.classList.contains("open");
      navLinks.classList.toggle("open", shouldOpen);
      toggle.setAttribute("aria-expanded", String(shouldOpen));

      if (!shouldOpen && typeof window.closeProfileMenu === "function") {
        window.closeProfileMenu();
      }
    });

    navLinks.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (mobileMediaQuery.matches) {
          closeMenu();
        }
      });
    });

    document.addEventListener("click", (event) => {
      if (mobileMediaQuery.matches && !nav.contains(event.target)) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    });

    if (typeof mobileMediaQuery.addEventListener === "function") {
      mobileMediaQuery.addEventListener("change", syncWithViewport);
    } else if (typeof mobileMediaQuery.addListener === "function") {
      mobileMediaQuery.addListener(syncWithViewport);
    }
  });
})();

(function initializeSharedAuthNav() {
  if (typeof window.syncAuthState === "function" && typeof window.openAuthModal === "function") {
    return;
  }

  const authSlot = document.getElementById("authSlot");
  if (!authSlot) {
    return;
  }

  const LOCAL_BACKEND_ORIGIN = "http://localhost:3000";

  function getBackendOrigin() {
    if (window.CYABackendOrigin?.resolveBackendOrigin) {
      return window.CYABackendOrigin.resolveBackendOrigin({ localFallback: LOCAL_BACKEND_ORIGIN });
    }

    const { protocol, hostname, port, origin } = window.location;
    const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1";
    if (protocol.startsWith("http") && (!isLocalHost || port === "3000")) {
      return origin;
    }

    return LOCAL_BACKEND_ORIGIN;
  }

  const backendOrigin = getBackendOrigin();

  function buildBackendUrl(path) {
    if (window.CYABackendOrigin?.buildBackendUrl) {
      return window.CYABackendOrigin.buildBackendUrl(path, backendOrigin);
    }

    return new URL(path, backendOrigin).toString();
  }

  function getAvatarUrl(user) {
    return user?.avatarUrl || (user?.photos?.[0] ? user.photos[0].value : "");
  }

  function getFallbackAvatarMarkup() {
    return `
      <span class="profile-fallback" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path fill="currentColor" d="M12 12.75a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm0 2.25c-4.2 0-7.75 2.17-7.75 5.17 0 .46.37.83.83.83h13.84a.83.83 0 0 0 .83-.83c0-3-3.55-5.17-7.75-5.17Z"/>
        </svg>
      </span>
    `;
  }

  function closeProfileMenu() {
    const menu = authSlot.querySelector(".profile-menu");
    const toggle = authSlot.querySelector(".profile-toggle");

    if (menu) {
      menu.classList.remove("open");
    }

    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
    }
  }

  function positionProfileMenu(toggle, menu) {
    if (!toggle || !menu || window.innerWidth > 640) {
      menu.style.top = "";
      menu.style.left = "";
      menu.style.right = "";
      menu.style.width = "";
      return;
    }

    const toggleRect = toggle.getBoundingClientRect();
    menu.style.top = `${Math.round(toggleRect.bottom + 8)}px`;
    menu.style.left = "14px";
    menu.style.right = "14px";
    menu.style.width = "auto";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }

  function toggleTheme() {
    const nextTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  }

  function renderLoggedOut() {
    authSlot.innerHTML = `<a class="auth-link" href="index.html">Login</a>`;
  }

  function renderLoggedIn(user) {
    const displayName = user.displayName || "My Profile";
    const email = user.emails?.[0]?.value || "";
    const photo = getAvatarUrl(user);
    const adminLinkMarkup = user.isAdmin
      ? `<button id="adminDashboardButton" class="profile-menu-link" type="button">Admin Dashboard</button>`
      : "";
    const avatarMarkup = photo
      ? `<img class="profile-avatar" src="${photo}" alt="${displayName}" referrerpolicy="no-referrer">`
      : getFallbackAvatarMarkup();

    authSlot.innerHTML = `
      <button class="profile-toggle" type="button" aria-expanded="false" aria-label="Open profile menu">
        ${avatarMarkup}
      </button>
      <div class="profile-menu">
        <div class="profile-menu-name">${displayName}</div>
        <div class="profile-menu-email">${email}</div>
        <button id="profilePageButton" class="profile-menu-link" type="button">Profile</button>
        ${adminLinkMarkup}
        <button id="themeToggleBtn" type="button">Toggle Theme</button>
        <button id="logoutButton" type="button">Logout</button>
      </div>
    `;

    const toggle = authSlot.querySelector(".profile-toggle");
    const menu = authSlot.querySelector(".profile-menu");
    const avatar = authSlot.querySelector(".profile-avatar");
    const profilePageButton = document.getElementById("profilePageButton");
    const adminDashboardButton = document.getElementById("adminDashboardButton");
    const themeToggleBtn = document.getElementById("themeToggleBtn");
    const logoutButton = document.getElementById("logoutButton");

    if (avatar) {
      avatar.addEventListener("error", () => {
        avatar.outerHTML = getFallbackAvatarMarkup();
      }, { once: true });
    }

    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      positionProfileMenu(toggle, menu);
      const isOpen = menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });

    menu.addEventListener("click", (event) => {
      event.stopPropagation();
    });

    profilePageButton?.addEventListener("click", () => {
      window.location.href = "profile.html";
    });

    adminDashboardButton?.addEventListener("click", () => {
      window.location.href = "admin.html";
    });

    themeToggleBtn?.addEventListener("click", () => {
      toggleTheme();
      closeProfileMenu();
    });

    logoutButton?.addEventListener("click", async () => {
      try {
        await fetch(buildBackendUrl("/api/auth/logout"), {
          method: "GET",
          credentials: "include",
        });
      } finally {
        window.location.reload();
      }
    });
  }

  async function syncSharedAuthState() {
    try {
      const response = await fetch(buildBackendUrl("/api/auth/user"), {
        credentials: "include",
      });

      if (!response.ok) {
        renderLoggedOut();
        return;
      }

      const user = await response.json();
      if (user?.displayName) {
        const photo = getAvatarUrl(user);
        if (photo) {
          try {
            localStorage.setItem("cya_user_avatar", photo);
          } catch (_) {}
        }
        renderLoggedIn(user);
        return;
      }

      try {
        localStorage.removeItem("cya_user_avatar");
      } catch (_) {}
      renderLoggedOut();
    } catch (error) {
      console.error("Could not load shared auth state:", error);
      renderLoggedOut();
    }
  }

  window.closeProfileMenu = closeProfileMenu;

  document.addEventListener("click", (event) => {
    if (!authSlot.contains(event.target)) {
      closeProfileMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeProfileMenu();
    }
  });

  window.addEventListener("resize", () => {
    const menu = authSlot.querySelector(".profile-menu");
    const toggle = authSlot.querySelector(".profile-toggle");

    if (menu?.classList.contains("open")) {
      positionProfileMenu(toggle, menu);
    }
  });

  syncSharedAuthState();
})();

(function initializeBottomNav() {
  if (typeof document === "undefined") return;

  const pathname = window.location.pathname.toLowerCase();
  const filename = pathname.split("/").pop() || "";
  if (filename.startsWith("admin") || filename.includes("reset-password")) {
    return;
  }

  function setupBottomNav() {
    let nav = document.querySelector(".cya-bottom-nav");

    const tabs = [
      {
        id: "home",
        label: "Home",
        href: "/index.html",
        matches: (file) => file === "" || file === "index.html",
        svg: '<svg class="cya-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5h-4.5a1 1 0 0 1-1-1v-4.5h-4v4.5a1 1 0 0 1-1 1H4.5A1.5 1.5 0 0 1 3 20v-9.5z"/></svg>'
      },
      {
        id: "events",
        label: "Events",
        href: "/events.html",
        matches: (file) => file.includes("events"),
        svg: '<svg class="cya-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><circle cx="8" cy="15" r="1" fill="currentColor"/><circle cx="12" cy="15" r="1" fill="currentColor"/><circle cx="16" cy="15" r="1" fill="currentColor"/></svg>'
      },
      {
        id: "fellowship",
        label: "Fellowship",
        href: "/fellowship.html",
        matches: (file) => file.includes("fellowship"),
        svg: '<svg class="cya-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
      },
      {
        id: "gallery",
        label: "Gallery",
        href: "/gallery.html",
        matches: (file) => file.includes("gallery") && !file.startsWith("admin"),
        svg: '<svg class="cya-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>'
      },
      {
        id: "profile",
        label: "Profile",
        href: "/profile.html",
        matches: (file) => file.includes("profile"),
        svg: '<svg class="cya-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
      }
    ];

    if (!nav) {
      nav = document.createElement("nav");
      nav.className = "cya-bottom-nav";
      nav.setAttribute("aria-label", "Mobile Bottom Navigation");

      tabs.forEach((tab) => {
        const link = document.createElement("a");
        link.className = "cya-tab-item";
        link.href = tab.href;
        link.setAttribute("aria-label", tab.label);
        link.dataset.tabId = tab.id;

        const isActive = tab.matches(filename);
        if (isActive) {
          link.classList.add("active");
          link.setAttribute("aria-current", "page");
        }

        link.innerHTML = `
          <span class="cya-tab-indicator" aria-hidden="true"></span>
          <span class="cya-tab-icon-wrap" aria-hidden="true">${tab.svg}</span>
          <span class="cya-tab-label">${tab.label}</span>
        `;

        nav.appendChild(link);
      });

      if (document.body) {
        document.body.appendChild(nav);
      } else {
        document.addEventListener("DOMContentLoaded", () => document.body?.appendChild(nav));
      }
    } else {
      nav.querySelectorAll(".cya-tab-item").forEach((link) => {
        const tabId = link.dataset.tabId;
        const tabDef = tabs.find((t) => t.id === tabId);
        if (tabDef && tabDef.matches(filename)) {
          link.classList.add("active");
          link.setAttribute("aria-current", "page");
        } else {
          link.classList.remove("active");
          link.removeAttribute("aria-current");
        }
      });
    }

    nav.querySelectorAll(".cya-tab-item").forEach((link) => {
      if (link.dataset.hasTapHandler) return;
      link.dataset.hasTapHandler = "true";

      link.addEventListener("click", (event) => {
        if (navigator.vibrate) {
          try {
            navigator.vibrate(8);
          } catch (_) {}
        }

        if (link.classList.contains("active")) {
          event.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });
    });

    try {
      const cachedAvatar = localStorage.getItem("cya_user_avatar");
      if (cachedAvatar) {
        const profileTab = nav.querySelector('[data-tab-id="profile"] .cya-tab-icon-wrap');
        if (profileTab) {
          const img = document.createElement("img");
          img.className = "cya-tab-avatar";
          img.src = cachedAvatar;
          img.alt = "Profile";
          img.loading = "lazy";
          img.onerror = () => { img.remove(); };
          profileTab.innerHTML = "";
          profileTab.appendChild(img);
        }
      }
    } catch (_) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupBottomNav);
  } else {
    setupBottomNav();
  }
})();

