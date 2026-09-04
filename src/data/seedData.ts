import { School, User, Attendance, StudentPermission, StudentBehaviorLog } from '../types';

export const INITIAL_SCHOOLS: School[] = [];

export const INITIAL_USERS: User[] = [
  // Super Admin (المشرف العام)
  {
    id: 'usr-admin-1',
    nationalId: '1000000000',
    name: 'المشرف العام (سوبر ادمن)',
    mobile: '0500000000',
    password: 'admin',
    role: 'superadmin',
    schoolCode: 'SUPERADMIN',
  },
];

export const INITIAL_PERMISSIONS: StudentPermission[] = [];

export const INITIAL_BEHAVIOR_LOGS: StudentBehaviorLog[] = [];

export function generateInitialAttendances(_users: User[], _schoolCode: string): Attendance[] {
  return [];
}
