import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.expensetracker',
  appName: 'SplitX',
  webDir: 'www',  
  server: {
    url: 'https://splitx-exp.netlify.app', 
    cleartext: true                     
  }
};

export default config;
