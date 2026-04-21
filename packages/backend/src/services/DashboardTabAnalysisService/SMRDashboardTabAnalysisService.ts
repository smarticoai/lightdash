// SMR-START
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import {
    MissingConfigError,
    ParameterError,
    type SessionUser,
} from '@lightdash/common';
import { streamText } from 'ai';
import type { Response } from 'express';
import type { LightdashConfig } from '../../config/parseConfig';
import type { DashboardModel } from '../../models/DashboardModel/DashboardModel';
import { BaseService } from '../BaseService';
import { DashboardService } from '../DashboardService/DashboardService';

export class DashboardTabAnalysisService extends BaseService {
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

        const userMessage = JSON.stringify(payload, null, 2);

        const googleGenAI = createGoogleGenerativeAI({
            apiKey: geminiConfig.apiKey,
        });

        const result = streamText({
            model: googleGenAI(geminiConfig.modelName),
            system: tabConfig.aiAnalysisPrompt,
            prompt: userMessage,
        });

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('X-Accel-Buffering', 'no');

        try {
            for await (const chunk of result.textStream) {
                res.write(chunk);
            }
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
}
// SMR-END
