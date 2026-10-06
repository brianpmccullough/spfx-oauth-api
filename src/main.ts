import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigurationService } from './config/configuration.service';
import { configureCors } from './cors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureCors(app);
  await app.listen(app.get(ConfigurationService).settings.port);
}
void bootstrap();
