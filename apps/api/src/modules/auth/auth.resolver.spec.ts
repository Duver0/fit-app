import { Test, TestingModule } from '@nestjs/testing'
import { AuthResolver } from './auth.resolver'
import { AuthService } from './auth.service'

describe('AuthResolver', () => {
  let resolver: AuthResolver
  let service: AuthService

  const mockAuthPayload = {
    accessToken: 'mock-jwt-token',
    user: {
      id: 'user-1',
      auth0Id: 'local|test@test.com',
      email: 'test@test.com',
      name: 'Test User',
      phone: null,
      avatarUrl: null,
      role: 'USER',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  }

  const mockAuthService = {
    register: jest.fn(),
    loginWithEmail: jest.fn(),
    loginWithEmailOnly: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthResolver,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile()

    resolver = module.get<AuthResolver>(AuthResolver)
    service = module.get<AuthService>(AuthService)
    jest.clearAllMocks()
  })

  describe('register', () => {
    it('should call authService.register with input', async () => {
      mockAuthService.register.mockResolvedValue(mockAuthPayload)

      const input = { email: 'test@test.com', password: 'password123', name: 'Test User' }
      const result = await resolver.register(input)

      expect(service.register).toHaveBeenCalledWith(input)
      expect(result).toEqual(mockAuthPayload)
    })

    it('should return accessToken and user from service', async () => {
      mockAuthService.register.mockResolvedValue(mockAuthPayload)

      const result = await resolver.register({
        email: 'test@test.com',
        password: 'password123',
        name: 'Test User',
      })

      expect(result.accessToken).toBe('mock-jwt-token')
      expect(result.user.email).toBe('test@test.com')
    })
  })

  describe('login', () => {
    it('should call authService.loginWithEmail with input', async () => {
      mockAuthService.loginWithEmail.mockResolvedValue(mockAuthPayload)

      const input = { email: 'test@test.com', password: 'password123' }
      const result = await resolver.login(input)

      expect(service.loginWithEmail).toHaveBeenCalledWith(input)
      expect(result).toEqual(mockAuthPayload)
    })

    it('should delegate to the correct service method', async () => {
      mockAuthService.loginWithEmail.mockResolvedValue(mockAuthPayload)

      await resolver.login({ email: 'a@b.com', password: 'pass' })

      expect(service.loginWithEmail).toHaveBeenCalledTimes(1)
      expect(service.loginWithEmail).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pass' })
    })
  })

  describe('loginWithEmailOnly', () => {
    it('should call authService.loginWithEmailOnly with email', async () => {
      mockAuthService.loginWithEmailOnly.mockResolvedValue(mockAuthPayload)

      const result = await resolver.loginWithEmailOnly('test@test.com')

      expect(service.loginWithEmailOnly).toHaveBeenCalledWith('test@test.com')
      expect(result).toEqual(mockAuthPayload)
    })
  })
})
