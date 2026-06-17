import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, TrendingUp, Award, Users, ChevronRight } from 'lucide-react-native';
import { useColors } from '@/hooks/useColors';
import { useLeadsStore } from '@/store/leadsStore';
import { LeadCard } from '@/components/LeadCard';
import { EmptyState } from '@/components/EmptyState';

function StatTile({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  const colors = useColors();
  return (
    <View style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.tileDot, { backgroundColor: color }]} />
      <Text style={[styles.tileValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.tileLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {sub ? <Text style={[styles.tileSub, { color }]}>{sub}</Text> : null}
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const leads = useLeadsStore(s => s.leads);

  const total = leads.length;
  const newLeads = leads.filter(l => l.status === 'New').length;
  const won = leads.filter(l => l.status === 'Won').length;
  const convRate = total > 0 ? Math.round((won / total) * 100) : 0;
  const recent = leads.slice(0, 5);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });
  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.appName, { color: colors.primary }]}>Data AI</Text>
            <Text style={[styles.date, { color: colors.mutedForeground }]}>{today}</Text>
          </View>
          <TouchableOpacity
            style={[styles.searchFab, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)/search')}
            activeOpacity={0.85}
          >
            <Search size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'web' ? 34 : 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tilesGrid}>
          <StatTile label="Total Leads" value={total} color={colors.primary} />
          <StatTile label="New" value={newLeads} color="#3B82F6" />
          <StatTile label="Won" value={won} color="#22C55E" />
          <StatTile label="Conversion" value={`${convRate}%`} color="#8B5CF6" />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Leads</Text>
          {leads.length > 5 && (
            <TouchableOpacity
              style={styles.seeAll}
              onPress={() => router.push('/(tabs)/leads')}
              activeOpacity={0.7}
            >
              <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
              <ChevronRight size={14} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {leads.length === 0 ? (
          <EmptyState
            icon={<Users size={28} color={colors.mutedForeground} />}
            title="No Leads Yet"
            subtitle="Tap the search button to find businesses and start filling your pipeline"
            actionLabel="Search Now"
            onAction={() => router.push('/(tabs)/search')}
          />
        ) : (
          recent.map(lead => <LeadCard key={lead.id} lead={lead} />)
        )}

        {leads.length > 0 && (
          <View style={[styles.quickStats, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.quickStatsTitle, { color: colors.foreground }]}>Quick Stats</Text>
            <View style={styles.quickRow}>
              <TrendingUp size={16} color="#8B5CF6" />
              <Text style={[styles.quickText, { color: colors.mutedForeground }]}>
                In Pipeline: {leads.filter(l => l.status !== 'Won' && l.status !== 'Lost').length} leads
              </Text>
            </View>
            <View style={styles.quickRow}>
              <Award size={16} color="#22C55E" />
              <Text style={[styles.quickText, { color: colors.mutedForeground }]}>
                Won {won} out of {total} leads
              </Text>
            </View>
            <View style={styles.quickRow}>
              <Search size={16} color={colors.primary} />
              <Text style={[styles.quickText, { color: colors.mutedForeground }]}>
                {[...new Set(leads.map(l => l.city))].length} cities ·{' '}
                {[...new Set(leads.map(l => l.category))].length} categories
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  appName: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.5 },
  date: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 2 },
  searchFab: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16 },
  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  tile: {
    flex: 1, minWidth: '45%', borderRadius: 14, borderWidth: 1,
    padding: 14, gap: 4,
  },
  tileDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  tileValue: { fontFamily: 'Inter_700Bold', fontSize: 26 },
  tileLabel: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  tileSub: { fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  quickStats: {
    borderRadius: 14, borderWidth: 1, padding: 16, marginTop: 16, gap: 10,
  },
  quickStatsTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, marginBottom: 4 },
  quickRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quickText: { fontFamily: 'Inter_400Regular', fontSize: 13 },
});
