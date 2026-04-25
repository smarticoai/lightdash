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
import { BaseService } from '../BaseService';
import { DashboardService } from '../DashboardService/DashboardService';

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

    constructor({
        lightdashConfig,
        dashboardService,
        dashboardModel,
    }: {
        lightdashConfig: LightdashConfig;
        dashboardService: DashboardService;
        dashboardModel: DashboardModel;
    }) {
        super({ serviceName: 'DashboardTabAnalysisService' });
        this.lightdashConfig = lightdashConfig;
        this.dashboardService = dashboardService;
        this.dashboardModel = dashboardModel;
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

        if (cachedResponse) {
            this.logger.info('Dashboard tab analysis cache hit', {
                dashboardUuid,
                projectUuid,
                activeTabUuid: activeTab.uuid,
                cacheKeyPrefix: cacheKey.slice(0, 12),
            });
            res.write(cachedResponse);
            res.end();
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
        } catch (err) {
            this.logger.error('Gemini stream failed', {
                error: err,
                dashboardUuid,
                projectUuid,
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
