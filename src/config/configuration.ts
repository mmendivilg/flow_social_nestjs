const DEFAULT_PORT = 3000;
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_CORS_ORIGINS = ['http://localhost:4173'];
const DEFAULT_CORS_METHODS = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
];
const DEFAULT_CORS_ALLOWED_HEADERS = ['Content-Type', 'Authorization'];

const parseCsv = (value: string | undefined, fallback: string[]): string[] => {
  if (!value) {
    return fallback;
  }

  const parsed = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : fallback;
};

const parseBoolean = (
  value: string | undefined,
  fallback: boolean,
): boolean => {
  if (value === undefined) {
    return fallback;
  }

  return value.trim().toLowerCase() === 'true';
};

const parsePort = (value: string | undefined): number => {
  if (!value) {
    return DEFAULT_PORT;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_PORT;
  }

  return parsed;
};

const parsePositiveInt = (
  value: string | undefined,
  fallback: number,
): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

export default () => ({
  app: {
    port: parsePort(process.env.PORT),
    host: process.env.APP_HOST?.trim() || DEFAULT_HOST,
    cors: {
      origins: parseCsv(process.env.CORS_ORIGINS, DEFAULT_CORS_ORIGINS),
      credentials: parseBoolean(process.env.CORS_CREDENTIALS, true),
      methods: parseCsv(process.env.CORS_METHODS, DEFAULT_CORS_METHODS),
      allowedHeaders: parseCsv(
        process.env.CORS_ALLOWED_HEADERS,
        DEFAULT_CORS_ALLOWED_HEADERS,
      ),
    },
    swagger: {
      enabled: parseBoolean(process.env.SWAGGER_ENABLED, true),
      path: process.env.SWAGGER_PATH?.trim() || 'docs',
      title: process.env.SWAGGER_TITLE?.trim() || 'Flow Social API',
      description:
        process.env.SWAGGER_DESCRIPTION?.trim() ||
        'Backend API for social coaching and tuning',
      version: process.env.SWAGGER_VERSION?.trim() || '1.0.0',
    },
  },
  conversation: {
    contextLimit: parsePositiveInt(process.env.CONVERSATION_CONTEXT_LIMIT, 20),
    maxImages: parsePositiveInt(process.env.CONVERSATION_MAX_IMAGES, 3),
    maxImageMb: parsePositiveInt(process.env.CONVERSATION_MAX_IMAGE_MB, 5),
    maxTextChars: parsePositiveInt(
      process.env.CONVERSATION_MAX_TEXT_CHARS,
      5000,
    ),
  },
  ai: {
    conversationModel:
      process.env.OPENAI_CONVERSATION_MODEL?.trim() ||
      process.env.OPENAI_MODEL?.trim() ||
      'gpt-5.2',
    ocrModel:
      process.env.OPENAI_OCR_MODEL?.trim() ||
      process.env.OPENAI_CONVERSATION_MODEL?.trim() ||
      process.env.OPENAI_MODEL?.trim() ||
      'gpt-4.1-mini',
  },
});
