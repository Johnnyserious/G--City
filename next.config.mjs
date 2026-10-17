/** @type {import('next').NextConfig} */
// BUILD_ID: Kennung dieser Version. Der Browser vergleicht sie regelmäßig mit /api/version und lädt neu,
// sobald eine neue Version online ist (auch bei „Zum Home-Bildschirm“-Apps).
// Lokal (ohne Vercel) leer → Update-Prüfung ist dann aus.
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || '';
const nextConfig = {
  reactStrictMode: false,
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
  async headers() {
    // Die Startseite nie aus dem Zwischenspeicher holen – sonst sieht man nach einem Update die alte Version
    return [{ source: '/', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] }];
  },
};
export default nextConfig;
