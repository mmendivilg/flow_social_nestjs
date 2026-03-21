import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableCors({
    origin: config.getOrThrow<string[]>('app.cors.origins'),
    credentials: config.getOrThrow<boolean>('app.cors.credentials'),
    methods: config.getOrThrow<string[]>('app.cors.methods'),
    allowedHeaders: config.getOrThrow<string[]>('app.cors.allowedHeaders'),
  });

  if (config.getOrThrow<boolean>('app.swagger.enabled')) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(config.getOrThrow<string>('app.swagger.title'))
      .setDescription(config.getOrThrow<string>('app.swagger.description'))
      .setVersion(config.getOrThrow<string>('app.swagger.version'))
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(
      config.getOrThrow<string>('app.swagger.path'),
      app,
      document,
    );
  }

  await app.listen(
    config.getOrThrow<number>('app.port'),
    config.getOrThrow<string>('app.host'),
  );
}

void bootstrap();
