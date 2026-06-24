import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import zhTWTranslation from './assets/locales/zh-TW/translation.json';
import zhCNTranslation from './assets/locales/zh-CN/translation.json';

const resources = {
  "zh-TW": { translation: zhTWTranslation },
  "zh-CN": { translation: zhCNTranslation },
};
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'zh-TW',
    fallbackLng: 'zh-TW',
    debug: false,
    interpolation: {
      escapeValue: false,
    }
  });

export default i18n;
