import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput,
  ScrollView, Modal, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Users, Search, Download, FileText, FileJson, X } from 'lucide-react-native';
import { useColors } from '@/hooks/useColors';
import { useLeadsStore } from '@/store/leadsStore';
import { LeadCard } from '@/components/LeadCard';
import { EmptyState } from '@/components/EmptyState';
import { exportToCSV, exportToJSON } from '@/services/exportService';
import { LEAD_STATUSES } from '@/types/lead';
import type { LeadStatus } from '@/types/lead';

type Filter = 'All' | LeadStatus;

export default function LeadsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const leads = useLeadsStore(s => s.leads);
  const isLoaded = useLeadsStore(s => s.isLoaded);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [showExport, setShowExport] = useState(false);
  const [exporting, setExporting] = useState<'csv' | 'json' | null>(null);

  const filtered = useMemo(() => {
    let res = leads;
    if (filter !== 'All') res = res.filter(l => l.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      res = res.filter(
        l =>
          l.name.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.category.toLowerCase().includes(q) ||
          l.address.toLowerCase().includes(q)
      );
    }
    return res;
  }, [leads, search, filter]);

  const handleExport = useCallback(async (type: 'csv' | 'json') => {
    setExporting(type);
    try {
      if (type === 'csv') await exportToCSV(filtered);
      else await exportToJSON(filtered);
      setShowExport(false);
    } catch (e: unknown) {
      Alert.alert('Export Failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setExporting(null);
    }
  }, [filtered]);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const filters: Filter[] = ['All', ...LEAD_STATUSES];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Leads</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              {leads.length} total · {filtered.length} showing
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowExport(true)}
            activeOpacity={0.8}
          >
            <Download size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search leads..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {filters.map(f => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filter === f ? colors.primary : colors.card,
                  borderColor: filter === f ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, { color: filter === f ? '#fff' : colors.mutedForeground }]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {!isLoaded ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={28} color={colors.mutedForeground} />}
          title={search || filter !== 'All' ? 'No matching leads' : 'No leads yet'}
          subtitle={search || filter !== 'All' ? 'Try adjusting your filters' : 'Search for businesses to start building your pipeline'}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          renderItem={({ item }) => <LeadCard lead={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Modal visible={showExport} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Export Leads</Text>
              <TouchableOpacity onPress={() => setShowExport(false)}>
                <X size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              Export {filtered.length} leads
            </Text>

            <TouchableOpacity
              style={[styles.exportOption, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={() => handleExport('csv')}
              disabled={exporting !== null}
              activeOpacity={0.8}
            >
              {exporting === 'csv'
                ? <ActivityIndicator color={colors.primary} />
                : <FileText size={24} color="#22C55E" />
              }
              <View style={styles.exportOptionText}>
                <Text style={[styles.exportOptionTitle, { color: colors.foreground }]}>CSV File</Text>
                <Text style={[styles.exportOptionDesc, { color: colors.mutedForeground }]}>
                  Open in Excel, Google Sheets
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportOption, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={() => handleExport('json')}
              disabled={exporting !== null}
              activeOpacity={0.8}
            >
              {exporting === 'json'
                ? <ActivityIndicator color={colors.primary} />
                : <FileJson size={24} color="#4F8AFF" />
              }
              <View style={styles.exportOptionText}>
                <Text style={[styles.exportOptionTitle, { color: colors.foreground }]}>JSON File</Text>
                <Text style={[styles.exportOptionDesc, { color: colors.mutedForeground }]}>
                  For developers and APIs
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 24 },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 2 },
  exportBtn: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 10,
  },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15, padding: 0 },
  filterScroll: { marginBottom: 4 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100,
    marginRight: 8, borderWidth: 1,
  },
  filterChipText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  list: { paddingTop: 8, paddingBottom: 100 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 18 },
  modalSub: { fontFamily: 'Inter_400Regular', fontSize: 13, marginBottom: 20 },
  exportOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14,
    borderWidth: 1, padding: 16, marginBottom: 12,
  },
  exportOptionText: { flex: 1 },
  exportOptionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, marginBottom: 2 },
  exportOptionDesc: { fontFamily: 'Inter_400Regular', fontSize: 13 },
});
