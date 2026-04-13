export const BRAND_NAME = 'CarMatch';
export const BRAND_TAGLINE = 'Find Your Best-Fit Car, Faster';
export const BRAND_DESCRIPTION =
  'CarMatch helps buyers discover, compare, and shortlist the right vehicle with guided recommendations and AI concierge support.';

export const BRAND_COLORS = {
  primary: '#0F4C81',
  primaryStrong: '#0B355A',
  accent: '#2EC4B6',
  accentSoft: '#E8F8F6',
  background: '#F4F8FC',
  surface: '#FFFFFF',
  text: '#0F172A',
  mutedText: '#475569',
} as const;

export function getOrganizationSchema(baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND_NAME,
    url: baseUrl,
    description: BRAND_DESCRIPTION,
    slogan: BRAND_TAGLINE,
  };
}

export function applyBrandMetadata(): void {
  if (typeof document === 'undefined') return;

  document.title = `${BRAND_NAME} - ${BRAND_TAGLINE}`;

  const ensureMeta = (name: string, content: string, attr: 'name' | 'property' = 'name') => {
    let tag = document.head.querySelector(`meta[${attr}="${name}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute(attr, name);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  };

  ensureMeta('description', BRAND_DESCRIPTION);
  ensureMeta('theme-color', BRAND_COLORS.primary);
  ensureMeta('og:site_name', BRAND_NAME, 'property');
  ensureMeta('og:title', `${BRAND_NAME} - ${BRAND_TAGLINE}`, 'property');
  ensureMeta('og:description', BRAND_DESCRIPTION, 'property');
  ensureMeta('twitter:card', 'summary');
  ensureMeta('twitter:title', `${BRAND_NAME} - ${BRAND_TAGLINE}`);
  ensureMeta('twitter:description', BRAND_DESCRIPTION);

  const scriptId = 'carmatch-org-schema';
  let script = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = scriptId;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }

  const baseUrl = window.location.origin;
  script.textContent = JSON.stringify(getOrganizationSchema(baseUrl));
}
