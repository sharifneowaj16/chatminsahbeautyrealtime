#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const checks = [];
function check(name, condition) {
  checks.push({ name, ok: Boolean(condition) });
}
function includes(file, fragment) {
  return read(file).includes(fragment);
}
function notIncludes(file, fragment) {
  return !read(file).includes(fragment);
}

check(
  'forgot-password no longer uses route-local in-memory OTP storage',
  notIncludes('app/api/auth/forgot-password/route.ts', 'new Map')
    && notIncludes('app/api/auth/forgot-password/route.ts', 'otpStorage')
);

check(
  'verify-otp no longer uses separate in-memory OTP storage',
  notIncludes('app/api/auth/verify-otp/route.ts', 'new Map')
    && notIncludes('app/api/auth/verify-otp/route.ts', 'otpStorage')
);

check(
  'forgot-password stores hashed OTP in PasswordResetToken table',
  includes('app/api/auth/forgot-password/route.ts', 'hashPasswordResetOtp(email, otp)')
    && includes('app/api/auth/forgot-password/route.ts', 'prisma.passwordResetToken.create')
    && includes('app/api/auth/forgot-password/route.ts', 'token: tokenHash')
);

check(
  'verify-otp validates hashed OTP and converts it to a reset token hash',
  includes('app/api/auth/verify-otp/route.ts', 'hashPasswordResetOtp(email, otp)')
    && includes('app/api/auth/verify-otp/route.ts', 'generatePasswordResetToken()')
    && includes('app/api/auth/verify-otp/route.ts', 'hashPasswordResetToken(resetToken)')
    && includes('app/api/auth/verify-otp/route.ts', 'token: resetTokenHash')
);

check(
  'reset-password hashes incoming reset token before DB lookup',
  includes('app/api/auth/reset-password/route.ts', 'const tokenHash = hashPasswordResetToken(token)')
    && includes('app/api/auth/reset-password/route.ts', 'where: { token: tokenHash }')
    && notIncludes('app/api/auth/reset-password/route.ts', 'where: { token },')
);

check(
  'reset-password rejects OTP/plain malformed token shapes',
  includes('app/api/auth/reset-password/route.ts', 'isResetTokenShape(token)')
    && includes('lib/auth/password-reset-token.ts', 'isResetTokenShape')
);

check(
  'OTP and reset tokens use crypto-backed randomness',
  includes('lib/auth/password-reset-token.ts', "import crypto from 'crypto'")
    && includes('lib/auth/password-reset-token.ts', 'crypto.randomInt(100000, 1000000)')
    && includes('lib/auth/password-reset-token.ts', 'crypto.randomBytes(32)')
);

check(
  'password helper no longer uses Math.random for generated passwords/tokens/codes',
  notIncludes('lib/auth/password.ts', 'Math.random')
    && includes('lib/auth/password.ts', 'crypto.randomInt')
    && includes('lib/auth/password.ts', 'crypto.randomBytes')
);

check(
  'OTP is not logged or returned in forgot-password response',
  notIncludes('app/api/auth/forgot-password/route.ts', 'console.log')
    && notIncludes('app/api/auth/forgot-password/route.ts', 'OTP for')
    && notIncludes('app/api/auth/forgot-password/route.ts', 'otp: process.env')
);

check(
  'forgot-password avoids account enumeration for unknown/inactive emails',
  includes('app/api/auth/forgot-password/route.ts', 'genericSuccess(email)')
    && includes('app/api/auth/forgot-password/route.ts', 'Avoid account enumeration')
);

check(
  'forgot/verify/reset routes are rate-limited',
  includes('app/api/auth/forgot-password/route.ts', 'checkRateLimit')
    && includes('app/api/auth/verify-otp/route.ts', 'checkRateLimit')
    && includes('app/api/auth/reset-password/route.ts', 'checkRateLimit')
);

check(
  'reset token is single-use and revokes refresh tokens',
  includes('app/api/auth/reset-password/route.ts', 'data: { used: true }')
    && includes('app/api/auth/reset-password/route.ts', 'prisma.refreshToken.updateMany')
    && includes('app/api/auth/reset-password/route.ts', 'revoked: true')
);

check(
  'reset-password client no longer requires oldPassword for forgot-password flow',
  notIncludes('components/reset-password-client.tsx', 'oldPassword')
    && includes('components/reset-password-client.tsx', 'Your old password is not required')
    && includes('components/reset-password-client.tsx', 'token,\n          newPassword')
);

check(
  'production env docs include password reset mailer and token secret',
  includes('.env.example', 'PASSWORD_RESET_TOKEN_SECRET')
    && includes('.env.example', 'PASSWORD_RESET_OTP_WEBHOOK_URL')
    && includes('ENVIRONMENT_VARIABLES_PRODUCTION.md', 'PASSWORD_RESET_OTP_WEBHOOK_URL')
);

check(
  'package.json exposes Phase 3 password reset security audit',
  includes('package.json', 'qa:phase3-password-reset-security')
    && includes('package.json', 'scripts/phase3-password-reset-security-audit.mjs')
);

const failed = checks.filter((item) => !item.ok);
const result = {
  ok: failed.length === 0,
  passed: checks.length - failed.length,
  failed: failed.length,
  issues: failed.map((item) => item.name),
};

console.log(JSON.stringify(result, null, 2));

if (failed.length) {
  process.exit(1);
}
