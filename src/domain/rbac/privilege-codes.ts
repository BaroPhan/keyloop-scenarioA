/**
 * Canonical privilege codes. Privileges are stored as rows and granted to
 * admins through admin groups; these constants are the source of truth used by
 * the @RequirePrivileges decorator and the seed.
 */
export const PrivilegeCode = {
  VIEW_APPOINTMENTS: 'VIEW_APPOINTMENTS',
  MANAGE_CAPABILITIES: 'MANAGE_CAPABILITIES',
  MANAGE_BAYS: 'MANAGE_BAYS',
  MANAGE_TECHNICIANS: 'MANAGE_TECHNICIANS',
  MANAGE_DEALERSHIPS: 'MANAGE_DEALERSHIPS',
  MANAGE_SERVICE_TYPES: 'MANAGE_SERVICE_TYPES',
  MANAGE_SKILLS: 'MANAGE_SKILLS',
  MANAGE_ADMINS: 'MANAGE_ADMINS',
} as const;

export type PrivilegeCode = (typeof PrivilegeCode)[keyof typeof PrivilegeCode];

export const ALL_PRIVILEGE_CODES = Object.values(PrivilegeCode);
