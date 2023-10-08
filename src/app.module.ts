import { MiddlewareConsumer, Module, NestModule, Scope } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RequestService } from './request.service';
import { AuthenticationMiddleware } from './middleware/authentication.middleware';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthGuard } from './guards/auth.guard';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggerModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        return {
          pinoHttp: {
            name: configService.get<string>('SERVICE_NAME'),
            level:
              configService.get<string>('NODE_ENV', 'test') !== 'production'
                ? 'debug'
                : 'info',
            formatters: {
              bindings: () => ({}),
              level: (label) => ({ level: label }),
            },
            transport:
              configService.get<string>('NODE_ENV', 'test') !== 'production'
                ? {
                    target: 'pino-pretty',
                    options: {
                      singleLine: true,
                    },
                  }
                : undefined,
            customLogLevel: function (req, res, err) {
              const statusCode = req.statusCode ?? res.statusCode ?? undefined;
              if (statusCode && statusCode >= 400 && statusCode < 500) {
                return 'error';
              } else if ((statusCode && statusCode >= 500) || err) {
                return 'error';
              } else if (statusCode && statusCode >= 300 && statusCode < 400) {
                return 'warn';
              }
              return 'info';
            },
            customProps(req, res) {
              return {
                statusCode: res.statusCode ?? req.statusCode ?? undefined,
              };
            },
            mixin() {
              return {
                serviceName: configService.get<string>('SERVICE_NAME'),
              };
            },
            wrapSerializers: true,
            timestamp: () => `,"timestamp":${Date.now().toString()}`,
            messageKey: 'message',
            serializers: {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              req(req) {
                return undefined;
              },
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              err(err) {
                return undefined;
              },
            },
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    RequestService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      scope: Scope.REQUEST,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthenticationMiddleware).forRoutes('*');
  }
}
