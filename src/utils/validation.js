/**
 * Validation utilities for the Discord Market Bot
 */

export class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class Validator {
  /**
   * Validate item name
   */
  static validateItemName(itemName) {
    if (!itemName || typeof itemName !== 'string') {
      throw new ValidationError('Название товара обязательно', 'itemName');
    }

    const trimmed = itemName.trim();
    
    if (trimmed.length < 2) {
      throw new ValidationError('Название товара должно содержать минимум 2 символа', 'itemName');
    }

    if (trimmed.length > 100) {
      throw new ValidationError('Название товара не должно превышать 100 символов', 'itemName');
    }

    // Check for suspicious patterns
    if (this.containsSuspiciousPatterns(trimmed)) {
      throw new ValidationError('Название товара содержит недопустимые символы', 'itemName');
    }

    return trimmed;
  }

  /**
   * Validate price
   */
  static validatePrice(price) {
    if (price === null || price === undefined) {
      throw new ValidationError('Цена обязательна', 'price');
    }

    const numPrice = Number(price);
    
    if (isNaN(numPrice)) {
      throw new ValidationError('Цена должна быть числом', 'price');
    }

    if (!Number.isInteger(numPrice)) {
      throw new ValidationError('Цена должна быть целым числом', 'price');
    }

    if (numPrice <= 0) {
      throw new ValidationError('Цена должна быть положительным числом', 'price');
    }

    if (numPrice > 999999) {
      throw new ValidationError('Цена не должна превышать 1,000,000 монет', 'price');
    }

    return numPrice;
  }

  /**
   * Validate quantity
   */
  static validateQuantity(quantity) {
    if (quantity === null || quantity === undefined) {
      throw new ValidationError('Количество обязательно', 'quantity');
    }

    const numQuantity = Number(quantity);
    
    if (isNaN(numQuantity)) {
      throw new ValidationError('Количество должно быть числом', 'quantity');
    }

    if (!Number.isInteger(numQuantity)) {
      throw new ValidationError('Количество должно быть целым числом', 'quantity');
    }

    if (numQuantity <= 0) {
      throw new ValidationError('Количество должно быть больше 0', 'quantity');
    }

    if (numQuantity > 10000) {
      throw new ValidationError('Количество не должно превышать 10,000', 'quantity');
    }

    return numQuantity;
  }

  /**
   * Validate Discord user ID
   */
  static validateDiscordId(discordId) {
    if (!discordId || typeof discordId !== 'string') {
      throw new ValidationError('ID пользователя Discord обязателен', 'discordId');
    }

    // Discord ID should be 17-19 digits
    if (!/^\d{17,19}$/.test(discordId)) {
      throw new ValidationError('Неверный формат ID пользователя Discord', 'discordId');
    }

    return discordId;
  }

  /**
   * Validate date string
   */
  static validateDateTime(dateTimeStr) {
    if (!dateTimeStr || typeof dateTimeStr !== 'string') {
      throw new ValidationError('Дата и время обязательны', 'dateTime');
    }

    const date = new Date(dateTimeStr);
    
    if (isNaN(date.getTime())) {
      throw new ValidationError('Неверный формат даты и времени', 'dateTime');
    }

    if (date <= new Date()) {
      throw new ValidationError('Дата должна быть в будущем', 'dateTime');
    }

    // Check if date is not too far in the future (1 year)
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    
    if (date > oneYearFromNow) {
      throw new ValidationError('Дата не должна быть более чем на год вперёд', 'dateTime');
    }

    return date;
  }

  /**
   * Validate auction description
   */
  static validateDescription(description) {
    if (!description) {
      return null; // Description is optional
    }

    if (typeof description !== 'string') {
      throw new ValidationError('Описание должно быть текстом', 'description');
    }

    const trimmed = description.trim();
    
    if (trimmed.length > 1000) {
      throw new ValidationError('Описание не должно превышать 1000 символов', 'description');
    }

    if (this.containsSuspiciousPatterns(trimmed)) {
      throw new ValidationError('Описание содержит недопустимые символы', 'description');
    }

    return trimmed;
  }

  /**
   * Check for suspicious patterns in text
   */
  static containsSuspiciousPatterns(text) {
    // Check for excessive special characters
    const specialCharCount = (text.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length;
    if (specialCharCount > text.length * 0.5) {
      return true;
    }

    // Check for repeated characters (spam-like patterns)
    const repeatedCharPattern = /(.)\1{4,}/;
    if (repeatedCharPattern.test(text)) {
      return true;
    }

    // Check for potential spam patterns
    const spamPatterns = [
      /https?:\/\/[^\s]+/gi, // URLs
      /discord\.gg\/[^\s]+/gi, // Discord invites
      /@everyone|@here/gi, // Mass mentions
    ];

    return spamPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Sanitize text input
   */
  static sanitizeText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }

    return text
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .substring(0, 1000); // Limit length
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(page, limit = 10) {
    const numPage = Number(page);
    const numLimit = Number(limit);

    if (isNaN(numPage) || numPage < 1) {
      throw new ValidationError('Номер страницы должен быть положительным числом', 'page');
    }

    if (isNaN(numLimit) || numLimit < 1 || numLimit > 50) {
      throw new ValidationError('Лимит должен быть от 1 до 50', 'limit');
    }

    return { page: numPage, limit: numLimit };
  }

  /**
   * Validate search term
   */
  static validateSearchTerm(searchTerm) {
    if (!searchTerm) {
      return '';
    }

    if (typeof searchTerm !== 'string') {
      throw new ValidationError('Поисковый запрос должен быть текстом', 'searchTerm');
    }

    const sanitized = this.sanitizeText(searchTerm);
    
    if (sanitized.length > 100) {
      throw new ValidationError('Поисковый запрос не должен превышать 100 символов', 'searchTerm');
    }

    return sanitized;
  }
}

/**
 * Rate limiting utility
 */
export class RateLimiter {
  constructor() {
    this.attempts = new Map();
    this.windows = new Map();
  }

  /**
   * Check if action is rate limited
   */
  isRateLimited(key, maxAttempts = 5, windowMs = 60000) {
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    
    if (!this.windows.has(key) || this.windows.get(key) !== window) {
      this.windows.set(key, window);
      this.attempts.set(key, 0);
    }

    const attempts = this.attempts.get(key) || 0;
    
    if (attempts >= maxAttempts) {
      return true;
    }

    this.attempts.set(key, attempts + 1);
    return false;
  }

  /**
   * Reset rate limit for a key
   */
  reset(key) {
    this.attempts.delete(key);
    this.windows.delete(key);
  }

  /**
   * Get time until rate limit resets
   */
  getTimeUntilReset(key, windowMs = 60000) {
    const now = Date.now();
    const window = Math.floor(now / windowMs);
    const nextWindow = (window + 1) * windowMs;
    return nextWindow - now;
  }
}

/**
 * Input sanitization utility
 */
export class Sanitizer {
  /**
   * Sanitize user input for database storage
   */
  static sanitizeForDB(input) {
    if (typeof input !== 'string') {
      return input;
    }

    return input
      .trim()
      .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Sanitize text for Discord display
   */
  static sanitizeForDiscord(input) {
    if (typeof input !== 'string') {
      return String(input);
    }

    return input
      .replace(/[<>]/g, '') // Remove potential HTML-like tags
      .replace(/@everyone|@here/g, '@\u200beveryone'); // Escape mass mentions
  }

  /**
   * Escape Discord markdown
   */
  static escapeMarkdown(text) {
    if (typeof text !== 'string') {
      return String(text);
    }

    return text.replace(/[_*~`|]/g, '\\$&');
  }
}
