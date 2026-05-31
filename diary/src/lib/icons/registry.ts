import type { Component } from 'svelte';
import {
	Calendar,
	Check,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	FileText,
	NotebookPen,
	Orbit,
	Pencil,
	Plus,
	RefreshCw,
	User
} from '@lucide/svelte';

export type IconComponent = Component<{
	size?: number | string;
	strokeWidth?: number | string;
	color?: string;
	class?: string;
	'aria-hidden'?: boolean | 'true' | 'false';
}>;

/** Єдиний словник іконок застосунку — міняти набір тут, не по всьому коду. */
export const ICONS = {
	add: Plus,
	calendar: Calendar,
	check: Check,
	chevronLeft: ChevronLeft,
	chevronRight: ChevronRight,
	chevronUp: ChevronUp,
	edit: Pencil,
	kindAct: User,
	kindEvent: Orbit,
	profile: User,
	refresh: RefreshCw,
	reflectComplete: FileText,
	reflectEmpty: Pencil,
	reflectPartial: NotebookPen,
	scrollTop: ChevronUp
} as const satisfies Record<string, IconComponent>;

export type IconName = keyof typeof ICONS;
