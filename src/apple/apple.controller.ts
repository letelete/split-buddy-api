import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  UnauthorizedException,
  HttpStatus,
} from '@nestjs/common';
import { AppleService } from './apple.service';
import { AppleOAuthGuard } from '../auth/strategies/apple.strategy';

@Controller('/auth/apple')
export class AppleController {
  constructor(private appleService: AppleService) {}
  @Get()
  @UseGuards(AppleOAuthGuard)
  async login(): Promise<any> {
    return HttpStatus.OK;
  }

  @Post('/redirect')
  @UseGuards(AppleOAuthGuard)
  async redirect(@Body() payload): Promise<any> {
    if (payload.id_token) {
      return this.appleService.registerByIDtoken(payload);
    }
    throw new UnauthorizedException('Unauthorized');
  }
}
