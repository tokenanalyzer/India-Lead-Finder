import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, Linking, Platform, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft, Phone, Globe, ChevronDown, Plus, X,
  Trash2, RefreshCw, Check, Copy, MessageCircle, Clock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useColors } from '@/hooks/useColors';
import { useLeadsStore } from '@/store/leadsStore';
import { useTemplatesStore } from '@/store/templatesStore';
import { getPlaceDetails } from '@/services/googleMaps';
import { StatusBadge } from '@/components/StatusBadge';
import { STATUS_COLORS, LEAD_STATUSES, timeAgo, isLeadDataStale, renderMessageTemplate } from '@/types/lead';
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
  const logContact = useLeadsStore(s => s.logContact);
  const getTemplateForCategory = useTemplatesStore(s => s.getTemplateForCategory);

  const [status, setStatus] = useState<LeadStatus>(lead?.status ?? 'New');
  const [notes, setNotes] = useState(lead?.notes ?? '');
  const [tags, setTags] = useState<string[]>(lead?.tags ?? []);
  const [phone, setPhone] = useState(lead?.phone ?? '');
  const [website, setWebsite] = useState(lead?.website ?? '');
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isRefreshingStale, setIsRefreshingStale] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const autoRefreshedIds = useRef(new Set<string>());

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

  // Google's Places ToS caps how long name/address/rating may be cached — this
  // pulls a fresh copy from the API and writes it straight to storage so the
  // saved lead never drifts more than ~30 days stale. `silent` skips the
  // haptics/alerts used for the manual "Details" button tap.
  const refreshFromGoogle = useCallback(async (silent: boolean) => {
    if (!lead?.placeId) return;
    silent ? setIsRefreshingStale(true) : setIsFetching(true);
    try {
      const details = await getPlaceDetails(lead.placeId);
      const nextPhone = details.phone || phone;
      const nextWebsite = details.website || website;
      setPhone(nextPhone);
      setWebsite(nextWebsite);
      await updateLead({
        ...lead,
        name: details.name || lead.name,
        address: details.address || lead.address,
        rating: details.rating,
        totalRatings: details.totalRatings,
        phone: nextPhone,
        website: nextWebsite,
        dataFetchedAt: new Date().toISOString(),
      });
      if (!silent) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      if (!silent) Alert.alert('Error', 'Failed to fetch contact details.');
    } finally {
      silent ? setIsRefreshingStale(false) : setIsFetching(false);
    }
  }, [lead, phone, website, updateLead]);

  const handleFetchDetails = useCallback(() => refreshFromGoogle(false), [refreshFromGoogle]);

  useEffect(() => {
    if (!lead || autoRefreshedIds.current.has(lead.id)) return;
    if (!isLeadDataStale(lead.dataFetchedAt)) return;
    autoRefreshedIds.current.add(lead.id);
    refreshFromGoogle(true);
    // Only re-check when navigating to a different lead, not on every store update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id]);

  const handleCall = useCallback(async () => {
    if (!phone) { Alert.alert('No Phone', 'No phone number available. Tap "Get Details" to fetch.'); return; }
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
    if (lead) await logContact(lead.id, 'call');
  }, [phone, lead, logContact]);

  const handleWebsite = () => {
    if (!website) { Alert.alert('No Website', 'No website available. Tap "Get Details" to fetch.'); return; }
    const url = website.startsWith('http') ? website : `https://${website}`;
    Linking.openURL(url);
  };

  const handleWhatsApp = useCallback(async () => {
    if (!phone) { Alert.alert('No Phone', 'No phone number available. Tap "Details" to fetch.'); return; }
    const digits = phone.replace(/\D/g, '').replace(/^0+/, '');
    const number = digits.startsWith('91') && digits.length === 12 ? digits : `91${digits}`;
    const template = getTemplateForCategory(lead?.category ?? '');
    const msg = encodeURIComponent(renderMessageTemplate(template.body, lead?.name ?? 'your business'));
    Linking.openURL(`https://wa.me/${number}?text=${msg}`);
    if (lead) await logContact(lead.id, 'whatsapp');
  }, [phone, lead, logContact, getTemplateForCategory]);

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

  const contactLog = lead.contactLog ?? [];

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
          {isRefreshingStale && (
            <View style={styles.refreshRow}>
              <ActivityIndicator size="small" color={colors.mutedForeground} />
              <Text style={[styles.refreshText, { color: colors.mutedForeground }]}>
                Refreshing latest info from Google...
              </Text>
            </View>
          )}
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
            <Phone size={18} color="#22C55E" />
            <Text style={[styles.actionBtnText, { color: '#22C55E' }]}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#25D36618', borderColor: '#25D36635' }]}
            onPress={handleWhatsApp}
            activeOpacity={0.8}
          >
            <MessageCircle size={18} color="#25D366" />
            <Text style={[styles.actionBtnText, { color: '#25D366' }]}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
            onPress={handleWebsite}
            activeOpacity={0.8}
          >
            <Globe size={18} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Website</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
            onPress={handleFetchDetails}
            disabled={isFetching || isRefreshingStale}
            activeOpacity={0.8}
          >
            {isFetching
              ? <ActivityIndicator size="small" color={colors.mutedForeground} />
              : <RefreshCw size={16} color={colors.mutedForeground} />
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

        {/* ── Contact History ── */}
        {contactLog.length > 0 ? (
          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <Clock size={13} color={colors.mutedForeground} />
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Contact History</Text>
              <Text style={[styles.histCount, { color: colors.mutedForeground }]}>
                {contactLog.length} contact{contactLog.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {[...contactLog].reverse().slice(0, 10).map((entry, i) => (
                <View
                  key={i}
                  style={[
                    styles.historyEntry,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                  ]}
                >
                  <View style={[
                    styles.histIcon,
                    { backgroundColor: entry.type === 'call' ? '#22C55E18' : '#25D36618' },
                  ]}>
                    {entry.type === 'call'
                      ? <Phone size={13} color="#22C55E" />
                      : <MessageCircle size={13} color="#25D366" />}
                  </View>
                  <View style={styles.histText}>
                    <Text style={[styles.histType, { color: colors.foreground }]}>
                      {entry.type === 'call' ? 'Phone Call' : 'WhatsApp'}
                    </Text>
                    <Text style={[styles.histTime, { color: colors.mutedForeground }]}>
                      {new Date(entry.at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <Text style={[styles.histAgo, { color: colors.mutedForeground }]}>
                    {timeAgo(entry.at)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

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
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowStatusPicker(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalSheet, { backgroundColor: colors.card }]}>
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
          </TouchableOpacity>
        </TouchableOpacity>
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
  refreshRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  refreshText: { fontFamily: 'Inter_400Regular', fontSize: 12 },

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

  histCount: { fontFamily: 'Inter_400Regular', fontSize: 12, marginLeft: 'auto' },
  historyCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  historyEntry: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  histIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  histText: { flex: 1 },
  histType: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  histTime: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 1 },
  histAgo: { fontFamily: 'Inter_400Regular', fontSize: 11 },

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
