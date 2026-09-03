import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');

const localesDir = path.join(frontendRoot, 'src/locales');
const en = JSON.parse(readFileSync(path.join(localesDir, 'en/translation.json'), 'utf8'));
const nl = JSON.parse(readFileSync(path.join(localesDir, 'nl/translation.json'), 'utf8'));
const uk = JSON.parse(readFileSync(path.join(localesDir, 'uk/translation.json'), 'utf8'));

const i18nConfig = readFileSync(path.join(frontendRoot, 'src/lib/i18n.ts'), 'utf8');
const mainEntry = readFileSync(path.join(frontendRoot, 'src/main.tsx'), 'utf8');
const footer = readFileSync(path.join(frontendRoot, 'src/components/Footer.tsx'), 'utf8');
const appEntry = readFileSync(path.join(frontendRoot, 'src/App.tsx'), 'utf8');
const languageSwitcher = readFileSync(path.join(frontendRoot, 'src/components/LanguageSwitcher.tsx'), 'utf8');
const packageJson = JSON.parse(readFileSync(path.join(frontendRoot, 'package.json'), 'utf8'));
const apiErrorsSource = readFileSync(path.join(frontendRoot, 'src/lib/api-errors.ts'), 'utf8');
const errorCodesSource = readFileSync(
  path.join(frontendRoot, '../backend/src/lib/error-codes.ts'),
  'utf8',
);

const CYRILLIC_RE = /[Ѐ-ӿ]/;
const LATIN_LETTER_RE = /[A-Za-z]/;
const PLURAL_SUFFIX_RE = /_(zero|one|two|few|many|other)$/;
const INTERPOLATION_RE = /\{\{\s*[\w.]+\s*\}\}/g;

// Keys that are deliberately identical across every language — illustrative
// literal examples (an email format sample), not UI prose to translate.
const LOCALE_INVARIANT_KEYS = new Set(['auth.emailPlaceholder']);

// Strip {{variable}} interpolation placeholders before scanning for Latin
// letters — "count" in "{{count}} / {{max}}" is a variable name, not prose.
const stripInterpolation = (value) => value.replace(INTERPOLATION_RE, '');

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

// Recursively collect dotted key paths. Arrays (bullet lists) are treated as
// leaves here — their contents are covered by collectValues/collectArrayLengths.
const collectKeys = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([key, value]) =>
    isPlainObject(value) ? collectKeys(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );

// Recursively collect every leaf string value, descending into arrays of
// strings (plain bullet lists) and arrays of {label, text} objects alike.
const collectValues = (obj) =>
  Object.values(obj).flatMap((value) => {
    if (isPlainObject(value)) return collectValues(value);
    if (Array.isArray(value)) return value.flatMap((item) => (isPlainObject(item) ? collectValues(item) : [item]));
    return [value];
  });

// Recursively collect {path, length} for every array-valued key, so bullet
// lists (e.g. the Privacy Policy sections) can be checked for equal length
// across languages instead of just equal top-level key names.
const collectArrayLengths = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([key, value]) => {
    if (Array.isArray(value)) return [[`${prefix}${key}`, value.length]];
    if (isPlainObject(value)) return collectArrayLengths(value, `${prefix}${key}.`);
    return [];
  });

// Recursively collect every leaf as [dotted/indexed path, value], so a value
// in one language can be looked up by its exact structural position in
// another — needed because Ukrainian's extra plural forms (_few/_many) throw
// off any check that assumes languages have the same flat value count.
const collectPathValues = (obj, prefix = '') =>
  Object.entries(obj).flatMap(([key, value]) => {
    if (isPlainObject(value)) return collectPathValues(value, `${prefix}${key}.`);
    if (Array.isArray(value))
      return value.flatMap((item, index) =>
        isPlainObject(item)
          ? collectPathValues(item, `${prefix}${key}.${index}.`)
          : [[`${prefix}${key}.${index}`, item]],
      );
    return [[`${prefix}${key}`, value]];
  });

