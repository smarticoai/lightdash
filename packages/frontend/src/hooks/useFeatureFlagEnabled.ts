import {
    type ApiError,
    type FeatureFlag,
    FeatureFlags,
} from '@lightdash/common';
import { useQuery } from '@tanstack/react-query';
import { useFeatureFlagEnabled as useFeatureFlagEnabledPosthog } from 'posthog-js/react';
import { lightdashApi } from '../api';

/**
 * Thin wrapper around posthog's useFeatureFlagEnabled hook that is aware
 * of our FeatureFlags enum.
 */
export const useFeatureFlagEnabled = (featureFlag: FeatureFlags) => {
    switch (featureFlag) {
        case FeatureFlags.PassthroughLogin:
            return true;
        case FeatureFlags.CustomVisualizationsEnabled:
            return true;
        case FeatureFlags.ShowDbtCloudProjectOption:
            return true;
        case FeatureFlags.UserGroupsEnabled:
            return true;
        case FeatureFlags.DashboardTabs:
            return true;
        case FeatureFlags.EnableUserTimezones:
            return true;
        case FeatureFlags.SemanticLayerEnabled:
            return true;
        case FeatureFlags.DashboardComments:
            return true;
        case 'ai-dashboard-summary' as FeatureFlags:
            return false;
        case 'scim-token-management' as FeatureFlags:
            return false;
        default:
            return false;
    }
    //useFeatureFlagEnabledPosthog(featureFlag) === true;
}

/**
 * Use our own endpoint to get the feature flag from multiple sources.
 */
export const useFeatureFlag = (featureFlagId: string) => {
    return useQuery<FeatureFlag, ApiError>(
        ['feature-flag', featureFlagId],
        () => {
            if (featureFlagId === FeatureFlags.QueryPagination) {
                return {
                    id: 'query-pagination',
                    enabled: false,
                };
            }
            return lightdashApi<FeatureFlag>({
                url: `/feature-flag/${featureFlagId}`,
                version: 'v2',
                method: 'GET',
                body: undefined,
            });
        },
        {
            retry: false,
            refetchOnMount: false,
        },
    );
};
