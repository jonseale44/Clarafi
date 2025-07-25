import { Express, Request } from 'express';
import { DataArchiveService } from './data-archive-service';
import { z } from 'zod';
import { db } from './db.js';
import { eq, and } from 'drizzle-orm';
import { archiveAccessLogs, dataArchives } from '@shared/schema';

// Validation schemas
const searchArchivesSchema = z.object({
  healthSystemName: z.string().optional(),
  archivedAfter: z.string().datetime().optional(),
  archivedBefore: z.string().datetime().optional(),
  archiveReason: z.string().optional(),
  hasBeenRestored: z.boolean().optional()
});

const restoreArchiveSchema = z.object({
  archiveId: z.string().uuid(),
  reason: z.string().min(10, 'Please provide a detailed reason for restoration'),
  restoreUsers: z.boolean().optional(),
  restorePatients: z.boolean().optional(),
  restoreEncounters: z.boolean().optional(),
  restoreAttachments: z.boolean().optional(),
  targetHealthSystemId: z.number().optional()
});

const manualArchiveSchema = z.object({
  healthSystemId: z.number(),
  reason: z.string().min(10, 'Please provide a detailed reason for archiving')
});

const legalHoldSchema = z.object({
  archiveId: z.string().uuid(),
  setHold: z.boolean(),
  reason: z.string().min(10, 'Please provide a detailed reason for legal hold')
});

