const DEFAULT_SITE_SETTINGS = {
  branding: {
    siteName: "AIC Ziwani CYA",
    churchSubtitle: "Africa Inland Church",
    tabTitleSuffix: "AIC Ziwani CYA",
    splashEnabled: true,
    splashBrand: "AIC Ziwani CYA",
    splashTagline: "Christian Youth Association",
    logoUrl: "/favicon.png",
    faviconUrl: "/favicon.ico?v=2",
    appIconUrl: "/icon-512.png",
    footerCopyright: "© 2026 AIC Ziwani | Africa Inland Church. All Rights Reserved.",
    footerMotto: "Rooted in Christ, Rising for Such a Time as This.",
    pwaName: "AIC Ziwani CYA",
    pwaShortName: "CYA Ziwani",
    pwaDescription: "The AIC Ziwani Christian Youth Association community app.",
    pwaThemeColor: "#c8102e",
  },
  appearance: {
    primaryColor: "#c8102e",
    darkPrimaryColor: "#9e0d23",
    darkModePrimaryColor: "#e53935",
    heroAccentColor: "#a78bfa",
    heroGoldColor: "#fde68a",
    defaultTheme: "light",
    announcementEnabled: false,
    announcementText: "",
    announcementLinkLabel: "",
    announcementLinkUrl: "",
    announcementBgColor: "#c8102e",
  },
  homepage: {
    themeKicker: "CYA Theme Of The Year",
    heroMainWord: "Chosen",
    heroThemeLine: "For Such A Time",
    scriptureRef: "Esther 4:14",
    scriptureText: "You have been positioned by God with purpose, courage and grace for this exact season.",
    heroSubtitle: "This year we are leaning into a calling that is timely, bold and full of responsibility. We are not here by accident. We are here to rise, serve, stand and shine where God has placed us.",
    heroCtaLabel: "Step Into Fellowship",
    heroCtaUrl: "/fellowship",
    themeFootnote: "A year to answer the moment with faith, service and holy courage.",
    spotlightEmptyTitle: "More Gatherings Are On The Way",
    spotlightEmptyText: "No upcoming event is listed right now, but the theme remains our call for the season. Check back soon for the next gathering.",
    aboutHeading: "About Us",
    aboutBody: "AIC Ziwani is committed to spreading the Gospel and nurturing believers through Christ-centered fellowship.",
    ministriesHeading: "Ministries",
    ministryHighlights: [
      { title: "Men's Ministry", description: "Strengthening men in faith and leadership." },
      { title: "Women's Ministry", description: "Empowering women through fellowship and growth." },
      { title: "Children's Ministry", description: "Raising children on Biblical foundations." },
    ],
    recentBlogsCount: 2,
  },
  leadership: {
    pastoralTag: "Spiritual Shepherds",
    pastoralHeading: "Pastoral Leadership",
    pastoralSubtext: "Providing biblical preaching, vision and shepherdship for the church and the youth community.",
    pastors: [
      {
        id: "pastor-1",
        name: "Rev. Patrick Odhiambo",
        badge: "Senior Pastor",
        role: "Senior Pastor & Reverend, AIC Ziwani",
        bio: "Faithfully shepherding the congregation with solid biblical teaching, spiritual counsel and pastoral care. Rev. Odhiambo champions a Christ-centered church where families and young people thrive together in holiness and mission.",
        scripture: "\"Feed the flock of God which is among you, taking the oversight thereof, not by constraint, but willingly; not for filthy lucre, but of a ready mind.\" — 1 Peter 5:2",
        photoUrl: "/rev-patrick-odhiambo.jpg",
        photoPublicId: "",
      },
      {
        id: "pastor-2",
        name: "Pastor Jeffer Wambua",
        badge: "Youth Pastor",
        role: "Youth Pastor, AIC Ziwani CYA",
        bio: "Directing and mentoring the Christian Youth Association (CYA), raising a generation anchored in Scripture, vibrant in worship, bold in evangelism and united in Christian brotherhood and sisterhood.",
        scripture: "\"Let no one despise your youth, but be an example to the believers in word, in conduct, in love, in spirit, in faith, in purity.\" — 1 Timothy 4:12",
        photoUrl: "/pastor-jeffer-wambua.jpg",
        photoPublicId: "",
      },
    ],
    committeeTag: "CYA Leadership",
    committeeHeading: "CYA Executive & Department Committee",
    committeeSubtext: "Dedicated youth servant-leaders steering fellowship boards, praise, community outreach and Scripture discipleship.",
    departments: [
      { id: "exec", label: "Executive", chipLabel: "CYA Executive" },
      { id: "music", label: "Music Department", chipLabel: "Music Ministry" },
      { id: "social", label: "Social Department", chipLabel: "Social Department" },
      { id: "bible", label: "Bible Study", chipLabel: "Bible Study" },
    ],
    committee: [
      {
        id: "cm-1",
        name: "Patrick Muili",
        role: "Chairman",
        department: "exec",
        bio: "Leading the CYA committee, coordinating youth operations and fostering godly unity across all fellowships.",
        photoUrl: "",
        photoPublicId: "",
      },
      {
        id: "cm-2",
        name: "Serah Kitanga",
        role: "Vice Chair",
        department: "exec",
        bio: "Assisting in executive leadership, overseeing youth committee initiatives and encouraging young women in discipleship.",
        photoUrl: "",
        photoPublicId: "",
      },
      {
        id: "cm-3",
        name: "Faith Masila",
        role: "Secretary",
        department: "exec",
        bio: "Managing official communications, event coordination records, meeting documentation and church youth archives.",
        photoUrl: "",
        photoPublicId: "",
      },
      {
        id: "cm-4",
        name: "Faith Mutua",
        role: "Vice Secretary",
        department: "exec",
        bio: "Supporting secretarial duties, registry oversight and active communication with members and department heads.",
        photoUrl: "",
        photoPublicId: "",
      },
      {
        id: "cm-5",
        name: "Abigael Deborah",
        role: "Music Department Chair",
        department: "music",
        bio: "Leading the praise & worship team, choir rehearsals and ushering the congregation into Spirit-filled worship.",
        photoUrl: "",
        photoPublicId: "",
      },
      {
        id: "cm-6",
        name: "Ryan Wambua",
        role: "Assistant Music Department",
        department: "music",
        bio: "Assisting in musical arrangements, sound equipment coordination and instrumentation for worship services.",
        photoUrl: "",
        photoPublicId: "",
      },
      {
        id: "cm-7",
        name: "Mercy Joy",
        role: "Social Department Chair",
        department: "social",
        bio: "Coordinating youth welfare, community bonding activities, retreats, sports days and compassionate member support.",
        photoUrl: "",
        photoPublicId: "",
      },
      {
        id: "cm-8",
        name: "Kelvin Kavithi",
        role: "Bible Study Chair",
        department: "bible",
        bio: "Curating scriptural discussion guides, organizing weekly Bible studies and spurring spiritual growth.",
        photoUrl: "",
        photoPublicId: "",
      },
      {
        id: "cm-9",
        name: "Esther Ndanu",
        role: "Assistant Bible Study",
        department: "bible",
        bio: "Facilitating study groups, scripture reading follow-ups and encouraging youth to read and apply God's Word daily.",
        photoUrl: "",
        photoPublicId: "",
      },
    ],
  },
  schedule_contact: {
    sanctuaryName: "AIC Ziwani Main Sanctuary",
    locationAddress: "AIC Ziwani Church, Ziwani Estate, Kariokor Ward, Nairobi, Kenya. Visitors and new members are warmly welcomed at all services!",
    phone: "+254 715 325 645",
    email: "info@aicziwani.org",
    whatsappNumber: "254715325645",
    whatsappMessage: "Hello AIC Ziwani CYA, I would like to get in touch.",
    services: [
      {
        name: "Sunday Bible Study",
        description: "Interactive Scripture study and reflection",
        time: "8:25 AM – 10:00 AM",
        featured: false,
      },
      {
        name: "Sunday Church Service",
        description: "Main congregational worship and sermon",
        time: "10:30 AM – 12:30 PM",
        featured: false,
      },
      {
        name: "Youth Fellowship (CYA)",
        description: "High-energy praise, Word and youth community",
        time: "1:00 PM – 3:00 PM",
        featured: true,
      },
      {
        name: "Midweek Fellowship",
        description: "Midweek prayer and fellowship",
        time: "Every 1st & 3rd Week",
        featured: false,
      },
      {
        name: "Online Bible Studies",
        description: "Virtual Friday evening discipleship",
        time: "Fridays 8:45 PM – 10:00 PM",
        featured: false,
      },
    ],
    socials: {
      instagram: { enabled: true, url: "https://www.instagram.com/aic_ziwani_youth/" },
      tiktok: { enabled: true, url: "https://www.tiktok.com/@cya.ziwani" },
      whatsapp: { enabled: true, url: "https://wa.me/254715325645" },
      youtube: { enabled: false, url: "" },
      facebook: { enabled: false, url: "" },
      x: { enabled: false, url: "" },
    },
    contactFormHeading: "Send a Message or Prayer Request",
    contactFormSubtext: "Have a question, need spiritual guidance, want to join a department, or have a prayer need? Share it with us in confidence.",
    contactFormToast: "✨ Amen! Thank you for reaching out. Your message has been saved for our leadership team. We stand with you in faith and will get back to you shortly.",
    contactDepartments: [
      { value: "general", label: "General Inquiries / Church Office" },
      { value: "pastoral", label: "Pastoral Care & Counseling (Confidential)" },
      { value: "prayer", label: "Prayer Request Ministry" },
      { value: "cya_exec", label: "CYA Executive Committee" },
      { value: "music", label: "Music & Worship Ministry" },
      { value: "bible_study", label: "Bible Study & Discipleship" },
      { value: "social", label: "Social Welfare & Fellowship" },
    ],
  },
  pages_nav: {
    nav: {
      fellowship: { visible: true, label: "Fellowship" },
      events: { visible: true, label: "Events" },
      gallery: { visible: true, label: "Gallery" },
      blog: { visible: true, label: "Blog" },
      contact: { visible: true, label: "Contact" },
    },
    fellowshipTitle: "Fellowship Hub For Real Conversations And Shared Planning",
    fellowshipSubtitle: "The fellowship page is now centered on discussion, gender-specific spaces and a shared planning board so men and women can raise matters that affect them, respond to one another and organize the next steps together.",
    fellowshipRooms: {
      maleLabel: "Men's Room",
      maleCopy: "A focused space for men's matters, questions and accountability conversations.",
      femaleLabel: "Women's Room",
      femaleCopy: "A focused space for women's matters, encouragement and practical support.",
      allLabel: "Shared Planning",
      allCopy: "A shared board for planning events, follow-ups and ideas that involve the wider fellowship.",
    },
    eventsTitle: "Church Events",
    eventsSubtitle: "Stay updated with what’s happening at AIC Ziwani, including past and upcoming gatherings.",
    galleryTitle: "Gallery",
    gallerySubtitle: "Moments from worship, fellowship and outreach.",
    blogTitle: "Our Blog",
    blogSubtitle: "Devotionals, teachings and updates from AIC Ziwani.",
    contactBadge: "Leadership & Connect",
    contactTitle: "Connect With AIC Ziwani",
    contactSubtitle: "Meet our pastoral guidance team, our CYA youth executive committee and discover every way to visit, pray and grow with us.",
  },
  features_security: {
    maintenanceMode: false,
    maintenanceTitle: "We Will Be Back Shortly",
    maintenanceMessage: "AIC Ziwani CYA is currently undergoing scheduled maintenance. Please check back in a few minutes.",
    allowRegistration: true,
    allowGoogleLogin: true,
    allowBlogComments: true,
    allowGalleryComments: true,
    allowFellowshipPosting: true,
    allowEventRsvp: true,
    enablePwaInstallBanner: true,
    enablePushPrompts: true,
    minPasswordLength: 8,
    passwordResetMode: "auto",
  },
  integrations: {
    gtmId: "GTM-PDRVX92S",
    googleSiteVerification: "",
    defaultPushTitle: "AIC Ziwani CYA",
    defaultPushUrl: "/events",
  },
};

