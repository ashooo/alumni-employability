const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const DEFAULT_LOGO_URL = '/plp_logo.png';

const getApiOrigin = () => {
  try {
    const parsed = new URL(API_URL);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return '';
  }
};

export const resolveLogoUrl = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!raw) return DEFAULT_LOGO_URL;
  if (raw === DEFAULT_LOGO_URL) return DEFAULT_LOGO_URL;
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) {
    try {
      const parsed = new URL(raw);
      const apiOrigin = getApiOrigin();
      if (apiOrigin) {
        const apiParsed = new URL(apiOrigin);
        if (
          parsed.protocol === apiParsed.protocol &&
          parsed.host === apiParsed.host &&
          parsed.pathname === DEFAULT_LOGO_URL
        ) {
          return DEFAULT_LOGO_URL;
        }
      }
    } catch {
      // Keep raw if URL parsing fails.
    }
    return raw;
  }

  const apiOrigin = getApiOrigin();
  if (!apiOrigin) return raw;

  // Server upload endpoints return /uploads/... and should resolve to API origin.
  if (raw.startsWith('/uploads/')) return `${apiOrigin}${raw}`;
  if (raw.startsWith('uploads/')) return `${apiOrigin}/${raw}`;

  // Other root-relative paths are app assets (e.g. /plp_logo.png).
  return raw;
};

export const fetchSystemLogoUrl = async () => {
  try {
    const res = await fetch(`${API_URL}/superadmin/public-settings/system_branding`);
    if (!res.ok) return DEFAULT_LOGO_URL;

    const data = await res.json();
    const brandingValue = data?.value;
    const parsedBranding = typeof brandingValue === 'string'
      ? JSON.parse(brandingValue)
      : brandingValue;

    return resolveLogoUrl(parsedBranding?.logoUrl);
  } catch {
    return DEFAULT_LOGO_URL;
  }
};
