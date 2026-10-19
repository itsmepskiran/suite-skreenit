import type { ComponentType } from 'react';

import AttendanceScreen from '@/components/hr/Attendance';

// Hand-built phone screens for the HR modules. A module not listed here uses the generated screens.
export const HR_SCREENS: Record<string, ComponentType> = {
  attendance: AttendanceScreen,
};
