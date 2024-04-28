import { Injectable } from '@nestjs/common';
import { PassportStrategy, AuthGuard } from '@nestjs/passport';
import { Strategy, Profile } from '@arendajaelu/nestjs-passport-apple';
import { ConfigService } from '@nestjs/config';

const APPLE_STRATEGY_NAME = 'apple';

@Injectable()
export class AppleStrategy extends PassportStrategy(
  Strategy,
  APPLE_STRATEGY_NAME,
) {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('APPLE_CLIENTID'),
      teamID: config.get<string>('APPLE_TEAMID'),
      keyID: config.get<string>('APPLE_KEYID'),
      keyFilePath: config.get<string>('APPLE_KEYFILE_PATH'),
      callbackURL: config.get<string>('APPLE_CALLBACK'),
      passReqToCallback: false,
      scope: ['email', 'name'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ) {
    return {
      emailAddress: profile.email,
      firstName: profile.name?.firstName || '',
      lastName: profile.name?.lastName || '',
    };
  }
}

@Injectable()
export class AppleOAuthGuard extends AuthGuard(APPLE_STRATEGY_NAME) {}
