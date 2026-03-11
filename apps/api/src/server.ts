import { buildApp } from './app';
import { loadConfig } from './config';

const config = loadConfig();
const app = await buildApp({ config });

try {
  await app.listen({ port: config.port, host: '0.0.0.0' });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
