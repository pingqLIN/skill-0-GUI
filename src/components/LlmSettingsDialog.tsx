import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, KeyRound, RefreshCw, Save, SlidersHorizontal, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useHighlightEffect } from '../hooks/useHighlightEffect';
import type { BridgeStatus } from '../services/bridgeStatusService';
import {
  fetchLlmSettings,
  updateLlmSettings,
  type LlmSettingsResponse,
  type LlmSettingsUpdateInput,
} from '../services/llmSettingsService';

type LlmSettingsDialogProps = {
  onBridgeStatusChange: (status: BridgeStatus) => void;
  onClose: () => void;
  open: boolean;
};

type FormState = {
  apiKey: string;
  clearApiKey: boolean;
  maxInputChars: number;
  mode: 'disabled' | 'fallback' | 'force';
  model: string;
  provider: 'openai' | 'gemini' | 'anthropic';
  timeoutMs: number;
};

function buildFormState(payload: LlmSettingsResponse): FormState {
  const preferredProvider = payload.settings.provider && payload.options.providerValues.includes(payload.settings.provider)
    ? payload.settings.provider
    : payload.options.providerValues[0] || 'openai';

  return {
    apiKey: '',
    clearApiKey: false,
    maxInputChars: payload.settings.maxInputChars,
    mode: payload.settings.mode,
    model: payload.settings.model,
    provider: preferredProvider,
    timeoutMs: payload.settings.timeoutMs,
  };
}

