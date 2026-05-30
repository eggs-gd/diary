import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
	appId: 'gd.eggs.diary',
	appName: 'Щоденник усвідомленості',
	webDir: 'build',
	ios: {
		preferredContentMode: 'mobile'
	},
	server: {
		androidScheme: 'https'
	}
};

export default config;
