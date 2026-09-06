import { Preferences } from '@capacitor/preferences';
import type { DayReflection, Tombstone } from '$lib/events/types';
import { LocalDayReflectionRepository } from './day-reflection-local';
import {
	DAY_REFLECTIONS_MIGRATED_KEY,
	DAY_REFLECTIONS_STORAGE_KEY,
	type DayReflectionRepository
} from './day-reflection-repository';
import {
	getAppDatabase,
	readTombstoneTable,
	replaceTombstoneTable,
	writeTombstones
} from './event-sqlite';
import { mergeTombstones, tombstonesFor } from './tombstones';

const TABLE = 'day_reflection_tombstones';

type DayReflectionRow = {
	day_key: string;
	next_actions: string;
	insights: string;
	day_score: number | null;
	next_actions_edited: number;
	insights_edited: number;
	score_edited: number;
	updated_at: string;
};

function rowToReflection(row: DayReflectionRow): DayReflection {
	return {
		dayKey: row.day_key,
		nextActions: row.next_actions,
		insights: row.insights,
		score: row.day_score === null ? undefined : row.day_score,
		nextActionsEdited: row.next_actions_edited === 1,
		insightsEdited: row.insights_edited === 1,
		scoreEdited: row.score_edited === 1,
		updatedAt: row.updated_at
	};
}

async function insertReflection(
	database: Awaited<ReturnType<typeof getAppDatabase>>,
	reflection: DayReflection
): Promise<void> {
	await database.run(
		`INSERT OR REPLACE INTO day_reflections (day_key, next_actions, insights, day_score, next_actions_edited, insights_edited, score_edited, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			reflection.dayKey,
			reflection.nextActions,
			reflection.insights,
			reflection.score ?? null,
			reflection.nextActionsEdited ? 1 : 0,
			reflection.insightsEdited ? 1 : 0,
			reflection.scoreEdited ? 1 : 0,
			reflection.updatedAt
		]
	);
}

async function migrateFromLocalStorage(
	database: Awaited<ReturnType<typeof getAppDatabase>>
): Promise<void> {
	const { value } = await Preferences.get({ key: DAY_REFLECTIONS_MIGRATED_KEY });
	if (value === 'true') return;

	const local = new LocalDayReflectionRepository();
	const reflections = await local.loadAll();
	const tombstones = await local.loadTombstones();

	for (const reflection of reflections) {
		await insertReflection(database, reflection);
	}
	await writeTombstones(database, TABLE, tombstones);

	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem(DAY_REFLECTIONS_STORAGE_KEY);
		localStorage.removeItem('guanming.day-reflection-tombstones.v1');
	}

	await Preferences.set({ key: DAY_REFLECTIONS_MIGRATED_KEY, value: 'true' });
}

export class SqliteDayReflectionRepository implements DayReflectionRepository {
	private readyPromise: Promise<void> | null = null;

	async ensureReady(): Promise<void> {
		if (!this.readyPromise) {
			this.readyPromise = (async () => {
				const database = await getAppDatabase();
				await migrateFromLocalStorage(database);
			})().catch((error) => {
				this.readyPromise = null;
				throw error;
			});
		}
		return this.readyPromise;
	}

	async loadAll(): Promise<DayReflection[]> {
		const database = await getAppDatabase();
		const result = await database.query(
			`SELECT day_key, next_actions, insights, day_score, next_actions_edited, insights_edited, score_edited, updated_at FROM day_reflections ORDER BY day_key DESC`
		);
		const rows = (result.values ?? []) as DayReflectionRow[];
		return rows.map(rowToReflection);
	}

	async loadTombstones(): Promise<Tombstone[]> {
		const database = await getAppDatabase();
		return readTombstoneTable(database, TABLE);
	}

	async save(reflection: DayReflection): Promise<void> {
		const database = await getAppDatabase();
		await insertReflection(database, reflection);
	}

	async deleteByDayKeys(dayKeys: string[]): Promise<void> {
		if (dayKeys.length === 0) return;
		const database = await getAppDatabase();
		const placeholders = dayKeys.map(() => '?').join(', ');
		await database.run(`DELETE FROM day_reflections WHERE day_key IN (${placeholders})`, dayKeys);
		await writeTombstones(database, TABLE, tombstonesFor(dayKeys, new Date().toISOString()));
	}

	async clear(): Promise<void> {
		const database = await getAppDatabase();
		const dayKeys = (await this.loadAll()).map((r) => r.dayKey);
		await database.execute(`DELETE FROM day_reflections`);
		await writeTombstones(database, TABLE, tombstonesFor(dayKeys, new Date().toISOString()));
	}

	async replace(reflections: DayReflection[], tombstones: Tombstone[]): Promise<void> {
		const database = await getAppDatabase();
		await database.execute(`DELETE FROM day_reflections`);
		for (const reflection of reflections) {
			await insertReflection(database, reflection);
		}
		await replaceTombstoneTable(database, TABLE, mergeTombstones(tombstones));
	}
}
