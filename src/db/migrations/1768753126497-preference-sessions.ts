import { MigrationInterface, QueryRunner } from 'typeorm';

export class PreferenceSessions1768753126497 implements MigrationInterface {
  name = 'PreferenceSessions1768753126497';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "preference_sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "status" character varying NOT NULL DEFAULT 'in_progress', "context_text" text, "answers_json" jsonb NOT NULL DEFAULT '{}'::jsonb, "derived_profile_json" jsonb, "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "completed_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f488f99dfb1e61e673c6bce3030" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_preference_sessions_status" ON "preference_sessions" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_preference_sessions_user_id" ON "preference_sessions" ("user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ALTER COLUMN "profile_json" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "preference_sessions" ADD CONSTRAINT "FK_5bc0e1d1843a3e1dd125f407c1a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "preference_sessions" DROP CONSTRAINT "FK_5bc0e1d1843a3e1dd125f407c1a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ALTER COLUMN "profile_json" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_preference_sessions_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_preference_sessions_status"`,
    );
    await queryRunner.query(`DROP TABLE "preference_sessions"`);
  }
}