// i18next plural forms differ per language (English: one/other; Ukrainian:
// one/few/many/other) — normalize away the suffix before comparing key sets.
const normalizePluralKeys = (keys) => [...new Set(keys.map((key) => key.replace(PLURAL_SUFFIX_RE, '')))].sort();

// Top-level namespaces that are English-only on purpose right now: the
// feature is still being built by another contributor under their own
// ticket, who owns adding the nl/uk translations. Remove an entry here once
// that namespace has full nl/uk coverage — don't add to this list to silence
// a real gap in a namespace you own.
const PENDING_NAMESPACES = ['admin'];

const dropPendingNamespaces = (keys) =>
  keys.filter((key) => !PENDING_NAMESPACES.some((ns) => key === ns || key.startsWith(`${ns}.`)));

test('en, nl, and uk translation bundles expose the same key set (plural-suffix aware)', () => {
  const enKeys = dropPendingNamespaces(normalizePluralKeys(collectKeys(en)));
  const nlKeys = dropPendingNamespaces(normalizePluralKeys(collectKeys(nl)));
  const ukKeys = dropPendingNamespaces(normalizePluralKeys(collectKeys(uk)));

  assert.ok(enKeys.length > 0, 'English bundle should not be empty');
  assert.deepEqual(nlKeys, enKeys, 'Dutch bundle is missing or has extra keys vs. English');
  assert.deepEqual(ukKeys, enKeys, 'Ukrainian bundle is missing or has extra keys vs. English');
});

test('pending namespaces are only missing from nl/uk, not from English itself', () => {
  const enKeys = new Set(collectKeys(en));
  for (const ns of PENDING_NAMESPACES) {
    const hasNamespace = [...enKeys].some((key) => key === ns || key.startsWith(`${ns}.`));
    assert.ok(hasNamespace, `PENDING_NAMESPACES lists "${ns}", but it doesn't exist in en/translation.json — remove it`);
  }
});

test('Ukrainian declares all four CLDR plural forms for count-based strings', () => {
  const ukKeys = new Set(collectKeys(uk));
  for (const base of ['userSearch.showingTop', 'profile.likes']) {
    for (const form of ['one', 'few', 'many', 'other']) {
      assert.ok(ukKeys.has(`${base}_${form}`), `uk is missing ${base}_${form}`);
    }
  }
});

test('bullet-list arrays (Privacy Policy / Terms of Service) have equal length across languages', () => {
  const enLists = new Map(collectArrayLengths(en));
  const nlLists = new Map(collectArrayLengths(nl));
  const ukLists = new Map(collectArrayLengths(uk));

  assert.ok(enLists.size > 0, 'expected at least one array-valued key (bullet list) in the English bundle');

  for (const [path, length] of enLists) {
    assert.equal(nlLists.get(path), length, `nl.${path} has a different number of items than en`);
    assert.equal(ukLists.get(path), length, `uk.${path} has a different number of items than en`);
  }
});

test('translation values are non-empty strings in every language', () => {
  for (const [lang, bundle] of [['en', en], ['nl', nl], ['uk', uk]]) {
    for (const value of collectValues(bundle)) {
      assert.equal(typeof value, 'string', `${lang} bundle has a non-string leaf value`);
      assert.ok(value.trim().length > 0, `${lang} bundle has an empty translation value`);
    }
  }
});

test('Ukrainian bundle is actually translated, not left in Latin script', () => {
  const enByPath = new Map(collectPathValues(en));
  const ukByPath = new Map(collectPathValues(uk));

  for (const [path, ukValue] of ukByPath) {
    if (LOCALE_INVARIANT_KEYS.has(path)) continue;

    // Ukrainian's extra plural forms (_few/_many) have no direct English
    // counterpart at the same path — fall back to the base key's _other (or
    // _one) form to decide whether this slot is translatable prose.
    let enValue = enByPath.get(path);
    if (enValue === undefined) {
      const base = path.replace(PLURAL_SUFFIX_RE, '');
      enValue = enByPath.get(`${base}_other`) ?? enByPath.get(`${base}_one`) ?? '';
    }

    // Skip values with no translatable Latin prose (e.g. the literal
    // "404"/"500" status codes, or "{{count}} / {{max}}" which is only
    // interpolation placeholders) — nothing there needs translating.
    if (!LATIN_LETTER_RE.test(stripInterpolation(enValue))) continue;
    assert.match(ukValue, CYRILLIC_RE, `uk.${path}: expected Cyrillic text in place of "${enValue}"`);
  }
});

