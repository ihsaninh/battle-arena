import { describe, expect, test } from 'bun:test';
import {
  displayNameSchema,
  roomIdSchema,
  roundNoSchema,
  answerTextSchema,
  choiceIdSchema,
  topicSchema,
  languageSchema,
  numQuestionsSchema,
  roundTimeSecSchema,
  capacitySchema,
  questionTypeSchema,
  battleDifficultySchema,
  battleModeSchema,
  createRoomSchema,
  joinRoomSchema,
  submitAnswerSchema,
  validateRequest,
} from './validation';

describe('Validation Schemas', () => {
  describe('displayNameSchema', () => {
    test('should validate valid display names', () => {
      expect(() => displayNameSchema.parse('John Doe')).not.toThrow();
      expect(() => displayNameSchema.parse('User-123')).not.toThrow();
      expect(() => displayNameSchema.parse('Alice_Bob')).not.toThrow();
    });

    test('should reject empty display name', () => {
      expect(() => displayNameSchema.parse('')).toThrow();
    });

    test('should reject display name over 100 characters', () => {
      const longName = 'a'.repeat(101);
      expect(() => displayNameSchema.parse(longName)).toThrow();
    });

    test('should reject display name with invalid characters', () => {
      expect(() => displayNameSchema.parse('User@123')).toThrow();
      expect(() => displayNameSchema.parse('User<>Name')).toThrow();
      expect(() => displayNameSchema.parse('User#Name')).toThrow();
    });

    test('should accept max length display name', () => {
      const maxName = 'a'.repeat(100);
      expect(() => displayNameSchema.parse(maxName)).not.toThrow();
    });
  });

  describe('roomIdSchema', () => {
    test('should validate valid room IDs', () => {
      expect(() => roomIdSchema.parse('room-123')).not.toThrow();
      expect(() => roomIdSchema.parse('abc_def')).not.toThrow();
      expect(() => roomIdSchema.parse('R1')).not.toThrow();
    });

    test('should reject empty room ID', () => {
      expect(() => roomIdSchema.parse('')).toThrow();
    });

    test('should reject invalid characters', () => {
      expect(() => roomIdSchema.parse('room@123')).toThrow();
      expect(() => roomIdSchema.parse('room 123')).toThrow();
    });

    test('should accept alphanumeric, dash, and underscore', () => {
      expect(() => roomIdSchema.parse('room-123_ABC')).not.toThrow();
    });
  });

  describe('roundNoSchema', () => {
    test('should validate valid round numbers', () => {
      expect(() => roundNoSchema.parse(1)).not.toThrow();
      expect(() => roundNoSchema.parse(5)).not.toThrow();
      expect(() => roundNoSchema.parse(20)).not.toThrow();
    });

    test('should reject 0', () => {
      expect(() => roundNoSchema.parse(0)).toThrow();
    });

    test('should reject negative numbers', () => {
      expect(() => roundNoSchema.parse(-1)).toThrow();
    });

    test('should reject float', () => {
      expect(() => roundNoSchema.parse(1.5)).toThrow();
    });

    test('should reject over 20', () => {
      expect(() => roundNoSchema.parse(21)).toThrow();
    });
  });

  describe('answerTextSchema', () => {
    test('should validate non-empty answer text', () => {
      expect(() => answerTextSchema.parse('This is an answer')).not.toThrow();
    });

    test('should reject empty string', () => {
      expect(() => answerTextSchema.parse('')).toThrow();
    });

    test('should reject text over 5000 characters', () => {
      const longText = 'a'.repeat(5001);
      expect(() => answerTextSchema.parse(longText)).toThrow();
    });

    test('should accept max length text', () => {
      const maxText = 'a'.repeat(5000);
      expect(() => answerTextSchema.parse(maxText)).not.toThrow();
    });
  });

  describe('languageSchema', () => {
    test('should validate 2-character language codes', () => {
      expect(() => languageSchema.parse('en')).not.toThrow();
      expect(() => languageSchema.parse('id')).not.toThrow();
      expect(() => languageSchema.parse('fr')).not.toThrow();
    });

    test('should reject non-2 character codes', () => {
      expect(() => languageSchema.parse('e')).toThrow();
      expect(() => languageSchema.parse('eng')).toThrow();
    });

    test('should reject uppercase', () => {
      expect(() => languageSchema.parse('EN')).toThrow();
    });

    test('should reject non-alphabetic', () => {
      expect(() => languageSchema.parse('e1')).toThrow();
      expect(() => languageSchema.parse('e-')).toThrow();
    });
  });

  describe('numQuestionsSchema', () => {
    test('should validate valid question counts', () => {
      expect(() => numQuestionsSchema.parse(1)).not.toThrow();
      expect(() => numQuestionsSchema.parse(10)).not.toThrow();
      expect(() => numQuestionsSchema.parse(20)).not.toThrow();
    });

    test('should reject 0 or less', () => {
      expect(() => numQuestionsSchema.parse(0)).toThrow();
      expect(() => numQuestionsSchema.parse(-1)).toThrow();
    });

    test('should reject more than 20', () => {
      expect(() => numQuestionsSchema.parse(21)).toThrow();
    });

    test('should reject float', () => {
      expect(() => numQuestionsSchema.parse(10.5)).toThrow();
    });
  });

  describe('roundTimeSecSchema', () => {
    test('should validate valid round times', () => {
      expect(() => roundTimeSecSchema.parse(5)).not.toThrow();
      expect(() => roundTimeSecSchema.parse(30)).not.toThrow();
      expect(() => roundTimeSecSchema.parse(600)).not.toThrow();
    });

    test('should reject less than 5 seconds', () => {
      expect(() => roundTimeSecSchema.parse(4)).toThrow();
    });

    test('should reject more than 600 seconds', () => {
      expect(() => roundTimeSecSchema.parse(601)).toThrow();
    });

    test('should reject float', () => {
      expect(() => roundTimeSecSchema.parse(30.5)).toThrow();
    });
  });

  describe('capacitySchema', () => {
    test('should validate valid capacities', () => {
      expect(() => capacitySchema.parse(2)).not.toThrow();
      expect(() => capacitySchema.parse(10)).not.toThrow();
      expect(() => capacitySchema.parse(100)).not.toThrow();
    });

    test('should reject less than 2', () => {
      expect(() => capacitySchema.parse(1)).toThrow();
    });

    test('should reject more than 100', () => {
      expect(() => capacitySchema.parse(101)).toThrow();
    });

    test('should allow undefined (optional)', () => {
      expect(() => capacitySchema.parse(undefined)).not.toThrow();
    });
  });

  describe('questionTypeSchema', () => {
    test('should validate open-ended', () => {
      expect(() => questionTypeSchema.parse('open-ended')).not.toThrow();
    });

    test('should validate multiple-choice', () => {
      expect(() => questionTypeSchema.parse('multiple-choice')).not.toThrow();
    });

    test('should reject invalid types', () => {
      expect(() => questionTypeSchema.parse('mcq')).toThrow();
      expect(() => questionTypeSchema.parse('essay')).toThrow();
    });
  });

  describe('battleDifficultySchema', () => {
    test('should validate valid difficulties', () => {
      expect(() => battleDifficultySchema.parse('easy')).not.toThrow();
      expect(() => battleDifficultySchema.parse('medium')).not.toThrow();
      expect(() => battleDifficultySchema.parse('hard')).not.toThrow();
    });

    test('should reject invalid difficulties', () => {
      expect(() => battleDifficultySchema.parse('extreme')).toThrow();
      expect(() => battleDifficultySchema.parse('EASY')).toThrow();
    });
  });

  describe('battleModeSchema', () => {
    test('should validate individual mode', () => {
      expect(() => battleModeSchema.parse('individual')).not.toThrow();
    });

    test('should validate team mode', () => {
      expect(() => battleModeSchema.parse('team')).not.toThrow();
    });

    test('should reject invalid modes', () => {
      expect(() => battleModeSchema.parse('solo')).toThrow();
      expect(() => battleModeSchema.parse('pvp')).toThrow();
    });
  });

  describe('createRoomSchema', () => {
    test('should validate basic create room data', () => {
      const data = {
        hostDisplayName: 'John',
        language: 'en',
        numQuestions: 10,
        roundTimeSec: 30,
        questionType: 'open-ended',
        battleMode: 'individual',
      };

      expect(() => createRoomSchema.parse(data)).not.toThrow();
    });

    test('should reject team mode with odd capacity', () => {
      const data = {
        hostDisplayName: 'John',
        language: 'en',
        numQuestions: 10,
        roundTimeSec: 30,
        questionType: 'open-ended',
        battleMode: 'team',
        capacity: 5,
      };

      expect(() => createRoomSchema.parse(data)).toThrow();
    });

    test('should reject team mode with capacity below 4', () => {
      const data = {
        hostDisplayName: 'John',
        language: 'en',
        numQuestions: 10,
        roundTimeSec: 30,
        questionType: 'open-ended',
        battleMode: 'team',
        capacity: 2,
      };

      expect(() => createRoomSchema.parse(data)).toThrow();
    });

    test('should accept team mode with valid even capacity', () => {
      const data = {
        hostDisplayName: 'John',
        language: 'en',
        numQuestions: 10,
        roundTimeSec: 30,
        questionType: 'open-ended',
        battleMode: 'team',
        capacity: 6,
      };

      expect(() => createRoomSchema.parse(data)).not.toThrow();
    });

    test('should apply default values', () => {
      const data = {
        hostDisplayName: 'John',
      };

      const result = createRoomSchema.parse(data);
      expect(result.language).toBe('en');
      expect(result.numQuestions).toBe(10);
      expect(result.roundTimeSec).toBe(30);
      expect(result.questionType).toBe('open-ended');
      expect(result.battleMode).toBe('individual');
    });
  });

  describe('joinRoomSchema', () => {
    test('should validate join room data', () => {
      expect(() =>
        joinRoomSchema.parse({ displayName: 'Alice' })
      ).not.toThrow();
    });

    test('should require displayName', () => {
      expect(() => joinRoomSchema.parse({})).toThrow();
    });

    test('should reject invalid displayName', () => {
      expect(() => joinRoomSchema.parse({ displayName: '' })).toThrow();
    });
  });

  describe('submitAnswerSchema', () => {
    test('should validate with answer_text', () => {
      expect(() =>
        submitAnswerSchema.parse({ answer_text: 'My answer' })
      ).not.toThrow();
    });

    test('should validate with choice_id', () => {
      expect(() =>
        submitAnswerSchema.parse({ choice_id: 'option-1' })
      ).not.toThrow();
    });

    test('should require either answer_text or choice_id', () => {
      expect(() => submitAnswerSchema.parse({})).toThrow();
    });

    test('should accept both answer_text and choice_id', () => {
      expect(() =>
        submitAnswerSchema.parse({
          answer_text: 'My answer',
          choice_id: 'option-1',
        })
      ).not.toThrow();
    });

    test('should accept optional timeMs', () => {
      expect(() =>
        submitAnswerSchema.parse({
          answer_text: 'My answer',
          timeMs: 5000,
        })
      ).not.toThrow();
    });
  });

  describe('validateRequest', () => {
    test('should return success with valid data', () => {
      const result = validateRequest(displayNameSchema, 'John');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('John');
      }
    });

    test('should return error with invalid data', () => {
      const result = validateRequest(roundNoSchema, -1);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Validation failed');
    });

    test('should include error details', () => {
      const result = validateRequest(roundNoSchema, 'not a number');
      expect(result.success).toBe(false);
      expect(result.details).toBeDefined();
      expect((result.details || []).length).toBeGreaterThan(0);
    });

    test('should handle complex schema validation', () => {
      const validRoom = {
        hostDisplayName: 'Host',
        language: 'en',
      };

      const result = validateRequest(createRoomSchema, validRoom);
      expect(result.success).toBe(true);
    });
  });

  describe('edge cases', () => {
    test('should handle null values appropriately', () => {
      const result = validateRequest(topicSchema, null);
      expect(result.success).toBe(false);
    });

    test('should handle whitespace in strings', () => {
      expect(() => displayNameSchema.parse('  John Doe  ')).not.toThrow();
    });

    test('should validate boundary values', () => {
      // Min/max boundaries
      expect(() => numQuestionsSchema.parse(1)).not.toThrow();
      expect(() => numQuestionsSchema.parse(20)).not.toThrow();
      expect(() => roundTimeSecSchema.parse(5)).not.toThrow();
      expect(() => roundTimeSecSchema.parse(600)).not.toThrow();
    });
  });
});
