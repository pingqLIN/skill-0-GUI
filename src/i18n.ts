import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './locales/en.json';
import zhTranslation from './locales/zh.json';
import zhTwTranslation from './locales/zh-TW.json';

const zhTwResolvedTranslation = {
  ...zhTranslation,
  ...zhTwTranslation,
  app: {
    ...zhTranslation.app,
    ...zhTwTranslation.app,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      zh: { translation: zhTwResolvedTranslation },
      'zh-TW': { translation: zhTwResolvedTranslation },
    },
    fallbackLng: {
      zh: ['zh-TW', 'en'],
      'zh-TW': ['en'],
      default: ['en'],
    },
    supportedLngs: ['en', 'zh', 'zh-TW'],
    nonExplicitSupportedLngs: false,
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