test('Dutch bundle is not a copy-pasted duplicate of the English source', () => {
  assert.notDeepEqual(nl, en);
});

test('i18n config falls back to English and registers en, nl, and uk', () => {
  assert.match(i18nConfig, /fallbackLng:\s*'en'/);
  assert.match(i18nConfig, /supportedLanguages\s*=\s*\[\s*'en'\s*,\s*'nl'\s*,\s*'uk'\s*\]/);
  assert.match(i18nConfig, /en:\s*\{\s*translation:\s*en\s*\}/);
  assert.match(i18nConfig, /nl:\s*\{\s*translation:\s*nl\s*\}/);
  assert.match(i18nConfig, /uk:\s*\{\s*translation:\s*uk\s*\}/);
});

test('i18n config detects the browser language and persists the choice to localStorage', () => {
  assert.match(i18nConfig, /from 'i18next-browser-languagedetector'/);
  assert.match(i18nConfig, /caches:\s*\[\s*'localStorage'\s*\]/);
  assert.match(i18nConfig, /order:\s*\[\s*'localStorage'\s*,\s*'navigator'\s*\]/);
});

test('app root wraps the router in I18nextProvider', () => {
  assert.match(mainEntry, /import \{ I18nextProvider \} from 'react-i18next'/);
  assert.match(mainEntry, /import i18n from '@\/lib\/i18n'/);

  const providerOpenIndex = mainEntry.indexOf('<I18nextProvider');
  const routerIndex = mainEntry.indexOf('<RouterProvider');
  const providerCloseIndex = mainEntry.indexOf('</I18nextProvider>');

  assert.ok(providerOpenIndex !== -1, 'I18nextProvider is not rendered');
  assert.ok(routerIndex !== -1, 'RouterProvider is not rendered');
  assert.ok(
    providerOpenIndex < routerIndex && routerIndex < providerCloseIndex,
    'RouterProvider must be nested inside I18nextProvider',
  );
});

test('Footer renders its copyright line and nav links through i18n instead of hardcoded strings', () => {
  assert.match(footer, /import \{ useTranslation \} from 'react-i18next'/);
  assert.match(footer, /t\('footer\.copyright',\s*\{\s*year:\s*currentYear\s*\}\)/);
  assert.match(footer, /t\('footer\.privacyPolicy'\)/);
  assert.match(footer, /t\('footer\.termsOfService'\)/);
  assert.match(footer, /t\('footer\.githubRepo'\)/);
  assert.doesNotMatch(
    footer,
    /All rights reserved/,
    'regression: copyright text was hardcoded again instead of going through t()',
  );
  assert.doesNotMatch(
    footer,
    />\s*Privacy Policy\s*</,
    'regression: footer nav text was hardcoded again instead of going through t()',
  );
});

test('i18n packages are declared as frontend dependencies', () => {
  const deps = packageJson.dependencies ?? {};
  for (const pkg of ['i18next', 'react-i18next', 'i18next-browser-languagedetector']) {
    assert.ok(pkg in deps, `${pkg} missing from frontend/package.json dependencies`);
  }
});

