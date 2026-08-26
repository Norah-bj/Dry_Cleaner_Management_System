export interface AppConfig {
  env: string;
  port: number;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface Configuration {
  app: AppConfig;
  database: DatabaseConfig;
}

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export default (): Configuration => ({
  app: {
    env: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
  },
  database: {
    host: requireEnv('DATABASE_HOST'),
    port: parseInt(requireEnv('DATABASE_PORT'), 10),
    username: requireEnv('DATABASE_USER'),
    password: requireEnv('DATABASE_PASSWORD'),
    database: requireEnv('DATABASE_NAME'),
  },
});
