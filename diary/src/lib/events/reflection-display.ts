import {
	dayReflectionActionIcon,
	type DayReflectionCalendarState
} from './day-reflection';
import {
	getReflectionStatus,
	reflectStatusIcon,
	type ReflectStatusIcon,
	type ReflectionStatus
} from './reflection-status';

export function eventReflectionDisplayIcon(status: ReflectionStatus): ReflectStatusIcon {
	return reflectStatusIcon(status);
}

export function dayReflectionDisplayIcon(state: DayReflectionCalendarState): ReflectStatusIcon {
	return dayReflectionActionIcon(state);
}

export { getReflectionStatus };
