import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LocaleProvider } from '../i18n';
import { SessionProvider } from '../session/session';
import { colors } from '../theme';

export default function RootLayout() {
  return (
    <LocaleProvider>
      <SessionProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
      </SessionProvider>
    </LocaleProvider>
  );
}
