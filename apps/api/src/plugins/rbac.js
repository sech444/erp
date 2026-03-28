import fp from 'fastify-plugin';

// ── Permission Matrix ─────────────────────────────────────────
// Defines what each role can access.
// Format: { [module]: { [action]: [roles] } }

export const PERMISSIONS = {
  // ── Inventory ──────────────────────────────────────────────
  'inventory:read':          ['ADMIN','DIRECTOR','MANAGER','STORE_KEEPER','PURCHASE_DEPT','ACCOUNTANT','SITE_SUPERVISOR'],
  'inventory:write':         ['ADMIN','MANAGER','STORE_KEEPER'],
  'inventory:delete':        ['ADMIN','MANAGER'],
  'inventory:stock-move':    ['ADMIN','MANAGER','STORE_KEEPER','SITE_SUPERVISOR'],
  'inventory:purchase':      ['ADMIN','MANAGER','PURCHASE_DEPT'],
  'inventory:reports':       ['ADMIN','DIRECTOR','MANAGER','ACCOUNTANT'],

  // ── Sales & CRM ───────────────────────────────────────────
  'sales:read':              ['ADMIN','DIRECTOR','MANAGER','SALES_TEAM','ACCOUNTANT'],
  'sales:write':             ['ADMIN','MANAGER','SALES_TEAM'],
  'sales:delete':            ['ADMIN','MANAGER'],
  'sales:quotation':         ['ADMIN','MANAGER','SALES_TEAM'],
  'sales:approve-quotation': ['ADMIN','DIRECTOR','MANAGER'],

  // ── HR ────────────────────────────────────────────────────
  'hr:read':                 ['ADMIN','DIRECTOR','MANAGER','HR_DEPT'],
  'hr:write':                ['ADMIN','HR_DEPT'],
  'hr:delete':               ['ADMIN'],
  'hr:payroll':              ['ADMIN','HR_DEPT','ACCOUNTANT'],
  'hr:payroll-approve':      ['ADMIN','DIRECTOR'],
  'hr:attendance':           ['ADMIN','HR_DEPT','MANAGER','SITE_SUPERVISOR'],
  'hr:self':                 ['ADMIN','DIRECTOR','MANAGER','SALES_TEAM','ACCOUNTANT','PURCHASE_DEPT','HR_DEPT','STORE_KEEPER','SITE_SUPERVISOR','TECHNICIAN','SUB_CONTRACTOR'],

  // ── Dashboard ─────────────────────────────────────────────
  'dashboard:read':          ['ADMIN','DIRECTOR','MANAGER','ACCOUNTANT'],
  'dashboard:basic':         ['ADMIN','DIRECTOR','MANAGER','SALES_TEAM','ACCOUNTANT','PURCHASE_DEPT','HR_DEPT','STORE_KEEPER','SITE_SUPERVISOR','TECHNICIAN'],

  // ── Users (admin only) ────────────────────────────────────
  'users:manage':            ['ADMIN'],
  'users:read':              ['ADMIN','DIRECTOR','HR_DEPT'],
};

const rbacPlugin = fp(async (fastify) => {
  /**
   * require(permission) → preHandler that checks if the authenticated
   * user has the given permission.
   *
   * Usage in route:
   *   preHandler: [fastify.authenticate, fastify.require('inventory:write')]
   */
  fastify.decorate('require', (permission) => async (request, reply) => {
    const user = request.user;
    if (!user) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const allowedRoles = PERMISSIONS[permission];
    if (!allowedRoles) {
      fastify.log.warn(`Unknown permission checked: ${permission}`);
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Permission not defined' } });
    }

    if (!allowedRoles.includes(user.role)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Your role (${user.role}) does not have permission: ${permission}`,
        },
      });
    }
  });

  /**
   * hasPermission(user, permission) → boolean helper for conditional logic
   */
  fastify.decorate('hasPermission', (user, permission) => {
    const allowedRoles = PERMISSIONS[permission] || [];
    return allowedRoles.includes(user?.role);
  });
});

export { rbacPlugin };
