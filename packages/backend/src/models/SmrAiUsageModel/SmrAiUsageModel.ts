// SMR-START
import { Knex } from 'knex';
import { SmrAiUsageTableName } from '../../database/entities/smrAiUsage';
import {
    OrganizationMemberUserAttributesTable,
    UserAttributesTable,
} from '../../database/entities/userAttributes';

type SmrAiUsageModelArguments = {
    database: Knex;
};

export type LogAiUsageParams = {
    labelId: number | null;
    userUuid: string | null;
    organizationUuid: string | null;
    projectUuid: string | null;
    dashboardUuid: string | null;
    dashboardTabUuid: string | null;
    modelName: string;
    promptTokens: number | null;
    completionTokens: number | null;
    totalTokens: number | null;
    costUsd: number | null;
    cacheHit: boolean;
    durationMs: number | null;
    errorMessage: string | null;
};

export class SmrAiUsageModel {
    private readonly database: Knex;

    constructor(args: SmrAiUsageModelArguments) {
        this.database = args.database;
    }

    /**
     * Smartico-specific: label_id is stored as a per-user attribute, written
     * by bo_server's APIMarketing.jwtSign via Lightdash.getUserByEmail. See
     * `bo_server/server/src/Managers/Lightdash.ts`.
     */
    async getLabelIdForUser(userId: number): Promise<number | null> {
        const row = await this.database(OrganizationMemberUserAttributesTable)
            .innerJoin(
                UserAttributesTable,
                `${OrganizationMemberUserAttributesTable}.user_attribute_uuid`,
                `${UserAttributesTable}.user_attribute_uuid`,
            )
            .where(`${OrganizationMemberUserAttributesTable}.user_id`, userId)
            .andWhere(`${UserAttributesTable}.name`, 'label_id')
            .select<{ value: string | null }[]>(
                `${OrganizationMemberUserAttributesTable}.value`,
            )
            .first();

        if (!row?.value) {
            return null;
        }
        const parsed = Number.parseInt(row.value, 10);
        return Number.isFinite(parsed) ? parsed : null;
    }

    async logUsage(params: LogAiUsageParams): Promise<void> {
        await this.database(SmrAiUsageTableName).insert({
            label_id: params.labelId,
            user_uuid: params.userUuid,
            organization_uuid: params.organizationUuid,
            project_uuid: params.projectUuid,
            dashboard_uuid: params.dashboardUuid,
            dashboard_tab_uuid: params.dashboardTabUuid,
            model_name: params.modelName,
            prompt_tokens: params.promptTokens,
            completion_tokens: params.completionTokens,
            total_tokens: params.totalTokens,
            cost_usd:
                params.costUsd === null ? null : params.costUsd.toFixed(6),
            cache_hit: params.cacheHit,
            duration_ms: params.durationMs,
            error_message: params.errorMessage,
        });
    }
}
// SMR-END
