import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module';
import { ConfidenceTestEntity } from './entities/confidence-test.entity';
import { ConfidenceTestService } from './confidence-test.service';
import { ConfidenceTestController } from './confidence-test.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ConfidenceTestEntity]), AiModule],
  providers: [ConfidenceTestService],
  controllers: [ConfidenceTestController],
  exports: [ConfidenceTestService],
})
export class ConfidenceTestModule {}
