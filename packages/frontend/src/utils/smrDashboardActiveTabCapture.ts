// SMR-START
import type { DashboardTab, DashboardTile } from '@lightdash/common';

export const tileBelongsToActiveTab = (
    tile: DashboardTile,
    activeTab: DashboardTab | undefined,
    dashboardTabs: DashboardTab[],
): boolean => {
    if (!dashboardTabs || dashboardTabs.length === 0) {
        return true;
    }
    if (!activeTab) {
        return true;
    }
    return !tile.tabUuid || tile.tabUuid === activeTab.uuid;
};

export const getTilesForActiveTab = (
    dashboardTiles: DashboardTile[] | undefined,
    activeTab: DashboardTab | undefined,
    dashboardTabs: DashboardTab[],
): DashboardTile[] => {
    if (!dashboardTiles) {
        return [];
    }
    return dashboardTiles.filter((tile) =>
        tileBelongsToActiveTab(tile, activeTab, dashboardTabs),
    );
};
// SMR-END
