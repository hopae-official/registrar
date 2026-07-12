import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SignInDto, SignUpDto } from './auth.dto';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';

export type AuthPayload = {
  email: string;
  sub: string; // user id
  company: string;
  name: string;
};

@Injectable()
export class AuthService {
  private readonly secret: string;
  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    this.secret = this.configService.get('JWT_SECRET', 'default-secret');
  }

  async signIn(signInDto: SignInDto) {
    const { email, password } = signInDto;
    const user = await this.userService.authenticatePassword({
      email,
      password,
    });
    if (!user) {
      throw new UnauthorizedException('Sign in failed');
    }
    const payload: AuthPayload = {
      email: user.email,
      sub: user.id,
      company: user.company,
      name: user.name,
    };
    return {
      access_token: this.signToken(payload),
    };
  }

  async signUp(signUpDto: SignUpDto) {
    const user = await this.userService.createUser(signUpDto);
    const payload: AuthPayload = {
      email: user.email,
      sub: user.id,
      company: user.company,
      name: user.name,
    };
    return {
      access_token: this.signToken(payload),
    };
  }

  verifyToken(token: string): jwt.JwtPayload {
    try {
      return jwt.verify(token, this.secret) as jwt.JwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
      }
      throw new UnauthorizedException();
    }
  }

  signToken(payload: jwt.JwtPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: '1y' });
  }
}
