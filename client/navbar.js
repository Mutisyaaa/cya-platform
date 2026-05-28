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
