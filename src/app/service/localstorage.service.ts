import { Injectable } from '@angular/core';
import type { GameStateStore, LayoutScoreStore, LoadLayout, SettingsStore, StorageProvider } from '../model/types';
import { log } from '../model/log';

@Injectable({
	providedIn: 'root'
})
export class LocalstorageService implements StorageProvider {
	private readonly prefix = 'mah.';
	private memoryStorage: Record<string, string> = {};

	constructor() {
		this.updateData();
	}

	getScore(id: string): LayoutScoreStore | undefined {
		return this.get<LayoutScoreStore>(`score.${id}`);
	}

	getSettings(): SettingsStore | undefined {
		return this.get<SettingsStore>('settings');
	}

	getState(): GameStateStore | undefined {
		return this.get<GameStateStore>('state');
	}

	getCustomLayouts(): Array<LoadLayout> | undefined {
		return this.get<Array<LoadLayout>>('boards');
	}

	setLastMirrorX(value: string): void {
		this.set('mirrorx', value);
	}

	setLastMirrorY(value: string): void {
		this.set('mirrory', value);
	}

	getLastMirrorX(): string | undefined {
		return this.get<string | undefined>('mirrorx');
	}

	getLastMirrorY(): string | undefined {
		return this.get<string | undefined>('mirrory');
	}

	localStorageNotAvailable(): boolean {
		try {
			return (typeof localStorage === 'undefined' || !localStorage);
		} catch {
			return true;
		}
	}

	getLastPlayed(): string | undefined {
		try {
			const key = `${this.prefix}last`;
			if (this.localStorageNotAvailable()) {
				return this.memoryStorage[key];
			}
			const result = localStorage.getItem(key);
			return result ?? undefined;
		} catch (error) {
			log.warn('localStorage.getItem failed:', error);
			return this.memoryStorage[`${this.prefix}last`];
		}
	}

	storeLastPlayed(id: string): void {
		const key = `${this.prefix}last`;
		try {
			if (this.localStorageNotAvailable()) {
				if (id) {
					this.memoryStorage[key] = id;
				} else {
					delete this.memoryStorage[key];
				}
				return;
			}
			if (id) {
				localStorage.setItem(key, id);
			} else {
				localStorage.removeItem(key);
			}
		} catch (error) {
			log.warn('localStorage.setItem/removeItem failed:', error);
			if (id) {
				this.memoryStorage[key] = id;
			} else {
				delete this.memoryStorage[key];
			}
		}
	}

	storeScore(id: string, store?: LayoutScoreStore): void {
		this.set<LayoutScoreStore>(`score.${id}`, store);
	}

	clearScore(id: string): void {
		this.set<LayoutScoreStore>(`score.${id}`);
	}

	storeSettings(store?: SettingsStore): void {
		this.set<SettingsStore>('settings', store);
	}

	storeState(store?: GameStateStore): void {
		this.set<GameStateStore>('state', store);
	}

	storeCustomLayouts(layouts?: Array<LoadLayout>): void {
		this.set<Array<LoadLayout>>('boards', layouts);
	}

	private get<T>(key: string): T | undefined {
		const fullKey = `${this.prefix}${key}`;
		let s: string | null = null;
		try {
			if (this.localStorageNotAvailable()) {
				s = this.memoryStorage[fullKey];
			} else {
				s = localStorage.getItem(fullKey);
			}
			if (!s) {
				return undefined;
			}
			return JSON.parse(s) as T;
		} catch (error) {
			// Remove corrupted entry to prevent repeated parse errors
			try {
				if (!this.localStorageNotAvailable()) {
					localStorage.removeItem(fullKey);
				}
				delete this.memoryStorage[fullKey];
			} catch (removalError) {
				log.warn('Failed to remove corrupted storage item:', fullKey, removalError);
			}
			log.warn('Failed to parse storage item:', fullKey, error);
			return undefined;
		}
	}

	private set<T>(key: string, data?: T): void {
		const fullKey = `${this.prefix}${key}`;
		try {
			if (data === undefined) {
				if (!this.localStorageNotAvailable()) {
					localStorage.removeItem(fullKey);
				}
				delete this.memoryStorage[fullKey];
			} else {
				const s = JSON.stringify(data);
				if (!this.localStorageNotAvailable()) {
					localStorage.setItem(fullKey, s);
				}
				this.memoryStorage[fullKey] = s;
			}
		} catch (error) {
			// Distinguish between quota errors and other errors
			if (error instanceof Error && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
				log.warn('localStorage quota exceeded:', fullKey);
			} else {
				log.warn('Failed to write storage item:', fullKey, error);
			}
			// Always fallback to memory on error
			if (data !== undefined) {
				this.memoryStorage[fullKey] = JSON.stringify(data);
			}
		}
	}

	private updateData(): void {
		if (this.localStorageNotAvailable()) {
			return;
		}
		this.migrateOldEntry('state');
		this.migrateOldEntry('settings');
	}

	private migrateOldEntry(key: string): void {
		try {
			const old = localStorage.getItem(key);
			if (old) {
				try {
					this.set<unknown>(key, JSON.parse(old));
				} catch (parseError) {
					log.warn(`Failed to parse old ${key} data, removing corrupted entry:`, parseError);
				}
				localStorage.removeItem(key);
			}
		} catch (error) {
			log.warn(`Failed to migrate old ${key} data:`, error);
		}
	}
}
