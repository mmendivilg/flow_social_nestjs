import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoachingController } from './coaching.controller';
import { CoachingService } from './coaching.service';
import { CoachingRequestEntity } from './entities/coaching-request.entity';
import { CoachingResponseEntity } from './entities/coaching-response.entity';
import { AiModule } from '../ai/ai.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { CoachingFeedbackEntity } from './entities/feedback.entity';
import { CoachingFeedbackService } from './coaching-feedback.service';
import { CoachingV2Controller } from './coaching-v2.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CoachingRequestEntity,
      CoachingResponseEntity,
      CoachingFeedbackEntity,
    ]),
    AiModule,
    ProfilesModule,
  ],
  controllers: [CoachingController, CoachingV2Controller],
  providers: [CoachingService, CoachingFeedbackService],
  exports: [CoachingService],
})
export class CoachingModule {}
