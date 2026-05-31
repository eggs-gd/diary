import {
	dayReflectionActionIcon,
	type DayReflectionCalendarState
} from './day-reflection';
import type { ReflectionTone } from '$lib/preferences/reflection-tone';
import {
	getReflectionStatus,
	reflectStatusIcon,
	type ReflectStatusIcon,
	type ReflectionStatus
} from './reflection-status';

export function eventReflectionDisplayIcon(
	tone: ReflectionTone,
	status: ReflectionStatus
): ReflectStatusIcon | null {
	if (tone === 'gentle') {
		return status === 'complete' ? 'reflectComplete' : null;
	}

	return reflectStatusIcon(status);
}

export function dayReflectionDisplayIcon(
	tone: ReflectionTone,
	state: DayReflectionCalendarState
): ReflectStatusIcon | null {
	if (tone === 'gentle') {
		return state === 'complete' ? 'reflectComplete' : null;
	}

	return dayReflectionActionIcon(state);
}

export { getReflectionStatus };
