import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Modal,
  ActivityIndicator, TextInput, Alert, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search, MapPin, Star, ChevronDown, Check, X, Copy, Navigation, GlobeOff,
  Layers, BookmarkPlus, Bookmark, Trash2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import * as Location from 'expo-location';
import { useColors } from '@/hooks/useColors';
import { useLeadsStore } from '@/store/leadsStore';
import { useSavedSearchesStore } from '@/store/savedSearchesStore';
import { searchPlaces } from '@/services/googleMaps';
import { EmptyState } from '@/components/EmptyState';
import { INDIAN_CITIES, BUSINESS_CATEGORIES } from '@/types/lead';
import type { SearchResult, Lead, SavedSearch } from '@/types/lead';

type PickerType = 'city' | 'category' | null;
interface TaggedResult extends SearchResult {
  sourceCity: string;
  sourceCategory: string;
}
interface Coords { latitude: number; longitude: number; }

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const leads = useLeadsStore(s => s.leads);
  const addLead = useLeadsStore(s => s.addLead);
  const savedSearches = useSavedSearchesStore(s => s.searches);
  const addSavedSearch = useSavedSearchesStore(s => s.addSearch);
  const updateSeenPlaceIds = useSavedSearchesStore(s => s.updateSeenPlaceIds);
  const deleteSavedSearch = useSavedSearchesStore(s => s.deleteSearch);

  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState<TaggedResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [picker, setPicker] = useState<PickerType>(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [copyItem, setCopyItem] = useState<TaggedResult | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [useMyLocation, setUseMyLocation] = useState(false);
  const [locationCoords, setLocationCoords] = useState<Coords | null>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [noWebsiteOnly, setNoWebsiteOnly] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkCities, setBulkCities] = useState<string[]>([]);
  const [activeSavedSearchId, setActiveSavedSearchId] = useState<string | null>(null);
  const [newSinceLastRun, setNewSinceLastRun] = useState<number | null>(null);
  const [saveSearchModalOpen, setSaveSearchModalOpen] = useState(false);
  const [saveSearchLabel, setSaveSearchLabel] = useState('');

  const savedPlaceIds = useMemo(() => new Set(leads.map(l => l.placeId)), [leads]);

  // Sort nearest-first when we searched by GPS — a plain lat/lng distance
  // is plenty accurate at city-block scale, no need for a routing API call.
  const sortedResults = useMemo(() => {
    const withDistance = results.map(r => {
      const hasCoords = useMyLocation && locationCoords && r.lat != null && r.lng != null;
      let distanceKm: number | undefined;
      if (hasCoords) {
        const R = 6371;
        const dLat = (r.lat! - locationCoords!.latitude) * Math.PI / 180;
        const dLng = (r.lng! - locationCoords!.longitude) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
          Math.cos(locationCoords!.latitude * Math.PI / 180) * Math.cos(r.lat! * Math.PI / 180) *
          Math.sin(dLng / 2) ** 2;
        distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }
      return { ...r, distanceKm };
    });
    if (useMyLocation && locationCoords) {
      return withDistance.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    }
    return withDistance;
  }, [results, useMyLocation, locationCoords]);

  const visibleResults = useMemo(
    () => (noWebsiteOnly ? sortedResults.filter(r => !r.website) : sortedResults),
    [sortedResults, noWebsiteOnly]
  );

  const marketStats = useMemo(() => {
    if (results.length === 0) return null;
    const rated = results.filter(r => r.rating > 0);
    const avgRating = rated.length > 0 ? rated.reduce((s, r) => s + r.rating, 0) / rated.length : 0;
    const noWebsiteCount = results.filter(r => !r.website).length;
    return { total: results.length, avgRating, noWebsiteCount };
  }, [results]);

  const clearLocation = () => {
    setUseMyLocation(false);
    setLocationCoords(null);
    setLocationLabel('');
  };

  async function getCurrentLocation(): Promise<{ coords: Coords; label: string }> {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('permission-denied');
    }
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000)),
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
    return { coords: { latitude, longitude }, label };
  }

  const handleUseMyLocation = async () => {
    setIsLocating(true);
    try {
      const { coords, label } = await getCurrentLocation();
      setLocationCoords(coords);
      setLocationLabel(label);
      setUseMyLocation(true);
      setBulkMode(false);
      setCity('');
    } catch (e) {
      if (e instanceof Error && e.message === 'permission-denied') {
        Alert.alert('Location Permission Needed', 'Allow location access to find businesses near you, or select a city manually.');
      } else {
        Alert.alert('Location Error', 'Could not get your location. Try selecting a city manually.');
      }
    } finally {
      setIsLocating(false);
    }
  };

  const toggleBulkCity = (item: string) => {
    setBulkCities(prev => prev.includes(item) ? prev.filter(c => c !== item) : [...prev, item]);
  };

  const toggleBulkMode = () => {
    setBulkMode(v => !v);
    clearLocation();
    setCity('');
    setBulkCities([]);
  };

  async function runSearch(params: {
    category: string; city?: string; cities?: string[]; location?: Coords; locationLabel?: string;
    // Passed explicitly (not read from state) to avoid a stale-closure read of
    // activeSavedSearchId right after setActiveSavedSearchId in the same tick.
    savedSearch?: SavedSearch;
  }) {
    setIsSearching(true);
    setError('');
    setHasSearched(true);
    try {
      let tagged: TaggedResult[] = [];
      if (params.cities && params.cities.length > 0) {
        const seenIds = new Set<string>();
        for (const c of params.cities) {
          try {
            const res = await searchPlaces({ category: params.category, city: c });
            for (const r of res) {
              if (!seenIds.has(r.placeId)) {
                seenIds.add(r.placeId);
                tagged.push({ ...r, sourceCity: c, sourceCategory: params.category });
              }
            }
          } catch {
            // one city failing in a bulk run shouldn't sink the rest
          }
        }
        if (tagged.length === 0) throw new Error('No results found across the selected cities.');
      } else if (params.location) {
        const res = await searchPlaces({ category: params.category, location: { ...params.location, radiusMeters: 15000 } });
        tagged = res.map(r => ({ ...r, sourceCity: params.locationLabel ?? 'your location', sourceCategory: params.category }));
      } else {
        const res = await searchPlaces({ category: params.category, city: params.city });
        tagged = res.map(r => ({ ...r, sourceCity: params.city ?? '', sourceCategory: params.category }));
      }

      setResults(tagged);

      if (params.savedSearch) {
        const newIds = tagged.map(t => t.placeId);
        const freshCount = params.savedSearch.seenPlaceIds.length > 0
          ? newIds.filter(id => !params.savedSearch!.seenPlaceIds.includes(id)).length
          : null;
        setNewSinceLastRun(freshCount);
        await updateSeenPlaceIds(params.savedSearch.id, newIds);
      } else {
        setNewSinceLastRun(null);
      }

      if (tagged.length === 0) setError('No businesses found. Try a different city, area, or category.');
      else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Search failed';
      setError(msg);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  const handleSearch = () => {
    setActiveSavedSearchId(null);
    if (bulkMode) {
      if (bulkCities.length === 0) { Alert.alert('Select Cities', 'Please select at least one city.'); return; }
      if (!category) { Alert.alert('Select Category', 'Please select a business category.'); return; }
      runSearch({ category, cities: bulkCities });
      return;
    }
    if (!useMyLocation && !city) { Alert.alert('Select City', 'Please select a city first.'); return; }
    if (!category) { Alert.alert('Select Category', 'Please select a business category.'); return; }
    if (useMyLocation && locationCoords) {
      runSearch({ category, location: locationCoords, locationLabel });
    } else {
      runSearch({ category, city });
    }
  };

  const handleSave = async (result: TaggedResult) => {
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
      category: result.sourceCategory,
      city: result.sourceCity,
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

  const openSaveSearchModal = () => {
    if (bulkMode && bulkCities.length === 0) { Alert.alert('Select Cities', 'Please select at least one city first.'); return; }
    if (!bulkMode && !useMyLocation && !city) { Alert.alert('Select City', 'Please select a city first.'); return; }
    if (!category) { Alert.alert('Select Category', 'Please select a business category.'); return; }
    const defaultLabel = bulkMode
      ? `${category} — ${bulkCities.length} cities`
      : useMyLocation
      ? `${category} near ${locationLabel}`
      : `${category} in ${city}`;
    setSaveSearchLabel(defaultLabel);
    setSaveSearchModalOpen(true);
  };

  const confirmSaveSearch = async () => {
    const label = saveSearchLabel.trim();
    if (!label) return;
    await addSavedSearch({
      label,
      category,
      cities: bulkMode ? bulkCities : useMyLocation ? [] : [city],
    });
    setSaveSearchModalOpen(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleRunSavedSearch = async (saved: SavedSearch) => {
    setActiveSavedSearchId(saved.id);
    setCategory(saved.category);
    setNewSinceLastRun(null);

    if (saved.cities.length === 0) {
      setBulkMode(false);
      setIsLocating(true);
      try {
        const { coords, label } = await getCurrentLocation();
        setLocationCoords(coords);
        setLocationLabel(label);
        setUseMyLocation(true);
        await runSearch({ category: saved.category, location: coords, locationLabel: label, savedSearch: saved });
      } catch {
        Alert.alert('Location Error', 'Could not get your location for this saved search.');
      } finally {
        setIsLocating(false);
      }
    } else if (saved.cities.length > 1) {
      setUseMyLocation(false);
      setBulkMode(true);
      setBulkCities(saved.cities);
      await runSearch({ category: saved.category, cities: saved.cities, savedSearch: saved });
    } else {
      setUseMyLocation(false);
      setBulkMode(false);
      setCity(saved.cities[0]);
      await runSearch({ category: saved.category, city: saved.cities[0], savedSearch: saved });
    }
  };

  const handleDeleteSavedSearch = (saved: SavedSearch) => {
    Alert.alert('Delete Saved Search', `Remove "${saved.label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        deleteSavedSearch(saved.id);
        if (activeSavedSearchId === saved.id) setActiveSavedSearchId(null);
      } },
    ]);
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

      {savedSearches.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.savedSearchRow}
        >
          {savedSearches.map(s => (
            <TouchableOpacity
              key={s.id}
              style={[
                styles.savedSearchChip,
                { backgroundColor: colors.card, borderColor: activeSavedSearchId === s.id ? colors.primary : colors.border },
              ]}
              onPress={() => handleRunSavedSearch(s)}
              onLongPress={() => handleDeleteSavedSearch(s)}
              activeOpacity={0.8}
            >
              <Bookmark size={12} color={colors.primary} />
              <Text style={[styles.savedSearchChipText, { color: colors.foreground }]} numberOfLines={1}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.form}>
        <TouchableOpacity onPress={toggleBulkMode} style={styles.bulkToggle} activeOpacity={0.7}>
          <Layers size={13} color={bulkMode ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.bulkToggleText, { color: bulkMode ? colors.primary : colors.mutedForeground }]}>
            {bulkMode ? 'Bulk mode — searching multiple cities' : 'Search multiple cities at once'}
          </Text>
        </TouchableOpacity>

        {bulkMode ? (
          <>
            <TouchableOpacity
              style={[styles.picker, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => { setPicker('city'); setPickerQuery(''); }}
              activeOpacity={0.8}
            >
              <MapPin size={18} color={bulkCities.length > 0 ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.pickerText, { color: bulkCities.length > 0 ? colors.foreground : colors.mutedForeground }]}>
                {bulkCities.length > 0 ? `${bulkCities.length} cities selected` : 'Add Cities'}
              </Text>
              <ChevronDown size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
            {bulkCities.length > 0 && (
              <View style={styles.bulkChipsWrap}>
                {bulkCities.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.bulkCityChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '40' }]}
                    onPress={() => toggleBulkCity(c)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.bulkCityChipText, { color: colors.primary }]}>{c}</Text>
                    <X size={11} color={colors.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        ) : useMyLocation ? (
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

        <View style={styles.actionRow}>
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
          <TouchableOpacity
            style={[styles.saveSearchBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
            onPress={openSaveSearchModal}
            activeOpacity={0.8}
            accessibilityLabel="Save this search"
          >
            <BookmarkPlus size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
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
          subtitle="Select a city (or several, or use your location), pick a category, then tap Search to find potential leads"
        />
      )}

      {hasSearched && !isSearching && results.length === 0 && !error && (
        <EmptyState
          icon={<MapPin size={28} color={colors.mutedForeground} />}
          title="No Results"
          subtitle="Try searching with a different city or category"
        />
      )}

      {marketStats && (
        <View style={styles.snapshotRow}>
          <Text style={[styles.snapshotText, { color: colors.mutedForeground }]}>
            {marketStats.total} results
            {marketStats.avgRating > 0 ? ` · avg ★${marketStats.avgRating.toFixed(1)}` : ''}
            {marketStats.noWebsiteCount > 0 ? ` · ${marketStats.noWebsiteCount} without a website` : ''}
            {newSinceLastRun != null ? ` · ${newSinceLastRun} new since last time` : ''}
          </Text>
          {marketStats.noWebsiteCount > 0 && (
            <TouchableOpacity
              style={[
                styles.filterChip,
                { borderColor: noWebsiteOnly ? colors.primary : colors.border,
                  backgroundColor: noWebsiteOnly ? colors.primary + '20' : 'transparent' },
              ]}
              onPress={() => setNoWebsiteOnly(v => !v)}
              activeOpacity={0.8}
            >
              <GlobeOff size={12} color={noWebsiteOnly ? colors.primary : colors.mutedForeground} />
              <Text style={[styles.filterChipText, { color: noWebsiteOnly ? colors.primary : colors.mutedForeground }]}>
                No Website Only
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <FlatList
        data={visibleResults}
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
                <View style={styles.badgeRow}>
                  {item.rating > 0 && (
                    <View style={styles.ratingRow}>
                      <Star size={12} color="#F59E0B" fill="#F59E0B" />
                      <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>
                        {item.rating.toFixed(1)}  ({item.totalRatings})
                      </Text>
                    </View>
                  )}
                  {item.distanceKm != null && (
                    <View style={styles.ratingRow}>
                      <Navigation size={11} color={colors.mutedForeground} />
                      <Text style={[styles.ratingText, { color: colors.mutedForeground }]}>
                        {item.distanceKm < 1 ? `${Math.round(item.distanceKm * 1000)} m` : `${item.distanceKm.toFixed(1)} km`}
                      </Text>
                    </View>
                  )}
                  {!item.website && (
                    <View style={styles.noWebsiteBadge}>
                      <GlobeOff size={11} color="#F59E0B" />
                      <Text style={styles.noWebsiteBadgeText}>No Website</Text>
                    </View>
                  )}
                  {bulkMode && (
                    <Text style={[styles.sourceCityText, { color: colors.mutedForeground }]}>{item.sourceCity}</Text>
                  )}
                </View>
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

      {/* ── Save search modal ── */}
      <Modal visible={saveSearchModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.saveSearchSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.copySheetTitle, { color: colors.foreground }]}>Save This Search</Text>
            <TextInput
              style={[styles.saveSearchInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
              value={saveSearchLabel}
              onChangeText={setSaveSearchLabel}
              placeholder="Name this search..."
              placeholderTextColor={colors.mutedForeground}
              autoFocus
            />
            <View style={styles.saveSearchBtnRow}>
              <TouchableOpacity
                style={[styles.saveSearchActionBtn, { backgroundColor: colors.muted }]}
                onPress={() => setSaveSearchModalOpen(false)}
              >
                <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveSearchActionBtn, { backgroundColor: colors.primary }]}
                onPress={confirmSaveSearch}
              >
                <Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
                {picker === 'city' ? (bulkMode ? 'Select Cities' : 'Select City') : 'Select Category'}
              </Text>
              {bulkMode && picker === 'city' ? (
                <TouchableOpacity onPress={() => setPicker(null)}>
                  <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 15 }}>Done</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setPicker(null)}>
                  <X size={22} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
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
                const selected = picker === 'city'
                  ? (bulkMode ? bulkCities.includes(item) : item === city)
                  : item === category;
                return (
                  <TouchableOpacity
                    style={[styles.pickerItem, selected && { backgroundColor: colors.primary + '20' }]}
                    onPress={() => {
                      if (picker === 'city') {
                        if (bulkMode) { toggleBulkCity(item); return; }
                        setCity(item);
                        setPicker(null);
                      } else {
                        setCategory(item);
                        setPicker(null);
                      }
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
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 24, marginBottom: 2 },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 14 },

  savedSearchRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 10 },
  savedSearchChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 7,
    maxWidth: 200,
  },
  savedSearchChipText: { fontFamily: 'Inter_500Medium', fontSize: 12 },

  form: { paddingHorizontal: 16, gap: 10, marginBottom: 8 },
  bulkToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  bulkToggleText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
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
  bulkChipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bulkCityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 5,
  },
  bulkCityChipText: { fontFamily: 'Inter_500Medium', fontSize: 12 },

  actionRow: { flexDirection: 'row', gap: 8 },
  searchBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 12, padding: 15,
  },
  searchBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#fff' },
  saveSearchBtn: {
    width: 50, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  errorBox: { marginHorizontal: 16, marginBottom: 8, borderRadius: 10, borderWidth: 1, padding: 12 },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18 },
  snapshotRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 6, gap: 8,
  },
  snapshotText: { fontFamily: 'Inter_400Regular', fontSize: 12, flex: 1 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 5,
  },
  filterChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  list: { paddingBottom: 100 },
  resultCard: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16,
    marginVertical: 5, borderRadius: 12, borderWidth: 1, padding: 12, gap: 10,
  },
  resultInfo: { flex: 1, gap: 4 },
  resultName: { fontFamily: 'Inter_600SemiBold', fontSize: 14, lineHeight: 20 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  sourceCityText: { fontFamily: 'Inter_400Regular', fontSize: 11, fontStyle: 'italic' },
  noWebsiteBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F59E0B20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
  },
  noWebsiteBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, color: '#F59E0B' },
  resultAddr: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 16 },
  saveBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, minWidth: 60, alignItems: 'center',
  },
  saveBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#fff' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  saveSearchSheet: { width: 300, borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  saveSearchInput: {
    borderRadius: 10, borderWidth: 1, padding: 12,
    fontFamily: 'Inter_400Regular', fontSize: 14,
  },
  saveSearchBtnRow: { flexDirection: 'row', gap: 8 },
  saveSearchActionBtn: {
    flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center',
  },
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
