// SMR-START
import { Knex } from 'knex';

export const SmrAiUsageTableName = '_smr_ai_usage';

export type DbSmrAiUsage = {
    ai_usage_uuid: string;
    created_at: Date;

    label_id: number | null;
    input_message: string | null;
    user_uuid: string | null;
    organization_uuid: string | null;
    project_uuid: string | null;
    dashboard_uuid: string | null;
    dashboard_tab_uuid: string | null;

    model_name: string;
    prompt_tokens: number | null;
    completion_tokens: number | null;
    total_tokens: number | null;
    cost_usd: string | null;

    cache_hit: boolean;
    duration_ms: number | null;
    error_message: string | null;
};

export type DbSmrAiUsageIn = Omit<DbSmrAiUsage, 'ai_usage_uuid' | 'created_at'>;

export type SmrAiUsageTable = Knex.CompositeTableType<
    DbSmrAiUsage,
    DbSmrAiUsageIn
>;
// SMR-END
