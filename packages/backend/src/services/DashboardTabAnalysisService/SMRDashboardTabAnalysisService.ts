// SMR-START
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import {
    MissingConfigError,
    ParameterError,
    type SessionUser,
} from '@lightdash/common';
import { streamText } from 'ai';
import crypto from 'crypto';
import type { Response } from 'express';
import type { LightdashConfig } from '../../config/parseConfig';
import type { DashboardModel } from '../../models/DashboardModel/DashboardModel';
import type { SmrAiUsageModel } from '../../models/SmrAiUsageModel/SmrAiUsageModel';
import { BaseService } from '../BaseService';
import { DashboardService } from '../DashboardService/DashboardService';

type ModelPricing = { inputPerMillion: number; outputPerMillion: number };

const MODEL_PRICING_USD: Record<string, ModelPricing> = {
    'gemini-2.5-flash': { inputPerMillion: 0.3, outputPerMillion: 2.5 },
    'gemini-2.5-flash-lite': { inputPerMillion: 0.1, outputPerMillion: 0.4 },
    'gemini-2.5-pro': { inputPerMillion: 1.25, outputPerMillion: 10.0 },
};

const computeCostUsd = (
    modelName: string,
    inputTokens: number | undefined,
    outputTokens: number | undefined,
): number | null => {
    const pricing = MODEL_PRICING_USD[modelName];
    if (!pricing) {
        return null;
    }
    if (inputTokens === undefined && outputTokens === undefined) {
        return null;
    }
    const inputCost =
        ((inputTokens ?? 0) * pricing.inputPerMillion) / 1_000_000;
    const outputCost =
        ((outputTokens ?? 0) * pricing.outputPerMillion) / 1_000_000;
    return inputCost + outputCost;
};

export class DashboardTabAnalysisService extends BaseService {
    private static readonly MAX_CACHE_ENTRIES = 100;

    private static readonly MODEL_TEMPERATURE = 0.2;

    private static readonly responseCache = new Map<string, string>();

    private static readonly VOLATILE_KEYS = new Set([
        'capturedAt',
        'queryUuid',
        'isFetchingRows',
        'hasFetchedAllRows',
    ]);

    private readonly lightdashConfig: LightdashConfig;

    private readonly dashboardService: DashboardService;

    private readonly dashboardModel: DashboardModel;

    private readonly smrAiUsageModel: SmrAiUsageModel;

    constructor({
        lightdashConfig,
        dashboardService,
        dashboardModel,
        smrAiUsageModel,
    }: {
        lightdashConfig: LightdashConfig;
        dashboardService: DashboardService;
        dashboardModel: DashboardModel;
        smrAiUsageModel: SmrAiUsageModel;
    }) {
        super({ serviceName: 'DashboardTabAnalysisService' });
        this.lightdashConfig = lightdashConfig;
        this.dashboardService = dashboardService;
        this.dashboardModel = dashboardModel;
        this.smrAiUsageModel = smrAiUsageModel;
    }

    private async recordUsage(params: {
        user: SessionUser;
        labelId: number | null;
        projectUuid: string;
        dashboardUuid: string;
        dashboardTabUuid: string | null;
        modelName: string;
        promptTokens: number | null;
        completionTokens: number | null;
        totalTokens: number | null;
        costUsd: number | null;
        cacheHit: boolean;
        durationMs: number;
        errorMessage: string | null;
    }): Promise<void> {
        try {
            await this.smrAiUsageModel.logUsage({
                labelId: params.labelId,
                userUuid: params.user.userUuid,
                organizationUuid: params.user.organizationUuid ?? null,
                projectUuid: params.projectUuid,
                dashboardUuid: params.dashboardUuid,
                dashboardTabUuid: params.dashboardTabUuid,
                modelName: params.modelName,
                promptTokens: params.promptTokens,
                completionTokens: params.completionTokens,
                totalTokens: params.totalTokens,
                costUsd: params.costUsd,
                cacheHit: params.cacheHit,
                durationMs: params.durationMs,
                errorMessage: params.errorMessage,
            });
        } catch (err) {
            this.logger.error('Failed to log dashboard tab AI usage', {
                error: err,
                dashboardUuid: params.dashboardUuid,
                projectUuid: params.projectUuid,
            });
        }
    }

    private async resolveLabelId(user: SessionUser): Promise<number | null> {
        try {
            return await this.smrAiUsageModel.getLabelIdForUser(user.userId);
        } catch (err) {
            this.logger.error('Failed to resolve label_id for AI usage', {
                error: err,
                userUuid: user.userUuid,
            });
            return null;
        }
    }

