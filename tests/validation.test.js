import { describe, test, expect } from '@jest/globals';
import { Validator, ValidationError, RateLimiter, Sanitizer } from '../src/utils/validation.js';

describe('Validator', () => {
  describe('validateItemName', () => {
    test('should validate correct item names', () => {
      expect(Validator.validateItemName('Iron Sword')).toBe('Iron Sword');
      expect(Validator.validateItemName('Зелье здоровья')).toBe('Зелье здоровья');
      expect(Validator.validateItemName('A')).toBe('A'); // Minimum length
    });

    test('should trim whitespace', () => {
      expect(Validator.validateItemName('  Iron Sword  ')).toBe('Iron Sword');
    });

    test('should throw error for empty name', () => {
      expect(() => Validator.validateItemName('')).toThrow(ValidationError);
      expect(() => Validator.validateItemName(null)).toThrow(ValidationError);
      expect(() => Validator.validateItemName(undefined)).toThrow(ValidationError);
    });

    test('should throw error for too short name', () => {
      expect(() => Validator.validateItemName('a')).toThrow('минимум 2 символа');
    });

    test('should throw error for too long name', () => {
      const longName = 'a'.repeat(101);
      expect(() => Validator.validateItemName(longName)).toThrow('100 символов');
    });

    test('should throw error for suspicious patterns', () => {
      expect(() => Validator.validateItemName('https://malicious.com')).toThrow('недопустимые символы');
      expect(() => Validator.validateItemName('discord.gg/invite')).toThrow('недопустимые символы');
      expect(() => Validator.validateItemName('aaaaa')).toThrow('недопустимые символы'); // Repeated chars
    });
  });

  describe('validatePrice', () => {
    test('should validate correct prices', () => {
      expect(Validator.validatePrice(100)).toBe(100);
      expect(Validator.validatePrice(1)).toBe(1);
      expect(Validator.validatePrice(1000000)).toBe(1000000); // Max allowed
    });

    test('should throw error for invalid prices', () => {
      expect(() => Validator.validatePrice(0)).toThrow('положительным числом');
      expect(() => Validator.validatePrice(-10)).toThrow('положительным числом');
      expect(() => Validator.validatePrice('abc')).toThrow('числом');
      expect(() => Validator.validatePrice(null)).toThrow('обязательна');
    });

    test('should throw error for too high price', () => {
      expect(() => Validator.validatePrice(1000001)).toThrow('1,000,000 монет');
    });

    test('should throw error for non-integer price', () => {
      expect(() => Validator.validatePrice(10.5)).toThrow('целым числом');
    });
  });

  describe('validateQuantity', () => {
    test('should validate correct quantities', () => {
      expect(Validator.validateQuantity(1)).toBe(1);
      expect(Validator.validateQuantity(100)).toBe(100);
      expect(Validator.validateQuantity(10000)).toBe(10000); // Max allowed
    });

    test('should throw error for invalid quantities', () => {
      expect(() => Validator.validateQuantity(0)).toThrow('больше 0');
      expect(() => Validator.validateQuantity(-5)).toThrow('больше 0');
      expect(() => Validator.validateQuantity('abc')).toThrow('числом');
      expect(() => Validator.validateQuantity(null)).toThrow('обязательно');
    });

    test('should throw error for too high quantity', () => {
      expect(() => Validator.validateQuantity(10001)).toThrow('10,000');
    });

    test('should throw error for non-integer quantity', () => {
      expect(() => Validator.validateQuantity(5.5)).toThrow('целым числом');
    });
  });

  describe('validateDiscordId', () => {
    test('should validate correct Discord IDs', () => {
      expect(Validator.validateDiscordId('123456789012345678')).toBe('123456789012345678');
      expect(Validator.validateDiscordId('12345678901234567')).toBe('12345678901234567'); // Min length
      expect(Validator.validateDiscordId('1234567890123456789')).toBe('1234567890123456789'); // Max length
    });

    test('should throw error for invalid Discord IDs', () => {
      expect(() => Validator.validateDiscordId('1234567890123456')).toThrow('формат ID');
      expect(() => Validator.validateDiscordId('12345678901234567890')).toThrow('формат ID');
      expect(() => Validator.validateDiscordId('abc123')).toThrow('формат ID');
      expect(() => Validator.validateDiscordId('')).toThrow('обязателен');
    });
  });

  describe('validateDateTime', () => {
    test('should validate future dates', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      expect(Validator.validateDateTime(futureDate.toISOString())).toEqual(futureDate);
    });

    test('should throw error for past dates', () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      expect(() => Validator.validateDateTime(pastDate.toISOString())).toThrow('будущем');
    });

    test('should throw error for invalid date format', () => {
      expect(() => Validator.validateDateTime('invalid-date')).toThrow('формат даты');
      expect(() => Validator.validateDateTime('')).toThrow('обязательны');
    });

    test('should throw error for dates too far in future', () => {
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 2); // 2 years from now
      expect(() => Validator.validateDateTime(farFuture.toISOString())).toThrow('год вперёд');
    });
  });

  describe('validatePagination', () => {
    test('should validate correct pagination parameters', () => {
      expect(Validator.validatePagination(1, 10)).toEqual({ page: 1, limit: 10 });
      expect(Validator.validatePagination(5, 25)).toEqual({ page: 5, limit: 25 });
      expect(Validator.validatePagination(1, 50)).toEqual({ page: 1, limit: 50 }); // Max limit
    });

    test('should throw error for invalid page numbers', () => {
      expect(() => Validator.validatePagination(0)).toThrow('положительным числом');
      expect(() => Validator.validatePagination(-1)).toThrow('положительным числом');
      expect(() => Validator.validatePagination('abc')).toThrow('положительным числом');
    });

    test('should throw error for invalid limits', () => {
      expect(() => Validator.validatePagination(1, 0)).toThrow('1 до 50');
      expect(() => Validator.validatePagination(1, 51)).toThrow('1 до 50');
      expect(() => Validator.validatePagination(1, -1)).toThrow('1 до 50');
    });
  });

  describe('validateSearchTerm', () => {
    test('should validate correct search terms', () => {
      expect(Validator.validateSearchTerm('sword')).toBe('sword');
      expect(Validator.validateSearchTerm('  iron sword  ')).toBe('iron sword');
      expect(Validator.validateSearchTerm('')).toBe('');
      expect(Validator.validateSearchTerm(null)).toBe('');
    });

    test('should throw error for too long search terms', () => {
      const longTerm = 'a'.repeat(101);
      expect(() => Validator.validateSearchTerm(longTerm)).toThrow('100 символов');
    });

    test('should throw error for non-string search terms', () => {
      expect(() => Validator.validateSearchTerm(123)).toThrow('текстом');
    });
  });
});

