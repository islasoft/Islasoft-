import { base44 } from '@/api/base44Client';

export const logAudit = async (actionType, resourceType, resourceId, resourceName, details = null) => {
  try {
    const user = await base44.auth.me();
    
    await base44.entities.AuditLog.create({
      user_id: user.id,
      user_email: user.email,
      user_name: user.full_name,
      action_type: actionType,
      resource_type: resourceType,
      resource_id: resourceId,
      resource_name: resourceName,
      ip_address: null, // Browser can't reliably get this
      user_agent: navigator.userAgent,
      details: details,
    });
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
};

export default logAudit;