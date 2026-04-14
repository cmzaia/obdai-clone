import React from 'react';
import { Pressable, Text, View, type ViewProps } from 'react-native';
import { theme } from './theme';

export function Screen({ children }: ViewProps) {
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, padding: theme.space.md }}>
      {children}
    </View>
  );
}

export function Card({ children, style }: ViewProps) {
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.space.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function H1({ children }: { children: React.ReactNode }) {
  return <Text style={{ fontSize: theme.type.h1, fontWeight: '700', color: theme.colors.text }}>{children}</Text>;
}

export function H2({ children }: { children: React.ReactNode }) {
  return <Text style={{ fontSize: theme.type.h2, fontWeight: '700', color: theme.colors.text }}>{children}</Text>;
}

export function Body({ children }: { children: React.ReactNode }) {
  return <Text style={{ fontSize: theme.type.body, color: theme.colors.text }}>{children}</Text>;
}

export function Subtext({ children }: { children: React.ReactNode }) {
  return <Text style={{ fontSize: theme.type.small, color: theme.colors.subtext }}>{children}</Text>;
}

export function PrimaryButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: theme.radius.sm,
        backgroundColor: disabled ? '#9CA3AF' : theme.colors.primary,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <Text style={{ color: 'white', fontWeight: '700', textAlign: 'center' }}>{title}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: theme.radius.sm,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: theme.colors.border,
        opacity: disabled ? 0.6 : pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ color: theme.colors.text, fontWeight: '700', textAlign: 'center' }}>{title}</Text>
    </Pressable>
  );
}

export function Badge({ label, tone }: { label: string; tone: 'neutral' | 'danger' | 'warning' | 'success' }) {
  const bg =
    tone === 'danger'
      ? '#FEE2E2'
      : tone === 'warning'
        ? '#FEF3C7'
        : tone === 'success'
          ? '#DCFCE7'
          : '#E5E7EB';
  const fg =
    tone === 'danger'
      ? theme.colors.danger
      : tone === 'warning'
        ? theme.colors.warning
        : tone === 'success'
          ? theme.colors.success
          : theme.colors.subtext;
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 }}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

