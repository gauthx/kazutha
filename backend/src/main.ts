import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));
  app.enableShutdownHooks();
  app.enableCors({
    origin: [
      'http://localhost:5173',
      /^http:\/\/10\.\d+\.\d+\.\d+:5173$/,
      /^http:\/\/192\.168\.\d+\.\d+:5173$/,
      /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:5173$/,
    ],
    credentials: true,
  });
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Application is running on port ${port}`);
}
await bootstrap();
