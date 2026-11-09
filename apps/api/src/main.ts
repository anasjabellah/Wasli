import 'reflect-metadata';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const { Logger, ValidationPipe } = await import('@nestjs/common');
const { ConfigService } = await import('@nestjs/config');
const { NestFactory } = await import('@nestjs/core');
const { DocumentBuilder, SwaggerModule } = await import('@nestjs/swagger');
const { default: helmet } = await import('helmet');
const { AppModule } = await import('./app.module.js');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  if (!config.get<string>('APP_DATABASE_URL')) {
    logger.warn(
      'APP_DATABASE_URL is unset. The API is using DATABASE_URL. Row-level security applies only when the API connects as the non-owner wasli_app role.',
    );
  }

  app.use(helmet({ contentSecurityPolicy: false }));
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: config
      .getOrThrow<string>('CORS_ORIGINS')
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Wasli API')
      .setDescription('Student pickup management API. PostgreSQL is the source of truth.')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('api/docs', app, document);

  const port = config.getOrThrow<number>('PORT');
  await app.listen(port, '0.0.0.0');
  logger.log(`API listening on port ${port}`);
}

void bootstrap();
