import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('user_profiles')
export class UserProfileEntity {
  // Use user_id as the primary key for a strict 1:1
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column({ name: 'display_name', type: 'varchar', nullable: true })
  displayName: string | null;

  @Column({ name: 'locale', type: 'varchar', default: 'en' })
  locale: string;

  @Column({ name: 'timezone', type: 'varchar', default: 'America/Mexico_City' })
  timezone: string;

  @Column({ name: 'profile_json', type: 'jsonb', default: () => "'{}'::jsonb" })
  profileJson: Record<string, unknown>;

  @Column({ name: 'version', type: 'int', default: 1 })
  version: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
