import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConfidenceTest1768887600000 implements MigrationInterface {
  name = 'ConfidenceTest1768887600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "confidence_tests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "status" character varying NOT NULL DEFAULT 'pending', "assigned_profile_id" character varying NOT NULL, "attempt_count" integer NOT NULL DEFAULT '0', "latest_score" integer, "latest_feedback" text, "latest_result_json" jsonb, "completed_at" TIMESTAMP WITH TIME ZONE, "skipped_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8ff8dc7c95f06623e7528eb14b2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_confidence_tests_user_id" ON "confidence_tests" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_confidence_tests_status" ON "confidence_tests" ("status") `,
    );
    await queryRunner.query(
      `ALTER TABLE "confidence_tests" ADD CONSTRAINT "FK_confidence_tests_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "confidence_tests" DROP CONSTRAINT "FK_confidence_tests_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_confidence_tests_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_confidence_tests_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "confidence_tests"`);
  }
}
