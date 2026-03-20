// ============================================================
//  InboxZen — All-in-One Gmail Organizer
//  v3 — Settings UI + Custom Labels + Advanced Flags
//
//  FILES NEEDED IN YOUR APPS SCRIPT PROJECT:
//    1. InboxZen.gs      ← this file
//    2. InboxZen-UI.html ← the settings dashboard
//
//  FIRST-TIME SETUP:
//    1. Add both files to your Apps Script project
//    2. Enable Gmail API: Services → Gmail API → ON
//    3. Run setupInboxZen() once
//    4. Deploy as Web App to open the Settings UI
// ============================================================

// ─────────────────────────────────────────────────────────────
//  DEFAULT CONFIGURATION
//  All values can be overridden live via the Settings UI.
// ─────────────────────────────────────────────────────────────
const DEFAULTS = {
  config: {
    archiveReadAfterDays:              14,
    archiveUnreadLowPriorityAfterDays: 7,
    sendDailyDigest:                   true,
    digestHour:                        7,
    digestOnlyOnWeekdays:              true,
    enableFocusInbox:                  true,
    autoReadNotifications:             true,
    archiveStaleThreads:               false,
    staleThreadDays:                   60,
    maxThreadsPerRun:                  200,
    neverTouchSenders: [
      "payroll@", "hr@", "irs.gov", "dmv.", "medicare", "socialsecurity"
    ],
  },
  categories: {
    finance:       { enabled: true,  autoRead: false, skipInbox: false, star: true,  flags: {} },
    receipts:      { enabled: true,  autoRead: true,  skipInbox: true,  star: false, flags: {} },
    travel:        { enabled: true,  autoRead: false, skipInbox: false, star: false, flags: {} },
    social:        { enabled: true,  autoRead: true,  skipInbox: true,  star: false, flags: {} },
    newsletters:   { enabled: true,  autoRead: false, skipInbox: true,  star: false, flags: {} },
    notifications: { enabled: true,  autoRead: true,  skipInbox: true,  star: false, flags: {} },
    promotions:    { enabled: true,  autoRead: true,  skipInbox: true,  star: false, flags: {} },
  },
  customLabels: [],
};

