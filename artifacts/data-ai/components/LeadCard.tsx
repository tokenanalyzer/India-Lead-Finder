import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Star } from 'lucide-react-native';
import { useColors } from '@/hooks/useColors';
import { StatusBadge } from './StatusBadge';
import type { Lead } from '@/types/lead';

interface Props {
  lead: Lead;
}

export function LeadCard({ lead }: Props) {
  const colors = useColors();
  const router = useRouter();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      activeOpacity={0.75}
      onPress={() => router.push(`/lead/${lead.id}`)}
    >
      <View style={[styles.statusBar, { backgroundColor: STATUS_COLOR_MAP[lead.status] }]} />
      <View style={styles.content}>
        <View style={styles.top}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {lead.name}
          </Text>
          <StatusBadge status={lead.status} size="sm" />
        </View>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <MapPin size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]} numberOfLines={1}>
              {lead.city}  ·  {lead.category}
            </Text>
          </View>
          {lead.rating > 0 ? (
            <View style={styles.metaItem}>
              <Star size={12} color="#F59E0B" fill="#F59E0B" />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {lead.rating.toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>

        {lead.address ? (
          <Text style={[styles.address, { color: colors.mutedForeground }]} numberOfLines={1}>
            {lead.address}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const STATUS_COLOR_MAP: Record<string, string> = {
  'New': '#3B82F6',
  'Contacted': '#8B5CF6',
  'Follow Up': '#F59E0B',
  'Proposal': '#F97316',
  'Won': '#22C55E',
  'Lost': '#EF4444',
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 5,
    borderWidth: 1,
    overflow: 'hidden',
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 }
      : { elevation: 2 }),
  },
  statusBar: {
    width: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    flex: 1,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  address: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
});
