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

export type ConfidenceTestStatus = 'pending' | 'completed' | 'skipped';

@Entity('confidence_tests')
@Index('IDX_confidence_tests_user_id', ['userId'], { unique: true })
@Index('IDX_confidence_tests_status', ['status'])
export class ConfidenceTestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'status', type: 'varchar', default: 'pending' })
  status: ConfidenceTestStatus;

  @Column({ name: 'assigned_profile_id', type: 'varchar' })
  assignedProfileId: string;

  @Column({ name: 'attempt_count', type: 'int', default: 0 })
  attemptCount: number;

  @Column({ name: 'latest_score', type: 'int', nullable: true })
  latestScore: number | null;

  @Column({ name: 'latest_feedback', type: 'text', nullable: true })
  latestFeedback: string | null;

  @Column({ name: 'latest_result_json', type: 'jsonb', nullable: true })
  latestResultJson: Record<string, unknown> | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ name: 'skipped_at', type: 'timestamptz', nullable: true })
  skippedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
