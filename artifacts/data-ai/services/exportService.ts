import { Platform, Alert } from 'react-native';
import Papa from 'papaparse';
import type { Lead } from '@/types/lead';

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
  }));
  return Papa.unparse(rows);
}

async function shareFile(uri: string, mimeType: string, title: string): Promise<void> {
  try {
    const Sharing = await import('expo-sharing');
    const FileSystem = await import('expo-file-system');
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType, dialogTitle: title });
    } else {
      Alert.alert('Saved', `File saved to: ${uri}`);
    }
    void FileSystem;
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

  const { writeAsStringAsync, documentDirectory, EncodingType } = await import('expo-file-system');
  const fileUri = (documentDirectory ?? '') + 'data_ai_leads.csv';
  await writeAsStringAsync(fileUri, csv, { encoding: EncodingType.UTF8 });
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

  const { writeAsStringAsync, documentDirectory, EncodingType } = await import('expo-file-system');
  const fileUri = (documentDirectory ?? '') + 'data_ai_leads.json';
  await writeAsStringAsync(fileUri, json, { encoding: EncodingType.UTF8 });
  await shareFile(fileUri, 'application/json', 'Export Leads as JSON');
}
