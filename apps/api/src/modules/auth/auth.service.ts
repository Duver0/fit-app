import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../../prisma/prisma.service'
import { User as PrismaUser } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(localId: string) {
    const user = await this.prisma.user.findUnique({ where: { auth0Id: localId } })
    if (!user) throw new UnauthorizedException()
    return user
  }

  private generateToken(user: PrismaUser) {
    const payload = { sub: user.auth0Id, role: user.role }
    const safeUser = {
      id: user.id,
      auth0Id: user.auth0Id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
    return {
      accessToken: this.jwtService.sign(payload),
      user: safeUser,
    }
  }

  async register(input: { email: string; password: string; name: string; phone?: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } })
    if (existing) throw new ConflictException('Email already registered')

    // Asignar avatar aleatorio de DiceBear (avataaars) usando el nombre como seed
    const avatarSeed = encodeURIComponent(`${input.name}-${Date.now()}`)
    const avatarUrl = `https://api.dicebear.com/10.x/avataaars/png?seed=${avatarSeed}&size=200`

    const passwordHash = await bcrypt.hash(input.password, 10)
    const user = await this.prisma.user.create({
      data: {
        auth0Id: `local|${input.email}`,
        email: input.email,
        name: input.name,
        phone: input.phone,
        passwordHash,
        avatarUrl,
      },
    })
    return this.generateToken(user)
  }

  async loginWithEmail(input: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } })
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials')

    const valid = await bcrypt.compare(input.password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Invalid credentials')

    return this.generateToken(user)
  }

  async loginWithEmailOnly(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user) throw new UnauthorizedException()
    return this.generateToken(user)
  }

}
