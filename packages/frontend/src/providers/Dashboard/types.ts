import {
    type ApiError,
    type CacheMetadata,
    type Dashboard,
    type DashboardFilterRule,
    type DashboardFilters,
    type DashboardParameters,
    type DateGranularity,
    type FilterableDimension,
    type ParameterDefinitions,
    type ParametersValuesMap,
    type ParameterValue,
    type RawResultRow,
    type ResultColumn,
    type SortField,
} from '@lightdash/common';
import { type Dispatch, type SetStateAction } from 'react';
import {
    type useDashboardCommentsCheck,
    type useGetComments,
} from '../../features/comments';

export type SqlChartTileMetadata = {
    columns: ResultColumn[];
};
 // SMR-START
export type DashboardTileCaptureSnapshot =
    | {
          kind: 'saved_chart';
          tileUuid: string;
          title: string;
          savedChartUuid: string | null;
          status: 'loading' | 'ready' | 'error';
          metricQuery?: unknown;
          fields?: unknown;
          rows?: unknown[];
          queryUuid?: string;
          totalResults?: number;
          hasFetchedAllRows?: boolean;
          isFetchingRows?: boolean;
          errorMessage?: string;
      }
    | {
          kind: 'sql_chart';
          tileUuid: string;
          title: string;
          savedSqlUuid: string | null;
          status: 'loading' | 'ready' | 'error';
          queryUuid?: string;
          originalColumns?: unknown;
          underlyingTable?: { columns: string[]; rows: RawResultRow[] };
          errorMessage?: string;
      }
    | {
          kind: 'markdown';
          tileUuid: string;
          title: string;
          content: string;
          hideFrame?: boolean;
      }
    | {
          kind: 'heading';
          tileUuid: string;
          text: string;
          showDivider?: boolean;
      }
    | {
          kind: 'loom';
          tileUuid: string;
          title: string;
          url: string;
      };
 // SMR-END
export type DashboardContextType = {
    projectUuid?: string;
    isDashboardLoading: boolean;
    dashboard: Dashboard | undefined;
    setEmbedDashboard: Dispatch<SetStateAction<Dashboard | undefined>>;
    dashboardError: ApiError | null;
    dashboardTiles: Dashboard['tiles'] | undefined;
    setDashboardTiles: Dispatch<SetStateAction<Dashboard['tiles'] | undefined>>;
    haveTilesChanged: boolean;
    setHaveTilesChanged: Dispatch<SetStateAction<boolean>>;
    haveTabsChanged: boolean;
    setHaveTabsChanged: Dispatch<SetStateAction<boolean>>;
    dashboardTabs: Dashboard['tabs'];
    setDashboardTabs: Dispatch<SetStateAction<Dashboard['tabs']>>;
    activeTab: Dashboard['tabs'][number] | undefined;
    setActiveTab: Dispatch<
        SetStateAction<Dashboard['tabs'][number] | undefined>
    >;
    dashboardFilters: DashboardFilters;
    dashboardTemporaryFilters: DashboardFilters;
    allFilters: DashboardFilters;
    isLoadingDashboardFilters: boolean;
    isFetchingDashboardFilters: boolean;
    resetDashboardFilters: () => void;
    setDashboardFilters: Dispatch<SetStateAction<DashboardFilters>>;
    setDashboardTemporaryFilters: Dispatch<SetStateAction<DashboardFilters>>;
    addDimensionDashboardFilter: (
        filter: DashboardFilterRule,
        isTemporary: boolean,
    ) => void;
    updateDimensionDashboardFilter: (
        filter: DashboardFilterRule,
        index: number,
        isTemporary: boolean,
        isEditMode: boolean,
    ) => void;
    removeDimensionDashboardFilter: (
        index: number,
        isTemporary: boolean,
    ) => void;
    addMetricDashboardFilter: (
        filter: DashboardFilterRule,
        isTemporary: boolean,
    ) => void;
    haveFiltersChanged: boolean;
    setHaveFiltersChanged: Dispatch<SetStateAction<boolean>>;
    addResultsCacheTime: (cacheMetadata: CacheMetadata) => void;
    oldestCacheTime: Date | undefined;
    invalidateCache: boolean | undefined;
    isAutoRefresh: boolean;
    setIsAutoRefresh: (autoRefresh: boolean) => void;
    clearCacheAndFetch: () => void;
    allFilterableFieldsMap: Record<string, FilterableDimension>;
    allFilterableFields: FilterableDimension[] | undefined;
    filterableFieldsByTileUuid:
        | Record<string, FilterableDimension[]>
        | undefined;
    hasTilesThatSupportFilters: boolean;
    chartSort: Record<string, SortField[]>;
    setChartSort: (sort: Record<string, SortField[]>) => void;
    sqlChartTilesMetadata: Record<string, SqlChartTileMetadata>;
    updateSqlChartTilesMetadata: (
        tileUuid: string,
        metadata: SqlChartTileMetadata,
    ) => void;
    dateZoomGranularity: DateGranularity | undefined;
    setDateZoomGranularity: Dispatch<
        SetStateAction<DateGranularity | undefined>
    >;
    chartsWithDateZoomApplied: Set<string> | undefined;
    setChartsWithDateZoomApplied: Dispatch<
        SetStateAction<Set<string> | undefined>
    >;
    dashboardCommentsCheck?: ReturnType<typeof useDashboardCommentsCheck>;
    dashboardComments?: ReturnType<typeof useGetComments>['data'];
    hasTileComments: (tileUuid: string) => boolean;
    requiredDashboardFilters: Pick<DashboardFilterRule, 'id' | 'label'>[];
    isDateZoomDisabled: boolean;
    setIsDateZoomDisabled: Dispatch<SetStateAction<boolean>>;
    setSavedParameters: Dispatch<SetStateAction<DashboardParameters>>;
    parametersHaveChanged: boolean;
    dashboardParameters: DashboardParameters;
    parameterValues: ParametersValuesMap;
    clearAllParameters: () => void;
    setParameter: (key: string, value: ParameterValue | null) => void;
    dashboardParameterReferences: Set<string>;
    addParameterReferences: (tileUuid: string, references: string[]) => void;
    tileParameterReferences: Record<string, string[]>;
    areAllChartsLoaded: boolean;
    parameterDefinitions: ParameterDefinitions;
    addParameterDefinitions: (parameters: ParameterDefinitions) => void;
    missingRequiredParameters: string[];
    pinnedParameters: string[];
    setPinnedParameters: (parameters: string[]) => void;
    toggleParameterPin: (parameterKey: string) => void;
    havePinnedParametersChanged: boolean;
    setHavePinnedParametersChanged: Dispatch<SetStateAction<boolean>>;
    tileNamesById: Record<string, string>;
    refreshDashboardVersion: () => Promise<void>;
    isRefreshingDashboardVersion: boolean;
    markTileScreenshotReady: (tileUuid: string) => void;
    markTileScreenshotErrored: (tileUuid: string) => void;
    isReadyForScreenshot: boolean;
    screenshotReadyTilesCount: number;
    screenshotErroredTilesCount: number;
    expectedScreenshotTilesCount: number;
     // SMR-START
    updateTileCaptureSnapshot: (
        tileUuid: string,
        snapshot: DashboardTileCaptureSnapshot | null,
    ) => void;
    getActiveTabCapturePayload: () => Record<string, unknown>;
    // SMR-END
};