const VALID_SECTIONS = Object.keys(DEFAULT_SITE_SETTINGS);

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizeString(value, fallback = "", maxLen = 1000) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.slice(0, maxLen);
}

function sanitizeRequiredString(value, fallback = "", maxLen = 1000) {
  const cleaned = sanitizeString(value, fallback, maxLen);
  return cleaned || fallback;
}

function sanitizeBoolean(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function sanitizeInt(value, fallback, min, max) {
  const num = Number.parseInt(value, 10);
  if (!Number.isFinite(num)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, num));
}

function sanitizeColor(value, fallback = "#c8102e") {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed) ? trimmed : fallback;
}

function sanitizeUrl(value, fallback = "", { allowEmpty = false } = {}) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return allowEmpty ? "" : fallback;
  }

  if (/^\/\/|^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return fallback;
  }

  if (trimmed.startsWith("/")) {
    return trimmed.slice(0, 1000);
  }

  try {
    const parsed = new URL(trimmed);
    if (["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) {
      return trimmed.slice(0, 1000);
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function sanitizeGtmId(value, fallback = "GTM-PDRVX92S") {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim().toUpperCase();
  if (!trimmed) {
    return "";
  }

  return /^(GTM|G)-[A-Z0-9]{4,20}$/.test(trimmed) ? trimmed : fallback;
}

function sanitizeId(value, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }

  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || fallback;
}

function sanitizeBranding(input = {}) {
  const def = DEFAULT_SITE_SETTINGS.branding;
  return {
    siteName: sanitizeRequiredString(input.siteName, def.siteName, 80),
    churchSubtitle: sanitizeRequiredString(input.churchSubtitle, def.churchSubtitle, 80),
    tabTitleSuffix: sanitizeRequiredString(input.tabTitleSuffix, def.tabTitleSuffix, 80),
    splashEnabled: sanitizeBoolean(input.splashEnabled, def.splashEnabled),
    splashBrand: sanitizeRequiredString(input.splashBrand, def.splashBrand, 80),
    splashTagline: sanitizeString(input.splashTagline ?? def.splashTagline, def.splashTagline, 120),
    logoUrl: sanitizeUrl(input.logoUrl, def.logoUrl),
    faviconUrl: sanitizeUrl(input.faviconUrl, def.faviconUrl),
    appIconUrl: sanitizeUrl(input.appIconUrl, def.appIconUrl),
    footerCopyright: sanitizeRequiredString(input.footerCopyright, def.footerCopyright, 240),
    footerMotto: sanitizeString(input.footerMotto ?? def.footerMotto, def.footerMotto, 240),
    pwaName: sanitizeRequiredString(input.pwaName, def.pwaName, 80),
    pwaShortName: sanitizeRequiredString(input.pwaShortName, def.pwaShortName, 40),
    pwaDescription: sanitizeRequiredString(input.pwaDescription, def.pwaDescription, 240),
    pwaThemeColor: sanitizeColor(input.pwaThemeColor, def.pwaThemeColor),
  };
}

function sanitizeAppearance(input = {}) {
  const def = DEFAULT_SITE_SETTINGS.appearance;
  const themeChoice = ["light", "dark", "system"].includes(input.defaultTheme)
    ? input.defaultTheme
    : def.defaultTheme;

  return {
    primaryColor: sanitizeColor(input.primaryColor, def.primaryColor),
    darkPrimaryColor: sanitizeColor(input.darkPrimaryColor, def.darkPrimaryColor),
    darkModePrimaryColor: sanitizeColor(input.darkModePrimaryColor, def.darkModePrimaryColor),
    heroAccentColor: sanitizeColor(input.heroAccentColor, def.heroAccentColor),
    heroGoldColor: sanitizeColor(input.heroGoldColor, def.heroGoldColor),
    defaultTheme: themeChoice,
    announcementEnabled: sanitizeBoolean(input.announcementEnabled, def.announcementEnabled),
    announcementText: sanitizeString(input.announcementText ?? def.announcementText, def.announcementText, 280),
    announcementLinkLabel: sanitizeString(input.announcementLinkLabel ?? def.announcementLinkLabel, def.announcementLinkLabel, 60),
    announcementLinkUrl: sanitizeUrl(input.announcementLinkUrl, def.announcementLinkUrl, { allowEmpty: true }),
    announcementBgColor: sanitizeColor(input.announcementBgColor, def.announcementBgColor),
  };
}

function sanitizeHomepage(input = {}) {
  const def = DEFAULT_SITE_SETTINGS.homepage;
  const rawHighlights = Array.isArray(input.ministryHighlights)
    ? input.ministryHighlights
    : def.ministryHighlights;
  const ministryHighlights = rawHighlights
    .slice(0, 12)
    .map((item) => ({
      title: sanitizeString(item?.title, "", 80),
      description: sanitizeString(item?.description, "", 280),
    }))
    .filter((item) => item.title || item.description);

  return {
    themeKicker: sanitizeRequiredString(input.themeKicker, def.themeKicker, 80),
    heroMainWord: sanitizeRequiredString(input.heroMainWord, def.heroMainWord, 60),
    heroThemeLine: sanitizeRequiredString(input.heroThemeLine, def.heroThemeLine, 120),
    scriptureRef: sanitizeRequiredString(input.scriptureRef, def.scriptureRef, 80),
    scriptureText: sanitizeRequiredString(input.scriptureText, def.scriptureText, 400),
    heroSubtitle: sanitizeRequiredString(input.heroSubtitle, def.heroSubtitle, 600),
    heroCtaLabel: sanitizeRequiredString(input.heroCtaLabel, def.heroCtaLabel, 60),
    heroCtaUrl: sanitizeUrl(input.heroCtaUrl, def.heroCtaUrl),
    themeFootnote: sanitizeString(input.themeFootnote ?? def.themeFootnote, def.themeFootnote, 200),
    spotlightEmptyTitle: sanitizeRequiredString(input.spotlightEmptyTitle, def.spotlightEmptyTitle, 120),
    spotlightEmptyText: sanitizeRequiredString(input.spotlightEmptyText, def.spotlightEmptyText, 400),
    aboutHeading: sanitizeRequiredString(input.aboutHeading, def.aboutHeading, 80),
    aboutBody: sanitizeRequiredString(input.aboutBody, def.aboutBody, 1200),
    ministriesHeading: sanitizeRequiredString(input.ministriesHeading, def.ministriesHeading, 80),
    ministryHighlights: ministryHighlights.length > 0 ? ministryHighlights : deepClone(def.ministryHighlights),
    recentBlogsCount: sanitizeInt(input.recentBlogsCount, def.recentBlogsCount, 1, 6),
  };
}

function sanitizeLeadership(input = {}) {
  const def = DEFAULT_SITE_SETTINGS.leadership;
  const rawPastors = Array.isArray(input.pastors) ? input.pastors : def.pastors;
  const pastors = rawPastors
    .slice(0, 20)
    .map((item, idx) => ({
      id: sanitizeId(item?.id, `pastor-${idx + 1}`),
      name: sanitizeString(item?.name, "", 120),
      badge: sanitizeString(item?.badge, "Pastor", 60),
      role: sanitizeString(item?.role, "", 120),
      bio: sanitizeString(item?.bio, "", 1000),
      scripture: sanitizeString(item?.scripture, "", 400),
      photoUrl: sanitizeUrl(item?.photoUrl, "", { allowEmpty: true }),
      photoPublicId: sanitizeString(item?.photoPublicId, "", 300),
    }))
    .filter((item) => item.name);

  const rawDepts = Array.isArray(input.departments) ? input.departments : def.departments;
  const departments = rawDepts
    .slice(0, 15)
    .map((dept, idx) => ({
      id: sanitizeId(dept?.id, `dept-${idx + 1}`),
      label: sanitizeString(dept?.label, "", 60),
      chipLabel: sanitizeString(dept?.chipLabel ?? dept?.label, "", 60),
    }))
    .filter((dept) => dept.label);

  const validDeptIds = new Set(departments.map((d) => d.id));
  const fallbackDeptId = departments[0]?.id || "exec";

  const rawCommittee = Array.isArray(input.committee) ? input.committee : def.committee;
  const committee = rawCommittee
    .slice(0, 60)
    .map((member, idx) => {
      const deptId = sanitizeId(member?.department, fallbackDeptId);
      return {
        id: sanitizeId(member?.id, `cm-${idx + 1}`),
        name: sanitizeString(member?.name, "", 120),
        role: sanitizeString(member?.role, "", 120),
        department: validDeptIds.has(deptId) ? deptId : fallbackDeptId,
        bio: sanitizeString(member?.bio, "", 500),
        photoUrl: sanitizeUrl(member?.photoUrl, "", { allowEmpty: true }),
        photoPublicId: sanitizeString(member?.photoPublicId, "", 300),
      };
    })
    .filter((member) => member.name);

  return {
    pastoralTag: sanitizeRequiredString(input.pastoralTag, def.pastoralTag, 60),
    pastoralHeading: sanitizeRequiredString(input.pastoralHeading, def.pastoralHeading, 100),
    pastoralSubtext: sanitizeString(input.pastoralSubtext ?? def.pastoralSubtext, def.pastoralSubtext, 300),
    pastors,
    committeeTag: sanitizeRequiredString(input.committeeTag, def.committeeTag, 60),
    committeeHeading: sanitizeRequiredString(input.committeeHeading, def.committeeHeading, 100),
    committeeSubtext: sanitizeString(input.committeeSubtext ?? def.committeeSubtext, def.committeeSubtext, 300),
    departments: departments.length > 0 ? departments : deepClone(def.departments),
    committee,
  };
}

function sanitizeScheduleContact(input = {}) {
  const def = DEFAULT_SITE_SETTINGS.schedule_contact;
  const rawServices = Array.isArray(input.services) ? input.services : def.services;
  const services = rawServices
    .slice(0, 20)
    .map((svc) => ({
      name: sanitizeString(svc?.name, "", 100),
      description: sanitizeString(svc?.description, "", 200),
      time: sanitizeString(svc?.time, "", 100),
      featured: sanitizeBoolean(svc?.featured, false),
    }))
    .filter((svc) => svc.name);

  const rawSocials = input.socials && typeof input.socials === "object" ? input.socials : {};
  const socials = {};
  for (const key of Object.keys(def.socials)) {
    const entry = rawSocials[key] || def.socials[key];
    socials[key] = {
      enabled: sanitizeBoolean(entry?.enabled, def.socials[key].enabled),
      url: sanitizeUrl(entry?.url, def.socials[key].url, { allowEmpty: true }),
    };
  }

  const rawDepartments = Array.isArray(input.contactDepartments)
    ? input.contactDepartments
    : def.contactDepartments;
  const contactDepartments = rawDepartments
    .slice(0, 20)
    .map((item, idx) => ({
      value: sanitizeId(item?.value, `dept-${idx + 1}`),
      label: sanitizeString(item?.label, "", 120),
    }))
    .filter((item) => item.label);

  return {
    sanctuaryName: sanitizeRequiredString(input.sanctuaryName, def.sanctuaryName, 120),
    locationAddress: sanitizeRequiredString(input.locationAddress, def.locationAddress, 400),
    phone: sanitizeRequiredString(input.phone, def.phone, 40),
    email: sanitizeRequiredString(input.email, def.email, 120),
    whatsappNumber: sanitizeString(input.whatsappNumber ?? def.whatsappNumber, def.whatsappNumber, 30).replace(/[^\d]/g, ""),
    whatsappMessage: sanitizeString(input.whatsappMessage ?? def.whatsappMessage, def.whatsappMessage, 240),
    services,
    socials,
    contactFormHeading: sanitizeRequiredString(input.contactFormHeading, def.contactFormHeading, 120),
    contactFormSubtext: sanitizeString(input.contactFormSubtext ?? def.contactFormSubtext, def.contactFormSubtext, 400),
    contactFormToast: sanitizeRequiredString(input.contactFormToast, def.contactFormToast, 400),
    contactDepartments: contactDepartments.length > 0 ? contactDepartments : deepClone(def.contactDepartments),
  };
}

function sanitizePagesNav(input = {}) {
  const def = DEFAULT_SITE_SETTINGS.pages_nav;
  const rawNav = input.nav && typeof input.nav === "object" ? input.nav : {};
  const nav = {};
  for (const key of Object.keys(def.nav)) {
    const item = rawNav[key] || def.nav[key];
    nav[key] = {
      visible: sanitizeBoolean(item?.visible, def.nav[key].visible),
      label: sanitizeRequiredString(item?.label, def.nav[key].label, 40),
    };
  }

  const rawRooms = input.fellowshipRooms && typeof input.fellowshipRooms === "object"
    ? input.fellowshipRooms
    : {};
  const fellowshipRooms = {
    maleLabel: sanitizeRequiredString(rawRooms.maleLabel, def.fellowshipRooms.maleLabel, 60),
    maleCopy: sanitizeRequiredString(rawRooms.maleCopy, def.fellowshipRooms.maleCopy, 240),
    femaleLabel: sanitizeRequiredString(rawRooms.femaleLabel, def.fellowshipRooms.femaleLabel, 60),
    femaleCopy: sanitizeRequiredString(rawRooms.femaleCopy, def.fellowshipRooms.femaleCopy, 240),
    allLabel: sanitizeRequiredString(rawRooms.allLabel, def.fellowshipRooms.allLabel, 60),
    allCopy: sanitizeRequiredString(rawRooms.allCopy, def.fellowshipRooms.allCopy, 240),
  };

  return {
    nav,
    fellowshipTitle: sanitizeRequiredString(input.fellowshipTitle, def.fellowshipTitle, 160),
    fellowshipSubtitle: sanitizeRequiredString(input.fellowshipSubtitle, def.fellowshipSubtitle, 500),
    fellowshipRooms,
    eventsTitle: sanitizeRequiredString(input.eventsTitle, def.eventsTitle, 100),
    eventsSubtitle: sanitizeRequiredString(input.eventsSubtitle, def.eventsSubtitle, 300),
    galleryTitle: sanitizeRequiredString(input.galleryTitle, def.galleryTitle, 100),
    gallerySubtitle: sanitizeRequiredString(input.gallerySubtitle, def.gallerySubtitle, 300),
    blogTitle: sanitizeRequiredString(input.blogTitle, def.blogTitle, 100),
    blogSubtitle: sanitizeRequiredString(input.blogSubtitle, def.blogSubtitle, 300),
    contactBadge: sanitizeRequiredString(input.contactBadge, def.contactBadge, 80),
    contactTitle: sanitizeRequiredString(input.contactTitle, def.contactTitle, 120),
    contactSubtitle: sanitizeRequiredString(input.contactSubtitle, def.contactSubtitle, 400),
  };
}

function sanitizeFeaturesSecurity(input = {}) {
  const def = DEFAULT_SITE_SETTINGS.features_security;
  const resetMode = ["auto", "email", "direct"].includes(input.passwordResetMode)
    ? input.passwordResetMode
    : def.passwordResetMode;

  return {
    maintenanceMode: sanitizeBoolean(input.maintenanceMode, def.maintenanceMode),
    maintenanceTitle: sanitizeRequiredString(input.maintenanceTitle, def.maintenanceTitle, 120),
    maintenanceMessage: sanitizeRequiredString(input.maintenanceMessage, def.maintenanceMessage, 600),
    allowRegistration: sanitizeBoolean(input.allowRegistration, def.allowRegistration),
    allowGoogleLogin: sanitizeBoolean(input.allowGoogleLogin, def.allowGoogleLogin),
    allowBlogComments: sanitizeBoolean(input.allowBlogComments, def.allowBlogComments),
    allowGalleryComments: sanitizeBoolean(input.allowGalleryComments, def.allowGalleryComments),
    allowFellowshipPosting: sanitizeBoolean(input.allowFellowshipPosting, def.allowFellowshipPosting),
    allowEventRsvp: sanitizeBoolean(input.allowEventRsvp, def.allowEventRsvp),
    enablePwaInstallBanner: sanitizeBoolean(input.enablePwaInstallBanner, def.enablePwaInstallBanner),
    enablePushPrompts: sanitizeBoolean(input.enablePushPrompts, def.enablePushPrompts),
    minPasswordLength: sanitizeInt(input.minPasswordLength, def.minPasswordLength, 6, 32),
    passwordResetMode: resetMode,
  };
}

function sanitizeIntegrations(input = {}) {
  const def = DEFAULT_SITE_SETTINGS.integrations;
  const verificationRaw = sanitizeString(
    input.googleSiteVerification ?? def.googleSiteVerification,
    def.googleSiteVerification,
    180
  ).replace(/["<>]/g, "");

  return {
    gtmId: sanitizeGtmId(input.gtmId, def.gtmId),
    googleSiteVerification: verificationRaw,
    defaultPushTitle: sanitizeRequiredString(input.defaultPushTitle, def.defaultPushTitle, 80),
    defaultPushUrl: sanitizeUrl(input.defaultPushUrl, def.defaultPushUrl),
  };
}

const SECTION_SANITIZERS = {
  branding: sanitizeBranding,
  appearance: sanitizeAppearance,
  homepage: sanitizeHomepage,
  leadership: sanitizeLeadership,
  schedule_contact: sanitizeScheduleContact,
  pages_nav: sanitizePagesNav,
  features_security: sanitizeFeaturesSecurity,
  integrations: sanitizeIntegrations,
};

function sanitizeSection(section, data) {
  const sanitizer = SECTION_SANITIZERS[section];
  if (!sanitizer) {
    throw new Error(`Unsupported settings section: ${section}`);
  }

  return sanitizer(data || {});
}

function createSiteSettingsManager({ pool }) {
  let cachedState = null;

  function invalidateCache() {
    cachedState = null;
  }

  async function loadFromDatabase() {
    if (cachedState) {
      return cachedState;
    }

    const result = await pool.query(
      "SELECT section, data, updated_by, updated_by_name, updated_at FROM site_settings"
    );

    const settings = deepClone(DEFAULT_SITE_SETTINGS);
    const meta = {};

    for (const row of result.rows) {
      if (!SECTION_SANITIZERS[row.section]) {
        continue;
      }

      settings[row.section] = sanitizeSection(row.section, {
        ...DEFAULT_SITE_SETTINGS[row.section],
        ...(row.data && typeof row.data === "object" ? row.data : {}),
      });
      meta[row.section] = {
        updatedBy: row.updated_by || null,
        updatedByName: row.updated_by_name || null,
        updatedAt: row.updated_at || null,
      };
    }

    cachedState = { settings, meta };
    return cachedState;
  }

  async function recordAudit({ section, action, actor, summary }) {
    await pool.query(
      `INSERT INTO site_settings_audit (section, action, actor_id, actor_name, summary)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        String(section || "all").slice(0, 80),
        String(action || "update").slice(0, 80),
        actor?.id || null,
        actor?.displayName || actor?.emails?.[0]?.value || "Admin",
        summary ? String(summary).slice(0, 400) : null,
      ]
    );
  }

  async function getAuditLog(limit = 30) {
    const safeLimit = sanitizeInt(limit, 30, 1, 100);
    const result = await pool.query(
      `SELECT id, section, action, actor_id, actor_name, summary, created_at
       FROM site_settings_audit
       ORDER BY created_at DESC
       LIMIT $1`,
      [safeLimit]
    );
    return result.rows;
  }

  async function getAllSettings() {
    const state = await loadFromDatabase();
    return {
      settings: deepClone(state.settings),
      meta: deepClone(state.meta),
    };
  }

  async function getPublicSettings() {
    const state = await loadFromDatabase();
    return {
      ...deepClone(state.settings),
      meta: Object.fromEntries(
        Object.entries(state.meta).map(([section, info]) => [
          section,
          { updatedAt: info.updatedAt || null },
        ])
      ),
    };
  }

  async function updateSection(section, patch, actor, auditSummary = null) {
    if (!SECTION_SANITIZERS[section]) {
      throw new Error(`Invalid settings section: ${section}`);
    }

    const currentState = await loadFromDatabase();
    const merged = {
      ...currentState.settings[section],
      ...(patch && typeof patch === "object" ? patch : {}),
    };
    const sanitized = sanitizeSection(section, merged);
    const actorName = actor?.displayName || actor?.emails?.[0]?.value || "Admin";

    await pool.query(
      `INSERT INTO site_settings (section, data, updated_by, updated_by_name, updated_at)
       VALUES ($1, $2::jsonb, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (section)
       DO UPDATE SET
         data = EXCLUDED.data,
         updated_by = EXCLUDED.updated_by,
         updated_by_name = EXCLUDED.updated_by_name,
         updated_at = CURRENT_TIMESTAMP`,
      [section, JSON.stringify(sanitized), actor?.id || null, actorName]
    );

    await recordAudit({
      section,
      action: "update",
      actor,
      summary: auditSummary || `Updated ${section} settings`,
    });

    invalidateCache();
    return getAllSettings();
  }

  async function resetSection(section, actor) {
    const actorName = actor?.displayName || actor?.emails?.[0]?.value || "Admin";

    if (section === "all") {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (const key of VALID_SECTIONS) {
          await client.query(
            `INSERT INTO site_settings (section, data, updated_by, updated_by_name, updated_at)
             VALUES ($1, $2::jsonb, $3, $4, CURRENT_TIMESTAMP)
             ON CONFLICT (section)
             DO UPDATE SET
               data = EXCLUDED.data,
               updated_by = EXCLUDED.updated_by,
               updated_by_name = EXCLUDED.updated_by_name,
               updated_at = CURRENT_TIMESTAMP`,
            [key, JSON.stringify(DEFAULT_SITE_SETTINGS[key]), actor?.id || null, actorName]
          );
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
      } finally {
        client.release();
      }

      await recordAudit({
        section: "all",
        action: "reset",
        actor,
        summary: "Reset all system settings to factory defaults",
      });

      invalidateCache();
      return getAllSettings();
    }

    if (!SECTION_SANITIZERS[section]) {
      throw new Error(`Invalid settings section: ${section}`);
    }

    const defaults = deepClone(DEFAULT_SITE_SETTINGS[section]);
    await pool.query(
      `INSERT INTO site_settings (section, data, updated_by, updated_by_name, updated_at)
       VALUES ($1, $2::jsonb, $3, $4, CURRENT_TIMESTAMP)
       ON CONFLICT (section)
       DO UPDATE SET
         data = EXCLUDED.data,
         updated_by = EXCLUDED.updated_by,
         updated_by_name = EXCLUDED.updated_by_name,
         updated_at = CURRENT_TIMESTAMP`,
      [section, JSON.stringify(defaults), actor?.id || null, actorName]
    );

    await recordAudit({
      section,
      action: "reset",
      actor,
      summary: `Reset ${section} settings to defaults`,
    });

    invalidateCache();
    return getAllSettings();
  }

  async function importAllSettings(rawPayload, actor) {
    if (!rawPayload || typeof rawPayload !== "object") {
      throw new Error("Invalid JSON settings payload.");
    }

    const actorName = actor?.displayName || actor?.emails?.[0]?.value || "Admin";
    const incoming = rawPayload.settings && typeof rawPayload.settings === "object"
      ? rawPayload.settings
      : rawPayload;

    const currentState = await loadFromDatabase();
    const updatedSections = [];
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      for (const section of VALID_SECTIONS) {
        if (!incoming[section] || typeof incoming[section] !== "object") {
          continue;
        }

        const sanitized = sanitizeSection(section, {
          ...currentState.settings[section],
          ...incoming[section],
        });
        await client.query(
          `INSERT INTO site_settings (section, data, updated_by, updated_by_name, updated_at)
           VALUES ($1, $2::jsonb, $3, $4, CURRENT_TIMESTAMP)
           ON CONFLICT (section)
           DO UPDATE SET
             data = EXCLUDED.data,
             updated_by = EXCLUDED.updated_by,
             updated_by_name = EXCLUDED.updated_by_name,
             updated_at = CURRENT_TIMESTAMP`,
          [section, JSON.stringify(sanitized), actor?.id || null, actorName]
        );
        updatedSections.push(section);
      }

      if (updatedSections.length === 0) {
        throw new Error("No recognized settings sections were found in the imported file.");
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }

    await recordAudit({
      section: "all",
      action: "import",
      actor,
      summary: `Imported settings sections: ${updatedSections.join(", ")}`,
    });

    invalidateCache();
    return getAllSettings();
  }

  return {
    getAllSettings,
    getPublicSettings,
    updateSection,
    resetSection,
    importAllSettings,
    recordAudit,
    getAuditLog,
    invalidateCache,
  };
}

module.exports = {
  DEFAULT_SITE_SETTINGS,
  VALID_SECTIONS,
  sanitizeSection,
  createSiteSettingsManager,
};
