import * as SQLite from 'expo-sqlite';
import type { Lead } from '@/types/lead';

let _db: SQLite.SQLiteDatabase | null = null;

export async function initDB(): Promise<void> {
  if (_db) return;
  _db = await SQLite.openDatabaseAsync('datai.db');
  await _db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      website TEXT DEFAULT '',
      rating REAL DEFAULT 0,
      totalRatings INTEGER DEFAULT 0,
      category TEXT DEFAULT '',
      city TEXT DEFAULT '',
      status TEXT DEFAULT 'New',
      notes TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      savedAt TEXT DEFAULT '',
      placeId TEXT DEFAULT '',
      lat REAL,
      lng REAL
    );
  `);
}

async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) await initDB();
  return _db!;
}

function parseRow(row: Record<string, unknown>): Lead {
  let tags: string[] = [];
  try { tags = JSON.parse((row.tags as string) || '[]'); } catch { tags = []; }
  return {
    id: row.id as string,
    name: (row.name as string) || '',
    address: (row.address as string) || '',
    phone: (row.phone as string) || '',
    website: (row.website as string) || '',
    rating: (row.rating as number) || 0,
    totalRatings: (row.totalRatings as number) || 0,
    category: (row.category as string) || '',
    city: (row.city as string) || '',
    status: (row.status as Lead['status']) || 'New',
    notes: (row.notes as string) || '',
    tags,
    savedAt: (row.savedAt as string) || '',
    placeId: (row.placeId as string) || '',
    lat: row.lat as number | undefined,
    lng: row.lng as number | undefined,
  };
}

export async function getAllLeads(): Promise<Lead[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM leads ORDER BY savedAt DESC'
  );
  return rows.map(parseRow);
}

export async function saveLead(lead: Lead): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `INSERT OR REPLACE INTO leads
     (id, name, address, phone, website, rating, totalRatings, category, city,
      status, notes, tags, savedAt, placeId, lat, lng)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [lead.id, lead.name, lead.address, lead.phone, lead.website,
     lead.rating, lead.totalRatings, lead.category, lead.city,
     lead.status, lead.notes, JSON.stringify(lead.tags),
     lead.savedAt, lead.placeId, lead.lat ?? null, lead.lng ?? null]
  );
}

export async function updateLead(lead: Lead): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    `UPDATE leads SET name=?, address=?, phone=?, website=?, rating=?, totalRatings=?,
     category=?, city=?, status=?, notes=?, tags=?, placeId=?, lat=?, lng=? WHERE id=?`,
    [lead.name, lead.address, lead.phone, lead.website, lead.rating, lead.totalRatings,
     lead.category, lead.city, lead.status, lead.notes, JSON.stringify(lead.tags),
     lead.placeId, lead.lat ?? null, lead.lng ?? null, lead.id]
  );
}

export async function deleteLead(id: string): Promise<void> {
  const db = await getDB();
  await db.runAsync('DELETE FROM leads WHERE id=?', [id]);
}
