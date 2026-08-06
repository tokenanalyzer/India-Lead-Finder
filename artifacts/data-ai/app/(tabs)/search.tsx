import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Modal,
  ActivityIndicator, TextInput, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, MapPin, Star, ChevronDown, Check, X, Copy } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import { useColors } from '@/hooks/useColors';
import { useLeadsStore } from '@/store/leadsStore';
import { searchPlaces } from '@/services/googleMaps';
import { EmptyState } from '@/components/EmptyState';
import { INDIAN_CITIES, BUSINESS_CATEGORIES } from '@/types/lead';
import type { SearchResult, Lead } from '@/types/lead';

type PickerType = 'city' | 'category' | null;

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const leads = useLeadsStore(s => s.leads);
  const addLead = useLeadsStore(s => s.addLead);

  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [picker, setPicker] = useState<PickerType>(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [copyItem, setCopyItem] = useState<SearchResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [useMyLocation, setUseMyLocation] = useState(false);
  const [locationCoords, setLocationCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  // What the *currently displayed* results were actually searched with — kept
  // separate from the live picker state so switching city/category after
  // searching (without re-searching) can't mislabel a saved lead.
  const [searchedCity, setSearchedCity] = useState('');
  const [searchedCategory, setSearchedCategory] = useState('');

  const savedPlaceIds = useMemo(() => new Set(leads.map(l => l.placeId)), [leads]);

  const clearLocation = () => {
    setUseMyLocation(false);
    setLocationCoords(null);
    setLocationLabel('');
  };

  const handleUseMyLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Permission Needed', 'Allow location access to find businesses near you, or select a city manually.');
        return;
      }
      const pos = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 15000)
        ),
      ]);
      const { latitude, longitude } = pos.coords;

      let label = 'your location';
      try {
        const places = await Location.reverseGeocodeAsync({ latitude, longitude });
        const place = places[0];
        if (place) label = place.city || place.subregion || place.district || place.region || label;
      } catch {
        // Reverse geocoding is best-effort — the coordinates still work for search either way.
      }

      setLocationCoords({ latitude, longitude });
      setLocationLabel(label);
      setUseMyLocation(true);
      setCity('');
    } catch {
      Alert.alert('Location Error', 'Could not get your location. Try selecting a city manually.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSearch = async () => {
    if (!useMyLocation && !city) { Alert.alert('Select City', 'Please select a city first.'); return; }
    if (!category) { Alert.alert('Select Category', 'Please select a business category.'); return; }
    setIsSearching(true);
    setError('');
    setHasSearched(true);
    try {
      const res = useMyLocation && locationCoords
        ? await searchPlaces({ category, location: { ...locationCoords, radiusMeters: 15000 } })
        : await searchPlaces({ category, city });
      setResults(res);
      setSearchedCity(useMyLocation ? locationLabel : city);
      setSearchedCategory(category);
      if (res.length === 0) setError('No businesses found. Try a different city, area, or category.');
      else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Search failed';
      setError(msg);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = async (result: SearchResult) => {
    if (savedPlaceIds.has(result.placeId)) return;
    setSavingIds(prev => new Set(prev).add(result.placeId));
    const lead: Lead = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      name: result.name,
      address: result.address,
      phone: result.phone,
      website: result.website,
      rating: result.rating,
      totalRatings: result.totalRatings,
      category: searchedCategory,
      city: searchedCity,
      status: 'New',
      notes: '',
      tags: [],
      savedAt: new Date().toISOString(),
      placeId: result.placeId,
      lat: result.lat,
      lng: result.lng,
      dataFetchedAt: new Date().toISOString(),
    };
    try {
      await addLead(lead);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Error', 'Failed to save lead.');
    } finally {
      setSavingIds(prev => { const s = new Set(prev); s.delete(result.placeId); return s; });
    }
  };

  const handleCopy = async (text: string, field: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
    setTimeout(() => setCopyItem(null), 1600);
  };

  const pickerItems = useMemo(() => {
    const list = picker === 'city' ? INDIAN_CITIES : BUSINESS_CATEGORIES;
    if (!pickerQuery) return list;
    return list.filter(i => i.toLowerCase().includes(pickerQuery.toLowerCase()));
  }, [picker, pickerQuery]);

  const topPad = Platform.OS === 'web' ? 16 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Find Leads</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          Search businesses across India
        </Text>
      </View>

      <View style={styles.form}>
        {useMyLocation ? (
          <View style={[styles.picker, styles.locationChip, { backgroundColor: colors.card, borderColor: colors.primary }]}>
            <MapPin size={18} color={colors.primary} />
            <Text style={[styles.pickerText, { color: colors.foreground }]} numberOfLines={1}>
              Near {locationLabel || 'you'}
            </Text>
            <TouchableOpacity onPress={clearLocation} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.picker, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => { setPicker('city'); setPickerQuery(''); }}
              activeOpacity={0.8}
            >
              <MapPin size={18} color={city ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.pickerText, { color: city ? colors.foreground : colors.mutedForeground }]}>
                {city || 'Select City'}
              </Text>
              <ChevronDown size={16} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.locationLink}
              onPress={handleUseMyLocation}
              disabled={isLocating}
              activeOpacity={0.7}
            >
              {isLocating
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <MapPin size={13} color={colors.primary} />
              }
              <Text style={[styles.locationLinkText, { color: colors.primary }]}>
                {isLocating ? 'Getting your location...' : 'Use my current location instead'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={[styles.picker, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => { setPicker('category'); setPickerQuery(''); }}
          activeOpacity={0.8}
        >
          <Search size={18} color={category ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.pickerText, { color: category ? colors.foreground : colors.mutedForeground }]}>
            {category || 'Select Category'}
          </Text>
          <ChevronDown size={16} color={colors.mutedForeground} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.searchBtn, { backgroundColor: colors.primary, opacity: isSearching ? 0.7 : 1 }]}
          onPress={handleSearch}
          disabled={isSearching}
          activeOpacity={0.85}
        >
          {isSearching
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Search size={18} color="#fff" /><Text style={styles.searchBtnText}>Search Businesses</Text></>
          }
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.destructive + '20', borderColor: colors.destructive + '40' }]}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      ) : null}

      {!hasSearched && !error && (
        <EmptyState
          icon={<Search size={28} color={colors.mutedForeground} />}
          title="Search for Businesses"
          subtitle="Select a city or use your current location, pick a category, then tap Search to find potential leads"
        />
      )}

      {hasSearched && !isSearching && results.length === 0 && !error && (
        <EmptyState
          icon={<MapPin size={28} color={colors.mutedForeground} />}
          title="No Results"
          subtitle="Try searching with a different city or category"
        />
      )}

      <FlatList
        data={results}
        keyExtractor={i => i.placeId}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const saved = savedPlaceIds.has(item.placeId);
          const saving = savingIds.has(item.placeId);
          return (
            <TouchableOpacity
              style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.95}
              onLongPress={() => setCopyItem(item)}
              delayLongPress={400}
            >
              <View style={styles.resultInfo}>
                <Text style={[styles.resultName, { color: colors.foreground }]} numberOfLines={2}>
                  {item.name}
                </Text>
                {item.rating > 0 && (
                  <View style={styles.ratingRow}>
                    <Star size={12} color="#F59E0B" fill="#F59E0B" />
                    <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>
                      {item.rating.toFixed(1)}  ({item.totalRatings})
                    </Text>
                  </View>
                )}
                <Text style={[styles.resultAddr, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {item.address}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: saved ? colors.muted : colors.primary,
                    borderColor: saved ? colors.border : 'transparent',
                  },
                ]}
                onPress={() => handleSave(item)}
                disabled={saved || saving}
                activeOpacity={0.8}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : saved
                  ? <Check size={16} color={colors.mutedForeground} />
                  : <Text style={styles.saveBtnText}>Save</Text>
                }
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />

      {/* ── Long-press copy modal ── */}
      <Modal visible={copyItem !== null} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCopyItem(null)}>
          <View style={[styles.copySheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.copySheetTitle, { color: colors.foreground }]} numberOfLines={1}>
              {copyItem?.name}
            </Text>
            {[
              { label: 'Copy Name', value: copyItem?.name ?? '', field: 'name' },
              { label: 'Copy Address', value: copyItem?.address ?? '', field: 'address' },
            ].filter(o => !!o.value).map(opt => (
              <TouchableOpacity
                key={opt.field}
                style={[styles.copyOption, { borderTopColor: colors.border }]}
                onPress={() => handleCopy(opt.value, opt.field)}
              >
                {copiedField === opt.field
                  ? <Check size={16} color="#22C55E" />
                  : <Copy size={16} color={colors.primary} />
                }
                <Text style={[styles.copyOptionText, {
                  color: copiedField === opt.field ? '#22C55E' : colors.foreground,
                }]}>
                  {copiedField === opt.field ? 'Copied!' : opt.label}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.copyOption, { borderTopColor: colors.border }]}
              onPress={() => setCopyItem(null)}
            >
              <Text style={[styles.copyOptionText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── City / Category picker modal ── */}
      <Modal visible={picker !== null} animationType="slide" transparent>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerSheet, { backgroundColor: colors.card }]}>
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.foreground }]}>
                {picker === 'city' ? 'Select City' : 'Select Category'}
              </Text>
              <TouchableOpacity onPress={() => setPicker(null)}>
                <X size={22} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.pickerSearch, { backgroundColor: colors.muted, color: colors.foreground }]}
              placeholder="Search..."
              placeholderTextColor={colors.mutedForeground}
              value={pickerQuery}
              onChangeText={setPickerQuery}
              autoFocus
            />
            <FlatList
              data={pickerItems}
              keyExtractor={i => i}
              renderItem={({ item }) => {
                const selected = picker === 'city' ? item === city : item === category;
                return (
                  <TouchableOpacity
                    style={[styles.pickerItem, selected && { backgroundColor: colors.primary + '20' }]}
                    onPress={() => {
                      if (picker === 'city') setCity(item);
                      else setCategory(item);
                      setPicker(null);
                    }}
                  >
                    <Text style={[styles.pickerItemText, { color: selected ? colors.primary : colors.foreground }]}>
                      {item}
                    </Text>
                    {selected && <Check size={16} color={colors.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 24, marginBottom: 2 },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  form: { paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  picker: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 12, borderWidth: 1, padding: 14,
  },
  pickerText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15 },
  locationChip: { borderWidth: 1.5 },
  locationLink: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 4, paddingHorizontal: 2, alignSelf: 'flex-start',
  },
  locationLinkText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  searchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 12, padding: 15,
  },
  searchBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#fff' },
  errorBox: { marginHorizontal: 16, marginBottom: 8, borderRadius: 10, borderWidth: 1, padding: 12 },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18 },
  list: { paddingBottom: 100 },
  resultCard: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16,
    marginVertical: 5, borderRadius: 12, borderWidth: 1, padding: 12, gap: 10,
  },
  resultInfo: { flex: 1, gap: 4 },
  resultName: { fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 20 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  resultAddr: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16 },
  saveBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, minWidth: 60, alignItems: 'center',
  },
  saveBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#fff' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  copySheet: {
    width: 280, borderRadius: 16, borderWidth: 1, overflow: 'hidden',
  },
  copySheetTitle: {
    fontFamily: 'Inter_600SemiBold', fontSize: 13,
    paddingHorizontal: 16, paddingVertical: 13,
  },
  copyOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth,
  },
  copyOptionText: { fontFamily: 'Inter_500Medium', fontSize: 15 },

  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingBottom: 12,
  },
  pickerTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 18 },
  pickerSearch: {
    marginHorizontal: 16, marginBottom: 8, borderRadius: 10,
    padding: 12, fontFamily: 'Inter_400Regular', fontSize: 15,
  },
  pickerItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  pickerItemText: { fontFamily: 'Inter_400Regular', fontSize: 15 },
});
