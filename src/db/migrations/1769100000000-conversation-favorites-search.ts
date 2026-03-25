import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConversationFavoritesSearch1769100000000
  implements MigrationInterface
{
  name = 'ConversationFavoritesSearch1769100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "conversation_chats" ADD COLUMN "is_favorite" boolean NOT NULL DEFAULT false`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_conversation_chats_user_favorite_updated" ON "conversation_chats" ("user_id", "is_favorite", "updated_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_conversation_chats_user_favorite_updated"`,
    );

    await queryRunner.query(
      `ALTER TABLE "conversation_chats" DROP COLUMN "is_favorite"`,
    );
  }
}
