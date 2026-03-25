import { z } from 'zod';
import { CHAT_TYPES, SUBMIT_MODES } from '../conversation.types';

export const CreateConversationChatBodySchema = z
  .object({
    type: z.enum(CHAT_TYPES),
    title: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

export type CreateConversationChatBodyDto = z.infer<
  typeof CreateConversationChatBodySchema
>;

export const UpdateConversationChatBodySchema = z
  .object({
    type: z.enum(CHAT_TYPES).optional(),
    title: z
      .union([z.string().trim().min(1).max(120), z.literal(null)])
      .optional(),
  })
  .strict()
  .refine((value) => value.type !== undefined || value.title !== undefined, {
    message: 'At least one field must be provided',
  });

export type UpdateConversationChatBodyDto = z.infer<
  typeof UpdateConversationChatBodySchema
>;

export const UpdateConversationChatFavoriteBodySchema = z
  .object({
    isFavorite: z.boolean(),
  })
  .strict();

export type UpdateConversationChatFavoriteBodyDto = z.infer<
  typeof UpdateConversationChatFavoriteBodySchema
>;

export const SubmitModeSchema = z.enum(SUBMIT_MODES);
export type SubmitModeDto = z.infer<typeof SubmitModeSchema>;
