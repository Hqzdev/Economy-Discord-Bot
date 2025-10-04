/**
 * Security utilities for the Discord Market Bot
 */

import crypto from 'crypto';
import { RateLimiter } from './validation.js';

export class SecurityManager {
  constructor() {
    this.rateLimiter = new RateLimiter();
    this.blockedUsers = new Set();
    this.suspiciousPatterns = [
      /discord\.gg\/[a-zA-Z0-9]+/gi,
      /https?:\/\/[^\s]+/gi,
      /@everyone|@here/gi,
      /(.)\1{10,}/gi, // Repeated characters
    ];
  }

  /**
   * Check if user is blocked
   */
  isUserBlocked(userId) {
    return this.blockedUsers.has(userId);
  }

  /**
   * Block a user
   */
  blockUser(userId, reason = 'Manual block') {
    this.blockedUsers.add(userId);
    console.log(`User ${userId} blocked: ${reason}`);
  }

  /**
   * Unblock a user
   */
  unblockUser(userId) {
    this.blockedUsers.delete(userId);
    console.log(`User ${userId} unblocked`);
  }

  /**
   * Check for suspicious activity
   */
  detectSuspiciousActivity(userId, action, data = {}) {
    const checks = [
      this.checkRateLimit(userId, action),
      this.checkSpamPatterns(data),
      this.checkUnusualBehavior(userId, action, data),
    ];

    return checks.some(check => check.isSuspicious);
  }

  /**
   * Check rate limiting
   */
  checkRateLimit(userId, action) {
    const limits = {
      'listing_create': { maxAttempts: 5, windowMs: 300000 }, // 5 minutes
      'deal_create': { maxAttempts: 10, windowMs: 60000 }, // 1 minute
      'balance_check': { maxAttempts: 20, windowMs: 60000 }, // 1 minute
      'default': { maxAttempts: 15, windowMs: 60000 }, // 1 minute
    };

    const limit = limits[action] || limits.default;
    const key = `${userId}_${action}`;
    
    const isLimited = this.rateLimiter.isRateLimited(key, limit.maxAttempts, limit.windowMs);
    
    return {
      isSuspicious: isLimited,
      reason: isLimited ? 'Rate limit exceeded' : null,
      timeUntilReset: isLimited ? this.rateLimiter.getTimeUntilReset(key, limit.windowMs) : 0,
    };
  }

  /**
   * Check for spam patterns in data
   */
  checkSpamPatterns(data) {
    const textFields = Object.values(data).filter(value => typeof value === 'string');
    
    for (const text of textFields) {
      for (const pattern of this.suspiciousPatterns) {
        if (pattern.test(text)) {
          return {
            isSuspicious: true,
            reason: 'Suspicious pattern detected',
            pattern: pattern.source,
          };
        }
      }

      // Check for excessive repetition
      const repeatedCharPattern = /(.)\1{5,}/g;
      if (repeatedCharPattern.test(text)) {
        return {
          isSuspicious: true,
          reason: 'Excessive character repetition',
        };
      }

      // Check for very short or very long inputs
      if (text.length < 1 || text.length > 1000) {
        return {
          isSuspicious: true,
          reason: 'Input length outside normal range',
        };
      }
    }

    return { isSuspicious: false };
  }

  /**
   * Check for unusual behavior patterns
   */
  checkUnusualBehavior(userId, action, data) {
    // This would be expanded with more sophisticated ML-based detection
    // For now, implement basic heuristics

    const now = Date.now();
    const behaviorKey = `behavior_${userId}`;
    
    // Store behavior data (in production, use Redis or similar)
    if (!this.behaviorHistory) {
      this.behaviorHistory = new Map();
    }

    const history = this.behaviorHistory.get(behaviorKey) || {
      actions: [],
      lastAction: null,
      suspiciousCount: 0,
    };

    // Check for rapid successive actions
    if (history.lastAction && (now - history.lastAction) < 1000) {
      history.suspiciousCount++;
    }

    // Check for unusual action sequences
    history.actions.push({ action, timestamp: now, data });
    
    // Keep only last 10 actions
    if (history.actions.length > 10) {
      history.actions = history.actions.slice(-10);
    }

    history.lastAction = now;
    this.behaviorHistory.set(behaviorKey, history);

    // Flag if too many suspicious activities
    if (history.suspiciousCount > 3) {
      return {
        isSuspicious: true,
        reason: 'Unusual behavior pattern detected',
      };
    }

    return { isSuspicious: false };
  }

