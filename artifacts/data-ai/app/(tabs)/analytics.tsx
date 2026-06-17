import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrendingUp, Target, Award, Users } from 'lucide-react-native';
import { useColors } from '@/hooks/useColors';
import { useLeadsStore } from '@/store/leadsStore';
import { EmptyState } from '@/components/EmptyState';
import { STATUS_COLORS, LEAD_STATUSES } from '@/types/lead';

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>{icon}</View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function BarRow({ label, count, maxCount, color }: { label: string; count: number; maxCount: number; color: string }) {
  const colors = useColors();
  const pct = maxCount > 0 ? Math.max((count / maxCount) * 100, count > 0 ? 4 : 0) : 0;
  return (
    <View style={styles.barRow}>
      <Text style={[styles.barLabel, { color: colors.mutedForeground }]} numberOfLines={1}>{label}</Text>
      <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
        <View style={[styles.barFill, { width: `${pct}%` as `${number}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barCount, { color: colors.foreground }]}>{count}</Text>
    </View>
  );
}

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const leads = useLeadsStore(s => s.leads);

  const stats = useMemo(() => {
    const total = leads.length;
    const won = leads.filter(l => l.status === 'Won').length;
    const lost = leads.filter(l => l.status === 'Lost').length;
    const active = leads.filter(l => l.status !== 'Won' && l.status !== 'Lost').length;
    const convRate = total > 0 ? Math.round((won / total) * 100) : 0;

    const statusCounts = LEAD_STATUSES.map(s => ({
      status: s,
      count: leads.filter(l => l.status === s).length,
      color: STATUS_COLORS[s].bg,
    }));
    const maxStatus = Math.max(...statusCounts.map(s => s.count), 1);

    const cityMap: Record<string, number> = {};
    leads.forEach(l => { if (l.city) cityMap[l.city] = (cityMap[l.city] || 0) + 1; });
    const topCities = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxCity = Math.max(...topCities.map(c => c[1]), 1);

    const catMap: Record<string, number> = {};
    leads.forEach(l => { if (l.category) catMap[l.category] = (catMap[l.category] || 0) + 1; });
    const topCategories = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxCat = Math.max(...topCategories.map(c => c[1]), 1);

    return { total, won, lost, active, convRate, statusCounts, maxStatus, topCities, maxCity, topCategories, maxCat };
  }, [leads]);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  if (leads.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 12 }]}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Analytics</Text>
        </View>
        <EmptyState
          icon={<TrendingUp size={28} color={colors.mutedForeground} />}
          title="No Data Yet"
          subtitle="Save some leads to see analytics and conversion stats"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Analytics</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          {stats.total} leads tracked
        </Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'web' ? 34 : 100 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.statsGrid}>
          <StatCard label="Total Leads" value={String(stats.total)} icon={<Users size={20} color={colors.primary} />} color={colors.primary} />
          <StatCard label="Won" value={String(stats.won)} icon={<Award size={20} color="#22C55E" />} color="#22C55E" />
          <StatCard label="Active" value={String(stats.active)} icon={<Target size={20} color="#F59E0B" />} color="#F59E0B" />
          <StatCard label="Conversion" value={`${stats.convRate}%`} icon={<TrendingUp size={20} color="#8B5CF6" />} color="#8B5CF6" />
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>CRM Pipeline</Text>
          {stats.statusCounts.map(({ status, count, color }) => (
            <BarRow key={status} label={status} count={count} maxCount={stats.maxStatus} color={color} />
          ))}
        </View>

        {stats.topCities.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Top Cities</Text>
            {stats.topCities.map(([city, count]) => (
              <BarRow key={city} label={city} count={count} maxCount={stats.maxCity} color={colors.primary} />
            ))}
          </View>
        )}

        {stats.topCategories.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Top Categories</Text>
            {stats.topCategories.map(([cat, count]) => (
              <BarRow key={cat} label={cat} count={count} maxCount={stats.maxCat} color="#8B5CF6" />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 24, marginBottom: 2 },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  scroll: { paddingHorizontal: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, minWidth: '45%', borderRadius: 14, borderWidth: 1, padding: 14,
    alignItems: 'flex-start', gap: 6,
  },
  statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 24 },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  section: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 14, gap: 12 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, marginBottom: 4 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, width: 80 },
  barTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barCount: { fontFamily: 'Inter_600SemiBold', fontSize: 13, width: 28, textAlign: 'right' },
});
