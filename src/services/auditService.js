import db from '../database/client.js';
import logger from '../utils/logger.js';

export class AuditService {
  async logAction(actorId, action, payload = {}) {
    try {
      await db.client.auditLog.create({
        data: {
          actorId,
          action,
          payloadJson: JSON.stringify(payload),
        },
      });
    } catch (error) {
      logger.error('Error logging audit action:', error);
      // Don't throw error to avoid breaking main functionality
    }
  }

  async getAuditLogs(actorId = null, action = null, page = 1, limit = 50) {
    try {
      const where = {};
      
      if (actorId) {
        where.actorId = actorId;
      }
      
      if (action) {
        where.action = action;
      }

      const [logs, total] = await Promise.all([
        db.client.auditLog.findMany({
          where,
          include: {
            actor: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.client.auditLog.count({ where }),
      ]);

      return {
        logs,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
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

      const result = await db.client.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      logger.info(`Cleaned up ${result.count} old audit logs`);
      return result.count;
    } catch (error) {
      logger.error('Error cleaning up audit logs:', error);
      throw error;
    }
  }
}
