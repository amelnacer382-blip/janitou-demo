import type { IncomingMessage, ServerResponse } from 'node:http';
import { readJsonBody, sanitizeString, sendError, sendJson } from '../common/http.js';
import { janitouStore } from '../../services/store.js';
import { verifyPin } from '../../services/pin.js';
import { authenticatedStaff, createStaffSession, destroyStaffSession } from './session.js';
import type { DbStaffUser } from '../../data/mock-db.js';
import { randomUUID } from 'node:crypto';
import {
  buildOtpAuthUri,
  generateRecoveryCodes,
  generateTotpSecret,
  verifyTotp,
} from '../../services/totp.js';

const attempts = new Map<string, { count: number; resetAt: number }>();
const mfaChallenges = new Map<string, { userId: string; expiresAt: number; attempts: number }>();

function userView(
  user: DbStaffUser
): { id: string; email: string; fullName: string; role: string; mfaEnabled: boolean } {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    mfaEnabled: Boolean(user.mfaEnabled),
  };
}

function verifySecondFactor(user: DbStaffUser, code: string): boolean {
  if (!code) return false;
  if (/^\d{6}$/.test(code)) {
    return Boolean(user.mfaSecret && verifyTotp(user.mfaSecret, code));
  }
  return janitouStore.consumeStaffRecoveryCode(user.id, code);
}

function tooManyAttempts(email: string): boolean {
  const key = email.trim().toLowerCase();
  const now = Date.now();
  const attempt = attempts.get(key);
  if (!attempt || now > attempt.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return false;
  }
  attempt.count += 1;
  return attempt.count > 10;
}

