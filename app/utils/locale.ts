import {
  AppLanguage,
  DEFAULT_APP_LANGUAGE,
  resolveAppLanguage,
} from "./i18n";
import {
  CurrencyPreference,
  RegionPreference,
} from "./appTheme";

type DateInput = Date | number | string | null | undefined;
type RegionCode = Exclude<RegionPreference, "auto">;
type CurrencyCode = Exclude<CurrencyPreference, "auto">;

type LocaleConfig = {
  locale: string;
  currency: CurrencyCode;
  pluggyLanguage: "pt" | "en" | "es";
  region: RegionCode;
};

type RegionMeta = {
  locale: string;
  defaultCurrency: CurrencyCode;
  pluggyLanguage: "pt" | "en" | "es";
  label: Record<AppLanguage, string>;
};

type CurrencyMeta = {
  label: Record<AppLanguage, string>;
};

const DEFAULT_REGION_BY_LANGUAGE: Record<AppLanguage, RegionCode> = {
  pt: "BR",
  en: "US",
  es: "ES",
  fr: "FR",
  it: "IT",
};

const REGION_META: Record<RegionCode, RegionMeta> = {
  BR: {
    locale: "pt-BR",
    defaultCurrency: "BRL",
    pluggyLanguage: "pt",
    label: {
      pt: "Brasil",
      en: "Brazil",
      es: "Brasil",
      fr: "Brésil",
      it: "Brasile",
    },
  },
  US: {
    locale: "en-US",
    defaultCurrency: "USD",
    pluggyLanguage: "en",
    label: {
      pt: "Estados Unidos",
      en: "United States",
      es: "Estados Unidos",
      fr: "États-Unis",
      it: "Stati Uniti",
    },
  },
  ES: {
    locale: "es-ES",
    defaultCurrency: "EUR",
    pluggyLanguage: "es",
    label: {
      pt: "Espanha",
      en: "Spain",
      es: "España",
      fr: "Espagne",
      it: "Spagna",
    },
  },
  FR: {
    locale: "fr-FR",
    defaultCurrency: "EUR",
    pluggyLanguage: "en",
    label: {
      pt: "França",
      en: "France",
      es: "Francia",
      fr: "France",
      it: "Francia",
    },
  },
  IT: {
    locale: "it-IT",
    defaultCurrency: "EUR",
    pluggyLanguage: "en",
    label: {
      pt: "Itália",
      en: "Italy",
      es: "Italia",
      fr: "Italie",
      it: "Italia",
    },
  },
};

const CURRENCY_META: Record<CurrencyCode, CurrencyMeta> = {
  BRL: {
    label: {
      pt: "Real brasileiro",
      en: "Brazilian real",
      es: "Real brasileño",
      fr: "Réal brésilien",
      it: "Real brasiliano",
    },
  },
  USD: {
    label: {
      pt: "Dólar americano",
      en: "US dollar",
      es: "Dólar estadounidense",
      fr: "Dollar américain",
      it: "Dollaro statunitense",
    },
  },
  EUR: {
    label: {
      pt: "Euro",
      en: "Euro",
      es: "Euro",
      fr: "Euro",
      it: "Euro",
    },
  },
};

let currentRegionPreference: RegionPreference = "auto";
let currentCurrencyPreference: CurrencyPreference = "auto";

function detectDeviceLocaleTag() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale || "";
  } catch (error) {
    console.log("Erro ao detectar locale do dispositivo:", error);
    return "";
  }
}

function resolveLocaleLanguage(language?: string | null): AppLanguage {
  return resolveAppLanguage(language ?? DEFAULT_APP_LANGUAGE);
}

function detectDeviceRegionCode(language?: string | null): RegionCode {
  const localeTag = detectDeviceLocaleTag();
  const regionToken = localeTag.split(/[-_]/)[1]?.toUpperCase();

  if (
    regionToken === "BR" ||
    regionToken === "US" ||
    regionToken === "ES" ||
    regionToken === "FR" ||
    regionToken === "IT"
  ) {
    return regionToken;
  }

  const safeLanguage = resolveLocaleLanguage(language);
  return DEFAULT_REGION_BY_LANGUAGE[safeLanguage];
}

export function resolveRegionPreference(value?: string | null): RegionPreference {
  return value === "BR" ||
    value === "US" ||
    value === "ES" ||
    value === "FR" ||
    value === "IT"
    ? value
    : "auto";
}

export function resolveCurrencyPreference(
  value?: string | null
): CurrencyPreference {
  return value === "BRL" || value === "USD" || value === "EUR" ? value : "auto";
}

export function setLocalePreferences(next?: {
  regionPreference?: RegionPreference | null;
  currencyPreference?: CurrencyPreference | null;
}) {
  currentRegionPreference = resolveRegionPreference(next?.regionPreference);
  currentCurrencyPreference = resolveCurrencyPreference(
    next?.currencyPreference
  );
}

export function getEffectiveRegionCode(
  language?: string | null,
  regionPreference?: RegionPreference | null
) {
  const safeLanguage = resolveLocaleLanguage(language);
  const safeRegion = resolveRegionPreference(
    regionPreference ?? currentRegionPreference
  );

  return safeRegion === "auto"
    ? detectDeviceRegionCode(safeLanguage)
    : safeRegion;
}

