import { School, User, Attendance, Excuse, Emergency } from '../types';

/**
 * Clean production initialization data.
 * Zero demo students, zero fake attendances, zero fake excuses.
 * Provides only the Super Admin account so the platform is 100% clean and ready for real school registration.
 */
export function generateInitialData(): {
  schools: School[];
  users: User[];
  attendances: Attendance[];
  excuses: Excuse[];
  emergencies: Emergency[];
} {
  const schools: School[] = [];

  const users: User[] = [
    // Super Admin / System Owner (المالك والمشرف العام على المنظومة)
    {
      id: 'usr-superadmin',
      nationalId: '9999999999',
      name: 'المشرف العام - إدارة المنظومة',
      mobile: '0548171965',
      email: 'admin@hodork.sa',
      password: 'admin',
      role: 'superadmin',
      schoolCode: 'GLOBAL',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    }
  ];

  const attendances: Attendance[] = [];
  const excuses: Excuse[] = [];
  const emergencies: Emergency[] = [];

  return { schools, users, attendances, excuses, emergencies };
}