export function setupArchiveRoutes(app: Express) {
  console.log('📦 [ArchiveRoutes] Registering data archive routes...');

  // Middleware to check admin access
  const requireSuperAdmin = async (req: Request, res: any, next: any) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = req.user as any;
    
    // Only system admins can access archive functionality
    if (user.role !== 'admin' || !user.isSystemAdmin) {
      console.warn(`⚠️ [Archive] Non-admin user ${user.id} attempted to access archive routes`);
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'Only system administrators can access data archives'
      });
    }

    // Log all admin access attempts
    await DataArchiveService['logAccess'](
      'access_attempt',
      user.id,
      `Accessing archive route: ${req.path}`,
      { 
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    );

    next();
  };

  /**
   * Search archived data
   */
  app.get('/api/archives/search', requireSuperAdmin, async (req, res) => {
    try {
      const params = searchArchivesSchema.parse(req.query);
      
      const criteria = {
        ...params,
        archivedAfter: params.archivedAfter ? new Date(params.archivedAfter) : undefined,
        archivedBefore: params.archivedBefore ? new Date(params.archivedBefore) : undefined
      };

      const archives = await DataArchiveService.searchArchives(
        criteria,
        (req.user as any).id
      );

      res.json({
        success: true,
        archives,
        count: archives.length
      });
    } catch (error) {
      console.error('❌ [Archive] Search error:', error);
      res.status(500).json({ 
        error: 'Failed to search archives',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * View archive details
   */
  app.get('/api/archives/:archiveId', requireSuperAdmin, async (req, res) => {
    try {
      const { archiveId } = req.params;
      
      if (!z.string().uuid().safeParse(archiveId).success) {
        return res.status(400).json({ error: 'Invalid archive ID format' });
      }

      const details = await DataArchiveService.viewArchiveDetails(
        archiveId,
        (req.user as any).id
      );

      if (!details) {
        return res.status(404).json({ error: 'Archive not found' });
      }

      res.json({
        success: true,
        archive: details
      });
    } catch (error) {
      console.error('❌ [Archive] View error:', error);
      res.status(500).json({ 
        error: 'Failed to view archive',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get archive access logs
   */
  app.get('/api/archives/:archiveId/access-logs', requireSuperAdmin, async (req, res) => {
    try {
      const { archiveId } = req.params;
      
      const logs = await db
        .select()
        .from(archiveAccessLogs)
        .where(eq(archiveAccessLogs.archiveId, archiveId))
        .orderBy(archiveAccessLogs.accessedAt);

      res.json({
        success: true,
        logs,
        count: logs.length
      });
    } catch (error) {
      console.error('❌ [Archive] Access log error:', error);
      res.status(500).json({ error: 'Failed to retrieve access logs' });
    }
  });

  /**
   * Restore archived data
   */
  app.post('/api/archives/restore', requireSuperAdmin, async (req, res) => {
    try {
      const request = restoreArchiveSchema.parse(req.body);
      
      console.log(`🔄 [Archive] Admin ${(req.user as any).id} initiating restore for archive ${request.archiveId}`);

      // Verify archive exists and is not under legal hold
      const [archive] = await db
        .select()
        .from(dataArchives)
        .where(eq(dataArchives.archiveId, request.archiveId));

      if (!archive) {
        return res.status(404).json({ error: 'Archive not found' });
      }

      if (archive.legalHold) {
        return res.status(403).json({ 
          error: 'Cannot restore archive under legal hold',
          legalHoldReason: archive.legalHoldReason
        });
      }

      await DataArchiveService.restoreArchive(
        request,
        (req.user as any).id
      );

      res.json({
        success: true,
        message: 'Archive restoration initiated successfully',
        archiveId: request.archiveId
      });
    } catch (error) {
      console.error('❌ [Archive] Restore error:', error);
      res.status(500).json({ 
        error: 'Failed to restore archive',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Manually archive a health system
   */
  app.post('/api/archives/create', requireSuperAdmin, async (req, res) => {
    try {
      const { healthSystemId, reason } = manualArchiveSchema.parse(req.body);
      
      console.log(`📦 [Archive] Admin ${(req.user as any).id} manually archiving health system ${healthSystemId}`);

      const archiveId = await DataArchiveService.archiveHealthSystem(
        healthSystemId,
        'manual_archive',
        (req.user as any).id
      );

      // Log the manual archive reason
      await db
        .update(dataArchives)
        .set({ complianceNotes: reason })
        .where(eq(dataArchives.archiveId, archiveId));

      res.json({
        success: true,
        message: 'Health system archived successfully',
        archiveId
      });
    } catch (error) {
      console.error('❌ [Archive] Create error:', error);
      res.status(500).json({ 
        error: 'Failed to archive health system',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Set/remove legal hold on archive
   */
  app.post('/api/archives/legal-hold', requireSuperAdmin, async (req, res) => {
    try {
      const { archiveId, setHold, reason } = legalHoldSchema.parse(req.body);
      
      console.log(`⚖️ [Archive] Admin ${(req.user as any).id} ${setHold ? 'setting' : 'removing'} legal hold on archive ${archiveId}`);

      await db
        .update(dataArchives)
        .set({
          legalHold: setHold,
          legalHoldReason: setHold ? reason : null
        })
        .where(eq(dataArchives.archiveId, archiveId));

      // Log the legal hold action
      await DataArchiveService['logAccess'](
        'legal_hold',
        (req.user as any).id,
        reason,
        { archiveId, setHold }
      );

      res.json({
        success: true,
        message: `Legal hold ${setHold ? 'set' : 'removed'} successfully`
      });
    } catch (error) {
      console.error('❌ [Archive] Legal hold error:', error);
      res.status(500).json({ 
        error: 'Failed to update legal hold',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Get archive statistics
   */
  app.get('/api/archives/stats', requireSuperAdmin, async (req, res) => {
    try {
      const stats = await db
        .select({
          totalArchives: db.sql<number>`COUNT(*)`,
          activeArchives: db.sql<number>`COUNT(*) FILTER (WHERE is_purged = false)`,
          purgedArchives: db.sql<number>`COUNT(*) FILTER (WHERE is_purged = true)`,
          restoredArchives: db.sql<number>`COUNT(*) FILTER (WHERE has_been_restored = true)`,
          legalHoldArchives: db.sql<number>`COUNT(*) FILTER (WHERE legal_hold = true)`,
          totalSizeMB: db.sql<number>`COALESCE(SUM((data_statistics->>'totalSizeMB')::numeric), 0)`
        })
        .from(dataArchives);

      const recentAccess = await db
        .select({
          accessType: archiveAccessLogs.accessType,
          count: db.sql<number>`COUNT(*)`
        })
        .from(archiveAccessLogs)
        .where(db.sql`accessed_at > NOW() - INTERVAL '30 days'`)
        .groupBy(archiveAccessLogs.accessType);

      res.json({
        success: true,
        stats: stats[0],
        recentAccess
      });
    } catch (error) {
      console.error('❌ [Archive] Stats error:', error);
      res.status(500).json({ error: 'Failed to retrieve statistics' });
    }
  });

  /**
   * Purge expired archives (manual trigger)
   */
  app.post('/api/archives/purge-expired', requireSuperAdmin, async (req, res) => {
    try {
      console.log(`🗑️ [Archive] Admin ${(req.user as any).id} manually triggering archive purge`);

      const purgedCount = await DataArchiveService.purgeExpiredArchives();

      res.json({
        success: true,
        message: `Purged ${purgedCount} expired archives`,
        purgedCount
      });
    } catch (error) {
      console.error('❌ [Archive] Purge error:', error);
      res.status(500).json({ 
        error: 'Failed to purge archives',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  console.log('✅ [ArchiveRoutes] Archive management routes registered');
}