  /**
   * Generate secure transaction ID
   */
  generateTransactionId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Hash sensitive data
   */
  hashSensitiveData(data, salt = null) {
    if (!salt) {
      salt = crypto.randomBytes(16).toString('hex');
    }
    
    const hash = crypto.createHash('sha256');
    hash.update(data + salt);
    
    return {
      hash: hash.digest('hex'),
      salt,
    };
  }

  /**
   * Validate transaction integrity
   */
  validateTransaction(transactionData, expectedHash) {
    const { hash } = this.hashSensitiveData(JSON.stringify(transactionData));
    return hash === expectedHash;
  }
}

/**
 * Permission checker
 */
export class PermissionChecker {
  /**
   * Check if user has required permissions
   */
  static async checkUserPermissions(member, requiredPermissions = []) {
    if (!member || !member.permissions) {
      return { hasPermission: false, reason: 'Member not found' };
    }

    for (const permission of requiredPermissions) {
      if (!member.permissions.has(permission)) {
        return { 
          hasPermission: false, 
          reason: `Missing permission: ${permission}` 
        };
      }
    }

    return { hasPermission: true };
  }

  /**
   * Check if user has specific role
   */
  static async checkUserRole(member, roleId) {
    if (!member || !member.roles) {
      return { hasRole: false, reason: 'Member not found' };
    }

    const hasRole = member.roles.cache.has(roleId);
    
    return { 
      hasRole, 
      reason: hasRole ? null : 'User does not have required role' 
    };
  }

  /**
   * Check if user is administrator
   */
  static async isAdministrator(member) {
    return this.checkUserPermissions(member, ['Administrator']);
  }
}

/**
 * Input validation and sanitization
 */
export class InputSanitizer {
  /**
   * Sanitize user input for safe processing
   */
  static sanitizeInput(input, type = 'text') {
    if (typeof input !== 'string') {
      return input;
    }

    switch (type) {
      case 'text':
        return this.sanitizeText(input);
      case 'number':
        return this.sanitizeNumber(input);
      case 'email':
        return this.sanitizeEmail(input);
      case 'url':
        return this.sanitizeUrl(input);
      default:
        return this.sanitizeText(input);
    }
  }

  /**
   * Sanitize text input
   */
  static sanitizeText(input) {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML
      .replace(/@everyone|@here/g, '@\u200beveryone') // Escape mentions
      .substring(0, 1000); // Limit length
  }

  /**
   * Sanitize number input
   */
  static sanitizeNumber(input) {
    const cleaned = input.replace(/[^\d.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Sanitize email input
   */
  static sanitizeEmail(input) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sanitized = input.trim().toLowerCase();
    return emailRegex.test(sanitized) ? sanitized : null;
  }

  /**
   * Sanitize URL input
   */
  static sanitizeUrl(input) {
    try {
      const url = new URL(input.trim());
      // Only allow http and https protocols
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return url.toString();
      }
      return null;
    } catch {
      return null;
    }
  }
}

/**
 * Audit logging for security events
 */
export class SecurityAuditor {
  constructor(auditService) {
    this.auditService = auditService;
  }

  /**
   * Log security event
   */
  async logSecurityEvent(userId, event, details = {}) {
    const securityEvent = {
      type: 'SECURITY',
      event,
      userId,
      details,
      timestamp: new Date().toISOString(),
      severity: this.getEventSeverity(event),
    };

    await this.auditService.logAction(userId, 'SECURITY_EVENT', securityEvent);
  }

  /**
   * Get event severity level
   */
  getEventSeverity(event) {
    const severityMap = {
      'RATE_LIMIT_EXCEEDED': 'WARNING',
      'SUSPICIOUS_PATTERN': 'HIGH',
      'BLOCKED_USER_ACTION': 'CRITICAL',
      'PERMISSION_VIOLATION': 'HIGH',
      'UNUSUAL_BEHAVIOR': 'MEDIUM',
    };

    return severityMap[event] || 'LOW';
  }
}

// Singleton instance
export const securityManager = new SecurityManager();
