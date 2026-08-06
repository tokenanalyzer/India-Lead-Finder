import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, ActivityIndicator, Linking, Alert, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Key, Eye, EyeOff, Trash2, Wifi, ExternalLink, CheckCircle, XCircle, Settings,
  MessageSquare, Plus, Pencil, X, Check, ChevronDown,
} from 'lucide-react-native';
import { useColors } from '@/hooks/useColors';
import { useSettingsStore } from '@/store/settingsStore';
import { useTemplatesStore } from '@/store/templatesStore';
import { testApiKey } from '@/services/googleMaps';
import { BUSINESS_CATEGORIES } from '@/types/lead';
import type { MessageTemplate } from '@/types/lead';

type TestState = 'idle' | 'testing' | 'ok' | 'fail';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { googleApiKey, setGoogleApiKey, clearGoogleApiKey } = useSettingsStore();
  const templates = useTemplatesStore(s => s.templates);
  const addTemplate = useTemplatesStore(s => s.addTemplate);
  const updateTemplate = useTemplatesStore(s => s.updateTemplate);
  const deleteTemplate = useTemplatesStore(s => s.deleteTemplate);

  const [inputKey, setInputKey] = useState(googleApiKey);
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testState, setTestState] = useState<TestState>('idle');
  const [testMsg, setTestMsg] = useState('');
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);

  useEffect(() => { setInputKey(googleApiKey); }, [googleApiKey]);

  const topPad = Platform.OS === 'web' ? 16 : insets.top;

  const handleSave = async () => {
    setIsSaving(true);
    await setGoogleApiKey(inputKey);
    setIsSaving(false);
    setTestState('idle');
    Alert.alert('Saved', inputKey.trim() ? 'Your API key has been saved.' : 'API key cleared.');
  };

  const handleTest = async () => {
    const keyToTest = inputKey.trim() || googleApiKey;
    if (!keyToTest) {
      Alert.alert('No Key', 'Enter an API key first, then tap Test.');
      return;
    }
    setTestState('testing');
    setTestMsg('');
    const result = await testApiKey(keyToTest);
    setTestState(result.ok ? 'ok' : 'fail');
    setTestMsg(result.message);
  };

  const handleClear = () => {
    Alert.alert('Clear API Key', "Remove your API key? You won't be able to search until you add one again.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => { await clearGoogleApiKey(); setInputKey(''); setTestState('idle'); } },
    ]);
  };

  const hasKey = !!googleApiKey;

  const openAddTemplate = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateCategory('');
    setTemplateBody('');
    setTemplateModalOpen(true);
  };

  const openEditTemplate = (t: MessageTemplate) => {
    setEditingTemplate(t);
    setTemplateName(t.name);
    setTemplateCategory(t.category);
    setTemplateBody(t.body);
    setTemplateModalOpen(true);
  };

  const handleSaveTemplate = async () => {
    const name = templateName.trim();
    const body = templateBody.trim();
    if (!name || !body) {
      Alert.alert('Missing Info', 'Give the template a name and a message body.');
      return;
    }
    if (editingTemplate) {
      await updateTemplate({ ...editingTemplate, name, category: templateCategory, body });
    } else {
      await addTemplate({ name, category: templateCategory, body });
    }
    setTemplateModalOpen(false);
  };

  const handleDeleteTemplate = (t: MessageTemplate) => {
    if (t.id === 'default') {
      Alert.alert('Can’t Delete', 'The default template is always kept as a fallback.');
      return;
    }
    Alert.alert('Delete Template', `Remove "${t.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTemplate(t.id) },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <View style={[styles.headerIcon, { backgroundColor: colors.primary + '18' }]}>
            <Settings size={20} color={colors.primary} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Settings</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── API Key Section ── */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>GOOGLE MAPS API</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeader}>
            <Key size={18} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>API Key</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: hasKey ? '#22C55E20' : '#EF444420' },
            ]}>
              <View style={[styles.statusDot, { backgroundColor: hasKey ? '#22C55E' : '#EF4444' }]} />
              <Text style={[styles.statusText, { color: hasKey ? '#22C55E' : '#EF4444' }]}>
                {hasKey ? 'Key Active' : 'No Key Set'}
              </Text>
            </View>
          </View>

          <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>
            {hasKey
              ? 'Using your Google Maps API key to search directly from this device.'
              : 'Add your own Google Maps API key to search — this app has no shared server key, so search is disabled until you add one.'}
          </Text>

          {/* Input */}
          <View style={[styles.inputRow, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1.5 }]}>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              value={inputKey}
              onChangeText={setInputKey}
              placeholder="AIzaSy..."
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!showKey}
            />
            <TouchableOpacity onPress={() => setShowKey(v => !v)} style={styles.eyeBtn}>
              {showKey ? <EyeOff size={18} color={colors.mutedForeground} /> : <Eye size={18} color={colors.mutedForeground} />}
            </TouchableOpacity>
          </View>

          {/* Test result */}
          {testState !== 'idle' && (
            <View style={[
              styles.testResult,
              { backgroundColor: testState === 'ok' ? '#22C55E15' : testState === 'fail' ? '#EF444415' : colors.muted },
            ]}>
              {testState === 'testing' && <ActivityIndicator size="small" color={colors.primary} />}
              {testState === 'ok' && <CheckCircle size={16} color="#22C55E" />}
              {testState === 'fail' && <XCircle size={16} color="#EF4444" />}
              <Text style={[
                styles.testMsg,
                { color: testState === 'ok' ? '#22C55E' : testState === 'fail' ? '#EF4444' : colors.mutedForeground },
              ]}>
                {testState === 'testing' ? 'Testing connection...' : testMsg}
              </Text>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, { backgroundColor: colors.primary, opacity: isSaving ? 0.7 : 1 }]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.btnPrimaryText}>Save Key</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={handleTest}
              disabled={testState === 'testing'}
              activeOpacity={0.8}
            >
              <Wifi size={15} color={colors.primary} />
              <Text style={[styles.btnSecondaryText, { color: colors.primary }]}>Test</Text>
            </TouchableOpacity>
            {googleApiKey ? (
              <TouchableOpacity
                style={[styles.btn, styles.btnDanger, { borderColor: colors.destructive + '50' }]}
                onPress={handleClear}
                activeOpacity={0.8}
              >
                <Trash2 size={15} color={colors.destructive} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* ── How to get key ── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>How to get your key</Text>
          <Text style={[styles.cardDesc, { color: colors.mutedForeground, lineHeight: 20 }]}>
            1. Go to Google Cloud Console{'\n'}
            2. Create a project (or select existing){'\n'}
            3. Enable <Text style={{ color: colors.primary }}>Places API</Text>{'\n'}
            4. Create an API Key under Credentials{'\n'}
            5. Restrict it to this app (Android: package name + SHA-1) so it can't be reused elsewhere{'\n'}
            6. Paste it above and tap Save
          </Text>
          <TouchableOpacity
            style={[styles.linkBtn, { borderColor: colors.border }]}
            onPress={() => Linking.openURL('https://console.cloud.google.com/apis/credentials')}
            activeOpacity={0.8}
          >
            <ExternalLink size={14} color={colors.primary} />
            <Text style={[styles.linkText, { color: colors.primary }]}>Open Google Cloud Console</Text>
          </TouchableOpacity>
        </View>

        {/* ── Message Templates ── */}
        <View style={styles.sectionLabelRow}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>WHATSAPP TEMPLATES</Text>
          <TouchableOpacity onPress={openAddTemplate} style={styles.addTemplateBtn} activeOpacity={0.7}>
            <Plus size={14} color={colors.primary} />
            <Text style={[styles.addTemplateBtnText, { color: colors.primary }]}>Add</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>
            Sent when you tap WhatsApp on a lead. Use {'{{business}}'} to insert the business name.
            Set a category to override the default for that category only.
          </Text>
          {templates.map((t, i) => (
            <View
              key={t.id}
              style={[styles.templateRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
            >
              <View style={styles.templateInfo}>
                <View style={styles.templateNameRow}>
                  <MessageSquare size={13} color={colors.primary} />
                  <Text style={[styles.templateName, { color: colors.foreground }]}>{t.name}</Text>
                  <Text style={[styles.templateCategoryTag, { color: colors.mutedForeground }]}>
                    {t.category || 'All categories'}
                  </Text>
                </View>
                <Text style={[styles.templateBody, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {t.body}
                </Text>
              </View>
              <View style={styles.templateActions}>
                <TouchableOpacity onPress={() => openEditTemplate(t)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Pencil size={15} color={colors.mutedForeground} />
                </TouchableOpacity>
                {t.id !== 'default' && (
                  <TouchableOpacity onPress={() => handleDeleteTemplate(t)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Trash2 size={15} color={colors.destructive} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* ── About ── */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ABOUT</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.aboutTitle, { color: colors.foreground }]}>
            <Text style={{ color: colors.foreground }}>Data </Text>
            <Text style={{ color: colors.primary }}>Ai</Text>
          </Text>
          <Text style={[styles.aboutTagline, { color: colors.mutedForeground }]}>
            Scrape Data. Unlock Insights.
          </Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutKey, { color: colors.mutedForeground }]}>Version</Text>
            <Text style={[styles.aboutVal, { color: colors.foreground }]}>1.0.0</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutKey, { color: colors.mutedForeground }]}>Storage</Text>
            <Text style={[styles.aboutVal, { color: colors.foreground }]}>Device (offline)</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutKey, { color: colors.mutedForeground }]}>Export</Text>
            <Text style={[styles.aboutVal, { color: colors.foreground }]}>CSV · JSON</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={[styles.aboutKey, { color: colors.mutedForeground }]}>Search</Text>
            <Text style={[styles.aboutVal, { color: colors.foreground }]}>Direct to Google (no backend)</Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Add/Edit template modal ── */}
      <Modal visible={templateModalOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTemplateModalOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.templateModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.templateModalHeader}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                {editingTemplate ? 'Edit Template' : 'New Template'}
              </Text>
              <TouchableOpacity onPress={() => setTemplateModalOpen(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.templateInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              value={templateName}
              onChangeText={setTemplateName}
              placeholder="Template name (e.g. Restaurant Pitch)"
              placeholderTextColor={colors.mutedForeground}
            />

            <TouchableOpacity
              style={[styles.templateInput, styles.categoryPickerBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={() => setCategoryPickerOpen(true)}
              activeOpacity={0.8}
            >
              <Text style={{ color: templateCategory ? colors.foreground : colors.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 14 }}>
                {templateCategory || 'All categories (default)'}
              </Text>
              <ChevronDown size={16} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TextInput
              style={[styles.templateInput, styles.templateBodyInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              value={templateBody}
              onChangeText={setTemplateBody}
              placeholder='Hello, I came across your business "{{business}}" ...'
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.saveSearchBtnRow}>
              <TouchableOpacity
                style={[styles.saveSearchActionBtn, { backgroundColor: colors.muted }]}
                onPress={() => setTemplateModalOpen(false)}
              >
                <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveSearchActionBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveTemplate}
              >
                <Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Category picker for template (reused compact list) ── */}
      <Modal visible={categoryPickerOpen} animationType="slide" transparent>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setCategoryPickerOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.pickerSheet, { backgroundColor: colors.card }]}>
            <View style={styles.templateModalHeader}>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>Category</Text>
              <TouchableOpacity onPress={() => setCategoryPickerOpen(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.categoryList}>
              <TouchableOpacity
                style={[styles.categoryItem, !templateCategory && { backgroundColor: colors.primary + '20' }]}
                onPress={() => { setTemplateCategory(''); setCategoryPickerOpen(false); }}
              >
                <Text style={{ color: !templateCategory ? colors.primary : colors.foreground, fontFamily: 'Inter_400Regular', fontSize: 15 }}>
                  All categories (default)
                </Text>
                {!templateCategory && <Check size={16} color={colors.primary} />}
              </TouchableOpacity>
              {BUSINESS_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryItem, templateCategory === cat && { backgroundColor: colors.primary + '20' }]}
                  onPress={() => { setTemplateCategory(cat); setCategoryPickerOpen(false); }}
                >
                  <Text style={{ color: templateCategory === cat ? colors.primary : colors.foreground, fontFamily: 'Inter_400Regular', fontSize: 15 }}>
                    {cat}
                  </Text>
                  {templateCategory === cat && <Check size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 24 },

  scroll: { paddingHorizontal: 16, gap: 10 },
  sectionLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, letterSpacing: 1, marginTop: 6 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },

  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, flex: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 100, paddingHorizontal: 8, paddingVertical: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  cardDesc: { fontFamily: 'Inter_400Regular', fontSize: 13 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 12,
  },
  input: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14, paddingVertical: 12 },
  eyeBtn: { padding: 8 },

  testResult: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, padding: 10 },
  testMsg: { fontFamily: 'Inter_400Regular', fontSize: 13, flex: 1 },

  btnRow: { flexDirection: 'row', gap: 8 },
  btn: { borderRadius: 10, paddingVertical: 11, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  btnPrimary: { flex: 1 },
  btnPrimaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#fff' },
  btnSecondary: { borderWidth: 1, paddingHorizontal: 14 },
  btnSecondaryText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  btnDanger: { borderWidth: 1, paddingHorizontal: 12 },

  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, padding: 12 },
  linkText: { fontFamily: 'Inter_500Medium', fontSize: 13 },

  divider: { height: 1 },
  aboutTitle: { fontSize: 22 },
  aboutTagline: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  aboutRow: { flexDirection: 'row', justifyContent: 'space-between' },
  aboutKey: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  aboutVal: { fontFamily: 'Inter_500Medium', fontSize: 13 },

  sectionLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  addTemplateBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  addTemplateBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  templateRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingTop: 10 },
  templateInfo: { flex: 1, gap: 3 },
  templateNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  templateName: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  templateCategoryTag: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  templateBody: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16 },
  templateActions: { flexDirection: 'row', gap: 14, paddingTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  templateModal: { width: '88%', maxWidth: 360, borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  templateModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  templateInput: { borderRadius: 10, borderWidth: 1, padding: 12, fontFamily: 'Inter_400Regular', fontSize: 14 },
  categoryPickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  templateBodyInput: { minHeight: 90 },
  saveSearchBtnRow: { flexDirection: 'row', gap: 8 },
  saveSearchActionBtn: { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },

  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', padding: 20, paddingBottom: 12 },
  categoryList: { marginTop: 8 },
  categoryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13 },
});
