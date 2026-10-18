import {
	CapacitorSQLite,
	SQLiteConnection,
	type SQLiteDBConnection
} from '@capacitor-community/sqlite';
import { Preferences } from '@capacitor/preferences';
import type { EventEntry, Tombstone } from '$lib/events/types';
import { normalizeEventKind } from '$lib/events/event-kind';
import { LocalEventRepository } from './event-local';
import { EVENTS_MIGRATED_KEY, EVENTS_STORAGE_KEY, type EventRepository } from './event-repository';
import { mergeTombstones, tombstonesFor } from './tombstones';

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

const CREATE_EVENT_TOMBSTONES_TABLE = `
CREATE TABLE IF NOT EXISTS event_tombstones (
	key TEXT PRIMARY KEY NOT NULL,
	deleted_at TEXT NOT NULL
);
`;

const CREATE_DAY_REFLECTION_TOMBSTONES_TABLE = `
CREATE TABLE IF NOT EXISTS day_reflection_tombstones (
	key TEXT PRIMARY KEY NOT NULL,
	deleted_at TEXT NOT NULL
);
`;

type EventRow = {
	id: string;
	created_at: string;
	updated_at: string | null;
	event_text: string;
	resonance: number;
	kind: string | null;
	protocol_json: string | null;
};

type TableInfoRow = {
	name?: string;
};

type TombstoneRow = {
	key: string;
	deleted_at: string;
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
		updatedAt: row.updated_at ?? row.created_at,
		text: row.event_text,
		score: row.resonance,
		kind: normalizeEventKind(row.kind),
		protocol: safeParseProtocol(row.protocol_json)
	};
}

async function ensureSchema(database: SQLiteDBConnection): Promise<void> {
	const result = await database.query(`PRAGMA table_info(events)`);
	const rows = (result.values ?? []) as TableInfoRow[];

	if (!rows.some((row) => row.name === 'protocol_json')) {
		await database.execute(`ALTER TABLE events ADD COLUMN protocol_json TEXT`);
	}
	if (!rows.some((row) => row.name === 'kind')) {
		await database.execute(`ALTER TABLE events ADD COLUMN kind TEXT NOT NULL DEFAULT 'event'`);
	}
	if (!rows.some((row) => row.name === 'updated_at')) {
		await database.execute(`ALTER TABLE events ADD COLUMN updated_at TEXT`);
	}

	await database.execute(CREATE_EVENTS_CREATED_AT_INDEX);
	await database.execute(CREATE_DAY_REFLECTIONS_TABLE);
	await database.execute(CREATE_EVENT_TOMBSTONES_TABLE);
	await database.execute(CREATE_DAY_REFLECTION_TOMBSTONES_TABLE);

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
		`INSERT OR REPLACE INTO events (id, created_at, updated_at, event_text, resonance, kind, protocol_json) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		[
			entry.id,
			entry.createdAt,
			entry.updatedAt ?? entry.createdAt,
			entry.text,
			entry.score,
			entry.kind,
			entry.protocol ? JSON.stringify(entry.protocol) : null
		]
	);
}

/** Shared: read a tombstone table into `Tombstone[]`. */
export async function readTombstoneTable(
	database: SQLiteDBConnection,
	table: string
): Promise<Tombstone[]> {
	const result = await database.query(`SELECT key, deleted_at FROM ${table}`);
	const rows = (result.values ?? []) as TombstoneRow[];
	return rows.map((r) => ({ key: r.key, deletedAt: r.deleted_at }));
}

/** Shared: add tombstones to a table. First write for a key wins (earliest). */
export async function writeTombstones(
	database: SQLiteDBConnection,
	table: string,
	tombstones: Tombstone[]
): Promise<void> {
	for (const t of tombstones) {
		await database.run(`INSERT OR IGNORE INTO ${table} (key, deleted_at) VALUES (?, ?)`, [
			t.key,
			t.deletedAt
		]);
	}
}

/** Shared: replace a tombstone table wholesale (used by sync). */
export async function replaceTombstoneTable(
	database: SQLiteDBConnection,
	table: string,
	tombstones: Tombstone[]
): Promise<void> {
	await database.execute(`DELETE FROM ${table}`);
	await writeTombstones(database, table, tombstones);
}

async function migrateFromLocalStorage(database: SQLiteDBConnection): Promise<void> {
	const { value } = await Preferences.get({ key: EVENTS_MIGRATED_KEY });
	if (value === 'true') return;

	const local = new LocalEventRepository();
	const entries = await local.loadAll();
	const tombstones = await local.loadTombstones();

	for (const entry of entries.reverse()) {
		await insertEvent(database, entry);
	}
	await writeTombstones(database, 'event_tombstones', tombstones);

	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem(EVENTS_STORAGE_KEY);
		localStorage.removeItem('guanming.event-tombstones.v1');
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
			})().catch((error) => {
				this.readyPromise = null;
				throw error;
			});
		}
		return this.readyPromise;
	}

	async loadAll(): Promise<EventEntry[]> {
		const database = await getDatabase();
		const result = await database.query(
			`SELECT id, created_at, updated_at, event_text, resonance, kind, protocol_json FROM events ORDER BY created_at DESC`
		);
		const rows = (result.values ?? []) as EventRow[];
		return rows.map(rowToEvent);
	}

	async loadTombstones(): Promise<Tombstone[]> {
		const database = await getDatabase();
		return readTombstoneTable(database, 'event_tombstones');
	}

	async save(entry: EventEntry): Promise<void> {
		const database = await getDatabase();
		await insertEvent(database, entry);
	}

	async deleteByIds(ids: string[]): Promise<void> {
		if (ids.length === 0) return;
		const database = await getDatabase();
		const placeholders = ids.map(() => '?').join(', ');
		await database.run(`DELETE FROM events WHERE id IN (${placeholders})`, ids);
		await writeTombstones(
			database,
			'event_tombstones',
			tombstonesFor(ids, new Date().toISOString())
		);
	}

	async clear(): Promise<void> {
		const database = await getDatabase();
		const ids = (await this.loadAll()).map((e) => e.id);
		await database.execute(`DELETE FROM events`);
		await writeTombstones(
			database,
			'event_tombstones',
			tombstonesFor(ids, new Date().toISOString())
		);
	}

	async replace(entries: EventEntry[], tombstones: Tombstone[]): Promise<void> {
		const database = await getDatabase();
		await database.execute(`DELETE FROM events`);
		for (const entry of [...entries].reverse()) {
			await insertEvent(database, entry);
		}
		await replaceTombstoneTable(database, 'event_tombstones', mergeTombstones(tombstones));
	}
}
