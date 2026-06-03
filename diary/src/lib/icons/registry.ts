import type { Component } from 'svelte';
import {
	Calendar,
	Check,
	Menu,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	FileText,
	NotebookPen,
	Orbit,
	Pencil,
	Plus,
	RefreshCw,
	Share2,
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
export type IconName =
	| 'add'
	| 'calendar'
	| 'check'
	| 'chevronLeft'
	| 'chevronRight'
	| 'chevronUp'
	| 'edit'
	| 'kindAct'
	| 'kindEvent'
	| 'menu'
	| 'profile'
	| 'refresh'
	| 'reflectComplete'
	| 'reflectEmpty'
	| 'reflectPartial'
	| 'scrollTop'
	| 'share';

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
	menu: Menu,
	profile: User,
	refresh: RefreshCw,
	reflectComplete: FileText,
	reflectEmpty: Pencil,
	reflectPartial: NotebookPen,
	scrollTop: ChevronUp,
	share: Share2
} as const satisfies Record<IconName, IconComponent>;