// ─────────────────────────────────────────────────────────────
//  ADVANCED FLAGS DEFINITIONS
//  The UI reads this to render toggles. The runtime applies them.
// ─────────────────────────────────────────────────────────────
const ADVANCED_FLAGS = {

  finance: [
    { id: "keepInInbox",    label: "Always keep in inbox",          desc: "Override any skip-inbox behavior",             defaultOn: true  },
    { id: "starAll",        label: "Star all finance emails",        desc: "Ensure nothing gets missed",                   defaultOn: true  },
    { id: "flagOverdraft",  label: "Highlight overdraft & fraud",    desc: "Keeps alerts extra visible",                   defaultOn: true  },
    { id: "flagTaxDocs",    label: "Highlight tax documents",        desc: "Tax-subject emails stay unread",               defaultOn: true  },
    { id: "alertsOnly",     label: "Only process alert emails",      desc: "Ignore promotional bank marketing",            defaultOn: false },
  ],

  receipts: [
    { id: "keepRefunds",       label: "Keep refunds in inbox",          desc: "Returns & refunds stay visible",            defaultOn: true  },
    { id: "highlightDelivery", label: "Don't auto-read delivery alerts", desc: "Out-for-delivery stays unread",            defaultOn: false },
    { id: "separateRefunds",   label: "Sub-label: 🔄 Refunds",          desc: "Refunds get their own nested label",        defaultOn: false },
    { id: "separateDelivery",  label: "Sub-label: 📦 Deliveries",       desc: "Shipping updates get their own label",      defaultOn: false },
    { id: "trashAfter90",      label: "Trash receipts after 90 days",   desc: "Auto-purge old order confirmations",        defaultOn: false },
  ],

  travel: [
    { id: "starConfirmations", label: "Star booking confirmations",   desc: "Confirmations get starred automatically",    defaultOn: true  },
    { id: "flagAlerts",        label: "Keep delays & cancellations",  desc: "Alert emails are never auto-archived",       defaultOn: true  },
    { id: "archiveMarketing",  label: "Silence travel marketing",     desc: "Auto-read airline/hotel promos",             defaultOn: true  },
    { id: "separateFlights",   label: "Sub-label: ✈️ Flights",        desc: "Flight emails get their own label",          defaultOn: false },
    { id: "separateHotels",    label: "Sub-label: 🏨 Hotels",         desc: "Hotel emails get their own label",           defaultOn: false },
  ],

  social: [
    { id: "separateLinkedIn",   label: "Sub-label: 💼 LinkedIn",      desc: "LinkedIn gets its own label",                defaultOn: false },
    { id: "separateDiscord",    label: "Sub-label: 🎮 Discord",        desc: "Discord gets its own label",                defaultOn: false },
    { id: "separateYouTube",    label: "Sub-label: ▶️ YouTube",        desc: "YouTube gets its own label",                defaultOn: false },
    { id: "keepDirectMessages", label: "Keep DMs in inbox",            desc: "Direct messages stay visible",              defaultOn: false },
    { id: "blockAllSocial",     label: "Nuclear: archive without label",desc: "Social emails vanish with no trace",        defaultOn: false },
  ],

  newsletters: [
    { id: "neverAutoRead",   label: "Never auto-read newsletters",    desc: "Keep unread until you choose to open",      defaultOn: false },
    { id: "separateSubstack",label: "Sub-label: 📝 Substack",         desc: "Substack newsletters get their own label",  defaultOn: false },
    { id: "archiveAfter30",  label: "Archive newsletters after 30d",  desc: "Unread newsletters swept after 30 days",   defaultOn: false },
    { id: "digestOnly",      label: "Only label digest-style emails", desc: "Ignore one-off newsletter blasts",          defaultOn: false },
  ],

  notifications: [
    { id: "keepFailures",      label: "Keep failures in inbox",        desc: "Build/alert failures are never archived",   defaultOn: true  },
    { id: "separateGitHub",    label: "Sub-label: 🐙 GitHub",          desc: "GitHub notifications in their own label",  defaultOn: false },
    { id: "separateCI",        label: "Sub-label: ⚙️ CI/CD",           desc: "Build pipeline alerts in their own label", defaultOn: false },
    { id: "separateMonitoring",label: "Sub-label: 📡 Monitoring",      desc: "Uptime/error alerts in their own label",   defaultOn: false },
    { id: "trashResolved",     label: "Auto-trash 'Resolved' alerts",  desc: "Clean up auto-resolved monitoring noise",  defaultOn: false },
  ],

  promotions: [
    { id: "neverAutoRead",     label: "Never auto-read promotions",    desc: "See the unread count, decide yourself",    defaultOn: false },
    { id: "trashAfter7",       label: "Trash promotions after 7 days", desc: "Nuclear option for deal email hoarders",   defaultOn: false },
    { id: "onlyFlashSales",    label: "Only flag time-limited deals",  desc: "Skip routine newsletters posing as deals", defaultOn: false },
  ],

};

