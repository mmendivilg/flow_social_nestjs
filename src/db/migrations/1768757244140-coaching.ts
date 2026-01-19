import { MigrationInterface, QueryRunner } from 'typeorm';

export class Coaching1768757244140 implements MigrationInterface {
  name = 'Coaching1768757244140';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "coaching_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "scenario_text" text NOT NULL, "last_message_text" text, "goal" character varying NOT NULL, "vibe" character varying NOT NULL, "flirt_level" character varying NOT NULL, "constraints_json" jsonb NOT NULL DEFAULT '{}'::jsonb, "profile_version" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_67efb2f1c3dbbe5129e25e0004f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_coaching_requests_created_at" ON "coaching_requests" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_coaching_requests_user_id" ON "coaching_requests" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "coaching_responses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "request_id" uuid NOT NULL, "status" character varying NOT NULL DEFAULT 'success', "message_text" text, "candidates_json" jsonb NOT NULL DEFAULT '[]'::jsonb, "meta_json" jsonb NOT NULL DEFAULT '{}'::jsonb, "model" character varying, "usage_json" jsonb, "provider_response_id" character varying, "error_message" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_baf3ef2524c21ac9cc926b4dae4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_coaching_responses_created_at" ON "coaching_responses" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_coaching_responses_request_id" ON "coaching_responses" ("request_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_coaching_responses_user_id" ON "coaching_responses" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "coaching_feedback" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "request_id" uuid NOT NULL, "response_id" uuid NOT NULL, "rating" character varying NOT NULL, "comment_text" text, "signals_json" jsonb NOT NULL DEFAULT '{}'::jsonb, "user_rewrite_text" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6f396019d4712cbec747ed31d86" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_coaching_feedback_created_at" ON "coaching_feedback" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_coaching_feedback_response_id" ON "coaching_feedback" ("response_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_coaching_feedback_user_id" ON "coaching_feedback" ("user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "preference_sessions" ALTER COLUMN "answers_json" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ALTER COLUMN "profile_json" SET DEFAULT '{}'::jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "coaching_requests" ADD CONSTRAINT "FK_418d12bb4c6852e899339e9db0f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "coaching_responses" ADD CONSTRAINT "FK_8a66b0549749fe326af924f4f3c" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "coaching_responses" ADD CONSTRAINT "FK_1af2170240eb55fc0544da0ac65" FOREIGN KEY ("request_id") REFERENCES "coaching_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "coaching_feedback" ADD CONSTRAINT "FK_f4b04f37ee0d5e42a8b59bad5e1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "coaching_feedback" ADD CONSTRAINT "FK_9b42f6bd126dd1900346330d9a1" FOREIGN KEY ("request_id") REFERENCES "coaching_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "coaching_feedback" ADD CONSTRAINT "FK_2adb609ba65ecdacad22a78af6c" FOREIGN KEY ("response_id") REFERENCES "coaching_responses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "coaching_feedback" DROP CONSTRAINT "FK_2adb609ba65ecdacad22a78af6c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "coaching_feedback" DROP CONSTRAINT "FK_9b42f6bd126dd1900346330d9a1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "coaching_feedback" DROP CONSTRAINT "FK_f4b04f37ee0d5e42a8b59bad5e1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "coaching_responses" DROP CONSTRAINT "FK_1af2170240eb55fc0544da0ac65"`,
    );
    await queryRunner.query(
      `ALTER TABLE "coaching_responses" DROP CONSTRAINT "FK_8a66b0549749fe326af924f4f3c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "coaching_requests" DROP CONSTRAINT "FK_418d12bb4c6852e899339e9db0f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ALTER COLUMN "profile_json" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "preference_sessions" ALTER COLUMN "answers_json" SET DEFAULT '{}'`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_coaching_feedback_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_coaching_feedback_response_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_coaching_feedback_created_at"`,
    );
    await queryRunner.query(`DROP TABLE "coaching_feedback"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_coaching_responses_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_coaching_responses_request_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_coaching_responses_created_at"`,
    );
    await queryRunner.query(`DROP TABLE "coaching_responses"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_coaching_requests_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_coaching_requests_created_at"`,
    );
    await queryRunner.query(`DROP TABLE "coaching_requests"`);
  }
}
