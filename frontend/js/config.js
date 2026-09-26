/**
 * config.js — Dynamic runtime configuration for Coal Governance Platform.
 * Supports:
 * - Local Development (localhost:8080)
 * - Cloud Deployment (Vercel Frontend + Render Backend)
 * - Custom Runtime URL overrides via localStorage or window.__ENV__
 */

(function () {
  const isLocal =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '0.0.0.0';

  // Stored override or environment variable
  const savedUrl = localStorage.getItem('COAL_GOV_API_URL');
  const envUrl = window.__ENV__?.API_BASE_URL;

  let defaultUrl;
  if (isLocal) {
    // If served from Go backend port 8080 or live-server port 8000
    if (window.location.port === '8080') {
      defaultUrl = `${window.location.origin}/api`;
    } else {
      defaultUrl = 'http://localhost:8080/api';
    }
  } else {
    // Production Cloud Default (Render backend or configured domain)
    defaultUrl = 'https://coal-governance-backend.onrender.com/api';
  }

  window.APP_CONFIG = {
    API_BASE_URL: savedUrl || envUrl || defaultUrl,
    IS_LOCAL: isLocal,
    setApiUrl: function (url) {
      if (url) {
        localStorage.setItem('COAL_GOV_API_URL', url.trim().replace(/\/$/, ''));
      } else {
        localStorage.removeItem('COAL_GOV_API_URL');
      }
      window.location.reload();
    }
  };
})();
