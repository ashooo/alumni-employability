export type FaqItem = { q: string; a: string };

export interface SiteContentSettings {
  overview: {
    welcome: string;
    purpose: string;
    importance: string;
  };
  help: {
    howItWorks: string;
    privacy: string;
  };
  faqs: FaqItem[];
}

export const CONTENT_SETTINGS_KEY = 'site_content_settings_v1';

export const defaultContentSettings: SiteContentSettings = {
  overview: {
    welcome: 'Welcome to the Alumni Employability Tracer System',
    purpose:
      'This system is designed to track, analyze, and predict the employability outcomes of university alumni. By collecting comprehensive data through tracer surveys, we generate actionable insights that help improve educational programs and career readiness.',
    importance:
      'Your participation helps the university understand how well our programs prepare graduates for the workforce, identify areas of improvement, and provide data-driven career guidance to future alumni.'
  },
  help: {
    howItWorks:
      'The tracer system collects employment data from alumni through structured surveys. This data is analyzed using statistical models and machine learning algorithms to identify trends and predict future outcomes.',
    privacy:
      'All data is collected and processed in compliance with the Data Privacy Act of 2012. Personal information is anonymized in analytics and never shared with third parties.'
  },
  faqs: [
    { q: 'How often should I update my survey?', a: 'We recommend updating your information whenever your employment status changes.' },
    { q: 'Can I view other alumni data?', a: 'No, individual data is confidential. Only aggregated and anonymized statistics are available.' },
    { q: 'How are job recommendations generated?', a: 'Recommendations are based on your skills assessment, degree, and employment history using machine learning models.' }
  ]
};

export const loadContentSettings = (): SiteContentSettings => {
  try {
    const raw = localStorage.getItem(CONTENT_SETTINGS_KEY);
    if (!raw) return defaultContentSettings;
    const parsed = JSON.parse(raw);
    return {
      overview: {
        ...defaultContentSettings.overview,
        ...(parsed?.overview || {})
      },
      help: {
        ...defaultContentSettings.help,
        ...(parsed?.help || {})
      },
      faqs: Array.isArray(parsed?.faqs) && parsed.faqs.length > 0 ? parsed.faqs : defaultContentSettings.faqs
    };
  } catch {
    return defaultContentSettings;
  }
};

export const saveContentSettings = (settings: SiteContentSettings) => {
  localStorage.setItem(CONTENT_SETTINGS_KEY, JSON.stringify(settings));
};
