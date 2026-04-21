// SMR-START
import { type ApiError } from '@lightdash/common';
import { useMemo, useEffect } from 'react';
import type { DashboardTileCaptureSnapshot } from '../../providers/Dashboard/types';
import useDashboardContext from '../../providers/Dashboard/useDashboardContext';

export const useTileCaptureSnapshot = (
    tileUuid: string,
    snapshot: DashboardTileCaptureSnapshot | null,
) => {
    const updateTileCaptureSnapshot = useDashboardContext(
        (c) => c.updateTileCaptureSnapshot,
    );

    const serialized = JSON.stringify(snapshot);

    useEffect(() => {
        updateTileCaptureSnapshot(tileUuid, snapshot);
        return () => updateTileCaptureSnapshot(tileUuid, null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tileUuid, serialized, updateTileCaptureSnapshot]);
};

export const useSavedChartTileCaptureSnapshot = ({
    tileUuid,
    title,
    savedChartUuid,
    isLoading,
    error,
    readyQuery,
    resultsData,
}: {
    tileUuid: string;
    title: string;
    savedChartUuid: string | null;
    isLoading: boolean;
    error: ApiError | { error?: { message?: string } } | null;
    readyQuery: { executeQueryResponse: { metricQuery: unknown; fields: unknown; queryUuid?: string } } | undefined;
    resultsData: { rows?: unknown[]; queryUuid?: string; totalResults?: number; hasFetchedAllRows?: boolean; isFetchingRows?: boolean } | undefined;
}) => {
    const snapshot = useMemo((): DashboardTileCaptureSnapshot => {
        if (error !== null) {
            return {
                kind: 'saved_chart',
                tileUuid,
                title,
                savedChartUuid,
                status: 'error',
                errorMessage:
                    error && typeof error === 'object' && 'error' in error &&
                    error.error && typeof error.error === 'object' && 'message' in error.error
                        ? String(error.error.message)
                        : 'Error',
            };
        }

        if (isLoading || !readyQuery || !resultsData) {
            return {
                kind: 'saved_chart',
                tileUuid,
                title,
                savedChartUuid,
                status: 'loading',
            };
        }

        return {
            kind: 'saved_chart',
            tileUuid,
            title,
            savedChartUuid,
            status: 'ready',
            metricQuery: readyQuery.executeQueryResponse.metricQuery,
            fields: readyQuery.executeQueryResponse.fields,
            rows: resultsData.rows,
            queryUuid:
                resultsData.queryUuid ??
                readyQuery.executeQueryResponse.queryUuid,
            totalResults: resultsData.totalResults,
            hasFetchedAllRows: resultsData.hasFetchedAllRows,
            isFetchingRows: resultsData.isFetchingRows,
        };
    }, [error, isLoading, readyQuery, resultsData, savedChartUuid, tileUuid, title]);

    useTileCaptureSnapshot(tileUuid, snapshot);
};

export const useSqlChartTileCaptureSnapshot = ({
    tileUuid,
    title,
    savedSqlUuid,
    isChartLoading,
    chartError,
    isChartResultsLoading,
    chartResultsError,
    chartResultsData,
}: {
    tileUuid: string;
    title: string;
    savedSqlUuid: string | null | undefined;
    isChartLoading: boolean;
    chartError: Partial<ApiError> | null;
    isChartResultsLoading: boolean;
    chartResultsError: Partial<ApiError> | null;
    chartResultsData: { queryUuid?: string; originalColumns?: unknown; chartUnderlyingData?: { columns: string[]; rows: unknown[] } } | undefined;
}) => {
    const snapshot = useMemo((): DashboardTileCaptureSnapshot => {
        if (!savedSqlUuid) {
            return {
                kind: 'sql_chart',
                tileUuid,
                title,
                savedSqlUuid: null,
                status: 'error',
                errorMessage: 'SQL chart was deleted or missing.',
            };
        }

        if (chartError) {
            return {
                kind: 'sql_chart',
                tileUuid,
                title,
                savedSqlUuid,
                status: 'error',
                errorMessage: chartError?.error?.message ?? 'Error fetching chart',
            };
        }

        if (isChartLoading) {
            return { kind: 'sql_chart', tileUuid, title, savedSqlUuid, status: 'loading' };
        }

        if (chartResultsError) {
            return {
                kind: 'sql_chart',
                tileUuid,
                title,
                savedSqlUuid,
                status: 'error',
                errorMessage: chartResultsError?.error?.message ?? 'Error loading results',
            };
        }

        if (chartResultsData === undefined || isChartResultsLoading) {
            return { kind: 'sql_chart', tileUuid, title, savedSqlUuid, status: 'loading' };
        }

        return {
            kind: 'sql_chart',
            tileUuid,
            title,
            savedSqlUuid,
            status: 'ready',
            queryUuid: chartResultsData.queryUuid,
            originalColumns: chartResultsData.originalColumns,
            underlyingTable: chartResultsData.chartUnderlyingData,
        };
    }, [chartError, chartResultsData, chartResultsError, isChartLoading, isChartResultsLoading, savedSqlUuid, tileUuid, title]);

    useTileCaptureSnapshot(tileUuid, snapshot);
};
// SMR-END
