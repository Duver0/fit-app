import { Resolver, Mutation, Args } from '@nestjs/graphql'
import { AuthService } from './auth.service'
import { AuthPayload } from '../../common/models'
import { RegisterInput, LoginInput } from './dto/auth.input'

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => AuthPayload)
  async register(@Args('input') input: RegisterInput) {
    return this.authService.register(input)
  }

  @Mutation(() => AuthPayload)
  async login(@Args('input') input: LoginInput) {
    return this.authService.loginWithEmail(input)
  }

}
