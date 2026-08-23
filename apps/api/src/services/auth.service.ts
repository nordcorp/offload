import { hash, compare } from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { randomBytes } from 'crypto';
import type { PrismaClient } from '@prisma/client';
import type { RegisterInput, LoginInput } from '@offload/shared';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export class AuthService {
  constructor(
    private prisma: PrismaClient,
    private jwtSecret: Uint8Array,
  ) {}

  async register(input: RegisterInput) {
    const passwordHash = await hash(input.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: { email: input.email, passwordHash, name: input.name },
    });
    const tokens = await this.generateTokens(user.id);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !(await compare(input.password, user.passwordHash))) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }
    const tokens = await this.generateTokens(user.id);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401 });
    }
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    const tokens = await this.generateTokens(stored.userId);
    return { user: this.sanitizeUser(stored.user), ...tokens };
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }

  async generateTokens(userId: string) {
    const accessToken = await new SignJWT({ userId })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(ACCESS_TOKEN_TTL)
      .setIssuedAt()
      .sign(this.jwtSecret);
    const refreshToken = randomBytes(64).toString('hex');
    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId, expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS) },
    });
    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<{ userId: string }> {
    const { payload } = await jwtVerify(token, this.jwtSecret);
    return { userId: payload.userId as string };
  }

  private sanitizeUser(user: { id: string; email: string; name: string; createdAt: Date }) {
    return { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt.toISOString() };
  }
}