    async streamActiveTabAnalysis(
        user: SessionUser,
        projectUuid: string,
        dashboardUuid: string,
        payload: unknown,
        res: Response,
    ): Promise<void> {
        const geminiConfig =
            this.lightdashConfig.ai.geminiDashboardTabAnalysis;
        if (!geminiConfig?.apiKey) {
            throw new MissingConfigError(
                'Gemini is not configured. Set GEMINI_API_KEY.',
            );
        }

        const dashboard = await this.dashboardService.getByIdOrSlug(
            user,
            dashboardUuid,
        );
        if (dashboard.projectUuid !== projectUuid) {
            throw new ParameterError(
                'Dashboard does not belong to the specified project',
            );
        }

        if (
            typeof payload === 'object' &&
            payload !== null &&
            'projectUuid' in payload
        ) {
            const p = payload as { projectUuid?: string };
            if (p.projectUuid && p.projectUuid !== projectUuid) {
                throw new ParameterError(
                    'Payload projectUuid does not match the request path',
                );
            }
        }

        const activeTab =
            typeof payload === 'object' &&
            payload !== null &&
            'activeTab' in payload
                ? (payload as { activeTab?: { uuid?: string } }).activeTab
                : undefined;

        if (!activeTab?.uuid) {
            throw new ParameterError(
                'Payload must include activeTab.uuid to identify the tab',
            );
        }

        const tabConfig = await this.dashboardModel.getTabAiPrompt(
            dashboardUuid,
            activeTab.uuid,
        );

        if (tabConfig.enableAiAnalysis !== true) {
            throw new ParameterError(
                'AI analysis is not enabled for this tab',
            );
        }

        if (!tabConfig.aiAnalysisPrompt) {
            throw new ParameterError(
                'No AI analysis prompt configured for this tab',
            );
        }

        const normalizedPayloadForCache =
            DashboardTabAnalysisService.normalizePayloadForCache(payload);
        const userMessage = JSON.stringify(normalizedPayloadForCache, null, 2);
        const systemPrompt = `${tabConfig.aiAnalysisPrompt}

Use markdown formatting where it improves readability. Apply bold, italic, and underline when it meaningfully emphasizes important points.`;
        const cacheKey = DashboardTabAnalysisService.getCacheKey({
            dashboardUuid,
            projectUuid,
            activeTabUuid: activeTab.uuid,
            modelName: geminiConfig.modelName,
            systemPrompt,
            userMessage,
        });
        const cachedResponse =
            DashboardTabAnalysisService.responseCache.get(cacheKey);

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('X-Accel-Buffering', 'no');

        const startedAt = Date.now();
        const labelId = await this.resolveLabelId(user);

        if (cachedResponse) {
            this.logger.info('Dashboard tab analysis cache hit', {
                dashboardUuid,
                projectUuid,
                activeTabUuid: activeTab.uuid,
                cacheKeyPrefix: cacheKey.slice(0, 12),
            });
            res.write(cachedResponse);
            res.end();
            await this.recordUsage({
                user,
                labelId,
                projectUuid,
                dashboardUuid,
                dashboardTabUuid: activeTab.uuid,
                modelName: geminiConfig.modelName,
                promptTokens: null,
                completionTokens: null,
                totalTokens: null,
                costUsd: 0,
                cacheHit: true,
                durationMs: Date.now() - startedAt,
                errorMessage: null,
            });
            return;
        }
        this.logger.info('Dashboard tab analysis cache miss', {
            dashboardUuid,
            projectUuid,
            activeTabUuid: activeTab.uuid,
            cacheKeyPrefix: cacheKey.slice(0, 12),
        });

        const googleGenAI = createGoogleGenerativeAI({
            apiKey: geminiConfig.apiKey,
        });
        const model = googleGenAI(
            geminiConfig.modelName,
        ) as unknown as Parameters<typeof streamText>[0]['model'];
        const result = streamText({
            model,
            system: systemPrompt,
            prompt: userMessage,
            temperature: DashboardTabAnalysisService.MODEL_TEMPERATURE,
        });

        try {
            let fullResponse = '';
            for await (const chunk of result.textStream) {
                fullResponse += chunk;
                res.write(chunk);
            }
            DashboardTabAnalysisService.setCachedResponse(
                cacheKey,
                fullResponse,
            );
            res.end();

            const usage = await result.usage;
            const inputTokens = usage.inputTokens ?? null;
            const outputTokens = usage.outputTokens ?? null;
            const totalTokens =
                inputTokens !== null || outputTokens !== null
                    ? (inputTokens ?? 0) + (outputTokens ?? 0)
                    : null;
            await this.recordUsage({
                user,
                labelId,
                projectUuid,
                dashboardUuid,
                dashboardTabUuid: activeTab.uuid,
                modelName: geminiConfig.modelName,
                promptTokens: inputTokens,
                completionTokens: outputTokens,
                totalTokens,
                costUsd: computeCostUsd(
                    geminiConfig.modelName,
                    usage.inputTokens,
                    usage.outputTokens,
                ),
                cacheHit: false,
                durationMs: Date.now() - startedAt,
                errorMessage: null,
            });
        } catch (err) {
            this.logger.error('Gemini stream failed', {
                error: err,
                dashboardUuid,
                projectUuid,
            });
            await this.recordUsage({
                user,
                labelId,
                projectUuid,
                dashboardUuid,
                dashboardTabUuid: activeTab.uuid,
                modelName: geminiConfig.modelName,
                promptTokens: null,
                completionTokens: null,
                totalTokens: null,
                costUsd: null,
                cacheHit: false,
                durationMs: Date.now() - startedAt,
                errorMessage:
                    err instanceof Error ? err.message : String(err),
            });
            if (!res.headersSent) {
                throw err;
            }
            res.end();
        }
    }

