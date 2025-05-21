import { themeConfig } from 'src/theme/theme-config';

// ----------------------------------------------------------------------

export const SETTINGS_STORAGE_KEY = 'app-settings';

// ----------------------------------------------------------------------

export const defaultSettings = {
  colorScheme: 'light',
  direction: themeConfig.direction,
  contrast: 'default',
  navLayout: 'mini',
  primaryColor: 'preset1',
  navColor: 'integrate',
  compactLayout: false,
  fontSize: 16,
  fontFamily: themeConfig.fontFamily.primary,
};
