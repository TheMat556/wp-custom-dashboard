/**
 * Lightweight i18n utility for the WP React UI shell.
 * Translates based on the WP locale injected by PHP (e.g. "de_DE", "de_AT").
 * Falls back to English (key) when no translation exists.
 */

type Vars = Record<string, string | number>;

function interpolate(str: string, vars?: Vars): string {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

/* ── German translations ─────────────────────────────────────────────────── */
const de: Record<string, string> = {
  // Greetings
  "Good morning": "Guten Morgen",
  "Good afternoon": "Guten Tag",
  "Good evening": "Guten Abend",
  "Good night": "Gute Nacht",

  // Hero
  "View Site": "Website ansehen",
  "New Page": "Neue Seite",
  "New Post": "Neuer Beitrag",
  "{n} page views in the last 30 days": "{n} Seitenaufrufe in den letzten 30 Tagen",
  "Visitor tracking is active — data will appear as people visit your site.":
    "Besuchertracking ist aktiv — Daten erscheinen, sobald Besucher Ihre Website aufrufen.",
  "{n}% ready": "{n}% bereit",
  "{n}% of setup checklist complete": "{n}% der Einrichtungscheckliste abgeschlossen",
  "Page views — last 7 days": "Seitenaufrufe — letzte 7 Tage",

  // Offline alert
  "Your website is not reachable right now": "Ihre Website ist gerade nicht erreichbar",
  "We could not connect to your homepage.":
    "Wir konnten keine Verbindung zu Ihrer Startseite herstellen.",
  "Your visitors may see an error page.": "Ihre Besucher sehen möglicherweise eine Fehlerseite.",
  "Problem started:": "Problem seit:",
  "Recommended next step:": "Empfohlene Maßnahme:",
  "Contact your hosting provider about your SSL certificate — it may be expired.":
    "Kontaktieren Sie Ihren Hoster wegen des SSL-Zertifikats — es könnte abgelaufen sein.",
  "Check if your domain registration is still active and DNS settings are correct.":
    "Prüfen Sie, ob Ihre Domain noch aktiv ist und die DNS-Einstellungen korrekt sind.",
  "Contact your hosting provider — the server may be overloaded or a plugin may have caused a PHP error.":
    "Kontaktieren Sie Ihren Hoster — der Server ist möglicherweise überlastet oder ein Plugin hat einen PHP-Fehler verursacht.",
  "Contact your hosting provider. Tell them your website is not loading and ask them to check the server.":
    "Kontaktieren Sie Ihren Hoster. Sagen Sie ihnen, dass Ihre Website nicht lädt, und bitten Sie sie, den Server zu prüfen.",
  "Technical details (for developers)": "Technische Details (für Entwickler)",
  "Error class:": "Fehlertyp:",
  "Detail:": "Detail:",
  "Last checked:": "Zuletzt geprüft:",
  "Site Health": "Website-Gesundheit",

  // Summary tiles
  Website: "Website",
  Offline: "Offline",
  Online: "Online",
  Check: "Prüfen",
  "Not reachable": "Nicht erreichbar",
  "Click for details": "Details anzeigen",
  "Visitors (last 30 days)": "Besucher (letzte 30 Tage)",
  "vs yesterday": "ggü. gestern",
  "Stable traffic": "Stabiler Traffic",
  "Tracking active": "Tracking aktiv",
  Updates: "Updates",
  "Checked {t}": "Geprüft {t}",
  "All up to date": "Alles aktuell",
  Speed: "Ladezeit",
  Fast: "Schnell",
  Acceptable: "Akzeptabel",
  Slow: "Langsam",
  WordPress: "WordPress",
  Error: "Fehler",
  Unreachable: "Nicht erreichbar",
  SEO: "SEO",
  "Your search engine visibility": "Ihre Suchmaschinen-Sichtbarkeit",
  "No issues": "Keine Probleme",
  "{n} issue": "{n} Problem",
  "{n} issues": "{n} Probleme",
  "Basic check": "Basisprüfung",
  "Basic check — tap to improve": "Basisprüfung — antippen zum Verbessern",
  "No plugin": "Kein Plugin",
  "Updates fix security issues. Make a backup first, then update.":
    "Updates beheben Sicherheitslücken. Erst ein Backup erstellen, dann updaten.",
  "Everything is up to date": "Alles ist aktuell",
  "Based on Yoast SEO data": "Basierend auf Yoast SEO Daten",
  "Basic SEO checks — install Yoast SEO (free) for full tracking":
    "Basis-SEO-Prüfung — Yoast SEO (kostenlos) für vollständiges Tracking installieren",
  "Install Yoast SEO (free) to track your search visibility":
    "Yoast SEO (kostenlos) installieren, um Ihre Suchsichtbarkeit zu verfolgen",
  "Homepage load time. Under 600 ms is good. Refreshes every 5 minutes.":
    "Ladezeit der Startseite. Unter 600 ms ist gut. Wird alle 5 Minuten aktualisiert.",

  // First steps
  "First Steps — {done} of {total} done": "Erste Schritte — {done} von {total} erledigt",
  "Complete these steps to get your site fully ready. Each one takes just a few minutes.":
    "Schließen Sie diese Schritte ab, um Ihre Website vollständig vorzubereiten. Jeder dauert nur wenige Minuten.",
  "Open →": "Öffnen →",
  "Dismiss checklist": "Checkliste schließen",

  // Charts
  "Page Views": "Seitenaufrufe",
  "Last 30 days": "Letzte 30 Tage",
  "Page views over the last 30 days": "Seitenaufrufe über die letzten 30 Tage",
  "No data yet. Tracking is active — views appear as people visit your site.":
    "Noch keine Daten. Tracking ist aktiv — Aufrufe erscheinen, sobald Besucher Ihre Website besuchen.",
  "Visitors by Country": "Besucher nach Land",
  "Visitor countries over the last 30 days": "Besucherländer über die letzten 30 Tage",
  Visits: "Besuche",
  "Install WP Statistics (free) to track visitor countries.":
    "WP Statistics (kostenlos) installieren, um Besucherländer zu verfolgen.",

  // Upcoming Bookings / Week Calendar
  "Upcoming Bookings": "Anstehende Termine",
  "Next 7 days": "Nächste 7 Tage",
  "View all": "Alle anzeigen",
  "No bookings in the next 7 days": "Keine Termine in den nächsten 7 Tagen",
  "No bookings": "Keine Termine",
  Today: "Heute",
  Tomorrow: "Morgen",
  "Week Overview": "Wochenübersicht",
  "{n} today": "{n} heute",

  // Action Center
  "What Needs Your Attention": "Was Ihre Aufmerksamkeit braucht",
  "All clear": "Alles in Ordnung",
  "{n} urgent, {w} to review": "{n} dringend, {w} zu prüfen",
  "Everything looks great! No action required.":
    "Alles sieht gut aus! Keine Maßnahmen erforderlich.",
  "Start with the red items first — everything else can wait.":
    "Beginnen Sie mit den roten Punkten — alles andere kann warten.",
  "A few things to review. Start with the orange items.":
    "Einiges zu prüfen. Beginnen Sie mit den orangefarbenen Punkten.",
  "Make a backup before applying updates — most hosts offer this in one click.":
    "Erstellen Sie ein Backup vor Updates — die meisten Hoster bieten dies mit einem Klick an.",
  "Act Now": "Sofort handeln",
  "Review Soon": "Bald prüfen",
  "{n} low-priority item": "{n} unwichtiger Punkt",
  "{n} low-priority items": "{n} unwichtige Punkte",
  View: "Ansehen",
  Fix: "Beheben",
  "Update now": "Jetzt updaten",
  "Review now": "Jetzt prüfen",
  "Impact:": "Auswirkung:",

  // Updates
  "Available Updates": "Verfügbare Updates",
  "Review before updating — always backup first":
    "Vor dem Update prüfen — immer erst ein Backup erstellen",
  "Create a backup before updating. Most hosting control panels offer one-click backups.":
    "Erstellen Sie vor dem Update ein Backup. Die meisten Hosting-Panels bieten Ein-Klick-Backups an.",
  "WordPress Core": "WordPress Core",
  Update: "Aktualisieren",
  "Tested WP {v}": "Getestet für WP {v}",

  // Site Status Overview
  "Site Status Overview": "Website-Status-Übersicht",
  "Legal, business and SEO checks": "Rechtliche, geschäftliche und SEO-Prüfungen",
  "All good": "Alles in Ordnung",
  "Action needed": "Handlung erforderlich",
  Active: "Aktiv",

  // Legal
  "Legal & Compliance": "Recht & Compliance",
  "Privacy Policy": "Datenschutzerklärung",
  Impressum: "Impressum",
  "View / Edit": "Ansehen / Bearbeiten",
  Published: "Veröffentlicht",
  "Draft — not public": "Entwurf — nicht öffentlich",
  "Not found": "Nicht gefunden",
  "Cookie consent plugin active.": "Cookie-Einwilligungs-Plugin aktiv.",
  "No cookie/GDPR plugin found. Consider installing one if you use analytics.":
    "Kein Cookie-/DSGVO-Plugin gefunden. Erwägen Sie die Installation, wenn Sie Analytics verwenden.",
  "Tracking plugin detected without a visible cookie consent plugin.":
    "Tracking-Plugin erkannt, aber kein Cookie-Einwilligungs-Plugin gefunden.",
  "Legal page not linked in footer.": "Pflichtseite nicht im Footer verlinkt.",

  // Business
  "Business Functions": "Geschäftliche Funktionen",
  "Business & Contact Functions": "Geschäftliche & Kontaktfunktionen",
  "Key tools your customers use to reach you":
    "Wichtige Tools für Ihre Kunden, um Sie zu erreichen",
  "Booking System": "Buchungssystem",
  "{n} upcoming": "{n} anstehend",
  "Contact Forms": "Kontaktformulare",
  "Email Delivery": "E-Mail-Zustellung",
  "Not installed": "Nicht installiert",
  Configured: "Konfiguriert",
  "Default (unreliable)": "Standard (unzuverlässig)",
  "Without an SMTP plugin, contact form emails may end up in spam. Install WP Mail SMTP (free) to fix this.":
    "Ohne SMTP-Plugin landen E-Mails aus Kontaktformularen im Spam. Installieren Sie WP Mail SMTP (kostenlos) zum Beheben.",
  "Install free": "Kostenlos installieren",
  Review: "Überprüfung",

  // SEO
  "SEO Basics": "SEO-Grundlagen",
  "Basic checks — no SEO plugin required": "Basisprüfung — kein SEO-Plugin erforderlich",
  "Search Visibility": "Suchmaschinen-Sichtbarkeit",
  "Homepage Title": "Startseiten-Titel",
  "Homepage Meta Description": "Startseiten-Meta-Beschreibung",
  Sitemap: "Sitemap",
  "Fix →": "Beheben →",
  "Install Yoast SEO (free) for full SEO tracking, meta descriptions, and XML sitemaps.":
    "Yoast SEO (kostenlos) für vollständiges SEO-Tracking, Meta-Beschreibungen und XML-Sitemaps installieren.",
  "Blocked — site set to discourage search engines":
    "Blockiert — Website für Suchmaschinen gesperrt",
  OK: "OK",
  Missing: "Fehlt",
  "Too short": "Zu kurz",
  "Not found — submit one via Google Search Console":
    "Nicht gefunden — über Google Search Console einreichen",
  "No SEO plugin installed. Install Yoast SEO (free) for full tracking.":
    "Kein SEO-Plugin installiert. Yoast SEO (kostenlos) für vollständiges Tracking installieren.",
  "Install Yoast SEO": "Yoast SEO installieren",
  "Pages with short title:": "Seiten mit kurzem Titel:",
  edit: "bearbeiten",

  // Brand Assets
  "Brand Assets": "Markenassets",
  "Centralized management for identity logos, color accents, and global navigation fragments used across the shell.":
    "Zentrale Verwaltung für Logos, Farbakzente und globale Navigationsfragmente innerhalb der Shell.",
  "Logo-only sidebar": "Seitenleiste nur mit Logo",
  On: "An",
  Off: "Aus",
  "Save Brand Assets": "Markenassets speichern",
  "Brand Assets In The Sidebar": "Markenassets in der Seitenleiste",
  "Upload the logo variants used in the shell sidebar.":
    "Laden Sie die Logo-Varianten hoch, die in der Shell-Seitenleiste verwendet werden.",
  "Light Theme Logo": "Logo für helles Theme",
  "Dark Theme Logo": "Logo für dunkles Theme",
  "{label} preview": "{label} Vorschau",
  "No image selected": "Kein Bild ausgewählt",
  "Select image": "Bild auswählen",
  "Use image": "Bild verwenden",
  Replace: "Ersetzen",
  Upload: "Hochladen",
  Delete: "Löschen",
  "Brand Colors": "Markenfarben",
  "Shell color theme and accent palette.": "Farbthema und Akzentpalette der Shell.",
  "Theme Preset": "Themenvorgabe",
  Default: "Standard",
  Ocean: "Ozean",
  Forest: "Wald",
  Sunset: "Sonnenuntergang",
  Monochrome: "Monochrom",
  Custom: "Benutzerdefiniert",
  "Global distribution preview": "Globale Verteilungsvorschau",
  "Reset to default": "Auf Standard zurücksetzen",
  "Link Rules": "Link-Regeln",
  "Patterns that should open in a new tab.":
    "Muster, die in einem neuen Tab geöffnet werden sollen.",
  "Global URL Fragments": "Globale URL-Fragmente",
  "One fragment per line": "Ein Fragment pro Zeile",
  "Matching links bypass the iframe and open directly in a new tab.":
    "Passende Links umgehen das Iframe und öffnen sich direkt in einem neuen Tab.",
  Typography: "Typografie",
  "Choose the font system used across the shell interface.":
    "Wählen Sie das Schriftsystem für die gesamte Shell-Oberfläche.",
  "Font preset": "Schriftvorgabe",
  Appearance: "Darstellung",
  "Display preferences": "Anzeigeeinstellungen",
  "High Contrast": "Hoher Kontrast",
  "Increase text and border contrast for better readability.":
    "Erhöht den Kontrast von Texten und Rahmen für bessere Lesbarkeit.",
  "Changes are applied live after saving.":
    "Änderungen werden nach dem Speichern direkt angewendet.",

  // Relative time
  "just now": "gerade eben",
  "{n} min ago": "vor {n} Min.",
  "{n}h ago": "vor {n} Std.",
  "{n} day ago": "vor {n} Tag",
  "{n} days ago": "vor {n} Tagen",

  // License Settings
  License: "Lizenz",
  "Manage your licenses": "Verwalte deine Lizenzen",
  "License Status": "Lizenzstatus",
  "Valid Until": "Gültig bis",
  "Your license key for product activation": "Dein Lizenzschlüssel für die Produktaktivierung",
  "Test Connection": "Verbindung testen",
  Connected: "Verbunden",
  "Not configured": "Nicht konfiguriert",
  "Grace Period": "Kulanzfrist",
  Expired: "Abgelaufen",
  "Not activated": "Nicht aktiviert",
  "All features are available.": "Alle Funktionen sind verfügbar.",
  "License expired. Some features are disabled.":
    "Lizenz abgelaufen. Einige Funktionen sind deaktiviert.",
  "No active license found.": "Keine aktive Lizenz gefunden.",
  "Connection failed or license invalid.": "Verbindung fehlgeschlagen oder Lizenz ungültig.",
  "License grace period active — please renew soon.":
    "Lizenz im Kulanzbereich — bitte bald erneuern.",
  "Valid until {date}": "Gültig bis {date}",
  "Manage License": "Lizenz verwalten",
  "Renew License": "Lizenz erneuern",
  "Activate License": "Lizenz aktivieren",
  "Try again": "Erneut versuchen",
  "Change License": "Lizenz ändern",
  Activate: "Aktivieren",
  Save: "Speichern",
  Cancel: "Abbrechen",
  Deactivate: "Deaktivieren",
  Refresh: "Aktualisieren",
  "License Key": "Lizenzschlüssel",
  "License Server": "Lizenzserver",
  "Connection successful": "Verbindung erfolgreich",
  "Connection test failed": "Verbindungstest fehlgeschlagen",
  Features: "Features",
  "Enter your 64-character license key": "Ihren 64-stelligen Lizenzschlüssel eingeben",
  "https://licenses.example.com": "https://lizenz.beispiel.com",
  Advanced: "Erweitert",
  "Connection Status": "Verbindungsstatus",
  "Show key": "Schlüssel anzeigen",
  "Hide key": "Schlüssel verbergen",
  "Server URL": "Server-URL",
  "License Connection": "Lizenzverbindung",
  "License connection is not configured.": "Lizenzverbindung ist nicht konfiguriert.",
  "License connection failed. Check your server URL or contact support.":
    "Lizenzverbindung fehlgeschlagen. Prüfen Sie die Server-URL oder wenden Sie sich an den Support.",
  Tier: "Stufe",
  "Grace period": "Kulanzfrist",
  "{days} day(s) remaining": "Noch {days} Tag(e)",
  "No grace period": "Keine Kulanzfrist",
  "Key prefix": "Schlüsselpräfix",
  "Last checked": "Zuletzt geprüft",

  // Support Chat
  "Support Chat": "Support-Chat",
  "All active chat threads": "Alle aktiven Chat-Gespräche",
  "Your site support thread": "Ihr Website-Support-Gespräch",
  "Find a conversation": "Gespräch suchen",
  "Search conversations": "Gespräche durchsuchen",
  "No matching conversations": "Keine passenden Gespräche",
  "No conversations yet": "Noch keine Gespräche",
  "No active conversations": "Keine aktiven Gespräche",
  "No archived conversations": "Keine archivierten Gespräche",
  "No messages yet": "Noch keine Nachrichten",
  Live: "Live",
  Archived: "Archiviert",
  Chat: "Chat",
  Settings: "Einstellungen",
  Archive: "Archiv",
  "Archived chat threads": "Archivierte Chats",
  "All archived chat threads": "Alle archivierten Chat-Gespräche",
  "Your archived support thread": "Ihr archiviertes Support-Gespräch",
  "View archive": "Archiv anzeigen",
  "Archive conversation": "Gespräch archivieren",
  "Archive this conversation?": "Dieses Gespräch archivieren?",
  "The thread stays visible, but no new messages can be sent.":
    "Das Gespräch bleibt sichtbar, aber es können keine neuen Nachrichten gesendet werden.",
  Unarchive: "Wiederherstellen",
  "Unarchive this conversation?": "Dieses Gespräch wiederherstellen?",
  "The thread moves back to the inbox and messages can be sent again.":
    "Das Gespräch wird zurück in den Posteingang verschoben und Nachrichten können wieder gesendet werden.",
  "Delete this conversation permanently?": "Dieses Gespräch dauerhaft löschen?",
  "This removes the thread from the inbox and cannot be undone.":
    "Dadurch wird das Gespräch aus dem Posteingang entfernt und kann nicht wiederhergestellt werden.",
  "This conversation is archived": "Dieses Gespräch ist archiviert",
  "Select a conversation to send a message":
    "Wählen Sie ein Gespräch aus, um eine Nachricht zu senden",
  "View chat": "Chat anzeigen",
  "Open chat settings": "Chat-Einstellungen öffnen",
  "Open conversation list": "Gesprächsliste öffnen",
  "Close conversation list": "Gesprächsliste schließen",
};

/* ── Translation function factory ─────────────────────────────────────────── */
export function createT(locale: string) {
  const isDE = locale.startsWith("de");
  const dict = isDE ? de : {};
  return function t(key: string, vars?: Vars): string {
    const template = (dict as Record<string, string>)[key] ?? key;
    return interpolate(template, vars);
  };
}

/** Translates a locale code to an Intl-compatible BCP 47 tag (e.g. "de_DE" → "de-DE"). */
export function localeToIntl(locale: string): string {
  return locale.replace("_", "-");
}

/** Returns a locale-aware short weekday name for a date string. */
export function localDayLabel(dateStr: string, intlLocale: string): string {
  try {
    return new Date(dateStr).toLocaleDateString(intlLocale, { weekday: "short" });
  } catch {
    return dateStr.slice(0, 3);
  }
}

/** Returns a locale-aware country name from a 2-letter code. */
export function localCountryName(code: string, intlLocale: string): string {
  try {
    return new Intl.DisplayNames([intlLocale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
