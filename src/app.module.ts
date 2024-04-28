import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppleModule } from './apple/apple.module';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [AppleModule, ConfigModule.forRoot(), JwtModule.register({}), AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
