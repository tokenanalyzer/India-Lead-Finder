import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, Linking, Platform, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft, Phone, Globe, ChevronDown, Plus, X,
  Trash2, RefreshCw, Check, Copy,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useColors } from '@/hooks/useColors';
import { useLeadsStore } from '@/store/leadsStore';
import { getPlaceDetails } from '@/services/googleMaps';
import { StatusBadge } from '@/components/StatusBadge';
import { STATUS_COLORS, LEAD_STATUSES } from '@/types/lead';
import type { LeadStatus } from '@/types/lead';

function CopyBtn({ text }: { text: string }) {
  const colors = useColors();
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  if (!text) return null;
  return (
    <TouchableOpacity onPress={handleCopy} style={styles.copyBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      {copied
        ? <Check size={14} color="#22C55E" />
        : <Copy size={14} color={colors.mutedForeground} />}
    </TouchableOpacity>
  );
}

export default function LeadDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const lead = useLeadsStore(s => s.getLeadById(id));
  const updateLead = useLeadsStore(s => s.updateLead);
  const deleteLead = useLeadsStore(s => s.deleteLead);

  const [status, setStatus] = useState<LeadStatus>(lead?.status ?? 'New');
  const [notes, setNotes] = useState(lead?.notes ?? '');
  const [tags, setTags] = useState<string[]>(lead?.tags ?? []);
  const [phone, setPhone] = useState(lead?.phone ?? '');
  const [website, setWebsite] = useState(lead?.website ?? '');
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const handleSave = useCallback(async () => {
    if (!lead) return;
    setIsSaving(true);
    try {
      await updateLead({ ...lead, status, notes, tags, phone, website });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save changes.');
    } finally {
      setIsSaving(false);
    }
  }, [lead, status, notes, tags, phone, website]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Lead',
      `Remove "${lead?.name}" from your leads?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            if (!lead) return;
            await deleteLead(lead.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            router.back();
          },
        },
      ]
    );
  }, [lead]);

  const handleFetchDetails = useCallback(async () => {
    if (!lead?.placeId) return;
    setIsFetching(true);
    try {
      const details = await getPlaceDetails(lead.placeId);
      if (details.phone) setPhone(details.phone);
      if (details.website) setWebsite(details.website);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Failed to fetch contact details.');
    } finally {
      setIsFetching(false);
    }
  }, [lead?.placeId]);

  const handleCall = () => {
    if (!phone) { Alert.alert('No Phone', 'No phone number available. Tap "Get Details" to fetch.'); return; }
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
  };

  const handleWebsite = () => {
    if (!website) { Alert.alert('No Website', 'No website available. Tap "Get Details" to fetch.'); return; }
    const url = website.startsWith('http') ? website : `https://${website}`;
    Linking.openURL(url);
  };

  const addTag = () => {
    const t = newTag.trim();
    if (t && !tags.includes(t)) { setTags(prev => [...prev, t]); setNewTag(''); }
  };

  if (!lead) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <TouchableOpacity style={[styles.backPill, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.back()}>
          <ArrowLeft size={18} color={colors.foreground} />
          <Text style={[styles.backPillText, { color: colors.foreground }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.notFound, { color: colors.mutedForeground }]}>Lead not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.navbar, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.backPill, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.back()}
          activeOpacity={0.75}
        >
          <ArrowLeft size={16} color={colors.foreground} />
          <Text style={[styles.backPillText, { color: colors.foreground }]}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.deleteBtn, { backgroundColor: colors.destructive + '15', borderColor: colors.destructive + '30' }]}
          onPress={handleDelete}
          activeOpacity={0.75}
        >
          <Trash2 size={16} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === 'web' ? 34 : 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Business info card ── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.bizNameRow}>
            <Text style={[styles.bizName, { color: colors.foreground }]} numberOfLines={3}>
              {lead.name}
            </Text>
            <CopyBtn text={lead.name} />
          </View>
          <Text style={[styles.bizMeta, { color: colors.mutedForeground }]}>
            {lead.category}  ·  {lead.city}
          </Text>
          {lead.address ? (
            <View style={styles.addrRow}>
              <Text style={[styles.bizAddr, { color: colors.mutedForeground }]}>{lead.address}</Text>
              <CopyBtn text={lead.address} />
            </View>
          ) : null}
          {lead.rating > 0 && (
            <Text style={[styles.bizRating, { color: '#F59E0B' }]}>
              ★ {lead.rating.toFixed(1)}  ({lead.totalRatings} reviews)
            </Text>
          )}
        </View>

        {/* ── Action buttons ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#22C55E15', borderColor: '#22C55E30' }]}
            onPress={handleCall}
            activeOpacity={0.8}
          >
            <Phone size={20} color="#22C55E" />
            <Text style={[styles.actionBtnText, { color: '#22C55E' }]}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
            onPress={handleWebsite}
            activeOpacity={0.8}
          >
            <Globe size={20} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Website</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
            onPress={handleFetchDetails}
            disabled={isFetching}
            activeOpacity={0.8}
          >
            {isFetching
              ? <ActivityIndicator size="small" color={colors.mutedForeground} />
              : <RefreshCw size={18} color={colors.mutedForeground} />
            }
            <Text style={[styles.actionBtnText, { color: colors.mutedForeground }]}>Details</Text>
          </TouchableOpacity>
        </View>

        {/* ── Phone ── */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Phone</Text>
          <View style={[styles.fieldRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="Add phone number..."
              placeholderTextColor={colors.mutedForeground}
              keyboardType="phone-pad"
            />
            <CopyBtn text={phone} />
          </View>
        </View>

        {/* ── Website ── */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Website</Text>
          <View style={[styles.fieldRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground }]}
              value={website}
              onChangeText={setWebsite}
              placeholder="Add website URL..."
              placeholderTextColor={colors.mutedForeground}
              keyboardType="url"
              autoCapitalize="none"
            />
            <CopyBtn text={website} />
          </View>
        </View>

        {/* ── CRM Status ── */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>CRM Status</Text>
          <TouchableOpacity
            style={[styles.fieldRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowStatusPicker(true)}
            activeOpacity={0.8}
          >
            <StatusBadge status={status} />
            <ChevronDown size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* ── Notes ── */}
        <View style={styles.fieldGroup}>
          <View style={styles.fieldLabelRow}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Notes</Text>
            <CopyBtn text={notes} />
          </View>
          <TextInput
            style={[styles.notesInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes about this lead..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* ── Tags ── */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Tags</Text>
          <View style={styles.tagsWrap}>
            {tags.map(tag => (
              <TouchableOpacity
                key={tag}
                style={[styles.tagChip, { backgroundColor: colors.primary + '20', borderColor: colors.primary + '40' }]}
                onPress={() => setTags(prev => prev.filter(t => t !== tag))}
                activeOpacity={0.7}
              >
                <Text style={[styles.tagText, { color: colors.primary }]}>{tag}</Text>
                <X size={12} color={colors.primary} />
              </TouchableOpacity>
            ))}
            <View style={[styles.tagInput, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                style={[styles.tagInputText, { color: colors.foreground }]}
                value={newTag}
                onChangeText={setNewTag}
                placeholder="Add tag..."
                placeholderTextColor={colors.mutedForeground}
                onSubmitEditing={addTag}
                returnKeyType="done"
              />
              {newTag.trim() ? (
                <TouchableOpacity onPress={addTag}>
                  <Plus size={16} color={colors.primary} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── Save ── */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: isSaving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving
            ? <ActivityIndicator color="#fff" />
            : <><Check size={18} color="#fff" /><Text style={styles.saveBtnText}>Save Changes</Text></>
          }
        </TouchableOpacity>
      </ScrollView>

      {/* ── Status picker modal ── */}
      <Modal visible={showStatusPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>CRM Status</Text>
              <TouchableOpacity onPress={() => setShowStatusPicker(false)}>
                <X size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            {LEAD_STATUSES.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.statusOption, { borderColor: s === status ? STATUS_COLORS[s].bg : colors.border }]}
                onPress={() => { setStatus(s); setShowStatusPicker(false); }}
                activeOpacity={0.8}
              >
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[s].bg }]} />
                <Text style={[styles.statusOptionText, { color: colors.foreground }]}>{s}</Text>
                {s === status && <Check size={18} color={STATUS_COLORS[s].bg} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { textAlign: 'center', marginTop: 40, fontFamily: 'Inter_400Regular', fontSize: 15 },

  navbar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  backPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 100, borderWidth: 1,
  },
  backPillText: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  deleteBtn: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },

  scroll: { padding: 16, gap: 14 },

  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 6 },
  bizNameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bizName: { fontFamily: 'Inter_700Bold', fontSize: 20, lineHeight: 26, flex: 1 },
  addrRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bizMeta: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 2 },
  bizAddr: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18, flex: 1 },
  bizRating: { fontFamily: 'Inter_500Medium', fontSize: 13, marginTop: 4 },

  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 12, borderWidth: 1, paddingVertical: 12,
  },
  actionBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },

  fieldGroup: { gap: 6 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 4 },
  fieldLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, paddingLeft: 4 },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 2,
  },
  fieldInput: {
    flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15,
    paddingVertical: 12,
  },
  copyBtn: { padding: 8 },

  notesInput: {
    borderRadius: 12, borderWidth: 1, padding: 14,
    fontFamily: 'Inter_400Regular', fontSize: 15, minHeight: 100,
  },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 100, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5,
  },
  tagText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  tagInput: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 100, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5, minWidth: 100,
  },
  tagInputText: { fontFamily: 'Inter_400Regular', fontSize: 12, minWidth: 60, padding: 0 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, padding: 16, marginTop: 4,
  },
  saveBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#fff' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, gap: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 18 },
  statusOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, borderWidth: 1.5, padding: 14,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusOptionText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 15 },
});
