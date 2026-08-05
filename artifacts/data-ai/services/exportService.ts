import { Platform, Alert } from 'react-native';
import Papa from 'papaparse';
import type { Lead } from '@/types/lead';

// expo-file-system types for native-only usage
interface FSModule {
  writeAsStringAsync: (uri: string, contents: string, options?: { encoding?: string }) => Promise<void>;
  documentDirectory: string | null;
  EncodingType: { UTF8: string; Base64: string };
}

function leadsToCSV(leads: Lead[]): string {
  const rows = leads.map(l => ({
    Name: l.name,
    Address: l.address,
    Phone: l.phone,
    Website: l.website,
    Rating: l.rating.toFixed(1),
    Category: l.category,
    City: l.city,
    Status: l.status,
    Notes: l.notes,
    Tags: l.tags.join('; '),
    'Saved On': l.savedAt,
    'Last Refreshed': l.dataFetchedAt || '',
    'Last Contacted': l.contactLog && l.contactLog.length > 0
      ? `${l.contactLog[l.contactLog.length - 1].type} @ ${l.contactLog[l.contactLog.length - 1].at}`
      : '',
    'Contact Count': (l.contactLog?.length ?? 0).toString(),
  }));
  return Papa.unparse(rows);
}

async function shareFile(uri: string, mimeType: string, title: string): Promise<void> {
  try {
    const Sharing = await import('expo-sharing');
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType, dialogTitle: title });
    } else {
      Alert.alert('Saved', `File saved to: ${uri}`);
    }
  } catch {
    Alert.alert('Export', `File ready at: ${uri}`);
  }
}

export async function exportToCSV(leads: Lead[]): Promise<void> {
  const csv = leadsToCSV(leads);

  if (Platform.OS === 'web') {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data_ai_leads.csv';
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const mod = await import('expo-file-system');
  const FS = mod as unknown as FSModule;
  const fileUri = (FS.documentDirectory ?? '') + 'data_ai_leads.csv';
  await FS.writeAsStringAsync(fileUri, csv, { encoding: FS.EncodingType.UTF8 });
  await shareFile(fileUri, 'text/csv', 'Export Leads as CSV');
}

export async function exportToJSON(leads: Lead[]): Promise<void> {
  const json = JSON.stringify(leads, null, 2);

  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data_ai_leads.json';
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const mod = await import('expo-file-system');
  const FS = mod as unknown as FSModule;
  const fileUri = (FS.documentDirectory ?? '') + 'data_ai_leads.json';
  await FS.writeAsStringAsync(fileUri, json, { encoding: FS.EncodingType.UTF8 });
  await shareFile(fileUri, 'application/json', 'Export Leads as JSON');
}
