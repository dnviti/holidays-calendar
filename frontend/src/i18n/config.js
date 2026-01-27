import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from '../locales/en/common.json';
import enAuth from '../locales/en/auth.json';
import enDashboard from '../locales/en/dashboard.json';
import enCalendar from '../locales/en/calendar.json';
import enApprovals from '../locales/en/approvals.json';
import enTeam from '../locales/en/team.json';
import enAdmin from '../locales/en/admin.json';
import enForms from '../locales/en/forms.json';
import enErrors from '../locales/en/errors.json';

import itCommon from '../locales/it/common.json';
import itAuth from '../locales/it/auth.json';
import itDashboard from '../locales/it/dashboard.json';
import itCalendar from '../locales/it/calendar.json';
import itApprovals from '../locales/it/approvals.json';
import itTeam from '../locales/it/team.json';
import itAdmin from '../locales/it/admin.json';
import itForms from '../locales/it/forms.json';
import itErrors from '../locales/it/errors.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        auth: enAuth,
        dashboard: enDashboard,
        calendar: enCalendar,
        approvals: enApprovals,
        team: enTeam,
        admin: enAdmin,
        forms: enForms,
        errors: enErrors,
      },
      it: {
        common: itCommon,
        auth: itAuth,
        dashboard: itDashboard,
        calendar: itCalendar,
        approvals: itApprovals,
        team: itTeam,
        admin: itAdmin,
        forms: itForms,
        errors: itErrors,
      }
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'it'],
    defaultNS: 'common',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng'
    },
    interpolation: {
      escapeValue: false // React already escapes
    }
  });

export default i18n;
