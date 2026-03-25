import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AccessTokenUser } from '../auth/types/auth-request.types';
import { JwtGuard } from '../common/guards/jwt.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  type CreateConversationChatBodyDto,
  CreateConversationChatBodySchema,
  SubmitModeSchema,
  type UpdateConversationChatFavoriteBodyDto,
  UpdateConversationChatFavoriteBodySchema,
  type UpdateConversationChatBodyDto,
  UpdateConversationChatBodySchema,
} from './dto/conversation.dto';
import {
  ConversationService,
  type UploadedConversationImage,
} from './conversation.service';

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const DEFAULT_MAX_IMAGES = 3;
const DEFAULT_MAX_IMAGE_MB = 5;
const uploadMaxImages = parsePositiveInt(
  process.env.CONVERSATION_MAX_IMAGES,
  DEFAULT_MAX_IMAGES,
);
const uploadMaxImageMb = parsePositiveInt(
  process.env.CONVERSATION_MAX_IMAGE_MB,
  DEFAULT_MAX_IMAGE_MB,
);

@UseGuards(JwtGuard)
@ApiTags('conversation')
@ApiBearerAuth()
@Controller('conversation')
export class ConversationController {
  constructor(private readonly conversation: ConversationService) {}

  @Post('chats')
  async createChat(
    @CurrentUser() user: AccessTokenUser,
    @Body(new ZodValidationPipe(CreateConversationChatBodySchema))
    body: CreateConversationChatBodyDto,
  ) {
    const chat = await this.conversation.createChat({
      userId: user.userId,
      type: body.type,
      title: body.title ?? null,
    });

    return {
      id: chat.id,
      type: chat.type,
      title: chat.title,
      isFavorite: chat.isFavorite,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };
  }

  @Get('chats')
  async listChats(
    @CurrentUser() user: AccessTokenUser,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('favorite') favorite?: string,
    @Query('q') q?: string,
    @Query('type') type?: string,
  ) {
    const result = await this.conversation.listChatsForUser(user.userId, {
      limit,
      cursor,
      favorite,
      q,
      type,
    });

    return {
      items: result.items.map((chat) => ({
        id: chat.id,
        type: chat.type,
        title: chat.title,
        isFavorite: chat.isFavorite,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      })),
      nextCursor: result.nextCursor,
    };
  }

  @Patch('chats/:id')
  async updateChat(
    @CurrentUser() user: AccessTokenUser,
    @Param('id') chatId: string,
    @Body(new ZodValidationPipe(UpdateConversationChatBodySchema))
    body: UpdateConversationChatBodyDto,
  ) {
    const chat = await this.conversation.updateChatForUser({
      userId: user.userId,
      chatId,
      type: body.type,
      title: body.title,
    });

    return {
      id: chat.id,
      type: chat.type,
      title: chat.title,
      isFavorite: chat.isFavorite,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };
  }

  @Patch('chats/:id/favorite')
  async setFavorite(
    @CurrentUser() user: AccessTokenUser,
    @Param('id') chatId: string,
    @Body(new ZodValidationPipe(UpdateConversationChatFavoriteBodySchema))
    body: UpdateConversationChatFavoriteBodyDto,
  ) {
    const chat = await this.conversation.setChatFavoriteForUser({
      userId: user.userId,
      chatId,
      isFavorite: body.isFavorite,
    });

    return {
      id: chat.id,
      type: chat.type,
      title: chat.title,
      isFavorite: chat.isFavorite,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    };
  }

  @Get('chats/:id/entries')
  async listEntries(
    @CurrentUser() user: AccessTokenUser,
    @Param('id') chatId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const result = await this.conversation.listEntriesForUserChat({
      userId: user.userId,
      chatId,
      limit,
      cursor,
    });

    return {
      items: result.items.map((entry) => ({
        id: entry.id,
        chatId: entry.chatId,
        role: entry.role,
        mode: entry.mode,
        status: entry.status,
        contentText: entry.contentText,
        sourceText: entry.sourceText,
        ocrText: entry.ocrText,
        payload: entry.payloadJson,
        model: entry.model,
        usage: entry.usageJson,
        errorMessage: entry.errorMessage,
        createdAt: entry.createdAt,
      })),
      nextCursor: result.nextCursor,
    };
  }

  @Post('chats/:id/submit')
  @UseInterceptors(
    FilesInterceptor('images', uploadMaxImages, {
      limits: {
        files: uploadMaxImages,
        fileSize: uploadMaxImageMb * 1024 * 1024,
      },
    }),
  )
  async submit(
    @CurrentUser() user: AccessTokenUser,
    @Param('id') chatId: string,
    @Body() body: { mode?: string; text?: string },
    @UploadedFiles() uploadedFiles: unknown[] = [],
  ) {
    const modeResult = SubmitModeSchema.safeParse(body.mode);
    if (!modeResult.success) {
      throw new BadRequestException(
        'mode must be one of suggest_reply or ask_advice',
      );
    }

    const images = uploadedFiles as UploadedConversationImage[];

    const result = await this.conversation.submitToChat({
      userId: user.userId,
      chatId,
      mode: modeResult.data,
      text: typeof body.text === 'string' ? body.text : null,
      images,
    });

    return {
      chatId: result.chat.id,
      userEntry: {
        id: result.userEntry.id,
        role: result.userEntry.role,
        mode: result.userEntry.mode,
        contentText: result.userEntry.contentText,
        sourceText: result.userEntry.sourceText,
        ocrText: result.userEntry.ocrText,
        createdAt: result.userEntry.createdAt,
      },
      assistantEntry: {
        id: result.assistantEntry.id,
        role: result.assistantEntry.role,
        mode: result.assistantEntry.mode,
        status: result.assistantEntry.status,
        contentText: result.assistantEntry.contentText,
        payload: result.assistantEntry.payloadJson,
        model: result.assistantEntry.model,
        usage: result.assistantEntry.usageJson,
        errorMessage: result.assistantEntry.errorMessage,
        createdAt: result.assistantEntry.createdAt,
      },
      output: result.output,
      errorMessage: result.errorMessage,
    };
  }

  @Post('chats/:id/analyze-options')
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        chatId: { type: 'string' },
        analysisEntryId: { type: 'string' },
        analysis: {
          type: 'object',
          properties: {
            conversationState: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
              },
            },
            coreStrategy: { type: 'string' },
            flowScore: { type: 'number' },
            successProbability: { type: 'number' },
            scoreBand: { type: 'string', enum: ['low', 'medium', 'high'] },
            nextSteps: { type: 'array', items: { type: 'string' } },
            suggestedReplies: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string', enum: ['safe', 'balanced', 'bold'] },
                  text: { type: 'string' },
                  recommended: { type: 'boolean' },
                },
              },
            },
            rationale: { type: 'string' },
            safety: {
              type: 'object',
              properties: {
                blocked: { type: 'boolean' },
                flags: { type: 'array', items: { type: 'string' } },
                note: { type: 'string', nullable: true },
              },
            },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  async analyzeOptions(
    @CurrentUser() user: AccessTokenUser,
    @Param('id') chatId: string,
  ) {
    const result = await this.conversation.analyzeOptionsForChat({
      userId: user.userId,
      chatId,
    });

    return {
      chatId: result.chat.id,
      analysisEntryId: result.analysisEntry.id,
      analysis: result.analysis,
      createdAt: result.analysisEntry.createdAt,
    };
  }
}
