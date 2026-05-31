import {
	CapacitorSQLite,
	SQLiteConnection,
	type SQLiteDBConnection
} from '@capacitor-community/sqlite';
import { Preferences } from '@capacitor/preferences';
import type { EventEntry } from '$lib/events/types';
import { normalizeEventKind } from '$lib/events/event-kind';
import { LocalEventRepository } from './event-local';
import { EVENTS_MIGRATED_KEY, EVENTS_STORAGE_KEY, type EventRepository } from './event-repository';

const DB_NAME = 'guanming';

const CREATE_EVENTS_TABLE = `
CREATE TABLE IF NOT EXISTS events (
	id TEXT PRIMARY KEY NOT NULL,
	created_at TEXT NOT NULL,
	event_text TEXT NOT NULL,
	resonance INTEGER NOT NULL,
	kind TEXT NOT NULL DEFAULT 'event',
	protocol_json TEXT
);
`;

const CREATE_EVENTS_CREATED_AT_INDEX = `
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);
`;

const CREATE_DAY_REFLECTIONS_TABLE = `
CREATE TABLE IF NOT EXISTS day_reflections (
	day_key TEXT PRIMARY KEY NOT NULL,
	next_actions TEXT NOT NULL DEFAULT '',
	insights TEXT NOT NULL DEFAULT '',
	day_score INTEGER,
	next_actions_edited INTEGER NOT NULL DEFAULT 0,
	insights_edited INTEGER NOT NULL DEFAULT 0,
	score_edited INTEGER NOT NULL DEFAULT 0,
	updated_at TEXT NOT NULL
);
`;

type EventRow = {
	id: string;
	created_at: string;
	event_text: string;
	resonance: number;
	kind: string | null;
	protocol_json: string | null;
};

type TableInfoRow = {
	name?: string;
};

let db: SQLiteDBConnection | null = null;
let dbPromise: Promise<SQLiteDBConnection> | null = null;

function safeParseProtocol(value: string | null): EventEntry['protocol'] {
	if (!value) return undefined;
	try {
		return JSON.parse(value) as EventEntry['protocol'];
	} catch {
		return undefined;
	}
}

function rowToEvent(row: EventRow): EventEntry {
	return {
		id: row.id,
		createdAt: row.created_at,
		text: row.event_text,
		score: row.resonance,
		kind: normalizeEventKind(row.kind),
		protocol: safeParseProtocol(row.protocol_json)
	};
}

async function ensureSchema(database: SQLiteDBConnection): Promise<void> {
	const result = await database.query(`PRAGMA table_info(events)`);
	const rows = (result.values ?? []) as TableInfoRow[];
	const hasProtocolJson = rows.some((row) => row.name === 'protocol_json');

	if (!hasProtocolJson) {
		await database.execute(`ALTER TABLE events ADD COLUMN protocol_json TEXT`);
	}

	const hasKind = rows.some((row) => row.name === 'kind');
	if (!hasKind) {
		await database.execute(`ALTER TABLE events ADD COLUMN kind TEXT NOT NULL DEFAULT 'event'`);
	}

	await database.execute(CREATE_EVENTS_CREATED_AT_INDEX);
	await database.execute(CREATE_DAY_REFLECTIONS_TABLE);

	const reflectionInfo = await database.query(`PRAGMA table_info(day_reflections)`);
	const reflectionRows = (reflectionInfo.values ?? []) as TableInfoRow[];
	if (!reflectionRows.some((row) => row.name === 'day_score')) {
		await database.execute(`ALTER TABLE day_reflections ADD COLUMN day_score INTEGER`);
	}
	if (!reflectionRows.some((row) => row.name === 'next_actions_edited')) {
		await database.execute(
			`ALTER TABLE day_reflections ADD COLUMN next_actions_edited INTEGER NOT NULL DEFAULT 0`
		);
	}
	if (!reflectionRows.some((row) => row.name === 'insights_edited')) {
		await database.execute(
			`ALTER TABLE day_reflections ADD COLUMN insights_edited INTEGER NOT NULL DEFAULT 0`
		);
	}
	if (!reflectionRows.some((row) => row.name === 'score_edited')) {
		await database.execute(
			`ALTER TABLE day_reflections ADD COLUMN score_edited INTEGER NOT NULL DEFAULT 0`
		);
	}
}

export async function getAppDatabase(): Promise<SQLiteDBConnection> {
	return getDatabase();
}

async function getDatabase(): Promise<SQLiteDBConnection> {
	if (db) return db;
	if (dbPromise) return dbPromise;

	dbPromise = (async () => {
		const connection = new SQLiteConnection(CapacitorSQLite);
		const database = await connection.createConnection(DB_NAME, false, 'no-encryption', 1, false);
		await database.open();
		await database.execute(CREATE_EVENTS_TABLE);
		await ensureSchema(database);
		db = database;
		return database;
	})();

	try {
		return await dbPromise;
	} catch (error) {
		dbPromise = null;
		db = null;
		throw error;
	}
}

async function insertEvent(database: SQLiteDBConnection, entry: EventEntry): Promise<void> {
	await database.run(
		`INSERT OR REPLACE INTO events (id, created_at, event_text, resonance, kind, protocol_json) VALUES (?, ?, ?, ?, ?, ?)`,
		[
			entry.id,
			entry.createdAt,
			entry.text,
			entry.score,
			entry.kind,
			entry.protocol ? JSON.stringify(entry.protocol) : null
		]
	);
}

async function migrateFromLocalStorage(database: SQLiteDBConnection): Promise<void> {
	const { value } = await Preferences.get({ key: EVENTS_MIGRATED_KEY });
	if (value === 'true') return;

	const local = new LocalEventRepository();
	const entries = await local.loadAll();

	for (const entry of entries.reverse()) {
		await insertEvent(database, entry);
	}

	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem(EVENTS_STORAGE_KEY);
	}

	await Preferences.set({ key: EVENTS_MIGRATED_KEY, value: 'true' });
}

export class SqliteEventRepository implements EventRepository {
	private readyPromise: Promise<void> | null = null;

	async ensureReady(): Promise<void> {
		if (!this.readyPromise) {
			this.readyPromise = (async () => {
				const database = await getDatabase();
				await migrateFromLocalStorage(database);
			})();
		}
		return this.readyPromise;
	}

	async loadAll(): Promise<EventEntry[]> {
		const database = await getDatabase();
		const result = await database.query(
			`SELECT id, created_at, event_text, resonance, kind, protocol_json FROM events ORDER BY created_at DESC`
		);

		const rows = (result.values ?? []) as EventRow[];
		return rows.map(rowToEvent);
	}

	async save(entry: EventEntry): Promise<void> {
		const database = await getDatabase();
		await insertEvent(database, entry);
	}

	async clear(): Promise<void> {
		const database = await getDatabase();
		await database.execute(`DELETE FROM events`);
	}

	async deleteByIds(ids: string[]): Promise<void> {
		if (ids.length === 0) return;

		const database = await getDatabase();
		const placeholders = ids.map(() => '?').join(', ');
		await database.run(`DELETE FROM events WHERE id IN (${placeholders})`, ids);
	}
}
