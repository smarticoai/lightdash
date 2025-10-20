/**
 * Consider adding a short description of the feature flag and how it
 * will be used.
 *
 * If the feature flag is no longer in use, remove it from this enum.
 */
export enum FeatureFlags {
    /**
     * Enable passthrough login
     */
    PassthroughLogin = 'passthrough-login',


    /**/
    ShowDbtCloudProjectOption = 'show-dbt-cloud-project-option',

    
    /** Enable dashboard tabs */
    DashboardTabs = 'dashboard_tabs',


    /* Show user groups */
    UserGroupsEnabled = 'user-groups-enabled',

    /* Send local timezone to the warehouse session */
    EnableUserTimezones = 'enable-user-timezones',


    /**
     * Enable the semantic layer
     */
    SemanticLayerEnabled = 'semantic-layer-enabled',


    /**
     * Enable dashboard comments
     */
    DashboardComments = 'dashboard-comments-enabled',

    /**
     * Enable scheduler task that replaces custom metrics after project compile
     */
    ReplaceCustomMetricsOnCompile = 'replace-custom-metrics-on-compile',

    /**
     * Enable the dynamic calculation of series color, when not manually set on the chart config.
     * This aims to make the colors more consistent, depending on the groups, but this could cause the opposite effect.
     * For more details, see https://github.com/lightdash/lightdash/issues/13831
     */
    CalculateSeriesColor = 'calculate-series-color',

    /**
     * Enable the ability to write back custom bin dimensions to dbt.
     */
    WriteBackCustomBinDimensions = 'write-back-custom-bin-dimensions',

    /**
     * Enable a new API endpoint that requests results page by page.
     */
    QueryPagination = 'query-pagination',

    /**
     * Enable the ability to show the warehouse execution time and total time in the chart tile.
     */
    ShowExecutionTime = 'show-execution-time',

    /**
     * Enable the ability to create custom visualizations with AI
     */
    AiCustomViz = 'ai-custom-viz',

    BigquerySSO = 'bigquery-sso',

    /**
     * Use workers for async query execution
     */
    WorkerQueryExecution = 'worker-query-execution',

    /**
     * Enable SQL pivot results conversion to PivotData format
     */
    UseSqlPivotResults = 'use-sql-pivot-results',

    /**
     * Enable the unused content dashboard showing least viewed charts and dashboards
     */
    UnusedContentDashboard = 'unused-content-dashboard',

    /**
     * Enable Redux state management for Explorer (gradual migration from Context API)
     */
    UseRedux = 'use-redux',

    /**
     * Enable the ability to use the user attributes to replace the project id in the explore tables
     */
    UseUserAttributesToReplaceProjectId = 'use-user-attributes-to-replace-project-id',
}

export type FeatureFlag = {
    id: string;
    enabled: boolean;
};

export function isFeatureFlags(value: string): value is FeatureFlags {
    return Object.values(FeatureFlags).includes(value as FeatureFlags);
}
