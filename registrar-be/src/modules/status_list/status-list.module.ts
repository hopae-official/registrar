import { Module } from '@nestjs/common';
import { CryptoModule } from '../crypto/crypto.module';
import { StatusListService } from './status-list.service';
import { StatusListController } from './status-list.controller';

@Module({
  imports: [CryptoModule],
  controllers: [StatusListController],
  providers: [StatusListService],
  exports: [StatusListService],
})
export class StatusListModule {}
