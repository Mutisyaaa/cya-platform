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

  function getInitials(name = "User") {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U";
  }

  function getAvatarUrl(user) {
    return user?.avatarUrl || (user?.photos?.[0] ? user.photos[0].value : "");
  }

  function getFallbackAvatarMarkup(name) {
    return `<span class="profile-fallback">${getInitials(name)}</span>`;
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
      : getFallbackAvatarMarkup(displayName);

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
        avatar.outerHTML = getFallbackAvatarMarkup(displayName);
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
        renderLoggedIn(user);
        return;
      }

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
