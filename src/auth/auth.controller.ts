import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AppleService } from 'src/apple/apple.service';
import { AppleOAuthGuard } from 'src/auth/strategies/apple.strategy';

@Controller('auth')
export class AuthController {
  constructor(private appleService: AppleService) {}
  @Get('/apple')
  @UseGuards(AppleOAuthGuard)
  async login(): Promise<any> {
    return HttpStatus.OK;
  }

  @Post('/apple/redirect')
  @UseGuards(AppleOAuthGuard)
  async redirect(@Body() payload): Promise<any> {
    if (payload.id_token) {
      return this.appleService.registerByIDtoken(payload);
    }
    throw new UnauthorizedException('Unauthorized');
  }
}
