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

export type CoachingGoal = 'casual' | 'serious_relationship' | 'just_chat';

export type CoachingVibe =
  | 'relax_joker'
  | 'quiet_polite'
  | 'confident_direct'
  | 'reserved_respectful';

export type FlirtLevel = 'none' | 'light' | 'classy';

@Entity('coaching_requests')
@Index('IDX_coaching_requests_user_id', ['userId'])
@Index('IDX_coaching_requests_created_at', ['createdAt'])
export class CoachingRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  /**
   * What is happening right now?
   * Example:
   * "I met a girl last weekend, we talked a bit and I got her number..."
   */
  @Column({ name: 'scenario_text', type: 'text' })
  scenarioText: string;

  /**
   * Optional last message from the other person (if continuing a chat)
   */
  @Column({ name: 'last_message_text', type: 'text', nullable: true })
  lastMessageText: string | null;

  /**
   * User intent / desired outcome
   */
  @Column({ name: 'goal', type: 'varchar' })
  goal: CoachingGoal;

  /**
   * Natural communication style
   */
  @Column({ name: 'vibe', type: 'varchar' })
  vibe: CoachingVibe;

  /**
   * Desired flirt intensity
   */
  @Column({ name: 'flirt_level', type: 'varchar' })
  flirtLevel: FlirtLevel;

  /**
   * Extra constraints or preferences:
   * - language
   * - message length
   * - no emojis
   * - WhatsApp / SMS
   */
  @Column({
    name: 'constraints_json',
    type: 'jsonb',
    default: () => "'{}'::jsonb",
  })
  constraintsJson: Record<string, unknown>;

  /**
   * Snapshot of the user profile version used to generate this request
   * (important when profiles evolve)
   */
  @Column({ name: 'profile_version', type: 'int' })
  profileVersion: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
