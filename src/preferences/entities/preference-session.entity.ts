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

export type PreferenceSessionStatus = 'in_progress' | 'completed';

@Entity('preference_sessions')
@Index('IDX_preference_sessions_user_id', ['userId'])
@Index('IDX_preference_sessions_status', ['status'])
export class PreferenceSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'status', type: 'varchar', default: 'in_progress' })
  status: PreferenceSessionStatus;

  // Free-text story/context the user provides (optional)
  @Column({ name: 'context_text', type: 'text', nullable: true })
  contextText: string | null;

  /**
   * Stores structured answers keyed by question id, e.g.
   * {
   *   "intention": "serious_relationship",
   *   "vibe": "relax_joker",
   *   "flirt_level": "classy"
   * }
   */
  @Column({ name: 'answers_json', type: 'jsonb', default: () => "'{}'::jsonb" })
  answersJson: Record<string, unknown>;

  /**
   * AI-derived “style profile” summary for this session (optional until completed).
   */
  @Column({
    name: 'derived_profile_json',
    type: 'jsonb',
    nullable: true,
  })
  derivedProfileJson: Record<string, unknown> | null;

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'now()' })
  startedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
