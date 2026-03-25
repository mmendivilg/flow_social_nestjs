import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import type { EntryMode, EntryRole, EntryStatus } from '../conversation.types';
import { ConversationChatEntity } from './conversation-chat.entity';

@Entity('conversation_entries')
@Index('IDX_conversation_entries_chat_created', ['chatId', 'createdAt'])
@Index('IDX_conversation_entries_user_created', ['userId', 'createdAt'])
export class ConversationEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'chat_id', type: 'uuid' })
  chatId: string;

  @ManyToOne(() => ConversationChatEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_id' })
  chat: ConversationChatEntity;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'role', type: 'varchar' })
  role: EntryRole;

  @Column({ name: 'mode', type: 'varchar', nullable: true })
  mode: EntryMode | null;

  @Column({ name: 'content_text', type: 'text' })
  contentText: string;

  @Column({ name: 'source_text', type: 'text', nullable: true })
  sourceText: string | null;

  @Column({ name: 'ocr_text', type: 'text', nullable: true })
  ocrText: string | null;

  @Column({
    name: 'payload_json',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  payloadJson: Record<string, unknown>;

  @Column({ name: 'status', type: 'varchar', default: 'success' })
  status: EntryStatus;

  @Column({ name: 'model', type: 'varchar', nullable: true })
  model: string | null;

  @Column({ name: 'usage_json', type: 'jsonb', nullable: true })
  usageJson: Record<string, unknown> | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
