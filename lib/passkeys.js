// Nur auf dem Server: Anmelden per Face ID / Touch ID / Fingerabdruck (Passkeys, WebAuthn).
// Das Gesicht verlässt nie das Handy – der Server bekommt nur einen öffentlichen Schlüssel.
// Die Sicherheits-Challenge wird signiert an den Browser gegeben (kein Speicher nötig).
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { getPasskeys, savePasskeys } from './profiles';

const SECRET = () => process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.DEV_PIN || 'g-city-local';
const sign = (v) => createHmac('sha256', SECRET()).update(v).digest('base64url');

// Challenge + Ablaufzeit (5 Min.) signieren
function makeToken(challenge, extra = '') {
  const body = Buffer.from(JSON.stringify({ c: challenge, e: Date.now() + 5 * 60000, x: extra })).toString('base64url');
  return body + '.' + sign(body);
}
function readToken(token) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) throw new Error('Ungültige Anfrage');
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(body));
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error('Ungültige Anfrage');
  const d = JSON.parse(Buffer.from(body, 'base64url').toString());
  if (Date.now() > d.e) throw new Error('Zeit abgelaufen – bitte nochmal');
  return d;
}

// Domain der Seite (z. B. g-city.vercel.app) – Passkeys gehören immer zu genau einer Domain
export function rpFrom(req) {
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost').split(',')[0].trim();
  const proto = (req.headers.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https')).split(',')[0].trim();
  return { rpID: host.split(':')[0], origin: `${proto}://${host}` };
}

export async function registrationOptions(req, profileId) {
  const { profile, keys } = await getPasskeys(profileId);
  if (!profile) throw new Error('Profil nicht gefunden – bitte erst das Profil sichern.');
  const { rpID } = rpFrom(req);
  const options = await generateRegistrationOptions({
    rpName: 'G City',
    rpID,
    userID: new TextEncoder().encode(profile.id),
    userName: profile.name,
    userDisplayName: profile.name,
    attestationType: 'none',
    excludeCredentials: keys.map((k) => ({ id: k.id, transports: k.transports })),
    authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
  });
  return { options, token: makeToken(options.challenge, profile.id) };
}

export async function verifyRegistration(req, { token, response }) {
  const t = readToken(token);
  const { rpID, origin } = rpFrom(req);
  const v = await verifyRegistrationResponse({ response, expectedChallenge: t.c, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: false });
  if (!v.verified || !v.registrationInfo) throw new Error('Face ID konnte nicht eingerichtet werden');
  const cred = v.registrationInfo.credential;
  const { keys } = await getPasskeys(t.x);
  const next = [...keys.filter((k) => k.id !== cred.id), { id: cred.id, pk: Buffer.from(cred.publicKey).toString('base64url'), n: cred.counter, transports: response.response?.transports || [], at: new Date().toISOString() }];
  await savePasskeys(t.x, next);
  return { ok: true };
}

export async function authenticationOptions(req) {
  const { rpID } = rpFrom(req);
  const options = await generateAuthenticationOptions({ rpID, userVerification: 'preferred', allowCredentials: [] });
  return { options, token: makeToken(options.challenge) };
}

export async function verifyAuthentication(req, { token, response }) {
  const t = readToken(token);
  const { rpID, origin } = rpFrom(req);
  const handle = response?.response?.userHandle;
  if (!handle) throw new Error('Kein Profil auf diesem Gerät gefunden');
  const profileId = Buffer.from(handle, 'base64url').toString();
  const { profile, keys } = await getPasskeys(profileId);
  const key = keys.find((k) => k.id === response.id);
  if (!profile || !key) throw new Error('Dieses Face ID gehört zu keinem G-City-Profil mehr');
  const v = await verifyAuthenticationResponse({
    response, expectedChallenge: t.c, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: false,
    credential: { id: key.id, publicKey: Buffer.from(key.pk, 'base64url'), counter: key.n || 0, transports: key.transports },
  });
  if (!v.verified) throw new Error('Anmeldung fehlgeschlagen');
  key.n = v.authenticationInfo.newCounter;
  await savePasskeys(profileId, keys).catch(() => {});
  return { profile };
}

export const randomId = () => randomBytes(8).toString('hex');
