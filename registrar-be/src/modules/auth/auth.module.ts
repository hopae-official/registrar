import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { JwtGuard } from './jwt.guard';

@Module({
  imports: [UserModule],
  providers: [AuthService, JwtGuard],
  exports: [AuthService, JwtGuard],
  controllers: [AuthController],
})
export class AuthModule {}
