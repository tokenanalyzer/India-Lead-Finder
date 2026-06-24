import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, Star, Copy, Check, ChevronRight, Phone, MessageCircle } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useColors } from '@/hooks/useColors';
import { StatusBadge } from './StatusBadge';
import type { Lead } from '@/types/lead';
import { timeAgo } from '@/types/lead';

interface Props {
  lead: Lead;
}

export function LeadCard({ lead }: Props) {
  const colors = useColors();
  const router = useRouter();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const copyToClipboard = async (text: string, field: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
    setShowMenu(false);
  };

  const copyOptions = [
    { label: 'Copy Name', value: lead.name, field: 'name' },
    { label: 'Copy Address', value: lead.address, field: 'address' },
    { label: 'Copy City', value: lead.city, field: 'city' },
    ...(lead.phone ? [{ label: 'Copy Phone', value: lead.phone, field: 'phone' }] : []),
    ...(lead.website ? [{ label: 'Copy Website', value: lead.website, field: 'website' }] : []),
  ].filter(o => !!o.value);

  // Last contact
  const lastContact = lead.contactLog && lead.contactLog.length > 0
    ? lead.contactLog[lead.contactLog.length - 1]
    : null;

  return (
    <>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.75}
        onPress={() => router.push(`/lead/${lead.id}`)}
        onLongPress={() => setShowMenu(true)}
        delayLongPress={400}
      >
        <View style={[styles.statusBar, { backgroundColor: STATUS_COLOR_MAP[lead.status] }]} />
        <View style={styles.content}>
          <View style={styles.top}>
            <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
              {lead.name}
            </Text>
            <View style={styles.topRight}>
              {copiedField ? (
                <Check size={14} color="#22C55E" />
              ) : null}
              <StatusBadge status={lead.status} size="sm" />
            </View>
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

          {lastContact ? (
            <View style={styles.contactedRow}>
              {lastContact.type === 'call'
                ? <Phone size={11} color={colors.mutedForeground} />
                : <MessageCircle size={11} color={colors.mutedForeground} />}
              <Text style={[styles.contactedText, { color: colors.mutedForeground }]}>
                {lastContact.type === 'call' ? 'Called' : 'WhatsApp'} {timeAgo(lastContact.at)}
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.chevronWrap}>
          <ChevronRight size={16} color={colors.mutedForeground} />
        </View>
      </TouchableOpacity>

      {/* Long-press copy menu */}
      <Modal visible={showMenu} transparent animationType="fade">
        <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setShowMenu(false)}>
          <View style={[styles.menuSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.menuTitle, { color: colors.foreground }]} numberOfLines={1}>
              {lead.name}
            </Text>
            {copyOptions.map(opt => (
              <TouchableOpacity
                key={opt.field}
                style={[styles.menuItem, { borderTopColor: colors.border }]}
                onPress={() => copyToClipboard(opt.value, opt.field)}
                activeOpacity={0.7}
              >
                <Copy size={16} color={colors.primary} />
                <Text style={[styles.menuItemText, { color: colors.foreground }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.menuItem, styles.menuCancel, { borderTopColor: colors.border }]}
              onPress={() => setShowMenu(false)}
            >
              <Text style={[styles.menuItemText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
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
    alignItems: 'center',
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 }
      : { elevation: 2 }),
  },
  statusBar: { width: 4, alignSelf: 'stretch' },
  content: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontFamily: 'Inter_600SemiBold', fontSize: 15, flex: 1 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  address: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  contactedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  contactedText: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  chevronWrap: { paddingRight: 10 },

  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  menuSheet: {
    width: 280, borderRadius: 16, borderWidth: 1,
    overflow: 'hidden',
    ...(Platform.OS === 'ios'
      ? { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 20 }
      : { elevation: 12 }),
  },
  menuTitle: {
    fontFamily: 'Inter_600SemiBold', fontSize: 14,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth,
  },
  menuItemText: { fontFamily: 'Inter_500Medium', fontSize: 15 },
  menuCancel: {},
});
