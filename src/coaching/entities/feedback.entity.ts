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
import { CoachingResponseEntity } from './coaching-response.entity';

export type FeedbackRating =
  | 'very_bad'
  | 'bad'
  | 'neutral'
  | 'good'
  | 'excellent';

@Entity('coaching_feedback')
@Index('IDX_coaching_feedback_user_id', ['userId'])
@Index('IDX_coaching_feedback_response_id', ['responseId'])
@Index('IDX_coaching_feedback_created_at', ['createdAt'])
export class CoachingFeedbackEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /* -------------------------
   * Relations
   * ------------------------- */

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

  @Column({ name: 'response_id', type: 'uuid' })
  responseId: string;

  @ManyToOne(() => CoachingResponseEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'response_id' })
  response: CoachingResponseEntity;

  /* -------------------------
   * Feedback data
   * ------------------------- */

  /**
   * High-level quality signal.
   */
  @Column({ name: 'rating', type: 'varchar' })
  rating: FeedbackRating;

  /**
   * Optional free-text feedback from the user.
   */
  @Column({ name: 'comment_text', type: 'text', nullable: true })
  commentText: string | null;

  /**
   * Structured signals for learning.
   * Example:
   * {
   *   "tone": "too_strong",
   *   "length": "too_long",
   *   "felt_authentic": false,
   *   "would_send": false
   * }
   */
  @Column({
    name: 'signals_json',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  signalsJson: Record<string, unknown>;

  /**
   * Optional: what the user actually sent instead (if they rewrote it).
   * Gold data for training later.
   */
  @Column({ name: 'user_rewrite_text', type: 'text', nullable: true })
  userRewriteText: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
