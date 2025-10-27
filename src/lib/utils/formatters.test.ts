import { describe, expect, test } from 'bun:test';
import {
  formatBattleTime,
  getDifficultyLabel,
  getDifficultyColor,
  getRoomStatusColor,
  getStatusColor,
  getStatusLabel,
} from './formatters';

describe('formatters', () => {
  describe('formatBattleTime', () => {
    test('should format 0 seconds as 0:00', () => {
      expect(formatBattleTime(0)).toBe('0:00');
    });

    test('should format seconds under 60', () => {
      expect(formatBattleTime(5)).toBe('0:05');
      expect(formatBattleTime(30)).toBe('0:30');
      expect(formatBattleTime(59)).toBe('0:59');
    });

    test('should format 60 seconds as 1:00', () => {
      expect(formatBattleTime(60)).toBe('1:00');
    });

    test('should format minutes and seconds correctly', () => {
      expect(formatBattleTime(65)).toBe('1:05');
      expect(formatBattleTime(125)).toBe('2:05');
      expect(formatBattleTime(300)).toBe('5:00');
      expect(formatBattleTime(600)).toBe('10:00');
    });

    test('should pad seconds with leading zero', () => {
      expect(formatBattleTime(61)).toBe('1:01');
      expect(formatBattleTime(121)).toBe('2:01');
    });

    test('should handle large time values', () => {
      expect(formatBattleTime(3661)).toBe('61:01');
    });

    test('should handle negative seconds (shows negative time)', () => {
      // Note: function doesn't validate negative input, just formats it
      const result = formatBattleTime(-5);
      expect(result).toContain(':');
    });
  });

  describe('getDifficultyLabel', () => {
    describe('English labels (default)', () => {
      test('should return "Mixed" for null/undefined/empty', () => {
        expect(getDifficultyLabel(null)).toBe('Mixed');
        expect(getDifficultyLabel(undefined)).toBe('Mixed');
        expect(getDifficultyLabel('')).toBe('Mixed');
      });

      test('should return label for numeric difficulty', () => {
        expect(getDifficultyLabel(1)).toBe('Easy');
        expect(getDifficultyLabel(2)).toBe('Medium');
        expect(getDifficultyLabel(3)).toBe('Hard');
      });

      test('should return label for string difficulty', () => {
        expect(getDifficultyLabel('easy')).toBe('Easy');
        expect(getDifficultyLabel('medium')).toBe('Medium');
        expect(getDifficultyLabel('hard')).toBe('Hard');
      });

      test('should handle case-insensitive string input', () => {
        expect(getDifficultyLabel('EASY')).toBe('Easy');
        expect(getDifficultyLabel('Medium')).toBe('Medium');
        expect(getDifficultyLabel('HARD')).toBe('Hard');
      });

      test('should capitalize unknown string difficulty', () => {
        expect(getDifficultyLabel('extreme')).toBe('Extreme');
        expect(getDifficultyLabel('beginner')).toBe('Beginner');
      });
    });

    describe('Indonesian labels', () => {
      test('should return Indonesian labels', () => {
        expect(getDifficultyLabel(1, 'id')).toBe('Mudah');
        expect(getDifficultyLabel(2, 'id')).toBe('Sedang');
        expect(getDifficultyLabel(3, 'id')).toBe('Sulit');
      });

      test('should return "Campuran" for null in Indonesian', () => {
        expect(getDifficultyLabel(null, 'id')).toBe('Campuran');
      });

      test('should handle string input in Indonesian', () => {
        expect(getDifficultyLabel('easy', 'id')).toBe('Mudah');
        expect(getDifficultyLabel('medium', 'id')).toBe('Sedang');
        expect(getDifficultyLabel('hard', 'id')).toBe('Sulit');
      });
    });

    describe('Language detection', () => {
      test('should detect Indonesian by prefix "id"', () => {
        expect(getDifficultyLabel(1, 'id-ID')).toBe('Mudah');
        expect(getDifficultyLabel(2, 'id_ID')).toBe('Sedang');
      });

      test('should default to English for unknown language', () => {
        expect(getDifficultyLabel(1, 'fr')).toBe('Easy');
        expect(getDifficultyLabel(2, 'de')).toBe('Medium');
      });
    });
  });

  describe('getDifficultyColor', () => {
    test('should return color for numeric difficulty', () => {
      expect(getDifficultyColor(1)).toBe('text-green-400');
      expect(getDifficultyColor(3)).toBe('text-red-400');
      expect(getDifficultyColor(2)).toBe('text-yellow-400');
    });

    test('should return color for string difficulty', () => {
      expect(getDifficultyColor('easy')).toContain('green');
      expect(getDifficultyColor('hard')).toContain('red');
      expect(getDifficultyColor('medium')).toContain('yellow');
    });

    test('should return text color for null/undefined', () => {
      // null/undefined defaults to medium difficulty
      expect(getDifficultyColor(null)).toBe('text-yellow-400');
      expect(getDifficultyColor(undefined)).toBe('text-yellow-400');
    });

    test('should handle case-insensitive string input', () => {
      const easyColor = getDifficultyColor('easy');
      const easyColorUppercase = getDifficultyColor('EASY');
      expect(easyColor).toBe(easyColorUppercase);
    });

    test('should return default color for unknown string', () => {
      const result = getDifficultyColor('unknown');
      expect(result).toBe('bg-gray-500/20 text-gray-400 border-gray-500/30');
    });
  });

  describe('getRoomStatusColor', () => {
    describe('default variant', () => {
      test('should return color for known status', () => {
        expect(getRoomStatusColor('waiting')).toContain('yellow');
        expect(getRoomStatusColor('active')).toContain('green');
        expect(getRoomStatusColor('finished')).toContain('blue');
      });

      test('should return default color for unknown status', () => {
        expect(getRoomStatusColor('unknown')).toBe(
          'bg-gray-500/20 text-gray-400 border-gray-500/30'
        );
      });
    });

    describe('badge variant', () => {
      test('should return badge color for known status', () => {
        const waitingBadge = getRoomStatusColor('waiting', 'badge');
        expect(waitingBadge).toContain('blue');

        const activeBadge = getRoomStatusColor('active', 'badge');
        expect(activeBadge).toContain('orange');
      });

      test('should return finished color for badge variant', () => {
        const finishedBadge = getRoomStatusColor('finished', 'badge');
        expect(finishedBadge).toBe(
          'bg-gray-500/20 text-gray-400 border-gray-500/30'
        );
      });
    });

    test('should differentiate between variants', () => {
      const defaultWaiting = getRoomStatusColor('waiting', 'default');
      const badgeWaiting = getRoomStatusColor('waiting', 'badge');
      expect(defaultWaiting).not.toBe(badgeWaiting);
    });
  });

  describe('getStatusColor', () => {
    test('should use badge variant by default', () => {
      const result = getStatusColor('waiting');
      const expected = getRoomStatusColor('waiting', 'badge');
      expect(result).toBe(expected);
    });

    test('should work for all status types', () => {
      expect(getStatusColor('waiting')).toContain('blue');
      expect(getStatusColor('active')).toContain('orange');
      expect(getStatusColor('finished')).toBeDefined();
    });
  });

  describe('getStatusLabel', () => {
    test('should return label for known status', () => {
      expect(getStatusLabel('waiting')).toBe('Waiting');
      expect(getStatusLabel('active')).toBe('In Progress');
      expect(getStatusLabel('finished')).toBe('Finished');
    });

    test('should return status itself for unknown status', () => {
      expect(getStatusLabel('unknown')).toBe('unknown');
      expect(getStatusLabel('pending')).toBe('pending');
    });

    test('should handle edge cases', () => {
      expect(getStatusLabel('')).toBe('');
      expect(getStatusLabel('ACTIVE')).toBe('ACTIVE');
    });
  });
});
