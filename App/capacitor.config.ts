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
	},
	plugins: {
		FirebaseAuthentication: {
			skipNativeAuth: true,
			providers: ['google.com']
		}
	}
};

export default config;
