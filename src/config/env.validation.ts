import { z } from 'zod';

const csvString = z.string().trim().min(1);
const booleanString = z.enum(['true', 'false']);
const positiveIntegerString = z.string().regex(/^[1-9]\d*$/);

const envSchema = z
  .object({
    PORT: z.string().regex(/^\d+$/).optional(),
    APP_HOST: z.string().trim().min(1).optional(),
    CORS_ORIGINS: csvString.optional(),
    CORS_CREDENTIALS: booleanString.optional(),
    CORS_METHODS: csvString.optional(),
    CORS_ALLOWED_HEADERS: csvString.optional(),
    SWAGGER_ENABLED: booleanString.optional(),
    SWAGGER_PATH: z.string().trim().min(1).optional(),
    SWAGGER_TITLE: z.string().trim().min(1).optional(),
    SWAGGER_DESCRIPTION: z.string().trim().min(1).optional(),
    SWAGGER_VERSION: z.string().trim().min(1).optional(),
    OPENAI_CONVERSATION_MODEL: z.string().trim().min(1).optional(),
    OPENAI_OCR_MODEL: z.string().trim().min(1).optional(),
    CONVERSATION_CONTEXT_LIMIT: positiveIntegerString.optional(),
    CONVERSATION_MAX_IMAGES: positiveIntegerString.optional(),
    CONVERSATION_MAX_IMAGE_MB: positiveIntegerString.optional(),
    CONVERSATION_MAX_TEXT_CHARS: positiveIntegerString.optional(),
  })
  .passthrough();

export const validateEnv = (config: Record<string, unknown>) => {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const errors = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment variables: ${errors}`);
  }

  return parsed.data;
};
