'use client';
// Face ID / Fingerabdruck im Browser (Passkeys). Siehe lib/passkeys.js für den Server-Teil.
import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';

export const passkeysSupported = () => typeof window !== 'undefined' && browserSupportsWebAuthn() && window.isSecureContext;
export const passkeyLabel = () => (typeof navigator !== 'undefined' && /iPhone|iPad|Mac/i.test(navigator.userAgent) ? 'Face ID' : 'Fingerabdruck');

async function api(body) {
  const r = await fetch('/api/passkey', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error(d.error || 'Fehler');
  return d;
}
const nice = (e) => {
  const m = String(e?.message || e);
  if (e?.name === 'NotAllowedError' || /not allowed|abgebrochen|cancel|timed out/i.test(m)) return 'Abgebrochen – probier es nochmal.';
  if (e?.name === 'InvalidStateError') return 'Auf diesem Handy ist Face ID für dein Profil schon eingerichtet ✓';
  return m;
};

// Face ID für dieses Profil einrichten
export async function registerPasskey(profileId) {
  try {
    const { options, token } = await api({ action: 'regOptions', id: profileId });
    const response = await startRegistration({ optionsJSON: options });
    await api({ action: 'regVerify', token, response });
    return true;
  } catch (e) {
    throw new Error(nice(e));
  }
}

// Mit Face ID anmelden → Profil vom Server
export async function loginWithPasskey() {
  try {
    const { options, token } = await api({ action: 'authOptions' });
    const response = await startAuthentication({ optionsJSON: options });
    const d = await api({ action: 'authVerify', token, response });
    return d.profile;
  } catch (e) {
    throw new Error(nice(e));
  }
}
