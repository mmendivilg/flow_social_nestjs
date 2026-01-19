import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserProfiles1768721119796 implements MigrationInterface {
  name = 'UserProfiles1768721119796';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_profiles" ("user_id" uuid NOT NULL, "display_name" character varying, "locale" character varying NOT NULL DEFAULT 'en', "timezone" character varying NOT NULL DEFAULT 'America/Mexico_City', "profile_json" jsonb NOT NULL DEFAULT '{}'::jsonb, "version" integer NOT NULL DEFAULT '1', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_6ca9503d77ae39b4b5a6cc3ba88" PRIMARY KEY ("user_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD CONSTRAINT "FK_6ca9503d77ae39b4b5a6cc3ba88" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_profiles" DROP CONSTRAINT "FK_6ca9503d77ae39b4b5a6cc3ba88"`,
    );
    await queryRunner.query(`DROP TABLE "user_profiles"`);
  }
}