test('formatCategoryLabel routes article categories through i18n', () => {
  const source = readFileSync(path.join(frontendRoot, 'src/lib/article-display.ts'), 'utf8');
  assert.match(source, /import i18n from '@\/lib\/i18n'/);
  assert.match(source, /i18n\.t\(`common\.categories\.\$\{category\}`/);
  for (const category of ['PROGRAMMING', 'CAREER', 'STUDY_NOTES', 'PROJECTS', 'LIFE', 'OPINION']) {
    assert.ok(en.common.categories[category], `en.common.categories.${category} is missing`);
  }
});

test('Privacy Policy and Terms of Service pages read their content from i18n, not hardcoded prose', () => {
  const privacyPolicySource = readFileSync(path.join(frontendRoot, 'src/pages/PrivacyPolicy.tsx'), 'utf8');
  const termsOfServiceSource = readFileSync(path.join(frontendRoot, 'src/pages/TermsOfService.tsx'), 'utf8');

  for (const source of [privacyPolicySource, termsOfServiceSource]) {
    assert.match(source, /import \{ useTranslation \} from 'react-i18next'/);
    assert.doesNotMatch(
      source,
      /Codamium \("we"/,
      'regression: legal copy was hardcoded again instead of going through t()',
    );
  }

  assert.match(privacyPolicySource, /t\('privacyPolicy\.title'\)/);
  assert.match(termsOfServiceSource, /t\('termsOfService\.title'\)/);
});

test('LanguageSwitcher offers every supported language and calls i18n.changeLanguage', () => {
  assert.match(languageSwitcher, /import \{ useTranslation \} from 'react-i18next'/);
  assert.match(languageSwitcher, /void i18n\.changeLanguage\(language\)/);
  assert.match(languageSwitcher, /aria-label=\{t\('languageSwitcher\.label'\)\}/);

  for (const language of ['en', 'nl', 'uk']) {
    assert.match(languageSwitcher, new RegExp(`LANGUAGE_NAMES[\\s\\S]*${language}:`));
    assert.match(languageSwitcher, new RegExp(`LANGUAGE_ORDER[\\s\\S]*${language}`));
  }
});

test('App renders the language switcher in the nav on every page', () => {
  assert.match(appEntry, /import \{ LanguageSwitcher \} from '@\/components\/LanguageSwitcher'/);
  assert.match(appEntry, /<LanguageSwitcher \/>/);
});

test('changing the i18next language updates resolved translations and persists to localStorage', async () => {
  // Exercises the exact mechanism LanguageSwitcher's onChange relies on
  // (i18next-browser-languagedetector's automatic localStorage caching),
  // using a minimal in-memory localStorage instead of a full browser/DOM.
  const store = {};
  const fakeWindow = {
    localStorage: {
      getItem: (key) => (key in store ? store[key] : null),
      setItem: (key, value) => {
        store[key] = String(value);
      },
      removeItem: (key) => {
        delete store[key];
      },
    },
    navigator: { languages: ['en-US'], language: 'en-US' },
    document: {},
  };

  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  // Node 21+ defines a built-in `navigator` as a getter-only accessor
  // property, so a plain assignment throws — redefine it instead, and
  // restore the original descriptor afterwards.
  const previousNavigatorDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  globalThis.window = fakeWindow;
  Object.defineProperty(globalThis, 'navigator', {
    value: fakeWindow.navigator,
    configurable: true,
    writable: true,
  });
  globalThis.document = fakeWindow.document;

  try {
    // Import fresh CJS instances so this doesn't share state with any other
    // i18next instance created elsewhere in the process.
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    delete require.cache[require.resolve('i18next')];
    delete require.cache[require.resolve('i18next-browser-languagedetector')];
    const i18next = require('i18next');
    const LanguageDetector = require('i18next-browser-languagedetector');

    await i18next.use(LanguageDetector).init({
      resources: { en: { translation: en }, nl: { translation: nl }, uk: { translation: uk } },
      supportedLngs: ['en', 'nl', 'uk'],
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'], lookupLocalStorage: 'i18nextLng' },
    });

    assert.equal(i18next.resolvedLanguage, 'en');
    assert.equal(i18next.t('login.title'), en.login.title);

    await i18next.changeLanguage('uk');

    assert.equal(i18next.resolvedLanguage, 'uk');
    assert.equal(i18next.t('login.title'), uk.login.title);
    assert.equal(store.i18nextLng, 'uk', 'language choice was not cached to localStorage');
  } finally {
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
    if (previousNavigatorDescriptor) {
      Object.defineProperty(globalThis, 'navigator', previousNavigatorDescriptor);
    } else {
      delete globalThis.navigator;
    }
  }
});

test('every backend ErrorCode has a matching api.errors.<code> translation key in every language', () => {
  const codeMatches = [...errorCodesSource.matchAll(/^\s*[A-Z_]+:\s*'([a-z_]+)'/gm)];
  const backendCodes = codeMatches.map((match) => match[1]);

  assert.ok(backendCodes.length > 0, 'expected to find at least one ErrorCode entry in backend/src/lib/error-codes.ts');

  for (const [lang, bundle] of [['en', en], ['nl', nl], ['uk', uk]]) {
    for (const code of backendCodes) {
      assert.ok(bundle.api?.errors?.[code], `${lang}.api.errors.${code} is missing`);
    }
  }

  // Catch the reverse too: a translation key with no backing backend code
  // would be silent dead weight that nobody maintains.
  const translatedCodes = Object.keys(en.api.errors);
  for (const code of translatedCodes) {
    assert.ok(backendCodes.includes(code), `en.api.errors.${code} has no matching ErrorCode in the backend`);
  }
});

test('translateApiError prefers the backend code and falls back to the given message', () => {
  assert.match(apiErrorsSource, /export const translateApiError/);
  assert.match(apiErrorsSource, /i18n\.exists\(`api\.errors\.\$\{code\}`\)/);
  assert.match(apiErrorsSource, /i18n\.t\(`api\.errors\.\$\{code\}`\)/);
  assert.match(apiErrorsSource, /return fallbackMessage/);
});

test('frontend catch sites route API errors through translateApiError instead of raw err.message', () => {
  const filesThatMustUseIt = [
    'src/pages/Login.tsx',
    'src/pages/Register.tsx',
    'src/pages/EditProfile.tsx',
    'src/pages/Profile.tsx',
    'src/pages/Article.tsx',
    'src/components/ArticleForm.tsx',
    'src/components/user/FollowButton.tsx',
    'src/components/user/FriendButton.tsx',
    'src/components/user/UserSearchBar.tsx',
  ];

  for (const relativePath of filesThatMustUseIt) {
    const source = readFileSync(path.join(frontendRoot, relativePath), 'utf8');
    assert.match(
      source,
      /import \{ translateApiError \} from '@\/lib\/api-errors'/,
      `${relativePath} does not import translateApiError`,
    );
    assert.match(source, /translateApiError\(/, `${relativePath} imports but never calls translateApiError`);
  }
});

test('LanguageSwitcher syncs the choice to the account when authenticated', () => {
  assert.match(languageSwitcher, /import \{ updateMyProfile \} from '@\/api\/users'/);
  assert.match(languageSwitcher, /updateMyProfile\(\{ preferredLanguage: language \}\)/);
});

test('useAuth applies a logged-in user\'s preferredLanguage on login and session restore', () => {
  const useAuthSource = readFileSync(path.join(frontendRoot, 'src/hooks/useAuth.ts'), 'utf8');
  assert.match(useAuthSource, /import \{ applyPreferredLanguage \} from '@\/lib\/i18n'/);

  const applyCallCount = (useAuthSource.match(/applyPreferredLanguage\(user\.preferredLanguage\)/g) ?? []).length;
  assert.equal(applyCallCount, 2, 'expected applyPreferredLanguage to be called after both login and session restore');
});

test('applyPreferredLanguage only switches for a supported, different language', () => {
  const i18nSource = readFileSync(path.join(frontendRoot, 'src/lib/i18n.ts'), 'utf8');
  assert.match(i18nSource, /export const applyPreferredLanguage/);
  assert.match(i18nSource, /supportedLanguages\.includes\(preferredLanguage as SupportedLanguage\)/);
  assert.match(i18nSource, /i18n\.language !== preferredLanguage/);
});