export function LlmSettingsDialog({ onBridgeStatusChange, onClose, open }: LlmSettingsDialogProps) {
  const { t } = useTranslation();
  const [formState, setFormState] = useState<FormState | null>(null);
  const [responseState, setResponseState] = useState<LlmSettingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [highlightRecentSave, triggerHighlightRecentSave] = useHighlightEffect(6000);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const loadSettings = async () => {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const payload = await fetchLlmSettings();
        if (cancelled) {
          return;
        }

        setResponseState(payload);
        setFormState(buildFormState(payload));
        onBridgeStatusChange(payload.bridgeStatus);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : t('app.llmAdminLoadError'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      cancelled = true;
    };
  }, [onBridgeStatusChange, open]);

  const capabilitySummary = useMemo(() => {
    if (!responseState) {
      return null;
    }

    return responseState.bridgeStatus.llmFallbackAvailable
      ? [responseState.bridgeStatus.llmProvider, responseState.bridgeStatus.llmModel].filter(Boolean).join('/') || t('app.llmFallbackReady')
      : responseState.bridgeStatus.llmReason || t('app.llmFallbackDisabledHint');
  }, [responseState, t]);

  if (!open) {
    return null;
  }

  const isMutable = Boolean(responseState?.settings.mutable);

  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = await fetchLlmSettings();
      setResponseState(payload);
      setFormState(buildFormState(payload));
      onBridgeStatusChange(payload.bridgeStatus);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : t('app.llmAdminLoadError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formState) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = await updateLlmSettings({
        apiKey: formState.apiKey.trim() || undefined,
        clearApiKey: formState.clearApiKey,
        maxInputChars: formState.maxInputChars,
        mode: formState.mode,
        model: formState.model.trim(),
        provider: formState.provider,
        timeoutMs: formState.timeoutMs,
      } satisfies LlmSettingsUpdateInput);
      setResponseState(payload);
      setFormState(buildFormState(payload));
      setSuccess(t('app.llmAdminSaved'));
      onBridgeStatusChange(payload.bridgeStatus);
      triggerHighlightRecentSave();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t('app.llmAdminSaveError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 px-4 py-6 backdrop-blur-sm">
      <div className="glass-panel-strong max-h-[90vh] w-full max-w-4xl overflow-y-auto px-5 py-5 sm:px-6 sm:py-6" data-testid="llm-settings-dialog">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="editorial-kicker">{t('app.llmAdminKicker')}</p>
            <h2 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
              <SlidersHorizontal size={20} />
              {t('app.llmAdminTitle')}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground/72">{t('app.llmAdminLead')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="editorial-button-secondary px-3 py-2 text-sm font-medium text-muted-foreground"
            aria-label={t('app.close')}
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <div className="surface-panel-muted px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{t('app.llmAdminRuntimeStatus')}</div>
                <div className="mt-2 text-sm font-semibold text-foreground">
                  {responseState?.bridgeStatus.llmFallbackAvailable ? t('app.llmFallbackAvailable') : t('app.llmFallbackUnavailable')}
                </div>
              </div>
              <span className={`editorial-chip px-3 py-1 text-[11px] font-medium ${isMutable ? '' : 'opacity-80'}`}>
                <span 
                  className={`h-2 w-2 rounded-full ${
                    responseState?.settings.mode === 'force' 
                      ? 'animate-led-flash-yellow led-3d-yellow' 
                      : responseState?.settings.mode === 'fallback' 
                        ? 'led-3d-emerald' 
                        : 'led-3d-red'
                  }`} 
                />
                {isMutable ? t('app.llmAdminMutable') : t('app.llmAdminReadOnly')}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-foreground/72">{capabilitySummary}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className={`rounded-[calc(var(--radius)*1.02)] border px-3 py-3 transition-colors ${highlightRecentSave ? 'animate-border-breathe bg-background/50' : 'border-transparent bg-background/70'}`}>
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('app.llmAdminApiKey')}</div>
                <div className="mt-2 text-sm font-medium text-foreground">
                  {responseState?.settings.apiKeyConfigured ? t('app.llmAdminApiKeyConfigured') : t('app.llmAdminApiKeyMissing')}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {responseState?.settings.apiKeySource === 'runtime'
                    ? t('app.llmAdminApiKeyRuntime')
                    : responseState?.settings.apiKeySource === 'env'
                      ? t('app.llmAdminApiKeyEnv')
                      : t('app.llmAdminApiKeyNone')}
                </div>
              </div>
              <div className="rounded-[calc(var(--radius)*1.02)] border border-transparent bg-background/70 px-3 py-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t('app.llmAdminCapability')}</div>
                <div className="mt-2 text-sm font-medium text-foreground">{responseState?.bridgeStatus.llmProvider || t('app.bridgeModeUnavailable')}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {responseState?.bridgeStatus.llmSupportsJsonSchema ? t('app.llmAdminJsonSchemaReady') : t('app.llmAdminJsonSchemaUnavailable')}
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">{t('app.llmAdminRuntimeHint')}</p>
          </div>

          <div className="surface-panel px-4 py-4">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleRefresh()}
                disabled={isLoading}
                className="editorial-button-secondary px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw size={16} />
                {t('app.refresh')}
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!isMutable || isLoading || isSaving || !formState}
                className="editorial-button-primary px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={16} />
                {isSaving ? t('app.saving') : t('app.save')}
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-[calc(var(--radius)*1.02)] bg-red-500/10 px-3 py-3 text-sm text-red-900">
                <div className="flex items-center gap-2 font-medium">
                  <AlertCircle size={15} />
                  {t('app.error')}
                </div>
                <p className="mt-2 leading-6">{error}</p>
              </div>
            )}

            {success && (
              <div className="mt-4 rounded-[calc(var(--radius)*1.02)] bg-emerald-500/10 px-3 py-3 text-sm text-emerald-950">
                <p className="font-medium">{success}</p>
              </div>
            )}
          </div>
        </div>

        {isLoading || !formState || !responseState ? (
          <div className="mt-5 rounded-[calc(var(--radius)*1.02)] bg-card px-4 py-5 text-sm text-muted-foreground">
            {t('app.llmAdminLoading')}
          </div>
        ) : (
          <div className={`mt-5 grid gap-4 rounded-[calc(var(--radius)*1.02)] border px-4 py-4 transition-colors md:grid-cols-2 ${highlightRecentSave ? 'animate-border-breathe bg-background/50' : 'border-transparent'}`}>
            <label className="space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{t('app.llmAdminMode')}</span>
              <select
                value={formState.mode}
                onChange={(event) => setFormState((current) => current ? { ...current, mode: event.target.value as FormState['mode'] } : current)}
                disabled={!isMutable}
                className="editorial-input-surface w-full px-4 py-3 text-sm leading-6 outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                {responseState.options.modeValues.map((value) => (
                  <option key={value} value={value}>
                    {value === 'fallback'
                      ? t('app.llmAdminModeFallback')
                      : value === 'force'
                        ? t('app.llmAdminModeForce')
                        : t('app.llmAdminModeDisabled')}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{t('app.llmAdminProvider')}</span>
              <select
                value={formState.provider}
                onChange={(event) => {
                  const provider = event.target.value as FormState['provider'];
                  setFormState((current) => current ? {
                    ...current,
                    model: provider === 'openai' && !current.model.trim() ? 'gpt-4o-mini' : current.model,
                    provider,
                  } : current);
                }}
                disabled={!isMutable}
                className="editorial-input-surface w-full px-4 py-3 text-sm leading-6 outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                {responseState.options.providerValues.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{t('app.llmAdminModel')}</span>
              <input
                type="text"
                list="llm-admin-model-options"
                value={formState.model}
                onChange={(event) => setFormState((current) => current ? { ...current, model: event.target.value } : current)}
                disabled={!isMutable}
                placeholder="gpt-4o-mini"
                className="editorial-input-surface w-full px-4 py-3 text-sm leading-6 outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />
              <datalist id="llm-admin-model-options">
                {formState.provider === 'openai' && (
                  <>
                    <option value="gpt-5.4" />
                    <option value="gpt-5" />
                    <option value="gpt-4o" />
                    <option value="gpt-4o-mini" />
                    <option value="o3-mini" />
                    <option value="o1" />
                    <option value="o1-mini" />
                  </>
                )}
                {formState.provider === 'gemini' && (
                  <>
                    <option value="gemini-2.5-pro" />
                    <option value="gemini-2.0-flash" />
                    <option value="gemini-1.5-pro" />
                    <option value="gemini-1.5-flash" />
                  </>
                )}
                {formState.provider === 'anthropic' && (
                  <>
                    <option value="claude-3-7-sonnet-20250219" />
                    <option value="claude-3-5-sonnet-20241022" />
                    <option value="claude-3-5-haiku-20241022" />
                  </>
                )}
              </datalist>
            </label>

            <label className="space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{t('app.llmAdminTimeout')}</span>
              <input
                type="number"
                min={256}
                max={120000}
                value={formState.timeoutMs}
                onChange={(event) => setFormState((current) => current ? { ...current, timeoutMs: Number(event.target.value || 0) } : current)}
                disabled={!isMutable}
                className="editorial-input-surface w-full px-4 py-3 text-sm leading-6 outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <label className="space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{t('app.llmAdminMaxInput')}</span>
              <input
                type="number"
                min={256}
                max={48000}
                value={formState.maxInputChars}
                onChange={(event) => setFormState((current) => current ? { ...current, maxInputChars: Number(event.target.value || 0) } : current)}
                disabled={!isMutable}
                className="editorial-input-surface w-full px-4 py-3 text-sm leading-6 outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <div className="space-y-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{t('app.llmAdminApiKey')}</span>
              <div className="space-y-3 rounded-[calc(var(--radius)*1.02)] bg-card px-4 py-4">
                <label className="space-y-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <KeyRound size={15} />
                    {t('app.llmAdminApiKeyInput')}
                  </span>
                  <input
                    type="password"
                    value={formState.apiKey}
                    onChange={(event) => setFormState((current) => current ? { ...current, apiKey: event.target.value, clearApiKey: false } : current)}
                    disabled={!isMutable}
                    placeholder={t('app.llmAdminApiKeyPlaceholder')}
                    className="editorial-input-surface w-full px-4 py-3 text-sm leading-6 outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </label>
                <label className="flex items-start gap-3 text-sm leading-6 text-foreground">
                  <input
                    type="checkbox"
                    checked={formState.clearApiKey}
                    onChange={(event) => setFormState((current) => current ? { ...current, apiKey: '', clearApiKey: event.target.checked } : current)}
                    disabled={!isMutable}
                    className="mt-1"
                  />
                  <span>{t('app.llmAdminClearApiKey')}</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