export function getEffectiveCurrencyCode(
  language?: string | null,
  regionPreference?: RegionPreference | null,
  currencyPreference?: CurrencyPreference | null
) {
  const safeCurrency = resolveCurrencyPreference(
    currencyPreference ?? currentCurrencyPreference
  );

  if (safeCurrency !== "auto") {
    return safeCurrency;
  }

  const regionCode = getEffectiveRegionCode(language, regionPreference);
  return REGION_META[regionCode].defaultCurrency;
}

export function getLocaleConfig(
  language?: string | null,
  regionPreference?: RegionPreference | null,
  currencyPreference?: CurrencyPreference | null
): LocaleConfig {
  const region = getEffectiveRegionCode(language, regionPreference);
  const regionMeta = REGION_META[region];

  return {
    locale: regionMeta.locale,
    currency: getEffectiveCurrencyCode(
      language,
      regionPreference,
      currencyPreference
    ),
    pluggyLanguage: regionMeta.pluggyLanguage,
    region,
  };
}

export function getLocaleTag(
  language?: string | null,
  regionPreference?: RegionPreference | null
) {
  return getLocaleConfig(language, regionPreference).locale;
}

export function getDefaultCurrencyForLanguage(language?: string | null) {
  return getLocaleConfig(language).currency;
}

export function getPluggyLanguage(language?: string | null) {
  return getLocaleConfig(language).pluggyLanguage;
}

export function getRegionLabel(
  region: RegionCode,
  language?: string | null
) {
  const safeLanguage = resolveLocaleLanguage(language);
  return REGION_META[region].label[safeLanguage];
}

export function getCurrencyLabel(
  currency: CurrencyCode,
  language?: string | null
) {
  const safeLanguage = resolveLocaleLanguage(language);
  return CURRENCY_META[currency].label[safeLanguage];
}

export function getRegionPreferenceOptions(language?: string | null) {
  const safeLanguage = resolveLocaleLanguage(language);

  return (Object.keys(REGION_META) as RegionCode[]).map((region) => ({
    value: region,
    label: getRegionLabel(region, safeLanguage),
    locale: REGION_META[region].locale,
    currency: REGION_META[region].defaultCurrency,
  }));
}

export function getCurrencyPreferenceOptions(language?: string | null) {
  const safeLanguage = resolveLocaleLanguage(language);

  return (Object.keys(CURRENCY_META) as CurrencyCode[]).map((currency) => ({
    value: currency,
    label: getCurrencyLabel(currency, safeLanguage),
    code: currency,
  }));
}

function parseDateInput(value: DateInput) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string") {
    const dayMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/);

    if (dayMatch) {
      const [, year, month, day] = dayMatch;
      const nextDate = new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
      );

      return Number.isNaN(nextDate.getTime()) ? null : nextDate;
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseMonthKey(value: string) {
  const monthMatch = value.match(/^(\d{4})-(\d{2})$/);

  if (!monthMatch) {
    return null;
  }

  const [, year, month] = monthMatch;
  const nextDate = new Date(Number(year), Number(month) - 1, 1);

  return Number.isNaN(nextDate.getTime()) ? null : nextDate;
}

export function formatNumberByLanguage(
  value: number,
  language?: string | null,
  options?: Intl.NumberFormatOptions
) {
  const safeValue = Number(value ?? 0);
  const locale = getLocaleTag(language);

  return new Intl.NumberFormat(locale, options).format(
    Number.isFinite(safeValue) ? safeValue : 0
  );
}

export function formatCurrencyByLanguage(
  value: number,
  language?: string | null,
  currencyCode?: string | null
) {
  const safeValue = Number(value ?? 0);
  const localeConfig = getLocaleConfig(language, undefined, currencyCode as CurrencyPreference);

  return new Intl.NumberFormat(localeConfig.locale, {
    style: "currency",
    currency: currencyCode || localeConfig.currency,
  }).format(Number.isFinite(safeValue) ? safeValue : 0);
}

export function formatMaskedCurrencyByLanguage(
  value: number,
  visible: boolean,
  language?: string | null,
  currencyCode?: string | null
) {
  if (visible) {
    return formatCurrencyByLanguage(value, language, currencyCode);
  }

  const localeConfig = getLocaleConfig(language, undefined, currencyCode as CurrencyPreference);
  const currency = currencyCode || localeConfig.currency;
  const parts = new Intl.NumberFormat(localeConfig.locale, {
    style: "currency",
    currency,
  }).formatToParts(0);
  const symbol =
    parts.find((part) => part.type === "currency")?.value || currency;

  return `${symbol} •••••`;
}

export function formatDateByLanguage(
  value: DateInput,
  language?: string | null,
  options?: Intl.DateTimeFormatOptions,
  fallback = "--"
) {
  const date = parseDateInput(value);

  if (!date) {
    return fallback;
  }

  return new Intl.DateTimeFormat(getLocaleTag(language), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...options,
  }).format(date);
}

export function formatDateTimeByLanguage(
  value: DateInput,
  language?: string | null,
  options?: Intl.DateTimeFormatOptions,
  fallback = "--"
) {
  const date = parseDateInput(value);

  if (!date) {
    return fallback;
  }

  return new Intl.DateTimeFormat(getLocaleTag(language), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  }).format(date);
}

export function formatMonthYearByLanguage(
  value: string,
  language?: string | null,
  fallback = "--"
) {
  const date = parseMonthKey(value);

  if (!date) {
    return fallback;
  }

  return new Intl.DateTimeFormat(getLocaleTag(language), {
    month: "short",
    year: "2-digit",
  })
    .format(date)
    .replace(/\./g, "");
}
