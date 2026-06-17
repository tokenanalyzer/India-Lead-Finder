import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { STATUS_COLORS } from '@/types/lead';
import type { LeadStatus } from '@/types/lead';

interface Props {
  status: LeadStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: Props) {
  const { bg, text } = STATUS_COLORS[status];
  const isSmall = size === 'sm';
  return (
    <View style={[styles.badge, { backgroundColor: bg, paddingHorizontal: isSmall ? 6 : 10, paddingVertical: isSmall ? 2 : 4 }]}>
      <Text style={[styles.label, { color: text, fontSize: isSmall ? 10 : 11 }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.3,
  },
});
