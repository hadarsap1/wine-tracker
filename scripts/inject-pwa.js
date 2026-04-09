#!/usr/bin/env node
/**
 * Post-build script: injects PWA tags into dist/index.html
 * Run after `expo export -p web`
 */

const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(htmlPath)) {
  console.error('dist/index.html not found — run expo export -p web first');
  process.exit(1);
}

let html = fs.readFileSync(htmlPath, 'utf8');

// ── Head injections ──────────────────────────────────────────────────────────

const headTags = `
  <!-- PWA manifest -->
  <link rel="manifest" href="/manifest.json" />

  <!-- iOS PWA -->
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="יומן יין" />
  <link rel="apple-touch-icon" href="/icon.png" />
`.trimEnd();

// Replace the existing viewport meta (Expo sets a minimal one) and inject after </style>
html = html.replace(
  /(<meta name="viewport"[^>]*>)/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />'
);

// Inject PWA head tags just before </head>
if (!html.includes('rel="manifest"')) {
  html = html.replace('</head>', headTags + '\n</head>');
}

// Fix title and lang
html = html.replace('<title>Wine Tracker</title>', '<title>יומן יין</title>');
html = html.replace('<html lang="en">', '<html lang="he" dir="rtl">');
// Handle httpEquiv (Expo uses JSX-style prop name in output sometimes)
html = html.replace('httpEquiv="X-UA-Compatible"', 'http-equiv="X-UA-Compatible"');

// ── Service Worker registration ──────────────────────────────────────────────

// Use a build timestamp so every deploy registers a fresh SW URL,
// bypassing any HTTP cache that may have stored an old sw.js.
const buildTs = Date.now();

const swScript = `
  <script>
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', function () {
        window.location.reload();
      });
      window.addEventListener('load', function () {
        navigator.serviceWorker
          .register('/sw.js?v=${buildTs}')
          .then(function (reg) { reg.update(); })
          .catch(function (err) { console.warn('SW registration failed:', err); });
      });
    }
  </script>`;

// Inject before the closing </body>
if (!html.includes("serviceWorker")) {
  html = html.replace('</body>', swScript + '\n</body>');
}

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('✓ PWA tags injected into dist/index.html');
