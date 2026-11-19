(function initializeSiteConfig() {
  const CACHE_KEY = "cya_site_settings_cache";

  function readCachedSettings() {
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  function writeCachedSettings(data) {
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage quota or private-mode restrictions.
    }
  }

  const liveSettings = window.__CYA_SITE_SETTINGS__;
  if (liveSettings && typeof liveSettings === "object") {
    writeCachedSettings(liveSettings);
  }

  const settings = liveSettings || readCachedSettings() || {};
  window.__CYA_SITE_SETTINGS__ = settings;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getUserSelectedTheme() {
    try {
      const stored = window.localStorage.getItem("theme");
      return stored === "light" || stored === "dark" ? stored : null;
    } catch {
      return null;
    }
  }

  function resolveInitialTheme() {
    const userChoice = getUserSelectedTheme();
    if (userChoice) {
      return userChoice;
    }

    const configured = settings?.appearance?.defaultTheme || "light";
    if (configured === "system") {
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return configured === "dark" ? "dark" : "light";
  }

  function applyResolvedTheme(theme) {
    const resolved = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.style.colorScheme = resolved;
    return resolved;
  }

  applyResolvedTheme(resolveInitialTheme());

  if (window.matchMedia && settings?.appearance?.defaultTheme === "system") {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = (event) => {
      if (!getUserSelectedTheme()) {
        applyResolvedTheme(event.matches ? "dark" : "light");
      }
    };
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleSystemChange);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(handleSystemChange);
    }
  }

  const themeObserver = new MutationObserver(() => {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "light" || attr === "dark") {
      document.documentElement.style.colorScheme = attr;
    }
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  function applyThemeColors() {
    const appearance = settings?.appearance;
    if (!appearance) return;

    const primary = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(appearance.primaryColor || "")
      ? appearance.primaryColor
      : "#c8102e";
    const darkPrimary = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(appearance.darkPrimaryColor || "")
      ? appearance.darkPrimaryColor
      : "#9e0d23";
    const darkModePrimary = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(appearance.darkModePrimaryColor || "")
      ? appearance.darkModePrimaryColor
      : "#e53935";
    const heroAccent = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(appearance.heroAccentColor || "")
      ? appearance.heroAccentColor
      : "#a78bfa";
    const heroGold = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(appearance.heroGoldColor || "")
      ? appearance.heroGoldColor
      : "#fde68a";

    let styleEl = document.getElementById("cyaDynamicThemeVars");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "cyaDynamicThemeVars";
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
      :root {
        --primary-red: ${primary};
        --dark-red: ${darkPrimary};
        --hero-accent: ${heroAccent};
        --hero-gold: ${heroGold};
      }
      [data-theme="dark"] {
        --primary-red: ${darkModePrimary};
        --dark-red: ${primary};
        --hero-accent: ${heroAccent};
        --hero-gold: ${heroGold};
      }
      .theme-kicker::before {
        background: var(--hero-accent, #a78bfa);
      }
      .theme-scripture strong {
        color: var(--hero-gold, #fde68a);
      }
      .cya-announcement-bar {
        --banner-bg: #c8102e;
        background-color: var(--banner-bg);
        color: #ffffff;
        padding: 10px 44px 10px 16px;
        text-align: center;
        font-size: 13.5px;
        font-weight: 600;
        line-height: 1.4;
        position: relative;
        z-index: 1200;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        flex-wrap: wrap;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.14);
      }
      @supports (color: color(from red xyz-d65 0 0 0)) {
        .cya-announcement-bar {
          --wcag-y-threshold: 0.17913;
          --y: max(0, sign(var(--wcag-y-threshold) - y));
          color: color(from var(--banner-bg) xyz-d65 calc(var(--y) * 0.9505) var(--y) calc(var(--y) * 1.089));
        }
      }
      @supports (color: contrast-color(red)) {
        .cya-announcement-bar {
          color: contrast-color(var(--banner-bg));
        }
      }
      .cya-announcement-link {
        color: inherit;
        font-weight: 800;
        text-decoration: underline;
        text-underline-offset: 3px;
      }
      .cya-announcement-close {
        position: absolute;
        right: 10px;
        top: 50%;
        transform: translateY(-50%);
        background: transparent;
        border: 1px solid currentColor;
        color: inherit;
        opacity: 0.8;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        line-height: 1;
        padding: 0;
      }
      .cya-announcement-close:hover {
        opacity: 1;
      }
    `;
  }

  function applyHeadMetadata() {
    const branding = settings?.branding;
    const integrations = settings?.integrations;

    if (branding?.pwaThemeColor) {
      const themeMeta = document.querySelector('meta[name="theme-color"]');
      if (themeMeta && themeMeta.getAttribute("content") !== "#ffffff") {
        themeMeta.setAttribute("content", branding.pwaThemeColor);
      }
    }

    if (branding?.faviconUrl) {
      const iconLink = document.querySelector('link[rel="icon"]');
      if (iconLink) {
        iconLink.setAttribute("href", branding.faviconUrl);
      }
    }

    if (branding?.appIconUrl) {
      const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
      if (appleIcon) {
        appleIcon.setAttribute("href", branding.appIconUrl);
      }
    }

    if (integrations?.googleSiteVerification) {
      let meta = document.querySelector('meta[name="google-site-verification"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "google-site-verification";
        document.head.appendChild(meta);
      }
      meta.content = integrations.googleSiteVerification;
    }
  }

  function injectAnalyticsTag() {
    const gtmId = String(settings?.integrations?.gtmId || "").trim().toUpperCase();
    if (!gtmId || !/^(GTM|G)-[A-Z0-9]{4,20}$/.test(gtmId) || window.__cyaGtmInjected) {
      return;
    }

    window.__cyaGtmInjected = gtmId;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    if (gtmId.startsWith("G-")) {
      window.gtag("config", gtmId);
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = gtmId.startsWith("G-")
      ? `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gtmId)}`
      : `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
    document.head.appendChild(script);
  }

  applyThemeColors();
  applyHeadMetadata();
  injectAnalyticsTag();

  function getRouteName() {
    return window.location.pathname
      .toLowerCase()
      .replace(/\/+$/, "")
      .replace(/\.html$/i, "") || "/";
  }

  function getSocialSvg(network) {
    switch (network) {
      case "instagram":
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.5" cy="6.5" r="1"></circle></svg>';
      case "tiktok":
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14.5 3c.5 1.7 1.8 3 3.5 3.5v2.8a6.9 6.9 0 0 1-3.5-1.1v6a5 5 0 1 1-5-5c.3 0 .7 0 1 .1v2.7a2.6 2.6 0 1 0 1.4 2.3V3h2.6Z"></path></svg>';
      case "whatsapp":
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.19.53-1.09 1.04-1.54 1.1-.42.06-.97.09-2.82-.67-2.37-.98-3.9-3.4-4.02-3.56-.12-.16-.97-1.29-.97-2.46s.61-1.74.83-1.98c.22-.24.47-.3.63-.3.16 0 .31 0 .45.01.14.01.34-.05.53.4.19.46.66 1.61.72 1.73.06.12.1.26.02.42-.08.16-.12.26-.24.4-.12.14-.26.31-.37.42-.12.12-.25.25-.11.49.14.24.63 1.04 1.35 1.68.93.83 1.71 1.09 1.95 1.21.24.12.38.1.52-.06.14-.16.6-.7.76-.94.16-.24.32-.2.53-.12.22.08 1.38.65 1.62.77.24.12.4.18.46.28.06.1.06.58-.13 1.11z"></path></svg>';
      case "youtube":
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 4.8 12 4.8 12 4.8s-6 0-7.7.5a2.7 2.7 0 0 0-1.9 1.9C2 8.9 2 12 2 12s0 3.1.4 4.8a2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.7.5 7.7.5s6 0 7.7-.5a2.7 2.7 0 0 0 1.9-1.9c.4-1.7.4-4.8.4-4.8s0-3.1-.4-4.8ZM10 15V9l5.2 3-5.2 3Z"></path></svg>';
      case "facebook":
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1V8c0-.9.3-1.5 1.6-1.5h1.7V3.7c-.3 0-1.3-.1-2.5-.1-2.4 0-4.1 1.5-4.1 4.2v2.1H7.5V13h2.7v8h3.3Z"></path></svg>';
      case "x":
        return '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.2 3h3l-6.6 7.5L22.3 21h-6l-4.7-6.2L6.2 21h-3l7-8L2.8 3h6.2l4.3 5.7L18.2 3Zm-1 16.2h1.7L8.1 4.7H6.3l10.9 14.5Z"></path></svg>';
      default:
        return "";
    }
  }

  function getSocialLabel(network) {
    const labels = {
      instagram: "Instagram",
      tiktok: "TikTok",
      whatsapp: "WhatsApp",
      youtube: "YouTube",
      facebook: "Facebook",
      x: "X",
    };
    return labels[network] || network;
  }

  function renderSocialLinksMarkup(socials, linkClassName, withIconSpan) {
    if (!socials || typeof socials !== "object") return "";
    return Object.entries(socials)
      .filter(([, cfg]) => cfg && cfg.enabled && cfg.url)
      .map(([network, cfg]) => {
        const label = getSocialLabel(network);
        const svg = getSocialSvg(network);
        const iconHtml = withIconSpan
          ? `<span class="social-icon" aria-hidden="true">${svg}</span>`
          : svg;
        return `<a class="${escapeHtml(linkClassName)}" href="${escapeHtml(cfg.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${iconHtml}</a>`;
      })
      .join("");
  }

  function applyNavVisibility(root = document) {
    const navConfig = settings?.pages_nav?.nav;
    if (!navConfig) return;

    Object.entries(navConfig).forEach(([key, cfg]) => {
      if (!cfg) return;
      const hrefPath = `/${key}`;

      root.querySelectorAll(`.nav-links a[href="${hrefPath}"]`).forEach((link) => {
        link.hidden = cfg.visible === false;
        if (cfg.label) {
          link.textContent = cfg.label;
        }
      });

      root.querySelectorAll(`.cya-bottom-nav .cya-tab-item[data-tab-id="${key}"]`).forEach((tab) => {
        tab.hidden = cfg.visible === false;
        tab.style.display = cfg.visible === false ? "none" : "";
        const labelEl = tab.querySelector(".cya-tab-label");
        if (labelEl && cfg.label) {
          labelEl.textContent = cfg.label;
        }
      });
    });

    if (typeof window.CYABottomNavSync === "function") {
      window.CYABottomNavSync();
    }
  }

  function applyGlobalBranding(route) {
    const branding = settings?.branding;
    if (!branding) return;

    const isAdminRoute = route.startsWith("/admin") || route === "/reset-password";

    if (!isAdminRoute) {
      document.querySelectorAll("nav .logo-area img").forEach((img) => {
        if (branding.logoUrl) {
          img.src = branding.logoUrl;
          img.alt = `${branding.siteName || "CYA"} logo`;
        }
      });

      document.querySelectorAll("nav .church-name h1").forEach((el) => {
        if (branding.siteName) el.textContent = branding.siteName;
      });

      document.querySelectorAll("nav .church-name span").forEach((el) => {
        if (branding.churchSubtitle) el.textContent = branding.churchSubtitle;
      });

      const footer = document.querySelector("footer");
      if (footer) {
        const footerParas = footer.querySelectorAll("p");
        if (footerParas.length >= 2) {
          footerParas[0].textContent = branding.footerCopyright || footerParas[0].textContent;
          footerParas[1].textContent = branding.footerMotto || "";
          footerParas[1].hidden = !branding.footerMotto;
        } else if (footerParas.length === 0 && branding.footerCopyright) {
          footer.textContent = branding.footerCopyright;
          if (branding.footerMotto) {
            const mottoEl = document.createElement("p");
            mottoEl.style.fontSize = "12.5px";
            mottoEl.style.opacity = "0.78";
            mottoEl.style.marginTop = "6px";
            mottoEl.textContent = branding.footerMotto;
            footer.appendChild(mottoEl);
          }
        }
      }
    }

    const splash = document.getElementById("cyaAppSplash");
    if (splash) {
      if (branding.splashEnabled === false) {
        splash.remove();
      } else {
        const splashImg = splash.querySelector(".cya-splash-logo");
        const splashBrand = splash.querySelector(".cya-splash-brand");
        const splashTagline = splash.querySelector(".cya-splash-tagline");
        if (splashImg && (branding.appIconUrl || branding.logoUrl)) {
          splashImg.src = branding.appIconUrl || branding.logoUrl;
        }
        if (splashBrand && branding.splashBrand) {
          splashBrand.textContent = branding.splashBrand;
        }
        if (splashTagline && branding.splashTagline !== undefined) {
          splashTagline.textContent = branding.splashTagline;
        }
      }
    }

    if (route === "/" && branding.siteName) {
      document.title = branding.siteName;
    } else if (!isAdminRoute && branding.tabTitleSuffix && document.title.includes("|")) {
      const prefix = document.title.split("|")[0].trim();
      document.title = `${prefix} | ${branding.tabTitleSuffix}`;
    }
  }

  function renderAnnouncementBanner(route) {
    if (route.startsWith("/admin") || route === "/reset-password") {
      return;
    }

    const appearance = settings?.appearance;
    if (!appearance?.announcementEnabled || !appearance?.announcementText) {
      return;
    }

    const dismissId = `cya_ann_${appearance.announcementText}_${appearance.announcementLinkUrl || ""}`;
    try {
      if (window.sessionStorage.getItem(dismissId) === "1") {
        return;
      }
    } catch {
      // Ignore sessionStorage restrictions.
    }

    const existing = document.getElementById("cyaAnnouncementBanner");
    if (existing) existing.remove();

    const bar = document.createElement("div");
    bar.id = "cyaAnnouncementBanner";
    bar.className = "cya-announcement-bar";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Church announcement");
    const bgColor = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(appearance.announcementBgColor || "")
      ? appearance.announcementBgColor
      : "#c8102e";
    bar.style.setProperty("--banner-bg", bgColor);

    const textSpan = document.createElement("span");
    textSpan.textContent = appearance.announcementText;
    bar.appendChild(textSpan);

    if (appearance.announcementLinkLabel && appearance.announcementLinkUrl) {
      const link = document.createElement("a");
      link.className = "cya-announcement-link";
      link.href = appearance.announcementLinkUrl;
      link.textContent = appearance.announcementLinkLabel;
      bar.appendChild(link);
    }

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "cya-announcement-close";
    closeBtn.setAttribute("aria-label", "Dismiss announcement");
    closeBtn.innerHTML = "&times;";
    closeBtn.addEventListener("click", () => {
      bar.remove();
      try {
        window.sessionStorage.setItem(dismissId, "1");
      } catch {
        // Ignore sessionStorage restrictions.
      }
    });
    bar.appendChild(closeBtn);

    document.body.prepend(bar);
  }

  function applyHomepageSettings() {
    const homepage = settings?.homepage;
    const schedule = settings?.schedule_contact;
    const security = settings?.features_security;

    if (homepage) {
      const kicker = document.querySelector(".hero .theme-kicker");
      if (kicker && homepage.themeKicker) kicker.textContent = homepage.themeKicker;

      const mainWord = document.querySelector("#heroTitle .hero-main-word");
      const themeLine = document.querySelector("#heroTitle .hero-theme-line");
      if (mainWord && homepage.heroMainWord) mainWord.textContent = homepage.heroMainWord;
      if (themeLine && homepage.heroThemeLine) themeLine.textContent = homepage.heroThemeLine;

      const scripture = document.querySelector(".hero .theme-scripture");
      if (scripture && (homepage.scriptureRef || homepage.scriptureText)) {
        scripture.innerHTML = `<strong>${escapeHtml(homepage.scriptureRef || "")}</strong><br>${escapeHtml(homepage.scriptureText || "")}`;
      }

      const heroSubtitle = document.getElementById("heroSubtitle");
      if (heroSubtitle && homepage.heroSubtitle) heroSubtitle.textContent = homepage.heroSubtitle;

      const heroBtn = document.querySelector(".hero-actions a.hero-btn");
      if (heroBtn) {
        if (homepage.heroCtaLabel) heroBtn.textContent = homepage.heroCtaLabel;
        if (homepage.heroCtaUrl) heroBtn.href = homepage.heroCtaUrl;
      }

      const footnote = document.querySelector(".hero .theme-footnote");
      if (footnote && homepage.themeFootnote !== undefined) {
        footnote.textContent = homepage.themeFootnote;
        footnote.hidden = !homepage.themeFootnote;
      }

      const aboutHeading = document.querySelector("#about h2");
      const aboutBody = document.querySelector("#about p");
      if (aboutHeading && homepage.aboutHeading) aboutHeading.textContent = homepage.aboutHeading;
      if (aboutBody && homepage.aboutBody) aboutBody.textContent = homepage.aboutBody;

      const ministriesHeading = document.querySelector("#ministries h2");
      const ministriesCards = document.querySelector("#ministries .cards");
      if (ministriesHeading && homepage.ministriesHeading) {
        ministriesHeading.textContent = homepage.ministriesHeading;
      }
      if (ministriesCards && Array.isArray(homepage.ministryHighlights) && homepage.ministryHighlights.length) {
        ministriesCards.innerHTML = homepage.ministryHighlights
          .map((item, idx) => `
            <div class="card" data-aos="fade-up" data-aos-delay="${(idx % 3 + 1) * 100}">
              <h3>${escapeHtml(item.title)}</h3>
              <p>${escapeHtml(item.description)}</p>
            </div>
          `)
          .join("");
      }
    }

    if (schedule) {
      const contactItems = document.querySelectorAll("#contact .contact-item");
      if (contactItems[0] && schedule.email) {
        const span = contactItems[0].querySelector("span:last-child");
        if (span) span.textContent = `Email: ${schedule.email}`;
      }
      if (contactItems[1] && schedule.phone) {
        const span = contactItems[1].querySelector("span:last-child");
        if (span) span.textContent = `Phone: ${schedule.phone}`;
      }

      const socialHost = document.querySelector("#contact .social-links");
      if (socialHost && schedule.socials) {
        socialHost.innerHTML = renderSocialLinksMarkup(schedule.socials, "social-link", true);
      }
    }

    if (security) {
      const googleBtn = document.getElementById("googleLoginBtn");
      const authDivider = document.querySelector("#authModal .auth-divider");
      if (security.allowGoogleLogin === false) {
        if (googleBtn) googleBtn.style.display = "none";
        if (authDivider) authDivider.style.display = "none";
      }

      const authSwitch = document.querySelector("#authModal .auth-switch");
      if (security.allowRegistration === false && authSwitch) {
        authSwitch.style.display = "none";
      }

      const reqLengthSpan = document.querySelector("#reqLength span");
      const minLen = Number.isInteger(security.minPasswordLength) ? security.minPasswordLength : 8;
      if (reqLengthSpan) {
        reqLengthSpan.textContent = `At least ${minLen} characters`;
      }
    }
  }

  function buildInitials(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "CY";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  function applyContactSettings() {
    const pagesNav = settings?.pages_nav;
    const leadership = settings?.leadership;
    const schedule = settings?.schedule_contact;

    if (pagesNav) {
      const badge = document.querySelector(".page-header .header-badge");
      const heading = document.querySelector(".page-header h2");
      const subtitle = document.querySelector(".page-header p");
      if (badge && pagesNav.contactBadge) badge.textContent = pagesNav.contactBadge;
      if (heading && pagesNav.contactTitle) {
        const words = pagesNav.contactTitle.trim().split(/\s+/);
        if (words.length >= 2) {
          const tail = words.slice(-2).join(" ");
          const head = words.slice(0, -2).join(" ");
          heading.innerHTML = head
            ? `${escapeHtml(head)} <span>${escapeHtml(tail)}</span>`
            : `<span>${escapeHtml(tail)}</span>`;
        } else {
          heading.textContent = pagesNav.contactTitle;
        }
      }
      if (subtitle && pagesNav.contactSubtitle) subtitle.textContent = pagesNav.contactSubtitle;
    }

    if (leadership) {
      const pastoralLead = document.querySelector("#leadership .section-lead");
      if (pastoralLead) {
        const tag = pastoralLead.querySelector(".section-tag");
        const h3 = pastoralLead.querySelector(".section-heading");
        const p = pastoralLead.querySelector(".section-subtext");
        if (tag && leadership.pastoralTag) tag.textContent = leadership.pastoralTag;
        if (h3 && leadership.pastoralHeading) h3.textContent = leadership.pastoralHeading;
        if (p && leadership.pastoralSubtext !== undefined) p.textContent = leadership.pastoralSubtext;
      }

      const pastoralGrid = document.querySelector(".pastoral-grid");
      if (pastoralGrid && Array.isArray(leadership.pastors)) {
        pastoralGrid.innerHTML = leadership.pastors
          .map((pastor, idx) => {
            const mediaHtml = pastor.photoUrl
              ? `<img src="${escapeHtml(pastor.photoUrl)}" alt="${escapeHtml(pastor.name)}" loading="${idx < 2 ? "eager" : "lazy"}">`
              : `<div class="member-placeholder"><div class="placeholder-avatar-ring">${escapeHtml(buildInitials(pastor.name))}</div><span class="placeholder-hint">Portrait not set</span></div>`;

            return `
              <article class="pastor-card" data-aos="fade-up" data-aos-delay="${(idx + 1) * 100}">
                <div class="pastor-photo-frame">
                  ${mediaHtml}
                  <div class="pastor-photo-overlay"></div>
                  ${pastor.badge ? `<div class="pastor-badge">${escapeHtml(pastor.badge)}</div>` : ""}
                </div>
                <div class="pastor-info">
                  <h4 class="pastor-name">${escapeHtml(pastor.name)}</h4>
                  <div class="pastor-role">${escapeHtml(pastor.role || "")}</div>
                  <p class="pastor-description">${escapeHtml(pastor.bio || "")}</p>
                  ${pastor.scripture ? `<div class="pastor-scripture">${escapeHtml(pastor.scripture)}</div>` : ""}
                </div>
              </article>
            `;
          })
          .join("");
      }

      const committeeLead = document.querySelector(".committee-section .section-lead");
      if (committeeLead) {
        const tag = committeeLead.querySelector(".section-tag");
        const h3 = committeeLead.querySelector(".section-heading");
        const p = committeeLead.querySelector(".section-subtext");
        if (tag && leadership.committeeTag) tag.textContent = leadership.committeeTag;
        if (h3 && leadership.committeeHeading) h3.textContent = leadership.committeeHeading;
        if (p && leadership.committeeSubtext !== undefined) p.textContent = leadership.committeeSubtext;
      }

      const filterBar = document.querySelector(".filter-tabs-bar");
      const depts = Array.isArray(leadership.departments) ? leadership.departments : [];
      const deptMap = new Map(depts.map((d) => [d.id, d]));

      if (filterBar && depts.length) {
        filterBar.innerHTML = [
          `<button type="button" class="filter-tab active" data-filter="all">All Leaders</button>`,
          ...depts.map((dept) => `<button type="button" class="filter-tab" data-filter="${escapeHtml(dept.id)}">${escapeHtml(dept.label)}</button>`),
        ].join("");
      }

      const committeeGrid = document.getElementById("committeeGrid");
      if (committeeGrid && Array.isArray(leadership.committee)) {
        const chipClassMap = {
          exec: "chip-exec",
          music: "chip-music",
          social: "chip-social",
          bible: "chip-bible",
        };

        committeeGrid.innerHTML = leadership.committee
          .map((member, idx) => {
            const deptInfo = deptMap.get(member.department);
            const chipLabel = deptInfo?.chipLabel || deptInfo?.label || member.department || "Committee";
            const chipClass = chipClassMap[member.department] || "chip-exec";
            const frameBody = member.photoUrl
              ? `<img src="${escapeHtml(member.photoUrl)}" alt="${escapeHtml(member.name)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;object-position:top center;">`
              : `<div class="member-placeholder"><div class="placeholder-avatar-ring">${escapeHtml(buildInitials(member.name))}</div><span class="placeholder-hint">Photo coming soon</span></div>`;

            return `
              <article class="member-card" data-category="${escapeHtml(member.department || "exec")}" data-aos="fade-up" data-aos-delay="${((idx % 6) + 1) * 50}">
                <div class="member-photo-frame">
                  ${frameBody}
                </div>
                <div class="member-info">
                  <span class="dept-chip ${chipClass}">${escapeHtml(chipLabel)}</span>
                  <h4 class="member-name">${escapeHtml(member.name)}</h4>
                  <div class="member-role">${escapeHtml(member.role || "")}</div>
                  <p class="member-bio">${escapeHtml(member.bio || "")}</p>
                </div>
              </article>
            `;
          })
          .join("");
      }
    }

    if (schedule) {
      const infoCards = document.querySelectorAll("#visit .info-card");
      const scheduleCard = infoCards[0];
      if (scheduleCard) {
        const sanctuarySub = scheduleCard.querySelector(".info-card-header span");
        if (sanctuarySub && schedule.sanctuaryName) {
          sanctuarySub.textContent = schedule.sanctuaryName;
        }

        const listEl = scheduleCard.querySelector(".service-times-list");
        if (listEl && Array.isArray(schedule.services)) {
          listEl.innerHTML = schedule.services
            .map((svc) => `
              <div class="service-item" ${svc.featured ? 'style="border-color: rgba(200, 16, 46, 0.3); background: rgba(200, 16, 46, 0.03);"' : ""}>
                <div>
                  <span class="service-item-name" ${svc.featured ? 'style="color: var(--primary-red);"' : ""}>${escapeHtml(svc.name)}</span>
                  ${svc.description ? `<span style="display: block; font-size: 11px; color: var(--text-secondary);">${escapeHtml(svc.description)}</span>` : ""}
                </div>
                <span class="service-item-time" ${svc.featured ? 'style="background: var(--primary-red); color: #fff;"' : ""}>${escapeHtml(svc.time || "")}</span>
              </div>
            `)
            .join("");
        }

        const locationEl = scheduleCard.querySelector(":scope > div:last-child");
        if (locationEl && schedule.locationAddress) {
          locationEl.innerHTML = `📍 <strong>Location:</strong> ${escapeHtml(schedule.locationAddress)}`;
        }
      }

      const contactCard = infoCards[1];
      if (contactCard) {
        const actionLinks = contactCard.querySelectorAll(".contact-action-item");
        if (actionLinks[0] && schedule.phone) {
          const telDigits = schedule.phone.replace(/[^\d+]/g, "");
          actionLinks[0].href = `tel:${telDigits}`;
          const valEl = actionLinks[0].querySelector(".contact-item-val");
          if (valEl) valEl.textContent = schedule.phone;
        }
        if (actionLinks[1] && schedule.email) {
          actionLinks[1].href = `mailto:${schedule.email}`;
          const valEl = actionLinks[1].querySelector(".contact-item-val");
          if (valEl) valEl.textContent = schedule.email;
        }

        const waBtn = contactCard.querySelector(".btn-whatsapp-chat");
        if (waBtn) {
          const waDigits = String(schedule.whatsappNumber || "").replace(/[^\d]/g, "");
          if (!waDigits) {
            waBtn.style.display = "none";
          } else {
            waBtn.style.display = "";
            const waText = encodeURIComponent(schedule.whatsappMessage || "Hello AIC Ziwani CYA, I would like to get in touch.");
            waBtn.href = `https://wa.me/${waDigits}?text=${waText}`;
          }
        }
      }

      const msgHeading = document.querySelector("#message .section-heading");
      const msgSubtext = document.querySelector("#message .section-subtext");
      const msgToast = document.getElementById("contactToast");
      const msgDeptSelect = document.getElementById("contactDepartment");
      if (msgHeading && schedule.contactFormHeading) msgHeading.textContent = schedule.contactFormHeading;
      if (msgSubtext && schedule.contactFormSubtext !== undefined) msgSubtext.textContent = schedule.contactFormSubtext;
      if (msgToast && schedule.contactFormToast) msgToast.textContent = schedule.contactFormToast;
      if (msgDeptSelect && Array.isArray(schedule.contactDepartments) && schedule.contactDepartments.length) {
        msgDeptSelect.innerHTML = schedule.contactDepartments
          .map((opt) => `<option value="${escapeHtml(opt.value)}">${escapeHtml(opt.label)}</option>`)
          .join("");
      }

      const footerSocials = document.querySelector("footer .footer-socials");
      if (footerSocials && schedule.socials) {
        footerSocials.innerHTML = renderSocialLinksMarkup(schedule.socials, "footer-social-btn", false);
      }
    }
  }

  function applyPageHeaders(route) {
    const pagesNav = settings?.pages_nav;
    if (!pagesNav) return;

    if (route === "/fellowship") {
      const h2 = document.querySelector(".hero h2");
      const p = document.querySelector(".hero p");
      if (h2 && pagesNav.fellowshipTitle) h2.textContent = pagesNav.fellowshipTitle;
      if (p && pagesNav.fellowshipSubtitle) p.textContent = pagesNav.fellowshipSubtitle;
    } else if (route === "/events") {
      const h2 = document.querySelector(".page-header h2");
      const p = document.querySelector(".page-header p");
      if (h2 && pagesNav.eventsTitle) h2.textContent = pagesNav.eventsTitle;
      if (p && pagesNav.eventsSubtitle) p.textContent = pagesNav.eventsSubtitle;
    } else if (route === "/gallery") {
      const h2 = document.querySelector(".page-header h2");
      const p = document.querySelector(".page-header p");
      if (h2 && pagesNav.galleryTitle) h2.textContent = pagesNav.galleryTitle;
      if (p && pagesNav.gallerySubtitle) p.textContent = pagesNav.gallerySubtitle;
    } else if (route === "/blog") {
      const h2 = document.querySelector(".page-header h2");
      const p = document.querySelector(".page-header p");
      if (h2 && pagesNav.blogTitle) h2.textContent = pagesNav.blogTitle;
      if (p && pagesNav.blogSubtitle) p.textContent = pagesNav.blogSubtitle;
    } else if (route === "/reset-password") {
      const minLen = settings?.features_security?.minPasswordLength || 8;
      const hintEl = document.querySelector("#resetStrengthLabel");
      if (hintEl && hintEl.textContent.includes("min 8")) {
        hintEl.textContent = `Too short (min ${minLen} chars)`;
      }
    } else if (route === "/profile") {
      if (settings?.features_security?.enablePushPrompts === false) {
        const pushPanel = document.querySelector(".notification-panel");
        if (pushPanel) {
          pushPanel.style.display = "none";
        }
      }
    }
  }

  function applySettingsToDom() {
    const route = getRouteName();
    applyGlobalBranding(route);
    renderAnnouncementBanner(route);
    applyNavVisibility(document);

    if (route === "/") {
      applyHomepageSettings();
    } else if (route === "/contact") {
      applyContactSettings();
    } else {
      applyPageHeaders(route);
    }
  }

  window.CYASiteConfig = {
    getSettings: () => settings,
    escapeHtml,
    getSocialSvg,
    getSocialLabel,
    renderSocialLinksMarkup,
    applyNavVisibility,
    getMinPasswordLength: () => {
      const n = Number.parseInt(settings?.features_security?.minPasswordLength, 10);
      return Number.isInteger(n) && n >= 6 && n <= 32 ? n : 8;
    },
    resolveInitialTheme,
    applyResolvedTheme,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applySettingsToDom);
  } else {
    applySettingsToDom();
  }
})();
