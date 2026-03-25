import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import type { ChatType } from '../conversation.types';

@Entity('conversation_chats')
@Index('IDX_conversation_chats_user_updated', ['userId', 'updatedAt'])
@Index('IDX_conversation_chats_user_type', ['userId', 'type'])
export class ConversationChatEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'type', type: 'varchar' })
  type: ChatType;

  @Column({ name: 'title', type: 'varchar', nullable: true })
  title: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
