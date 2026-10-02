import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/models/authenticated-user';
import type { MeResponseDto } from './dto/me-response.dto';

@Controller('me')
export class MeController {
  @Get()
  getMe(@CurrentUser() user: AuthenticatedUser): MeResponseDto {
    return {
      upn: user.upn ?? null,
      name: user.name ?? null,
      bearerToken: user.accessToken,
    };
  }
}