describe('RateLimiter', () => {
  let rateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
  });

  test('should allow actions within rate limit', () => {
    const key = 'test_user';
    
    // First 5 attempts should be allowed
    for (let i = 0; i < 5; i++) {
      expect(rateLimiter.isRateLimited(key, 5, 60000)).toBe(false);
    }
  });

  test('should block actions after rate limit exceeded', () => {
    const key = 'test_user';
    
    // Exceed rate limit
    for (let i = 0; i < 6; i++) {
      rateLimiter.isRateLimited(key, 5, 60000);
    }
    
    // 6th attempt should be blocked
    expect(rateLimiter.isRateLimited(key, 5, 60000)).toBe(true);
  });

  test('should reset rate limit after window expires', () => {
    const key = 'test_user';
    
    // Exceed rate limit
    for (let i = 0; i < 6; i++) {
      rateLimiter.isRateLimited(key, 5, 60000);
    }
    
    // Reset should clear the limit
    rateLimiter.reset(key);
    expect(rateLimiter.isRateLimited(key, 5, 60000)).toBe(false);
  });

  test('should calculate time until reset correctly', () => {
    const key = 'test_user';
    const windowMs = 60000; // 1 minute
    
    rateLimiter.isRateLimited(key, 1, windowMs);
    
    const timeUntilReset = rateLimiter.getTimeUntilReset(key, windowMs);
    expect(timeUntilReset).toBeGreaterThan(0);
    expect(timeUntilReset).toBeLessThanOrEqual(windowMs);
  });
});

describe('Sanitizer', () => {
  describe('sanitizeForDB', () => {
    test('should sanitize text for database storage', () => {
      expect(Sanitizer.sanitizeForDB('  test  ')).toBe('test');
      expect(Sanitizer.sanitizeForDB('test\nwith\tcontrol\0chars')).toBe('test with controlchars');
      expect(Sanitizer.sanitizeForDB('test   with   multiple    spaces')).toBe('test with multiple spaces');
    });

    test('should handle non-string inputs', () => {
      expect(Sanitizer.sanitizeForDB(123)).toBe(123);
      expect(Sanitizer.sanitizeForDB(null)).toBe(null);
    });
  });

  describe('sanitizeForDiscord', () => {
    test('should sanitize text for Discord display', () => {
      expect(Sanitizer.sanitizeForDiscord('<script>alert("xss")</script>')).toBe('script>alert("xss")/script>');
      expect(Sanitizer.sanitizeForDiscord('@everyone check this out')).toBe('@\u200beveryone check this out');
      expect(Sanitizer.sanitizeForDiscord(123)).toBe('123');
    });
  });

  describe('escapeMarkdown', () => {
    test('should escape Discord markdown characters', () => {
      expect(Sanitizer.escapeMarkdown('**bold** text')).toBe('\\*\\*bold\\*\\* text');
      expect(Sanitizer.escapeMarkdown('_italic_ text')).toBe('\\_italic\\_ text');
      expect(Sanitizer.escapeMarkdown('`code` text')).toBe('\\`code\\` text');
      expect(Sanitizer.escapeMarkdown('||spoiler|| text')).toBe('\\|\\|spoiler\\|\\| text');
      expect(Sanitizer.escapeMarkdown('~strikethrough~ text')).toBe('\\~strikethrough\\~ text');
    });

    test('should handle non-string inputs', () => {
      expect(Sanitizer.escapeMarkdown(123)).toBe('123');
    });
  });
});