// ─────────────────────────────────────────────────────────────
//  BUILT-IN MATCHERS (runtime only — extensible via UI)
// ─────────────────────────────────────────────────────────────
const BASE_MATCHERS = {
  finance: {
    fromContains: [
      "chase.com","bankofamerica","wellsfargo","citibank","usbank",
      "discover.com","americanexpress","paypal.com","venmo.com",
      "cashapp","zelle","mint.com","ynab.com","fidelity.com",
      "vanguard.com","schwab.com","robinhood.com","coinbase.com",
      "turbotax","hrblock.com","quickbooks","expensify.com","stripe.com","square.com",
    ],
    subjectContains: [
      "statement available","payment due","payment received","transfer complete",
      "deposit","invoice","tax document","your bill","account alert",
      "fraud alert","low balance","direct deposit","wire transfer","overdraft",
    ],
  },
  receipts: {
    fromContains: [
      "amazon.com","ebay.com","etsy.com","walmart.com","target.com",
      "bestbuy.com","costco.com","apple.com","store.google.com","shopify.com",
      "doordash.com","ubereats.com","grubhub.com","instacart.com","shipt.com",
      "chewy.com","wayfair.com","overstock.com","macys.com","nordstrom.com",
      "gap.com","hm.com","zara.com","shein.com","temu.com",
    ],
    subjectContains: [
      "your order","order confirmation","order #","order shipped",
      "out for delivery","delivered","your receipt","purchase confirmation",
      "your purchase","thanks for your order","shipment notification",
      "your package","return confirmation","refund processed","refund initiated",
    ],
  },
  travel: {
    fromContains: [
      "united.com","delta.com","aa.com","southwest.com","jetblue.com",
      "alaskaair.com","spirit.com","frontier.com","ryanair.com","easyjet.com",
      "booking.com","airbnb.com","vrbo.com","expedia.com","hotels.com",
      "kayak.com","priceline.com","tripadvisor.com","travelocity.com","orbitz.com",
      "hertz.com","enterprise.com","avis.com","budget.com",
      "uber.com","lyft.com","turo.com","amtrak.com","tripit.com",
    ],
    subjectContains: [
      "booking confirmation","flight confirmation","itinerary",
      "check-in","your trip","reservation confirmed","hotel confirmation",
      "boarding pass","gate change","flight delay","cancellation","travel alert",
    ],
  },
  social: {
    fromContains: [
      "linkedin.com","twitter.com","x.com","facebook.com","instagram.com",
      "tiktok.com","pinterest.com","reddit.com","snapchat.com","discord.com",
      "slack.com","teams.microsoft","whatsapp.com","telegram.org",
      "youtube.com","twitch.tv","medium.com","substack.com",
      "meetup.com","eventbrite.com",
    ],
    subjectContains: [
      "sent you a message","commented on","mentioned you","reacted to",
      "liked your","followed you","connection request","friend request",
      "tagged you","new follower","wants to connect","viewed your profile",
    ],
  },
  newsletters: {
    hasListUnsubscribeHeader: true,
    fromContains: [
      "mailchimp.com","constantcontact.com","campaignmonitor.com",
      "sendgrid.net","klaviyo.com","hubspot.com","marketo.com",
      "newsletter.","digest.","weekly@","monthly@","updates@",
      "noreply@","no-reply@","donotreply@",
    ],
    subjectContains: [
      "weekly digest","daily digest","monthly newsletter","weekly newsletter",
      "weekly roundup","this week in","issue #","edition #","weekly update",
    ],
  },
  notifications: {
    fromContains: [
      "notifications@github.com","notifications@gitlab.com",
      "jira@","atlassian.com","trello.com","asana.com","monday.com",
      "notion.so","clickup.com","linear.app","sentry.io",
      "pagerduty.com","opsgenie.com","circleci.com","travis-ci.com",
      "vercel.com","netlify.com","heroku.com","datadog.com",
      "newrelic.com","pingdom.com","zapier.com","ifttt.com","make.com",
      "zoom.us","webex.com","calendar-notification@",
    ],
    subjectContains: [
      "build failed","build succeeded","deployment","new issue",
      "pull request","merge request","assigned to you","review requested",
      "pipeline","alert triggered","down alert","resolved","automated message",
    ],
  },
  promotions: {
    subjectContains: [
      "% off","% discount","sale ends","flash sale","limited time",
      "don't miss out","exclusive offer","special offer","deal of the day",
      "today only","last chance","save up to","free shipping","promo code",
      "coupon","black friday","cyber monday","buy now","shop now",
      "free trial","upgrade now","unlock premium","referral bonus","earn rewards",
    ],
  },
};

// ─────────────────────────────────────────────────────────────
//  CORE LABEL REGISTRY
// ─────────────────────────────────────────────────────────────
const CORE_LABELS = {
  focus:         { name: "⭐ Focus",            color: "#F2C960" },
  finance:       { name: "💳 Finance",           color: "#E66550" },
  receipts:      { name: "🧾 Receipts & Orders", color: "#A479E2" },
  travel:        { name: "✈️ Travel",            color: "#4986E7" },
  social:        { name: "💬 Social",            color: "#FFB878" },
  newsletters:   { name: "📰 Newsletters",       color: "#16A766" },
  notifications: { name: "🔔 Notifications",    color: "#CCA6AC" },
  promotions:    { name: "🏷️ Promotions",       color: "#89D3B2" },
  unsubscribe:   { name: "🚫 Unsubscribe Me",   color: "#E07798" },
  processed:     { name: "_zen_processed",       color: "#999999" },
};

