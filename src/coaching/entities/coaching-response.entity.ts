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
import { CoachingRequestEntity } from './coaching-request.entity';

export type CoachingResponseStatus = 'success' | 'failed';

@Entity('coaching_responses')
@Index('IDX_coaching_responses_user_id', ['userId'])
@Index('IDX_coaching_responses_request_id', ['requestId'])
@Index('IDX_coaching_responses_created_at', ['createdAt'])
export class CoachingResponseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'request_id', type: 'uuid' })
  requestId: string;

  @ManyToOne(() => CoachingRequestEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request: CoachingRequestEntity;

  /**
   * Whether the generation succeeded.
   */
  @Column({ name: 'status', type: 'varchar', default: 'success' })
  status: CoachingResponseStatus;

  /**
   * Primary suggested message (simple path).
   * If you generate multiple options, store them in `candidates_json`.
   */
  @Column({ name: 'message_text', type: 'text', nullable: true })
  messageText: string | null;

  /**
   * Multiple candidate messages + structured info per candidate.
   * Example:
   * [
   *   { "text": "...", "label": "Playful", "reason": "..." },
   *   { "text": "...", "label": "Direct", "reason": "..." }
   * ]
   */
  @Column({
    name: 'candidates_json',
    type: 'jsonb',
    default: () => "'[]'::jsonb",
  })
  candidatesJson: Array<Record<string, unknown>>;

  /**
   * Extra metadata about the generation:
   * - detected_language
   * - emoji_used
   * - estimated_flirt_level
   * - tone_tags
   * - safety_flags
   */
  @Column({
    name: 'meta_json',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  metaJson: Record<string, unknown>;

  /**
   * Store model + provider info for audit/debug.
   * Example: "gpt-4.1-mini", "gpt-4o-mini", etc.
   */
  @Column({ name: 'model', type: 'varchar', nullable: true })
  model: string | null;

  /**
   * Token usage (if available from SDK).
   */
  @Column({ name: 'usage_json', type: 'jsonb', nullable: true })
  usageJson: Record<string, unknown> | null;

  /**
   * Store request id / trace id from provider if needed.
   */
  @Column({ name: 'provider_response_id', type: 'varchar', nullable: true })
  providerResponseId: string | null;

  /**
   * If status=failed, store a safe error message.
   * (Don't store secrets; don’t store the OPENAI key, etc.)
   */
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
