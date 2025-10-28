import * as Joi from 'joi';

export const envSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),

  // Central DB
  CENTRAL_DB_HOST: Joi.string().required(),
  CENTRAL_DB_PORT: Joi.number().default(5432),
  CENTRAL_DB_NAME: Joi.string().required(),
  CENTRAL_DB_USER: Joi.string().required(),
  CENTRAL_DB_PASS: Joi.string().required(),

  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('3600s'),

  // Admin DB
  ADMIN_DB_HOST: Joi.string().required(),
  ADMIN_DB_PORT: Joi.number().default(5432),
  ADMIN_DB_USER: Joi.string().required(),
  ADMIN_DB_PASS: Joi.string().required(),

  // Security
  BCRYPT_ROUNDS: Joi.number().default(12),

  // Logging
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),

  // Rate limiting
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(10),
});
