import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiProduces,
} from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { RelyingPartyService } from '../relying_party.service';
import { AccessCertService } from '../../access_cert/access_cert.service';
import { RegistrationCertService } from '../../registration_cert/registration_cert.service';
import { CryptoService } from '../../crypto/crypto.service';
import {
  SearchRelyingPartyQueryDto,
  CheckIntendedUseQueryDto,
} from '../relying_party.dto';

@ApiTags('1. Public Registry')
@Controller('registry')
export class PublicRegistryController {
  constructor(
    private readonly rpService: RelyingPartyService,
    private readonly accessCertService: AccessCertService,
    private readonly regCertService: RegistrationCertService,
    private readonly cryptoService: CryptoService,
  ) {}

  @Get('wrp')
  @ApiOperation({ summary: 'Search/list registered Wallet-Relying Parties' })
  @ApiProduces('application/jwt')
  @ApiResponse({
    status: 200,
    description: 'JWS-signed paginated list of matching WRPs',
  })
  async findAll(
    @Query() query: SearchRelyingPartyQueryDto,
    @Res() res: FastifyReply,
  ) {
    const data = await this.rpService.findAll(query);
    const jws = await this.cryptoService.signJWT(data, {
      typ: 'wrp-registry+jwt',
    });
    res.type('application/jwt').send(jws);
  }

  @Get('wrp/check-intended-use')
  @ApiOperation({ summary: 'Check intended use for a Wallet-Relying Party' })
  @ApiProduces('application/jwt')
  @ApiResponse({ status: 200, description: 'JWS-signed intended use result' })
  async checkIntendedUse(
    @Query() query: CheckIntendedUseQueryDto,
    @Res() res: FastifyReply,
  ) {
    const result = await this.rpService.checkIntendedUse(query);
    const jws = await this.cryptoService.signJWT(
      { ...result },
      { typ: 'wrp-registry+jwt' },
    );
    res.type('application/jwt').send(jws);
  }

  @Get('wrp/verify-intermediary')
  @ApiOperation({ summary: 'Verify intermediary-RP relationship (RPI_07a)' })
  @ApiProduces('application/jwt')
  @ApiResponse({ status: 200, description: 'JWS-signed verification result' })
  async verifyIntermediary(
    @Query('rp') rpIdentifier: string,
    @Query('intermediary') intermediaryIdentifier: string,
    @Res() res: FastifyReply,
  ) {
    const verified = await this.rpService.verifyIntermediaryRelationship(
      rpIdentifier,
      intermediaryIdentifier,
    );
    const jws = await this.cryptoService.signJWT(
      { rp: rpIdentifier, intermediary: intermediaryIdentifier, verified },
      { typ: 'wrp-registry+jwt' },
    );
    res.type('application/jwt').send(jws);
  }

  @Get('wrp/:id')
  @ApiOperation({ summary: 'Get a single WRP by identifier' })
  @ApiProduces('application/jwt')
  @ApiResponse({ status: 200, description: 'JWS-signed WRP data' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(@Param('id') id: string, @Res() res: FastifyReply) {
    const data = await this.rpService.findOne(id);
    const jws = await this.cryptoService.signJWT(data, {
      typ: 'wrp-registry+jwt',
    });
    res.type('application/jwt').send(jws);
  }

  // --- Access Certificates (read-only) ---

  @Get('wrp/:rpId/access-certs')
  @ApiOperation({ summary: 'List access certificates for a WRP' })
  @ApiResponse({ status: 200, description: 'List of access certificates' })
  getAccessCerts(@Param('rpId') rpId: string) {
    return this.accessCertService.getAll(rpId);
  }

  @Get('wrp/:rpId/access-certs/:certId')
  @ApiOperation({ summary: 'Get a specific access certificate' })
  @ApiResponse({ status: 200, description: 'Access certificate data' })
  @ApiResponse({ status: 404, description: 'Not found' })
  getAccessCert(@Param('rpId') rpId: string, @Param('certId') certId: string) {
    return this.accessCertService.findOne(rpId, certId);
  }

  // --- Registration Certificates (read-only) ---

  @Get('wrp/:rpId/registration-certs')
  @ApiOperation({ summary: 'List registration certificates for a WRP' })
  @ApiResponse({
    status: 200,
    description: 'List of registration certificates',
  })
  getRegistrationCerts(@Param('rpId') rpId: string) {
    return this.regCertService.getAll(rpId);
  }

  @Get('wrp/:rpId/registration-certs/:certId')
  @ApiOperation({ summary: 'Get a specific registration certificate' })
  @ApiResponse({ status: 200, description: 'Registration certificate data' })
  @ApiResponse({ status: 404, description: 'Not found' })
  getRegistrationCert(
    @Param('rpId') rpId: string,
    @Param('certId') certId: string,
  ) {
    return this.regCertService.findOne(rpId, certId);
  }
}
