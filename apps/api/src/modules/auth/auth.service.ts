import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'
import { User } from '../../common/models'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async validateUser(auth0Id: string) {
    const user = await this.prisma.user.findUnique({ where: { auth0Id } })
    if (!user) throw new UnauthorizedException()
    return user
  }

  private generateToken(user: any) {
    const payload = { sub: user.auth0Id, role: user.role }
    return {
      accessToken: this.jwtService.sign(payload),
      user,
    }
  }

  async register(input: { email: string; password: string; name: string; phone?: string }) {
    const user = await this.prisma.user.create({
      data: {
        auth0Id: `auth0|${input.email}`,
        email: input.email,
        name: input.name,
        phone: input.phone,
      },
    })
    return this.generateToken(user)
  }

  async loginWithEmail(input: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } })
    if (!user) throw new UnauthorizedException('Invalid credentials')
    return this.generateToken(user)
  }

  async loginWithGoogle(idToken: string) {
    throw new Error('Google SSO not yet implemented')
  }
}
