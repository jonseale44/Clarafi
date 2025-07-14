import { Router } from "express";
import { pool } from "./db";

const router = Router();

// Middleware function
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Get admin statistics
router.get("/stats", requireAuth, async (req, res) => {
  try {
    const user = req.user!;
    
    // Only allow admin users
    if (user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied. Admin role required." });
    }

    // Get total users count
    const totalUsersResult = await pool.query(
      `SELECT COUNT(*) as count FROM users WHERE health_system_id = $1`,
      [user.healthSystemId]
    );
    const totalUsers = parseInt(totalUsersResult.rows[0].count) || 0;

    // Get active providers count
    const activeProvidersResult = await pool.query(
      `SELECT COUNT(*) as count FROM users 
       WHERE health_system_id = $1 
       AND role = 'provider' 
       AND active = true`,
      [user.healthSystemId]
    );
    const activeProviders = parseInt(activeProvidersResult.rows[0].count) || 0;

    // Get pending invites count
    const pendingInvitesResult = await pool.query(
      `SELECT COUNT(*) as count FROM migration_invitations 
       WHERE to_health_system_id = $1 
       AND status = 'pending' 
       AND expires_at > NOW()`,
      [user.healthSystemId]
    );
    const pendingInvites = parseInt(pendingInvitesResult.rows[0].count) || 0;

    // Get pending verifications count
    const pendingVerificationsResult = await pool.query(
      `SELECT COUNT(*) as count FROM clinic_admin_verifications 
       WHERE status = 'pending'`
    );
    const pendingVerifications = parseInt(pendingVerificationsResult.rows[0].count) || 0;

    // Get approved today count
    const approvedTodayResult = await pool.query(
      `SELECT COUNT(*) as count FROM clinic_admin_verifications 
       WHERE status = 'approved' 
       AND DATE(approved_at) = CURRENT_DATE`
    );
    const approvedToday = parseInt(approvedTodayResult.rows[0].count) || 0;

    // Get total clinics count
    const totalClinicsResult = await pool.query(
      `SELECT COUNT(*) as count FROM locations 
       WHERE health_system_id = $1`,
      [user.healthSystemId]
    );
    const totalClinics = parseInt(totalClinicsResult.rows[0].count) || 0;

    // Get pending migrations count
    const pendingMigrationsResult = await pool.query(
      `SELECT COUNT(*) as count FROM migration_invitations 
       WHERE status = 'pending' 
       AND expires_at > NOW()`
    );
    const pendingMigrations = parseInt(pendingMigrationsResult.rows[0].count) || 0;

    // Get total health systems count
    const totalHealthSystemsResult = await pool.query(
      `SELECT COUNT(*) as count FROM health_systems`
    );
    const totalHealthSystems = parseInt(totalHealthSystemsResult.rows[0].count) || 0;

    // Get daily active users (users who have accessed the system today)
    const dailyActiveUsersResult = await pool.query(
      `SELECT COUNT(DISTINCT u.id) as count 
       FROM users u
       JOIN user_session_locations usl ON u.id = usl.user_id
       WHERE u.health_system_id = $1 
       AND DATE(usl.login_time) = CURRENT_DATE`,
      [user.healthSystemId]
    );
    const dailyActiveUsers = parseInt(dailyActiveUsersResult.rows[0].count) || 0;

    // Get encounters today count
    const encountersTodayResult = await pool.query(
      `SELECT COUNT(*) as count FROM encounters e
       JOIN patients p ON e.patient_id = p.id
       WHERE p.health_system_id = $1 
       AND DATE(e.created_at) = CURRENT_DATE`,
      [user.healthSystemId]
    );
    const encountersToday = parseInt(encountersTodayResult.rows[0].count) || 0;

    // Calculate monthly revenue (simple calculation based on subscription tiers)
    let monthlyRevenue = 0;
    if (user.healthSystemId) {
      const healthSystemResult = await pool.query(
        `SELECT subscription_tier FROM health_systems WHERE id = $1`,
        [user.healthSystemId]
      );
      if (healthSystemResult.rows.length > 0) {
        const tier = healthSystemResult.rows[0].subscriptionTier;
        if (tier === 1) {
          monthlyRevenue = 99; // Tier 1: $99/month
        } else if (tier === 2) {
          // Tier 2: Custom pricing - count active users
          const tier2UsersResult = await pool.query(
            `SELECT COUNT(*) as count FROM users 
             WHERE healthSystemId = $1 AND isActive = true`,
            [user.healthSystemId]
          );
          const userCount = parseInt(tier2UsersResult.rows[0].count) || 0;
          monthlyRevenue = userCount * 299; // Assuming $299/user for enterprise
        }
      }
    }

    // Get active subscriptions count
    const activeSubscriptionsResult = await pool.query(
      `SELECT COUNT(*) as count FROM healthSystems 
       WHERE subscriptionStatus = 'active'`
    );
    const activeSubscriptions = parseInt(activeSubscriptionsResult.rows[0].count) || 0;

    // Get recent activity (last 5 activities)
    const recentActivityResult = await pool.query(
      `SELECT 
        'User login' as description,
        u.username,
        usl.loginTime as timestamp
       FROM user_session_locations usl
       JOIN users u ON usl.userId = u.id
       WHERE u.healthSystemId = $1
       ORDER BY usl.loginTime DESC
       LIMIT 5`,
      [user.healthSystemId]
    );

    const recentActivity = recentActivityResult.rows.map(row => ({
      description: `${row.username} logged in`,
      timestamp: new Date(row.timestamp).toLocaleString()
    }));

    res.json({
      totalUsers,
      activeProviders,
      pendingInvites,
      pendingVerifications,
      approvedToday,
      totalClinics,
      pendingMigrations,
      totalHealthSystems,
      dailyActiveUsers,
      encountersToday,
      monthlyRevenue,
      activeSubscriptions,
      recentActivity
    });

  } catch (error) {
    console.error('[AdminStats] Error fetching admin statistics:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : "Failed to fetch admin statistics" 
    });
  }
});

export default router;