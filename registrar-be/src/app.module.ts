import { Module, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { RelyingPartyModule } from './modules/relying_party/relying_party.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { createLoggerConfig } from './logger.config';
import { UserModule } from './modules/user/user.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...createLoggerConfig(config),
        forRoutes: [{ path: '{*splat}', method: RequestMethod.ALL }],
      }),
    }),
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
      },
    }),
    HealthModule,
    AuthModule,
    RelyingPartyModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
