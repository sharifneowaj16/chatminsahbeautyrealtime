import crypto from 'node:crypto';
import NextAuth, { type NextAuthOptions, type Session, type User } from 'next-auth';
import type { JWT } from 'next-auth/jwt';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from '@/lib/prisma';
import { verifyPasswordTimingSafe } from '@/lib/auth/password';
import { checkRateLimit } from '@/lib/cache/redis';
import {
  getBangladeshPhoneVariations,
  normalizeBangladeshPhoneNumber,
} from '@/lib/phone';
import { consumePhoneOtpProof } from '@/lib/auth/phone-otp';
import {
  bumpUserTokenVersion,
  getUserSessionGuard,
} from '@/lib/auth/session-revocation';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role: string;
    };
    revoked?: boolean;
  }

  interface User {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    role: string;
    tokenVersion?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    role?: string;
    tokenVersion?: number;
    revoked?: boolean;
  }
}

function generateCryptoReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return code;
}

async function createUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateCryptoReferralCode();
    const exists = await prisma.user.findUnique({
      where: { referralCode: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  return `MB${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

function splitName(fullName?: string | null): { firstName: string; lastName: string | null } {
  const cleaned = (fullName || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return { firstName: 'Minsah', lastName: 'Member' };
  const parts = cleaned.split(' ');
  const firstName = parts[0] || 'Minsah';
  const lastName = parts.slice(1).join(' ') || null;
  return { firstName, lastName };
}

function getRequestIp(req: { headers?: Record<string, unknown> } | undefined): string {
  const headers = req?.headers;
  if (!headers) return 'unknown';
  const fwd = headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) {
    return fwd.split(',')[0].trim();
  }
  const realIp = headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }
  return 'unknown';
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,

  providers: [
    // 1. 1-Tap Google OAuth (no forced prompt=consent so returning users sign in instantly)
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'select_account',
        },
      },
    }),

    // 2. 1-Tap Facebook OAuth (supports both email and phone-only Facebook accounts)
    FacebookProvider({
      clientId: process.env.META_APP_ID || process.env.FACEBOOK_CLIENT_ID || '',
      clientSecret: process.env.META_APP_SECRET || process.env.FACEBOOK_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: 'email,public_profile',
        },
      },
    }),

    // 3. Real QSMS Phone OTP Provider (consumes single-use server-issued Redis proof)
    CredentialsProvider({
      id: 'phone-otp',
      name: 'Mobile OTP',
      credentials: {
        phone: { label: 'Phone', type: 'text' },
        otpProof: { label: 'OTP Proof', type: 'text' },
      },
      async authorize(credentials) {
        const rawPhone = credentials?.phone?.trim() || '';
        const otpProof = credentials?.otpProof?.trim() || '';

        if (!rawPhone || !otpProof) {
          throw new Error('Verification expired. Please request a new code.');
        }

        const proof = await consumePhoneOtpProof(rawPhone, otpProof);
        if (!proof) {
          throw new Error('Verification code expired. Please verify again.');
        }

        const phoneVariations = getBangladeshPhoneVariations(proof.phone);
        let user = await prisma.user.findFirst({
          where: {
            OR: [
              { verifiedPhone: { in: phoneVariations } },
              { phone: { in: phoneVariations } },
            ],
          },
          orderBy: [{ phoneVerified: 'desc' }, { lastLoginAt: 'desc' }, { createdAt: 'asc' }],
        });

        if (user) {
          if (user.status !== 'ACTIVE') {
            throw new Error('Your account has been suspended');
          }

          const updates: Record<string, unknown> = {
            lastLoginAt: new Date(),
            phoneVerified: true,
            phone: proof.phone,
          };

          if (!user.verifiedPhone) {
            const clash = await prisma.user.findUnique({
              where: { verifiedPhone: proof.phone },
              select: { id: true },
            });
            if (!clash || clash.id === user.id) {
              updates.verifiedPhone = proof.phone;
            }
          }

          if (proof.fullName && (!user.firstName || user.firstName === 'Minsah' || user.firstName === 'Guest')) {
            const parsedName = splitName(proof.fullName);
            updates.firstName = parsedName.firstName;
            if (parsedName.lastName) updates.lastName = parsedName.lastName;
          }

          if (proof.email && !user.email) {
            const emailTaken = await prisma.user.findUnique({
              where: { email: proof.email },
              select: { id: true },
            });
            if (!emailTaken) {
              updates.email = proof.email;
            }
          }

          user = await prisma.user.update({
            where: { id: user.id },
            data: updates,
          });
        } else {
          const parsedName = splitName(proof.fullName);
          const referralCode = await createUniqueReferralCode();

          let safeEmail: string | null = null;
          if (proof.email) {
            const emailTaken = await prisma.user.findUnique({
              where: { email: proof.email },
              select: { id: true },
            });
            if (!emailTaken) safeEmail = proof.email;
          }

          user = await prisma.user.create({
            data: {
              phone: proof.phone,
              verifiedPhone: proof.phone,
              phoneVerified: true,
              email: safeEmail,
              firstName: parsedName.firstName,
              lastName: parsedName.lastName,
              referralCode,
              role: 'CUSTOMER',
              status: 'ACTIVE',
              loyaltyPoints: 100,
              lastLoginAt: new Date(),
            },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.phone || 'Minsah Member',
          image: user.avatar,
          role: user.role,
          tokenVersion: user.tokenVersion,
        };
      },
    }),

    // 4. Hardened Email / BD Phone + Password Provider (Redis rate-limited + timing-safe)
    CredentialsProvider({
      id: 'credentials',
      name: 'Email or Phone and Password',
      credentials: {
        email: { label: 'Email or Phone', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        const rawIdentifier = credentials?.email?.trim() || '';
        const password = credentials?.password || '';

        if (!rawIdentifier || !password) {
          throw new Error('Email or phone and password are required');
        }

        const normalizedPhone = normalizeBangladeshPhoneNumber(rawIdentifier);
        const normalizedKey = normalizedPhone || rawIdentifier.toLowerCase();
        const ip = getRequestIp(req as { headers?: Record<string, unknown> } | undefined);

        // Brute-force protection on both IP and identifier
        const [ipLimit, idLimit] = await Promise.all([
          checkRateLimit(`auth:login:ip:${ip}`, 20, 900),
          checkRateLimit(`auth:login:id:${normalizedKey}`, 8, 900),
        ]);

        if (!ipLimit.allowed || !idLimit.allowed) {
          throw new Error('Too many login attempts. Please try again in a few minutes.');
        }

        let user = null;
        if (normalizedPhone) {
          const phoneVariations = getBangladeshPhoneVariations(normalizedPhone);
          user = await prisma.user.findFirst({
            where: {
              OR: [
                { verifiedPhone: { in: phoneVariations } },
                { phone: { in: phoneVariations } },
              ],
            },
            orderBy: [{ passwordHash: 'desc' }, { phoneVerified: 'desc' }, { lastLoginAt: 'desc' }],
          });
        } else {
          user = await prisma.user.findUnique({
            where: { email: rawIdentifier.toLowerCase() },
          });
        }

        // Always perform constant-time bcrypt verify to prevent account enumeration
        const isPasswordValid = await verifyPasswordTimingSafe(password, user?.passwordHash);

        if (!user || !isPasswordValid) {
          throw new Error('Invalid email/phone or password');
        }

        if (user.status !== 'ACTIVE') {
          throw new Error('Your account has been suspended');
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.phone || 'Minsah Member',
          image: user.avatar,
          role: user.role,
          tokenVersion: user.tokenVersion,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' || account?.provider === 'facebook') {
        const provider = account.provider;
        const providerAccountId = account.providerAccountId;
        if (!providerAccountId) return false;

        const rawEmail = user.email?.trim().toLowerCase() || null;
        const googleVerified =
          provider !== 'google' ||
          (profile as { email_verified?: boolean } | undefined)?.email_verified !== false;
        const trustedEmail = rawEmail && googleVerified ? rawEmail : null;

        // Step 1: Match existing linked OAuth account first (supports email-less FB accounts)
        const existingLinked = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider,
              providerAccountId,
            },
          },
          include: { user: true },
        });

        let dbUser = existingLinked?.user ?? null;

        if (dbUser) {
          if (dbUser.status !== 'ACTIVE') {
            return '/login?error=AccountSuspended';
          }

          await prisma.$transaction([
            prisma.account.update({
              where: { id: existingLinked!.id },
              data: {
                access_token: account.access_token ?? existingLinked!.access_token,
                refresh_token: account.refresh_token ?? existingLinked!.refresh_token,
                expires_at: account.expires_at ?? existingLinked!.expires_at,
                token_type: account.token_type ?? existingLinked!.token_type,
                scope: account.scope ?? existingLinked!.scope,
                id_token: account.id_token ?? existingLinked!.id_token,
              },
            }),
            prisma.user.update({
              where: { id: dbUser.id },
              data: {
                lastLoginAt: new Date(),
                avatar: dbUser.avatar || user.image || null,
                ...(trustedEmail && !dbUser.emailVerified ? { emailVerified: new Date() } : {}),
              },
            }),
          ]);
        } else {
          // Step 2: Match by verified email if available
          if (trustedEmail) {
            dbUser = await prisma.user.findUnique({
              where: { email: trustedEmail },
            });
          }

          if (dbUser) {
            if (dbUser.status !== 'ACTIVE') {
              return '/login?error=AccountSuspended';
            }

            await prisma.$transaction([
              prisma.account.create({
                data: {
                  userId: dbUser.id,
                  type: account.type,
                  provider,
                  providerAccountId,
                  access_token: account.access_token,
                  refresh_token: account.refresh_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                },
              }),
              prisma.user.update({
                where: { id: dbUser.id },
                data: {
                  lastLoginAt: new Date(),
                  avatar: dbUser.avatar || user.image || null,
                  emailVerified: dbUser.emailVerified ?? new Date(),
                },
              }),
            ]);
          } else {
            // Step 3: Create brand-new customer (works even if Facebook user has no email)
            const parsedName = splitName(user.name);
            const referralCode = await createUniqueReferralCode();

            dbUser = await prisma.user.create({
              data: {
                email: trustedEmail,
                firstName: parsedName.firstName,
                lastName: parsedName.lastName,
                avatar: user.image || null,
                emailVerified: trustedEmail ? new Date() : null,
                role: 'CUSTOMER',
                status: 'ACTIVE',
                loyaltyPoints: 100,
                lastLoginAt: new Date(),
                referralCode,
                accounts: {
                  create: {
                    type: account.type,
                    provider,
                    providerAccountId,
                    access_token: account.access_token,
                    refresh_token: account.refresh_token,
                    expires_at: account.expires_at,
                    token_type: account.token_type,
                    scope: account.scope,
                    id_token: account.id_token,
                  },
                },
              },
            });
          }
        }

        user.id = dbUser.id;
        user.role = dbUser.role;
        user.tokenVersion = dbUser.tokenVersion;
      }

      return true;
    },

    async jwt({ token, user }): Promise<JWT> {
      if (user) {
        token.userId = user.id;
        token.role = user.role || 'CUSTOMER';
        token.tokenVersion = typeof user.tokenVersion === 'number' ? user.tokenVersion : 0;
        token.revoked = false;
        return token;
      }

      if (!token.userId || token.revoked) {
        token.userId = '';
        token.revoked = true;
        return token;
      }

      const guard = await getUserSessionGuard(token.userId);
      const jwtVersion = typeof token.tokenVersion === 'number' ? token.tokenVersion : 0;

      if (!guard || !guard.active || guard.tokenVersion !== jwtVersion) {
        token.userId = '';
        token.role = '';
        token.revoked = true;
        return token;
      }

      token.role = guard.role;
      token.revoked = false;
      return token;
    },

    async session({ session, token }): Promise<Session> {
      if (!token?.userId || token.revoked) {
        return {
          ...session,
          user: {
            id: '',
            email: null,
            name: null,
            image: null,
            role: '',
          },
          revoked: true,
        };
      }

      if (session.user) {
        session.user.id = token.userId;
        session.user.role = token.role || 'CUSTOMER';
      }
      session.revoked = false;
      return session;
    },
  },

  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
    newUser: '/register',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days (instantly revocable via tokenVersion)
    updateAge: 24 * 60 * 60,
  },

  events: {
    async signOut({ token }) {
      if (token?.userId) {
        await bumpUserTokenVersion(token.userId);
      }
    },
  },

  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions);
