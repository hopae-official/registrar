import { Params } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { IncomingMessage, ServerResponse } from 'node:http';

type RawReq = IncomingMessage & { body?: unknown };
type RawRes = ServerResponse & { body?: unknown };

export function createLoggerConfig(config: ConfigService): Params {
  const stage = config.get<string>('STAGE');
  const isDev = stage === 'dev';
  const logLevel =
    config.get<string>('LOG_LEVEL') || (isDev ? 'debug' : 'info');

  const KNOWN_FIELDS = new Set([
    'req',
    'res',
    'responseTime',
    'reqBody',
    'resBody',
    'context',
    'err',
  ]);

  return {
    pinoHttp: {
      level: logLevel,
      formatters: {
        log(obj: Record<string, unknown>) {
          const formatted: Record<string, unknown> = {};
          const extra: Record<string, unknown> = {};

          for (const [key, value] of Object.entries(obj)) {
            if (KNOWN_FIELDS.has(key)) {
              formatted[key] = value;
            } else {
              extra[key] = value;
            }
          }

          if (Object.keys(extra).length > 0) {
            formatted.data = JSON.stringify(extra);
          }
          return formatted;
        },
      },
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers["x-api-key"]',
          'req.headers.cookie',
        ],
        censor: '[REDACTED]',
      },
      serializers: {
        req(req: RawReq) {
          return {
            method: req.method,
            url: req.url,
            headers: req.headers,
          };
        },
        res(res: RawRes) {
          return {
            statusCode: res.statusCode,
          };
        },
      },
      customSuccessObject(req: RawReq, res: RawRes, val: object) {
        return {
          ...val,
          reqBody: req.body ? JSON.stringify(req.body) : undefined,
          resBody: res.body ? JSON.stringify(res.body) : undefined,
        };
      },
      customErrorObject(req: RawReq, res: RawRes, _error: Error, val: object) {
        return {
          ...val,
          reqBody: req.body ? JSON.stringify(req.body) : undefined,
          resBody: res.body ? JSON.stringify(res.body) : undefined,
        };
      },
      customLogLevel: (_req, res, err) => {
        if (res.statusCode >= 500 || err) return 'error';
        return 'info';
      },
    },
  };
}