// Sub-labels created by advanced flags
const FLAG_SUBLABELS = {
  separateRefunds:    { name: "🧾 Receipts & Orders/🔄 Refunds",     color: "#A479E2" },
  separateDelivery:   { name: "🧾 Receipts & Orders/📦 Deliveries",  color: "#A479E2" },
  separateFlights:    { name: "✈️ Travel/✈️ Flights",                color: "#4986E7" },
  separateHotels:     { name: "✈️ Travel/🏨 Hotels",                 color: "#4986E7" },
  separateLinkedIn:   { name: "💬 Social/💼 LinkedIn",               color: "#FFB878" },
  separateDiscord:    { name: "💬 Social/🎮 Discord",                color: "#FFB878" },
  separateYouTube:    { name: "💬 Social/▶️ YouTube",                color: "#FFB878" },
  separateSubstack:   { name: "📰 Newsletters/📝 Substack",          color: "#16A766" },
  separateGitHub:     { name: "🔔 Notifications/🐙 GitHub",          color: "#CCA6AC" },
  separateCI:         { name: "🔔 Notifications/⚙️ CI\u2215CD",       color: "#CCA6AC" },
  separateMonitoring: { name: "🔔 Notifications/📡 Monitoring",      color: "#CCA6AC" },
};

// ─────────────────────────────────────────────────────────────
//  SETTINGS PERSISTENCE
// ─────────────────────────────────────────────────────────────
const SETTINGS_KEY = "inboxzen_settings_v1";

function _loadSettings() {
  const raw = PropertiesService.getUserProperties().getProperty(SETTINGS_KEY);
  if (!raw) return JSON.parse(JSON.stringify(DEFAULTS));
  try {
    return _deepMerge(JSON.parse(JSON.stringify(DEFAULTS)), JSON.parse(raw));
  } catch (e) {
    Logger.log("Settings parse error, using defaults: " + e.message);
    return JSON.parse(JSON.stringify(DEFAULTS));
  }
}

function _saveSettings(s) {
  PropertiesService.getUserProperties().setProperty(SETTINGS_KEY, JSON.stringify(s));
}

function _deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] !== null && typeof source[key] === "object" && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      _deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// ─────────────────────────────────────────────────────────────
//  WEB APP
// ─────────────────────────────────────────────────────────────

