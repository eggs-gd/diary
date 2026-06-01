import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
	appId: 'gd.eggs.diary',
	appName: 'Attention Journal',
	webDir: 'build',
	ios: {
		preferredContentMode: 'mobile'
	},
	server: {
		androidScheme: 'https'
	}
};

export default config;
