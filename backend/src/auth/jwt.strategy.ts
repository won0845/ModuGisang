import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ExtractJwt, Strategy, VerifiedCallback } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Payload } from './payload.interface';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // 토큰 분석
      ignoreExpiration: false,
      secretOrKey: process.env.ACCESS_TOKEN_SECRET_KEY, // 생성자에서 바로 접근
    });
  }

  async validate(payload: Payload, done: VerifiedCallback): Promise<any> {
    const user = await this.authService.tokenValidateUser(payload);
    if (!user) {
      console.log('user does not exist');
      return done(
        new UnauthorizedException({ message: 'user does not exist' }),
        false,
      );
    }
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime > payload.exp) {
      return done(new UnauthorizedException({ message: 'Token is expired' }));
    }
    console.log('토큰 검증 완료');
    return done(null, user);
  }
}
