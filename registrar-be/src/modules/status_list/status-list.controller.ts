import { Controller, Get, NotFoundException, Param, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiProduces, ApiResponse } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { StatusListService } from './status-list.service';
import { STATUS_LIST_ID } from './status-list.codec';

@ApiTags('5. Status List')
@Controller('status-lists')
export class StatusListController {
  constructor(private readonly statusList: StatusListService) {}

  @Get(':id')
  @ApiOperation({ summary: 'IETF Token Status List for issued WRPRCs' })
  @ApiProduces('application/statuslist+jwt')
  @ApiResponse({ status: 200, description: 'Signed status list token' })
  @ApiResponse({ status: 404, description: 'Unknown status list' })
  async get(@Param('id') id: string, @Res() reply: FastifyReply) {
    if (id !== STATUS_LIST_ID) {
      throw new NotFoundException('unknown status list');
    }
    const token = await this.statusList.statusListToken(id);
    void reply
      .header('Content-Type', 'application/statuslist+jwt')
      .header('Cache-Control', 'no-store')
      .send(token);
  }
}
