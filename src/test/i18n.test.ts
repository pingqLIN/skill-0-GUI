import { describe, expect, it } from 'vitest';
import en from '../locales/en.json';
import zh from '../locales/zh.json';
import zhTw from '../locales/zh-TW.json';
import i18n from '../i18n';

function flattenKeys(value: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === 'object' && !Array.isArray(child)
      ? flattenKeys(child as Record<string, unknown>, path)
      : [path];
  });
}

function mergeLocale(base: Record<string, unknown>, overrides: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.keys({ ...base, ...overrides }).map((key) => {
    const baseValue = base[key];
    const overrideValue = overrides[key];
    if (baseValue && overrideValue && typeof baseValue === 'object' && typeof overrideValue === 'object') {
      return [key, mergeLocale(baseValue as Record<string, unknown>, overrideValue as Record<string, unknown>)];
    }
    return [key, overrideValue ?? baseValue];
  }));
}

describe('locale resources', () => {
  it('keeps the resolved zh-TW fallback resource in key parity with English', () => {
    const resolvedZhTw = mergeLocale(zh as Record<string, unknown>, zhTw as Record<string, unknown>);

    expect(flattenKeys(resolvedZhTw).sort()).toEqual(flattenKeys(en as Record<string, unknown>).sort());
  });

  it('keeps Taiwan-specific overrides separate from the legacy zh resource', () => {
    expect(zhTw.app.intakeTaskChoices).toBe('選擇開始方式');
    expect(zhTw.app).not.toBe(zh.app);
  });

  it('registers a full zh-TW resource with English as its explicit fallback', () => {
    expect(i18n.getResourceBundle('zh-TW', 'translation')?.app?.intakeTaskChoices).toBe('選擇開始方式');
    expect(i18n.options.fallbackLng).toMatchObject({ 'zh-TW': ['en'] });
  });

  it('keeps the legacy zh preference on Traditional Chinese content', async () => {
    await i18n.changeLanguage('zh');
    expect(i18n.t('app.intakeTaskChoices')).toBe('選擇開始方式');
    await i18n.changeLanguage('en');
  });
});
