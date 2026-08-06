import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, TrendingUp, Award, Users, ChevronRight, Key } from 'lucide-react-native';
import { useColors } from '@/hooks/useColors';
import { useLeadsStore } from '@/store/leadsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { LeadCard } from '@/components/LeadCard';
import { EmptyState } from '@/components/EmptyState';

const STEPS_NO_KEY = [
  'Add your free Google Maps API key in Settings',
  'Pick a city (or use your current location) and a category',
  'Save the businesses you like — they show up here as leads to track',
];
const STEPS_WITH_KEY = [
  'Pick a city (or use your current location) and a category',
  'Tap Search to pull real businesses straight from Google Maps',
  'Save the ones you like — they show up here as leads to track',
];

function StatTile({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colors = useColors();
  return (
    <View style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.tileDot, { backgroundColor: color }]} />
      <Text style={[styles.tileValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.tileLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const leads = useLeadsStore(s => s.leads);
  const googleApiKey = useSettingsStore(s => s.googleApiKey);
  const settingsLoaded = useSettingsStore(s => s.isLoaded);
  const hasApiKey = googleApiKey.trim().length > 0;

  const total = leads.length;
  const newLeads = leads.filter(l => l.status === 'New').length;
  const won = leads.filter(l => l.status === 'Won').length;
  const convRate = total > 0 ? Math.round((won / total) * 100) : 0;
  const recent = leads.slice(0, 5);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });
  const topPad = Platform.OS === 'web' ? 16 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          {/* ── Brand mark ── */}
          <View style={styles.brandBlock}>
            <Image
              source={require('@/assets/images/icon.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <View>
              <Text style={styles.brandName}>
                <Text style={[styles.brandWord, { color: colors.foreground }]}>Data </Text>
                <Text style={[styles.brandAI, { color: colors.primary }]}>Ai</Text>
              </Text>
              <Text style={[styles.brandTagline, { color: colors.mutedForeground }]}>
                Scrape Data. Unlock Insights.
              </Text>
            </View>
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
        contentContainerStyle={[styles.scroll, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {settingsLoaded && !hasApiKey && (
          <TouchableOpacity
            style={[styles.setupBanner, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B40' }]}
            onPress={() => router.push('/(tabs)/settings')}
            activeOpacity={0.85}
          >
            <View style={[styles.setupIconWrap, { backgroundColor: '#F59E0B25' }]}>
              <Key size={18} color="#F59E0B" />
            </View>
            <View style={styles.setupTextWrap}>
              <Text style={[styles.setupTitle, { color: colors.foreground }]}>Add your Google Maps API key</Text>
              <Text style={[styles.setupSubtitle, { color: colors.mutedForeground }]}>
                Required to search — it's free to set up in Settings
              </Text>
            </View>
            <ChevronRight size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}

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
          <>
            <EmptyState
              icon={<Users size={28} color={colors.mutedForeground} />}
              title="No Leads Yet"
              subtitle="Tap the search button to find businesses and start filling your pipeline"
              actionLabel="Search Now"
              onAction={() => router.push('/(tabs)/search')}
            />
            <View style={[styles.stepsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.stepsTitle, { color: colors.foreground }]}>Getting Started</Text>
              {(hasApiKey ? STEPS_WITH_KEY : STEPS_NO_KEY).map((text, i) => (
                <View key={text} style={styles.stepRow}>
                  <View style={[styles.stepNum, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.stepNumText, { color: colors.primary }]}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.stepText, { color: colors.mutedForeground }]}>{text}</Text>
                </View>
              ))}
            </View>
          </>
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

  brandBlock: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandLogo: { width: 42, height: 42, borderRadius: 12 },
  brandName: { lineHeight: 28 },
  brandWord: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    letterSpacing: -0.3,
  },
  brandAI: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    letterSpacing: 1,
  },
  brandTagline: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 1,
    letterSpacing: 0.3,
  },

  searchFab: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16 },
  setupBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16,
  },
  setupIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  setupTextWrap: { flex: 1 },
  setupTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, marginBottom: 2 },
  setupSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  stepsCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 14, marginTop: -8 },
  stepsTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, marginBottom: 2 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumText: { fontFamily: 'Inter_700Bold', fontSize: 12 },
  stepText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  tile: {
    flex: 1, minWidth: '45%', borderRadius: 14, borderWidth: 1,
    padding: 14, gap: 4,
  },
  tileDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  tileValue: { fontFamily: 'Inter_700Bold', fontSize: 26 },
  tileLabel: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 17 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  quickStats: { borderRadius: 14, borderWidth: 1, padding: 16, marginTop: 16, gap: 10 },
  quickStatsTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, marginBottom: 4 },
  quickRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quickText: { fontFamily: 'Inter_400Regular', fontSize: 13 },
});