export async function handleAuthRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  method: string
): Promise<boolean> {
  if (!pathname.startsWith('/api/v1/auth')) return false;

  if (pathname === '/api/v1/auth/login' && method === 'POST') {
    let body: { email?: string; password?: string; mfaCode?: string; challenge?: string };
    try {
      body = await readJsonBody(req);
    } catch {
      sendError(res, 400, 'Validation Error', 'Corps JSON invalide.');
      return true;
    }
    const email = sanitizeString(body.email || '');
    const password = String(body.password || '');
    if (!email || !password) {
      sendError(res, 400, 'Validation Error', 'Email et mot de passe requis.');
      return true;
    }
    if (tooManyAttempts(email)) {
      sendError(res, 429, 'Too Many Requests', 'محاولات كثيرة، أعد المحاولة لاحقاً.');
      return true;
    }
    const user = janitouStore.getStaffUserByEmail(email);
    if (
      !user ||
      !user.isActive ||
      !verifyPin(password, user.passwordSalt, user.passwordHash)
    ) {
      sendError(res, 401, 'Unauthorized', 'Email ou mot de passe incorrect.');
      return true;
    }
    if (!user.mfaEnabled && user.role === 'ADMIN' && process.env.JANITOU_MFA_REQUIRED_ADMINS === '1') {
      sendError(
        res,
        403,
        'MFA_ENROLLMENT_REQUIRED',
        "La politique impose la MFA aux administrateurs. Activez-la avant d'activer cette option."
      );
      return true;
    }
    if (user.mfaEnabled) {
      const challenge = sanitizeString(body.challenge || '');
      const code = String(body.mfaCode || '').trim();
      const now = Date.now();
      for (const [token, record] of mfaChallenges) {
        if (record.expiresAt < now) mfaChallenges.delete(token);
      }
      if (!challenge) {
        const token = randomUUID();
        mfaChallenges.set(token, { userId: user.id, expiresAt: now + 5 * 60 * 1000, attempts: 0 });
        sendJson(res, 200, { mfaRequired: true, challenge: token });
        return true;
      }
      const record = mfaChallenges.get(challenge);
      if (!record || record.userId !== user.id) {
        sendError(res, 401, 'MFA_REQUIRED', 'Challenge MFA invalide ou expiré.');
        return true;
      }
      if (!verifySecondFactor(user, code)) {
        record.attempts += 1;
        if (record.attempts >= 5) mfaChallenges.delete(challenge);
        sendError(res, 401, 'MFA_INVALID', 'Code de vérification incorrect.');
        return true;
      }
      mfaChallenges.delete(challenge);
    }
    attempts.delete(email.toLowerCase());
    sendJson(res, 200, { token: await createStaffSession(user.id), user: userView(user) });
    return true;
  }

  if (pathname === '/api/v1/auth/mfa' && method === 'GET') {
    const user = authenticatedStaff(req);
    if (!user) {
      sendError(res, 401, 'Unauthorized', 'Session invalide ou expirée.');
      return true;
    }
    sendJson(res, 200, { enabled: Boolean(user.mfaEnabled) });
    return true;
  }

  if (pathname === '/api/v1/auth/mfa/setup' && method === 'POST') {
    const user = authenticatedStaff(req);
    if (!user) {
      sendError(res, 401, 'Unauthorized', 'Session invalide ou expirée.');
      return true;
    }
    if (user.mfaEnabled) {
      sendError(res, 409, 'Conflict', 'MFA déjà activée.');
      return true;
    }
    const secret = generateTotpSecret();
    janitouStore.setStaffMfaSecret(user.id, secret);
    sendJson(res, 200, { secret, otpauthUri: buildOtpAuthUri(secret, user.email) });
    return true;
  }

  if (pathname === '/api/v1/auth/mfa/enable' && method === 'POST') {
    const user = authenticatedStaff(req);
    if (!user) {
      sendError(res, 401, 'Unauthorized', 'Session invalide ou expirée.');
      return true;
    }
    if (!user.mfaSecret) {
      sendError(res, 409, 'Conflict', "Lancez d'abord la configuration MFA.");
      return true;
    }
    let body: { code?: string };
    try {
      body = await readJsonBody(req);
    } catch {
      sendError(res, 400, 'Validation Error', 'Corps JSON invalide.');
      return true;
    }
    if (!verifyTotp(user.mfaSecret, String(body.code || '').trim())) {
      sendError(res, 401, 'MFA_INVALID', 'Code de vérification incorrect.');
      return true;
    }
    const recoveryCodes = generateRecoveryCodes();
    janitouStore.enableStaffMfa(user.id, recoveryCodes, user);
    sendJson(res, 200, { recoveryCodes });
    return true;
  }

  if (pathname === '/api/v1/auth/mfa/disable' && method === 'POST') {
    const user = authenticatedStaff(req);
    if (!user) {
      sendError(res, 401, 'Unauthorized', 'Session invalide ou expirée.');
      return true;
    }
    let body: { password?: string; code?: string };
    try {
      body = await readJsonBody(req);
    } catch {
      sendError(res, 400, 'Validation Error', 'Corps JSON invalide.');
      return true;
    }
    if (!verifyPin(String(body.password || ''), user.passwordSalt, user.passwordHash)) {
      sendError(res, 401, 'Unauthorized', 'Mot de passe incorrect.');
      return true;
    }
    if (!verifySecondFactor(user, String(body.code || '').trim())) {
      sendError(res, 401, 'MFA_INVALID', 'Code de vérification incorrect.');
      return true;
    }
    janitouStore.disableStaffMfa(user.id, user);
    sendJson(res, 200, { success: true });
    return true;
  }

  if (pathname === '/api/v1/auth/logout' && method === 'POST') {
    await destroyStaffSession(req);
    sendJson(res, 200, { success: true });
    return true;
  }

  if (pathname === '/api/v1/auth/me' && method === 'GET') {
    const user = authenticatedStaff(req);
    if (!user) {
      sendError(res, 401, 'Unauthorized', 'Session invalide ou expirée.');
      return true;
    }
    sendJson(res, 200, { user: userView(user) });
    return true;
  }

  sendError(res, 404, 'Not Found', `Cannot ${method} ${pathname}`);
  return true;
}