function doGet() {
  return HtmlService
    .createHtmlOutputFromFile("InboxZen-UI")
    .setTitle("InboxZen Settings")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getSettings() {
  return {
    settings:      _loadSettings(),
    advancedFlags: ADVANCED_FLAGS,
    defaults:      DEFAULTS,
  };
}

function saveSettings(settings) {
  try {
    _saveSettings(settings);
    _syncLabels(settings);
    _syncDigestTrigger(settings.config);
    return { success: true, message: "Settings saved & labels synced." };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

function runNow() {
  try { runInboxZen(); return { success: true, message: "Processing run complete." }; }
  catch (e) { return { success: false, message: e.message }; }
}

// ─────────────────────────────────────────────────────────────
//  LABEL SYNC
// ─────────────────────────────────────────────────────────────

function _syncLabels(settings) {
  // Core labels always exist
  for (const def of Object.values(CORE_LABELS)) {
    if (!GmailApp.getUserLabelByName(def.name)) GmailApp.createLabel(def.name);
  }

  // Flag sub-labels: create if flag on, delete if flag off
  for (const [flagId, def] of Object.entries(FLAG_SUBLABELS)) {
    const exists     = !!GmailApp.getUserLabelByName(def.name);
    const isEnabled  = _anyFlagEnabled(settings, flagId);
    if (isEnabled && !exists) {
      GmailApp.createLabel(def.name);
      Logger.log(`Created sub-label: ${def.name}`);
    } else if (!isEnabled && exists) {
      try { GmailApp.getUserLabelByName(def.name).deleteLabel(); } catch(e) {}
    }
  }

  // Custom labels
  for (const cl of (settings.customLabels || [])) {
    if (!cl.enabled) continue;
    if (!GmailApp.getUserLabelByName(cl.name)) {
      GmailApp.createLabel(cl.name);
      Logger.log(`Created custom label: ${cl.name}`);
    }
  }
}

function _anyFlagEnabled(settings, flagId) {
  for (const catCfg of Object.values(settings.categories || {})) {
    if (catCfg.flags && catCfg.flags[flagId] === true) return true;
  }
  return false;
}

function _syncDigestTrigger(config) {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === "sendDailyDigest")
    .forEach(t => ScriptApp.deleteTrigger(t));
  if (config.sendDailyDigest) {
    ScriptApp.newTrigger("sendDailyDigest")
      .timeBased().everyDays(1).atHour(config.digestHour).create();
  }
}

// ═════════════════════════════════════════════════════════════
//  CORE ENGINE
// ═════════════════════════════════════════════════════════════

function runInboxZen() {
  const startTime = Date.now();
  Logger.log("🧘 InboxZen starting...");

  const settings = _loadSettings();
  const cfg = settings.config;

  const processedLabel = GmailApp.getUserLabelByName(CORE_LABELS.processed.name)
    || GmailApp.createLabel(CORE_LABELS.processed.name);

  const threads = GmailApp.search(`-label:_zen_processed`, 0, cfg.maxThreadsPerRun);
  Logger.log(`Processing ${threads.length} threads`);

  let categorized = 0, silenced = 0, flaggedUnsub = 0;

  for (const thread of threads) {
    try {
      const messages  = thread.getMessages();
      const firstMsg  = messages[0];
      const latestMsg = messages[messages.length - 1];
      const from      = latestMsg.getFrom().toLowerCase();
      const subject   = latestMsg.getSubject().toLowerCase();
      const body      = latestMsg.getPlainBody().toLowerCase().substring(0, 2000);
      const hasUnsub  = !!latestMsg.getHeader("List-Unsubscribe");

      if (_isProtected(from, cfg.neverTouchSenders)) {
        thread.addLabel(processedLabel);
        continue;
      }

      let matched = false;

      // ── Built-in categories ────────────────────────────
      for (const [catKey, catCfg] of Object.entries(settings.categories)) {
        if (!catCfg.enabled) continue;
        const matchers = BASE_MATCHERS[catKey];
        if (!matchers || !_matchesMatchers(matchers, from, subject, hasUnsub)) continue;

        matched = true;
        categorized++;

        const flags     = catCfg.flags || {};
        const autoRead  = _flagTrue(flags, "neverAutoRead") ? false : catCfg.autoRead;
        const skipInbox = _flagTrue(flags, "keepInInbox")   ? false : catCfg.skipInbox;
        const star      = _flagTrue(flags, "starAll") || _flagTrue(flags, "starConfirmations") || catCfg.star;

        const coreLbl = CORE_LABELS[catKey] ? GmailApp.getUserLabelByName(CORE_LABELS[catKey].name) : null;
        if (coreLbl) thread.addLabel(coreLbl);

        _applySubLabels(thread, catKey, flags, from, subject);

        if (autoRead) { thread.markRead(); silenced++; }
        if (skipInbox) thread.moveToArchive();
        if (star) firstMsg.star();

        break;
      }

      // ── Custom labels ──────────────────────────────────
      if (!matched) {
        for (const cl of (settings.customLabels || [])) {
          if (!cl.enabled || !_matchesCustom(cl, from, subject)) continue;
          matched = true;
          categorized++;
          const lbl = GmailApp.getUserLabelByName(cl.name);
          if (lbl) thread.addLabel(lbl);
          if (cl.autoRead)  { thread.markRead(); silenced++; }
          if (cl.skipInbox) thread.moveToArchive();
          if (cl.star)      firstMsg.star();
          break;
        }
      }

      // ── Focus inbox ────────────────────────────────────
      if (!matched && cfg.enableFocusInbox && _looksHuman(thread, subject)) {
        const fl = GmailApp.getUserLabelByName(CORE_LABELS.focus.name);
        if (fl) thread.addLabel(fl);
      }

      // ── Unsubscribe detector ───────────────────────────
      if (_shouldFlagUnsub(body, hasUnsub)) {
        const ul = GmailApp.getUserLabelByName(CORE_LABELS.unsubscribe.name);
        if (ul) { thread.addLabel(ul); flaggedUnsub++; }
      }

      thread.addLabel(processedLabel);
    } catch (e) {
      Logger.log(`Thread error: ${e.message}`);
    }
  }

  const archived = _archiveOldMail(cfg);
  if (cfg.archiveStaleThreads) _archiveStale(cfg);

  Logger.log(`✅ Done in ${((Date.now()-startTime)/1000).toFixed(1)}s — ` +
    `Categorized:${categorized} Silenced:${silenced} Unsub:${flaggedUnsub} Archived:${archived}`);
}

// ─────────────────────────────────────────────────────────────
//  MATCHING
// ─────────────────────────────────────────────────────────────

function _matchesMatchers(m, from, subject, hasUnsub) {
  if (m.hasListUnsubscribeHeader && hasUnsub) return true;
  if (m.fromContains && m.fromContains.some(function(f) { return from.includes(f.toLowerCase()); })) return true;
  if (m.subjectContains && m.subjectContains.some(function(s) { return subject.includes(s.toLowerCase()); })) return true;
  return false;
}

function _matchesCustom(cl, from, subject) {
  if (cl.fromRules && cl.fromRules.some(function(r) { return r && from.includes(r.toLowerCase()); })) return true;
  if (cl.subjectRules && cl.subjectRules.some(function(r) { return r && subject.includes(r.toLowerCase()); })) return true;
  return false;
}

function _isProtected(from, list) {
  return (list || []).some(f => f && from.includes(f.toLowerCase()));
}

function _looksHuman(thread, subject) {
  if (thread.isImportant() || thread.hasStarredMessages()) return true;
  if (thread.getMessageCount() > 1) return true;
  return ["hi ", "hello ", "dear ", "following up", "quick question", "re:"]
    .some(p => subject.startsWith(p));
}

function _shouldFlagUnsub(body, hasUnsub) {
  if (hasUnsub) return true;
  return ["unsubscribe","opt out","opt-out","manage preferences","stop receiving"]
    .some(s => body.includes(s));
}

function _flagTrue(flags, id) { return !!(flags && flags[id] === true); }

// ─────────────────────────────────────────────────────────────
//  SUB-LABEL APPLICATION
// ─────────────────────────────────────────────────────────────

function _applySubLabels(thread, catKey, flags, from, subject) {
  const add = (flagId) => {
    if (!_flagTrue(flags, flagId)) return;
    const def = FLAG_SUBLABELS[flagId];
    if (!def) return;
    const l = GmailApp.getUserLabelByName(def.name);
    if (l) thread.addLabel(l);
  };
  switch (catKey) {
    case "receipts":
      if (subject.match(/refund|return/)) add("separateRefunds");
      if (subject.match(/delivered|out for delivery/)) add("separateDelivery");
      break;
    case "travel":
      if (from.match(/united|delta|aa\.com|southwest|jetblue|alaska|spirit|frontier|ryanair|easyjet/)) add("separateFlights");
      if (from.match(/booking\.com|airbnb|hotels\.com|marriott|hilton|hyatt/)) add("separateHotels");
      break;
    case "social":
      if (from.includes("linkedin")) add("separateLinkedIn");
      if (from.includes("discord")) add("separateDiscord");
      if (from.includes("youtube")) add("separateYouTube");
      break;
    case "newsletters":
      if (from.includes("substack")) add("separateSubstack");
      break;
    case "notifications":
      if (from.match(/github|gitlab/)) add("separateGitHub");
      if (from.match(/circleci|travis|jenkins|vercel|netlify|heroku/)) add("separateCI");
      if (from.match(/datadog|newrelic|pingdom|pagerduty|opsgenie|sentry/)) add("separateMonitoring");
      if (_flagTrue(flags, "keepFailures") && subject.match(/fail|error|down|critical/)) thread.markUnread();
      break;
  }
}

// ─────────────────────────────────────────────────────────────
//  ARCHIVING
// ─────────────────────────────────────────────────────────────

function _archiveOldMail(cfg) {
  const threads = GmailApp.search(
    `in:inbox is:read older_than:${cfg.archiveReadAfterDays}d -is:starred`, 0, cfg.maxThreadsPerRun
  ).filter(t => !_isProtected(t.getMessages()[0].getFrom().toLowerCase(), cfg.neverTouchSenders));
  if (threads.length) GmailApp.moveThreadsToArchive(threads);

  const lp = GmailApp.search(
    `in:inbox is:unread older_than:${cfg.archiveUnreadLowPriorityAfterDays}d ` +
    `(label:🔔-Notifications OR label:💬-Social OR label:🏷️-Promotions)`, 0, 100
  );
  if (lp.length) GmailApp.moveThreadsToArchive(lp);
  return threads.length + lp.length;
}

function _archiveStale(cfg) {
  const threads = GmailApp.search(
    `in:inbox older_than:${cfg.staleThreadDays}d -is:starred -is:important`, 0, 50
  ).filter(t => !_isProtected(t.getMessages()[0].getFrom().toLowerCase(), cfg.neverTouchSenders));
  if (threads.length) GmailApp.moveThreadsToArchive(threads);
  return threads.length;
}

// ─────────────────────────────────────────────────────────────
//  DAILY DIGEST
// ─────────────────────────────────────────────────────────────

function sendDailyDigest() {
  const settings = _loadSettings();
  const cfg = settings.config;
  if (!cfg.sendDailyDigest) return;
  const now = new Date();
  if (cfg.digestOnlyOnWeekdays && [0,6].includes(now.getDay())) return;

  const me          = Session.getActiveUser().getEmail();
  const unsubCount  = GmailApp.search("label:🚫-Unsubscribe-Me is:unread", 0, 100).length;
  const focusItems  = GmailApp.search("label:⭐-Focus is:unread", 0, 10);
  const financeNew  = GmailApp.search("label:💳-Finance is:unread", 0, 5);
  const travelNew   = GmailApp.search("label:✈️-Travel is:unread", 0, 5);
  const receiptsNew = GmailApp.search("label:🧾-Receipts-Orders is:unread", 0, 5);

  var customSections = (settings.customLabels || [])
    .filter(function(cl) { return cl.enabled; })
    .map(function(cl) {
      var labelQuery = "label:" + cl.name.replace(/\s/g, "-") + " is:unread";
      var items = GmailApp.search(labelQuery, 0, 5);
      if (!items.length) return null;
      return { title: (cl.emoji || "📌") + " " + cl.name, items: items, color: cl.color || "#888" };
    })
    .filter(function(s) { return s !== null; });

  var unsubHtml = unsubCount
    ? "<p style=\"color:#E07798;\">🚫 <strong>" + unsubCount + "</strong> unsubscribe candidates</p>"
    : "";

  var html = "<div style=\"font-family:'Georgia',serif;max-width:600px;margin:0 auto;color:#1a1a2e;background:#f8f6f0;padding:32px;border-radius:12px;\">"
    + "<h1 style=\"font-size:28px;margin:0 0 4px;\">🧘 Morning Briefing</h1>"
    + "<p style=\"color:#666;margin:0 0 24px;font-size:14px;\">" + now.toDateString() + "</p>"
    + "<div style=\"background:white;border-radius:8px;padding:20px;margin-bottom:16px;border-left:4px solid #F2C960;\">"
    + "<h2 style=\"font-size:16px;margin:0 0 8px;\">📊 Overview</h2>"
    + "<p>Unread: <strong>" + GmailApp.getInboxUnreadCount() + "</strong></p>"
    + unsubHtml
    + "</div>";

  if (focusItems.length)  html += _digestSection("⭐ Focus — Needs Attention", focusItems, "#F2C960");
  if (financeNew.length)  html += _digestSection("💳 Finance", financeNew, "#E66550");
  if (travelNew.length)   html += _digestSection("✈️ Travel", travelNew, "#4986E7");
  if (receiptsNew.length) html += _digestSection("🧾 Recent Orders", receiptsNew, "#A479E2");
  for (var si = 0; si < customSections.length; si++) {
    var sec = customSections[si];
    html += _digestSection(sec.title, sec.items, sec.color);
  }
  html += "<p style=\"font-size:12px;color:#aaa;margin-top:24px;text-align:center;\">InboxZen &middot; <a href=\"https://mail.google.com\" style=\"color:#aaa;\">Open Gmail</a></p></div>";

  GmailApp.sendEmail(me, "🧘 Morning Briefing — " + now.toDateString(), "", { htmlBody: html });
}

function _digestSection(title, threads, color) {
  var items = threads.map(function(t) {
    var subj = (t.getFirstMessageSubject() || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
    return "<li style=\"margin:5px 0;\">" + subj + "</li>";
  }).join("");
  return "<div style=\"background:white;border-radius:8px;padding:20px;margin-bottom:16px;border-left:4px solid " + color + ";\">"
    + "<h2 style=\"font-size:16px;margin:0 0 10px;\">" + title + "</h2>"
    + "<ul style=\"margin:0;padding-left:20px;\">" + items + "</ul></div>";
}

// ─────────────────────────────────────────────────────────────
//  UTILITIES
// ─────────────────────────────────────────────────────────────

function listUnsubscribeCandidates() {
  const tally = {};
  GmailApp.search("label:🚫-Unsubscribe-Me", 0, 100).forEach(t => {
    const f = t.getMessages()[0].getFrom();
    tally[f] = (tally[f]||0)+1;
  });
  const sorted = Object.entries(tally).sort((a,b)=>b[1]-a[1]);
  Logger.log("📋 Unsubscribe Candidates:");
  sorted.forEach(([s,n]) => Logger.log(`  ${String(n).padStart(4)}×  ${s}`));
  return sorted;
}

// ═════════════════════════════════════════════════════════════
//  SCRATCH RESET
// ═════════════════════════════════════════════════════════════

function previewReset() {
  Logger.log("════════════════════════════════");
  Logger.log("  InboxZen Reset Preview");
  Logger.log("════════════════════════════════");
  const labels = GmailApp.getUserLabels();
  Logger.log(`\n📋 USER LABELS (${labels.length}):`);
  labels.forEach(l => Logger.log(`   • ${l.getName()}`));
  const filters = _listFilters();
  Logger.log(`\n🔽 FILTERS: ${filters === null ? "⚠️ Gmail API not enabled" : filters.length + " found"}`);
  if (filters && filters.length) filters.forEach(function(f, i) {
    var c = f.criteria || {};
    var parts = [];
    if (c.from)    parts.push("from:" + c.from);
    if (c.subject) parts.push("subj:" + c.subject);
    var crit = parts.length ? parts.join(", ") : "(no criteria)";
    Logger.log("   " + (i + 1) + ". [" + crit + "]");
  });
  Logger.log("\n→ Run resetInboxToScratch() to commit.\n");
}

function resetInboxToScratch() {
  Logger.log("🧹 Resetting...");
  const lc = _nukeAllUserLabels();
  const fc = _nukeAllFilters();
  Logger.log(`✅ Labels: ${lc} | Filters: ${fc === null ? "skipped (enable Gmail API)" : fc}`);
}

function _nukeAllUserLabels() {
  let n = 0;
  GmailApp.getUserLabels().forEach(l => { try { l.deleteLabel(); n++; } catch(e){} });
  return n;
}

function _nukeAllFilters() {
  const f = _listFilters();
  if (!f) return null;
  let n = 0;
  f.forEach(fil => { try { Gmail.Users.Settings.Filters.remove("me", fil.id); n++; } catch(e){} });
  return n;
}

function _listFilters() {
  try { return Gmail.Users.Settings.Filters.list("me").filter || []; }
  catch(e) { return null; }
}

function resetProcessedFlag() {
  const lbl = GmailApp.getUserLabelByName("_zen_processed");
  if (!lbl) { Logger.log("Not found."); return; }
  let batch, total = 0;
  do {
    batch = GmailApp.search("label:_zen_processed", 0, 500);
    batch.forEach(t => t.removeLabel(lbl));
    total += batch.length;
  } while (batch.length === 500);
  Logger.log(`Removed flag from ${total} threads.`);
}

// ═════════════════════════════════════════════════════════════
//  SETUP & TEARDOWN
// ═════════════════════════════════════════════════════════════

function setupInboxZen() {
  Logger.log("🚀 InboxZen v3 — Full Setup");
  Logger.log("════════════════════════════════");

  Logger.log("1/5 — Resetting to scratch...");
  resetInboxToScratch();

  Logger.log("2/5 — Clearing triggers...");
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  Logger.log("3/5 — Creating labels...");
  const settings = _loadSettings();
  _syncLabels(settings);

  Logger.log("4/5 — Installing triggers...");
  ScriptApp.newTrigger("runInboxZen").timeBased().everyHours(1).create();
  if (settings.config.sendDailyDigest) {
    ScriptApp.newTrigger("sendDailyDigest")
      .timeBased().everyDays(1).atHour(settings.config.digestHour).create();
  }

  Logger.log("5/5 — First pass...");
  runInboxZen();

  Logger.log("\n════════════════════════════════");
  Logger.log("🎉 InboxZen is live!");
  Logger.log("   → Deploy as Web App to open the Settings UI");
  Logger.log("════════════════════════════════");
}

function teardownInboxZen() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  Object.values(CORE_LABELS).forEach(def => {
    const l = GmailApp.getUserLabelByName(def.name);
    if (l) try { l.deleteLabel(); } catch(e) {}
  });
  PropertiesService.getUserProperties().deleteProperty(SETTINGS_KEY);
  Logger.log("InboxZen fully removed.");
}
