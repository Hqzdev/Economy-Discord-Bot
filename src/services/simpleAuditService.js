import db from '../database/jsonDb.js';
import logger from '../utils/logger.js';

export class AuditService {
  async logAction(actorId, action, payload = {}) {
    try {
      db.logAction(actorId, action, payload);
    } catch (error) {
      logger.error('Error logging audit action:', error);
      // Don't throw error to avoid breaking main functionality
    }
  }

  async getAuditLogs(actorId = null, action = null, page = 1, limit = 50) {
    try {
      let logs = db.data.auditLog || [];
      
      if (actorId) {
        logs = logs.filter(log => log.actorId === actorId);
      }
      
      if (action) {
        logs = logs.filter(log => log.action === action);
      }

      // Sort by date descending
      logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedLogs = logs.slice(startIndex, endIndex);

      return {
        logs: paginatedLogs,
        total: logs.length,
        page,
        totalPages: Math.ceil(logs.length / limit),
        hasNext: endIndex < logs.length,
        hasPrev: page > 1,
      };
    } catch (error) {
      logger.error('Error getting audit logs:', error);
      throw error;
    }
  }

  async cleanupOldLogs(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const originalLength = db.data.auditLog.length;
      db.data.auditLog = db.data.auditLog.filter(log => 
        new Date(log.createdAt) >= cutoffDate
      );
      
      const cleanedCount = originalLength - db.data.auditLog.length;
      db.save();

      logger.info(`Cleaned up ${cleanedCount} old audit logs`);
      return cleanedCount;
    } catch (error) {
      logger.error('Error cleaning up audit logs:', error);
      throw error;
    }
  }
}