    private static getCacheKey({
        dashboardUuid,
        projectUuid,
        activeTabUuid,
        modelName,
        systemPrompt,
        userMessage,
    }: {
        dashboardUuid: string;
        projectUuid: string;
        activeTabUuid: string;
        modelName: string;
        systemPrompt: string;
        userMessage: string;
    }): string {
        return crypto
            .createHash('sha256')
            .update(
                JSON.stringify(
                    DashboardTabAnalysisService.sortObjectKeysDeep({
                    dashboardUuid,
                    projectUuid,
                    activeTabUuid,
                    modelName,
                    systemPrompt,
                    userMessage,
                    }),
                ),
            )
            .digest('hex');
    }

    private static setCachedResponse(
        cacheKey: string,
        fullResponse: string,
    ): void {
        DashboardTabAnalysisService.responseCache.set(cacheKey, fullResponse);
        if (
            DashboardTabAnalysisService.responseCache.size >
            DashboardTabAnalysisService.MAX_CACHE_ENTRIES
        ) {
            const oldestCacheKey =
                DashboardTabAnalysisService.responseCache.keys().next().value;
            if (oldestCacheKey) {
                DashboardTabAnalysisService.responseCache.delete(oldestCacheKey);
            }
        }
    }

    private static normalizePayloadForCache(payload: unknown): unknown {
        const withoutVolatileKeys =
            DashboardTabAnalysisService.removeVolatileKeysDeep(payload);
        return DashboardTabAnalysisService.sortObjectKeysDeep(
            withoutVolatileKeys,
        );
    }

    private static removeVolatileKeysDeep(value: unknown): unknown {
        if (Array.isArray(value)) {
            return value.map((item) =>
                DashboardTabAnalysisService.removeVolatileKeysDeep(item),
            );
        }

        if (value !== null && typeof value === 'object') {
            const obj = value as Record<string, unknown>;
            const next: Record<string, unknown> = {};
            for (const [key, nestedValue] of Object.entries(obj)) {
                if (!DashboardTabAnalysisService.VOLATILE_KEYS.has(key)) {
                    next[key] =
                        DashboardTabAnalysisService.removeVolatileKeysDeep(
                            nestedValue,
                        );
                }
            }
            return next;
        }

        return value;
    }

    private static sortObjectKeysDeep(value: unknown): unknown {
        if (Array.isArray(value)) {
            return value.map((item) =>
                DashboardTabAnalysisService.sortObjectKeysDeep(item),
            );
        }

        if (value !== null && typeof value === 'object') {
            const obj = value as Record<string, unknown>;
            const sortedKeys = Object.keys(obj).sort();
            const next: Record<string, unknown> = {};
            for (const key of sortedKeys) {
                next[key] = DashboardTabAnalysisService.sortObjectKeysDeep(
                    obj[key],
                );
            }
            return next;
        }

        return value;
    }
}
// SMR-END
