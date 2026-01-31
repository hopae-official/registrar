import {
  Controller,
  UseGuards,
  Post,
  Put,
  Delete,
  Get,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RelyingPartyService } from './relying_party.service';
import { JwtGuard } from '../auth/jwt.guard';
import { AuthenticatedUser } from '../user/user.deco';
import {
  CreateRelyingPartyDto,
  UpdateRelyingPartyDto,
  SearchRelyingPartyQueryDto,
  CheckIntendedUseQueryDto,
} from './relying_party.dto';
import { AuthPayload } from '../auth/auth.service';

@Controller('wrp')
export class RelyingPartyController {
  constructor(private readonly relyingPartyService: RelyingPartyService) {}

  // Public: search/list registered WRPs with query parameters
  @Get()
  findAll(@Query() query: SearchRelyingPartyQueryDto) {
    return this.relyingPartyService.findAll(query);
  }

  // Public: dedicated check endpoint for intended use validation (returns boolean)
  @Get('check-intended-use')
  checkIntendedUse(@Query() query: CheckIntendedUseQueryDto) {
    return { result: this.relyingPartyService.checkIntendedUse(query) };
  }

  // Authenticated: list WRPs owned by the current user
  @UseGuards(JwtGuard)
  @Get('my')
  findAllByUser(@AuthenticatedUser() user: AuthPayload) {
    return this.relyingPartyService.findAllByUser(user.sub);
  }

  // Public: get a single WRP by identifier
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.relyingPartyService.findOne(id);
  }

  // Authenticated: register a new WRP
  @UseGuards(JwtGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateRelyingPartyDto,
    @AuthenticatedUser() user: AuthPayload,
  ) {
    return this.relyingPartyService.create(dto, user.sub);
  }

  // Authenticated: update an existing WRP
  @UseGuards(JwtGuard)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRelyingPartyDto,
    @AuthenticatedUser() user: AuthPayload,
  ) {
    return this.relyingPartyService.update(id, dto, user.sub);
  }

  // Authenticated: delete an existing WRP
  @UseGuards(JwtGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string, @AuthenticatedUser() user: AuthPayload) {
    return this.relyingPartyService.delete(id, user.sub);
  }
}
