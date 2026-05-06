const safeJson = (value) => {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === 'string') return value;
  try {
    return value;
  } catch {
    return null;
  }
};

/**
 * Best-effort audit logging. This must never break the primary request flow.
 */
const writeAuditLogSafe = async (
  prismaClient,
  {
    userId = null,
    action,
    entityType = null,
    entityId = null,
    status = null,
    ipAddress = null,
    details = null,
    metadata = null
  }
) => {
  try {
    if (!prismaClient?.auditLog?.create) return;
    if (!action) return;

    // Normalize values
    const data = {
      user_id: userId === null || userId === undefined ? null : Number(userId),
      action: String(action),
      entity_type: entityType ? String(entityType) : null,
      entity_id: entityId === null || entityId === undefined ? null : Number(entityId),
      status: status ? String(status).slice(0, 20) : null,
      ip_address: ipAddress ? String(ipAddress).slice(0, 45) : null,
      details: details ? String(details) : null,
      metadata: safeJson(metadata)
    };

    await prismaClient.auditLog.create({ data });
  } catch (error) {
    // Intentionally swallow audit errors in production flow, but log to console
    console.error('Audit log write failed:', error?.message || error);
  }
};

/**
 * Helper to extract IP address from request object.
 */
const getIpAddress = (req) => {
  if (!req) return null;
  return (
    (String(req.headers['x-forwarded-for'] || '').split(',')[0] || '').trim() ||
    req.ip ||
    req.connection?.remoteAddress ||
    null
  );
};

/**
 * Higher-level audit logging that automatically extracts context from the request.
 */
const writeAuditLogWithReq = async (
  prismaClient,
  req,
  {
    action,
    entityType = null,
    entityId = null,
    status = 'success',
    details = null,
    metadata = null,
    userId = null // Override if needed
  }
) => {
  return writeAuditLogSafe(prismaClient, {
    userId: userId || req?.user?.id || null,
    action,
    entityType,
    entityId,
    status,
    ipAddress: getIpAddress(req),
    details: details || (status === 'success' ? 'Operation successful' : null),
    metadata
  });
};

module.exports = {
  writeAuditLogSafe,
  writeAuditLogWithReq,
  getIpAddress
};

