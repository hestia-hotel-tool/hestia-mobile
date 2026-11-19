import { useMemo } from 'react';
import { usePermissions } from './rbac/usePermissions';
import {
  ASSIGNMENT_DEPARTMENTS,
  assignmentDepartmentForHomeVariant,
  type AssignmentDepartmentConfig,
} from './assignments';

/**
 * The assignment layer the signed-in reader works in, and whether they may
 * assign in it: engineering's titles see and assign technicians, everyone else
 * housekeeping's room attendants. Screens take this instead of testing roles.
 */
export function useAssignmentDepartment(): AssignmentDepartmentConfig & { canAssign: boolean } {
  const { homeVariant, can } = usePermissions();
  const config = ASSIGNMENT_DEPARTMENTS[assignmentDepartmentForHomeVariant(homeVariant)];
  const canAssign = can(config.assignPermission);
  return useMemo(() => ({ ...config, canAssign }), [config, canAssign]);
}

export default useAssignmentDepartment;
