import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { AccessCertModule } from './modules/access_cert/access_cert.module';
import { RegistrationCertModule } from './modules/registration_cert/registration_cert.module';
import { RelyingPartyModule } from './modules/relying_party/relying_party.module';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    AccessCertModule,
    RegistrationCertModule,
    RelyingPartyModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
