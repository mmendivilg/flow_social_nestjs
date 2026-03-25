import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { ConversationChatEntity } from './entities/conversation-chat.entity';
import { ConversationEntryEntity } from './entities/conversation-entry.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConversationChatEntity, ConversationEntryEntity]),
    AiModule,
    ProfilesModule,
  ],
  controllers: [ConversationController],
  providers: [ConversationService],
  exports: [ConversationService],
})
export class ConversationModule {}
