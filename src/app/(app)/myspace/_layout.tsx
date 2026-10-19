import { Stack } from 'expo-router';

import { colors } from '@/components/ui';

export default function MySpaceLayout() {
  return (
    <Stack screenOptions={{ headerTitleStyle: { fontWeight: '700' }, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" options={{ title: 'My space' }} />
      <Stack.Screen name="details" options={{ title: 'My details' }} />
      <Stack.Screen name="payslips" options={{ title: 'Payslips' }} />
      <Stack.Screen name="payslip/[run]" options={{ title: 'Payslip' }} />
      <Stack.Screen name="attendance" options={{ title: 'Attendance' }} />
      <Stack.Screen name="leave" options={{ title: 'Leave' }} />
      <Stack.Screen name="expenses" options={{ title: 'Expense claims' }} />
      <Stack.Screen name="loans" options={{ title: 'Loans' }} />
      <Stack.Screen name="performance" options={{ title: 'Performance' }} />
      <Stack.Screen name="training" options={{ title: 'Training' }} />
    </Stack>
  );
}
