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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
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

@ApiTags('Wallet Relying Party')
@Controller('wrp')
export class RelyingPartyController {
  constructor(private readonly relyingPartyService: RelyingPartyService) {}

  @Get()
  @ApiOperation({ summary: 'Search/list registered Wallet-Relying Parties' })
  @ApiResponse({ status: 200, description: 'Paginated list of matching WRPs' })
  findAll(@Query() query: SearchRelyingPartyQueryDto) {
    return this.relyingPartyService.findAll(query);
  }

  @Get('check-intended-use')
  @ApiOperation({ summary: 'Check intended use for a Wallet-Relying Party' })
  @ApiResponse({
    status: 200,
    description: 'Boolean result of intended use check',
  })
  checkIntendedUse(@Query() query: CheckIntendedUseQueryDto) {
    return { result: this.relyingPartyService.checkIntendedUse(query) };
  }

  @UseGuards(JwtGuard)
  @Get('my')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List WRPs owned by the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of own WRPs' })
  findAllByUser(@AuthenticatedUser() user: AuthPayload) {
    return this.relyingPartyService.findAllByUser(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single WRP by identifier' })
  @ApiResponse({ status: 200, description: 'WRP data' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id') id: string) {
    return this.relyingPartyService.findOne(id);
  }

  @UseGuards(JwtGuard)
  @Post()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new Wallet-Relying Party' })
  @ApiResponse({ status: 201, description: 'WRP created' })
  create(
    @Body() dto: CreateRelyingPartyDto,
    @AuthenticatedUser() user: AuthPayload,
  ) {
    return this.relyingPartyService.create(dto, user.sub);
  }

  @UseGuards(JwtGuard)
  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing Wallet-Relying Party' })
  @ApiResponse({ status: 200, description: 'WRP updated' })
  @ApiResponse({ status: 404, description: 'Not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateRelyingPartyDto,
    @AuthenticatedUser() user: AuthPayload,
  ) {
    return this.relyingPartyService.update(id, dto, user.sub);
  }

  @UseGuards(JwtGuard)
  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an existing Wallet-Relying Party' })
  @ApiResponse({ status: 204, description: 'WRP deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  delete(@Param('id') id: string, @AuthenticatedUser() user: AuthPayload) {
    return this.relyingPartyService.delete(id, user.sub);
  }
}
