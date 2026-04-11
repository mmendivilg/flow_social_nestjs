import { BadRequestException } from '@nestjs/common';
import { AiV2Service } from '../ai/ai-v2.service';
import { CoachingV2Controller } from './coaching-v2.controller';
import { GenerateCoachingBodySchema } from './dto/generate-coaching.dto';

type UploadedCoachingImage = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

describe('CoachingV2Controller', () => {
  let controller: CoachingV2Controller;
  let ai: { generateCoaching: jest.Mock };

  beforeEach(() => {
    ai = {
      generateCoaching: jest.fn().mockResolvedValue({
        message: 'Test message',
        options: [{ text: 'Option A', label: 'balanced' }],
        rationale: ['short rationale'],
        safety: { blocked: false, flags: [] },
      }),
    };

    controller = new CoachingV2Controller(ai as unknown as AiV2Service);
  });

  it('accepts text-only payload', async () => {
    const body = GenerateCoachingBodySchema.parse({
      scenarioText: 'I met her at a coffee shop and got her number.',
      lastMessageText: null,
      goal: 'casual',
      vibe: 'relax_joker',
      flirtLevel: 'light',
    });

    const response = await controller.generate(body);

    expect(response).toMatchObject({
      status: 'success',
      message: 'Test message',
      options: [{ text: 'Option A', label: 'balanced' }],
      rationale: ['short rationale'],
      safety: { blocked: false, flags: [] },
    });

    expect(ai.generateCoaching).toHaveBeenCalledTimes(1);
    expect(ai.generateCoaching).toHaveBeenCalledWith({
      scenarioText: 'I met her at a coffee shop and got her number.',
      lastMessageText: null,
      goal: 'casual',
      vibe: 'relax_joker',
      flirtLevel: 'light',
      constraints: undefined,
      image: undefined,
    });
  });

  it('accepts text + valid image payload', async () => {
    const constraints = {
      language: 'es',
      locale: 'es-MX',
      numOptions: 3,
      emojiLevel: 'some',
    };

    const body = GenerateCoachingBodySchema.parse({
      scenarioText: 'She replied after two days and I want to keep it natural.',
      lastMessageText: 'Hey! Sorry for the late reply 😅',
      goal: 'casual',
      vibe: 'quiet_polite',
      flirtLevel: 'light',
      constraints: JSON.stringify(constraints),
    });

    const imageBuffer = Buffer.from('fake-png-content');
    const image = {
      buffer: imageBuffer,
      mimetype: 'image/png',
      originalname: 'context.png',
      size: imageBuffer.length,
    } as UploadedCoachingImage;

    await controller.generate(body, image);

    expect(ai.generateCoaching).toHaveBeenCalledTimes(1);
    const calls = ai.generateCoaching.mock.calls as Array<[unknown]>;
    const input = calls[0][0] as {
      image?: {
        buffer: Buffer;
        mimetype: string;
        originalname: string;
      };
      constraints?: Record<string, unknown>;
    };

    expect(input.constraints).toEqual(constraints);
    expect(input.image).toBeDefined();
    expect(input.image?.mimetype).toBe('image/png');
    expect(input.image?.originalname).toBe('context.png');
    expect(input.image?.buffer).toBeInstanceOf(Buffer);
    expect(input.image?.buffer.length).toBe(imageBuffer.length);
  });

  it('rejects invalid MIME type', async () => {
    const body = GenerateCoachingBodySchema.parse({
      scenarioText: 'I met her at a coffee shop and got her number.',
      lastMessageText: null,
      goal: 'casual',
      vibe: 'relax_joker',
      flirtLevel: 'none',
    });

    const image = {
      buffer: Buffer.from('not-an-image'),
      mimetype: 'text/plain',
      originalname: 'notes.txt',
      size: 12,
    } as UploadedCoachingImage;

    await expect(controller.generate(body, image)).rejects.toThrow(
      BadRequestException,
    );

    expect(ai.generateCoaching).not.toHaveBeenCalled();
  });

  it('rejects oversize image', async () => {
    const body = GenerateCoachingBodySchema.parse({
      scenarioText: 'I met her at a coffee shop and got her number.',
      lastMessageText: null,
      goal: 'casual',
      vibe: 'relax_joker',
      flirtLevel: 'none',
    });

    const oversizedBytes = 5 * 1024 * 1024 + 1;
    const image = {
      buffer: Buffer.alloc(1),
      mimetype: 'image/png',
      originalname: 'big.png',
      size: oversizedBytes,
    } as UploadedCoachingImage;

    await expect(controller.generate(body, image)).rejects.toThrow(
      BadRequestException,
    );

    expect(ai.generateCoaching).not.toHaveBeenCalled();
  });
});
