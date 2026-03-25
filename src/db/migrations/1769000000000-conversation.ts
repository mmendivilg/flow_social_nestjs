import { MigrationInterface, QueryRunner } from 'typeorm';

export class Conversation1769000000000 implements MigrationInterface {
  name = 'Conversation1769000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "conversation_chats" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "type" character varying NOT NULL,
        "title" character varying,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_conversation_chats_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_conversation_chats_user_updated" ON "conversation_chats" ("user_id", "updated_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_conversation_chats_user_type" ON "conversation_chats" ("user_id", "type")`,
    );

    await queryRunner.query(
      `CREATE TABLE "conversation_entries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "chat_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role" character varying NOT NULL,
        "mode" character varying,
        "content_text" text NOT NULL,
        "source_text" text,
        "ocr_text" text,
        "payload_json" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "status" character varying NOT NULL DEFAULT 'success',
        "model" character varying,
        "usage_json" jsonb,
        "error_message" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_conversation_entries_id" PRIMARY KEY ("id")
      )`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_conversation_entries_chat_created" ON "conversation_entries" ("chat_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_conversation_entries_user_created" ON "conversation_entries" ("user_id", "created_at")`,
    );

    await queryRunner.query(
      `ALTER TABLE "conversation_chats"
        ADD CONSTRAINT "FK_conversation_chats_user_id"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "conversation_entries"
        ADD CONSTRAINT "FK_conversation_entries_chat_id"
        FOREIGN KEY ("chat_id") REFERENCES "conversation_chats"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(
      `ALTER TABLE "conversation_entries"
        ADD CONSTRAINT "FK_conversation_entries_user_id"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversation_entries" DROP CONSTRAINT "FK_conversation_entries_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_entries" DROP CONSTRAINT "FK_conversation_entries_chat_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversation_chats" DROP CONSTRAINT "FK_conversation_chats_user_id"`,
    );

    await queryRunner.query(
      `DROP INDEX "public"."IDX_conversation_entries_user_created"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_conversation_entries_chat_created"`,
    );
    await queryRunner.query(`DROP TABLE "conversation_entries"`);

    await queryRunner.query(
      `DROP INDEX "public"."IDX_conversation_chats_user_type"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_conversation_chats_user_updated"`,
    );
    await queryRunner.query(`DROP TABLE "conversation_chats"`);
  }
}
