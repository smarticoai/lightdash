// SMR-START
import type { LightdashConfig } from '../../config/parseConfig';
import { QueryHistoryModel } from '../../models/QueryHistoryModel/QueryHistoryModel';
import type { ICacheService } from './ICacheService';
import { type CacheHitCacheResult } from './types';

type CacheServiceDependencies = {
    queryHistoryModel: QueryHistoryModel;
    lightdashConfig: LightdashConfig;
};

const DEFAULT_CACHE_EXPIRY_BUFFER_MS = 10 * 60 * 1000;

export class CacheService implements ICacheService {
    private readonly queryHistoryModel: QueryHistoryModel;

    private readonly lightdashConfig: LightdashConfig;

    constructor({
        queryHistoryModel,
        lightdashConfig,
    }: CacheServiceDependencies) {
        this.queryHistoryModel = queryHistoryModel;
        this.lightdashConfig = lightdashConfig;
    }

    get isEnabled() {
        return this.lightdashConfig.results.cacheEnabled;
    }

    async findCachedResultsFile(
        projectUuid: string,
        cacheKey: string,
    ): Promise<CacheHitCacheResult | null> {
        if (!this.isEnabled) {
            return null;
        }

        const latestMatchingQuery =
            await this.queryHistoryModel.findMostRecentByCacheKey(
                cacheKey,
                projectUuid,
            );

        const staleTimeMilliseconds =
            this.lightdashConfig.results.cacheStateTimeSeconds * 1000;

        const expiryBuffer =
            staleTimeMilliseconds > DEFAULT_CACHE_EXPIRY_BUFFER_MS * 4
                ? DEFAULT_CACHE_EXPIRY_BUFFER_MS
                : staleTimeMilliseconds / 4;

        if (
            latestMatchingQuery &&
            latestMatchingQuery.resultsFileName &&
            latestMatchingQuery.columns &&
            latestMatchingQuery.resultsCreatedAt &&
            latestMatchingQuery.resultsExpiresAt &&
            latestMatchingQuery.resultsUpdatedAt &&
            latestMatchingQuery.totalRowCount !== null &&
            latestMatchingQuery.resultsExpiresAt >
            new Date(Date.now() + expiryBuffer)
        ) {
            return {
                cacheHit: true,
                cacheKey: latestMatchingQuery.cacheKey,
                fileName: latestMatchingQuery.resultsFileName,
                createdAt: latestMatchingQuery.resultsCreatedAt,
                updatedAt: latestMatchingQuery.resultsUpdatedAt,
                expiresAt: latestMatchingQuery.resultsExpiresAt,
                totalRowCount: latestMatchingQuery.totalRowCount,
                columns: latestMatchingQuery.columns,
                originalColumns: latestMatchingQuery.originalColumns,
                pivotValuesColumns: latestMatchingQuery.pivotValuesColumns,
                pivotTotalColumnCount:
                    latestMatchingQuery.pivotTotalColumnCount,
            };
        }

        return null;
    }
}
// SMR-END
