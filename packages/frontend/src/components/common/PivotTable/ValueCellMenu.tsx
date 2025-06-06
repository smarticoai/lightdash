import { subject } from '@casl/ability';
import {
    createDashboardFilterRuleFromField,
    hasCustomBinDimension,
    isDimension,
    isDimensionValueInvalidDate,
    type ItemsMap,
    type ResultValue,
} from '@lightdash/common';
import { Menu, Text, type MenuProps } from '@mantine/core';
import { IconArrowBarToDown, IconCopy, IconStack } from '@tabler/icons-react';
import { type FC } from 'react';
import { useLocation, useParams } from 'react-router';
import useApp from '../../../providers/App/useApp';
import useTracking from '../../../providers/Tracking/useTracking';
import { EventName } from '../../../types/Events';
import { FilterDashboardTo } from '../../DashboardFilter/FilterDashboardTo';
import { useMetricQueryDataContext } from '../../MetricQueryData/useMetricQueryDataContext';
import MantineIcon from '../MantineIcon';

type ValueCellMenuProps = {
    value?: ResultValue | null;
    onCopy: () => void;

    rowIndex?: number;
    colIndex?: number;
    item?: ItemsMap[string] | undefined;
    getUnderlyingFieldValues?: (
        colIndex: number,
        rowIndex: number,
    ) => Record<string, ResultValue>;
} & Pick<MenuProps, 'opened' | 'onOpen' | 'onClose'>;

const ValueCellMenu: FC<React.PropsWithChildren<ValueCellMenuProps>> = ({
    children,
    rowIndex,
    colIndex,
    getUnderlyingFieldValues,
    item,
    value,
    opened,
    onOpen,
    onClose,
    onCopy,
}) => {
    const { user } = useApp();
    const tracking = useTracking(true);
    const metricQueryData = useMetricQueryDataContext(true);

    // FIXME: get rid of this from here
    const { projectUuid } = useParams<{ projectUuid: string }>();
    const location = useLocation();
    const isDashboardPage = location.pathname.includes('/dashboards');

    if (!value || !tracking || !metricQueryData) {
        return <>{children}</>;
    }

    const { openUnderlyingDataModal, openDrillDownModal, metricQuery } =
        metricQueryData;
    const { track } = tracking;

    const hasUnderlyingData = getUnderlyingFieldValues && item;
    const hasDrillInto = getUnderlyingFieldValues && item;

    const canViewUnderlyingData =
        hasUnderlyingData &&
        user.data?.ability?.can(
            'view',
            subject('UnderlyingData', {
                organizationUuid: user.data?.organizationUuid,
                projectUuid: projectUuid,
            }),
        );

    const canViewDrillInto =
        hasDrillInto &&
        user.data?.ability?.can(
            'manage',
            subject('Explore', {
                organizationUuid: user.data?.organizationUuid,
                projectUuid: projectUuid,
            }),
        );

    const handleOpenUnderlyingDataModal = () => {
        if (
            !getUnderlyingFieldValues ||
            !item ||
            rowIndex === undefined ||
            colIndex === undefined
        ) {
            return;
        }

        const underlyingFieldValues = getUnderlyingFieldValues(
            rowIndex,
            colIndex,
        );

        openUnderlyingDataModal({
            item,
            value,
            fieldValues: underlyingFieldValues,
        });

        track({
            name: EventName.VIEW_UNDERLYING_DATA_CLICKED,
            properties: {
                organizationId: user?.data?.organizationUuid,
                userId: user?.data?.userUuid,
                projectId: projectUuid,
            },
        });
    };

    const handleOpenDrillIntoModal = () => {
        if (
            !getUnderlyingFieldValues ||
            !item ||
            rowIndex === undefined ||
            colIndex === undefined
        ) {
            return;
        }

        const underlyingFieldValues = getUnderlyingFieldValues(
            rowIndex,
            colIndex,
        );

        openDrillDownModal({
            item,
            fieldValues: underlyingFieldValues,
        });

        track({
            name: EventName.DRILL_BY_CLICKED,
            properties: {
                organizationId: user.data?.organizationUuid,
                userId: user.data?.userUuid,
                projectId: projectUuid,
            },
        });
    };

    const filterValue =
        value.raw === undefined ||
        (isDimension(item) && isDimensionValueInvalidDate(item, value))
            ? null // Set as null if value is invalid date or undefined
            : value.raw;

    const filters =
        isDashboardPage && isDimension(item) && !item.hidden
            ? [
                  createDashboardFilterRuleFromField({
                      field: item,
                      availableTileFilters: {},
                      isTemporary: true,
                      value: filterValue,
                  }),
              ]
            : [];

    return (
        <Menu
            opened={opened}
            onOpen={onOpen}
            onClose={onClose}
            withinPortal
            closeOnItemClick
            closeOnEscape
            shadow="md"
            radius={0}
            position="bottom-end"
            offset={{
                mainAxis: 0,
                crossAxis: 0,
            }}
        >
            <Menu.Target>{children}</Menu.Target>

            <Menu.Dropdown>
                <Menu.Item
                    icon={
                        <MantineIcon
                            icon={IconCopy}
                            size="md"
                            fillOpacity={0}
                        />
                    }
                    onClick={onCopy}
                >
                    Copy value
                </Menu.Item>

                {item &&
                (canViewUnderlyingData || canViewDrillInto) &&
                !hasCustomBinDimension(metricQuery) ? (
                    <>
                        {canViewUnderlyingData ? (
                            <Menu.Item
                                icon={
                                    <MantineIcon
                                        icon={IconStack}
                                        size="md"
                                        fillOpacity={0}
                                    />
                                }
                                onClick={handleOpenUnderlyingDataModal}
                            >
                                View underlying data
                            </Menu.Item>
                        ) : null}

                        {canViewDrillInto ? (
                            <Menu.Item
                                icon={
                                    <MantineIcon
                                        icon={IconArrowBarToDown}
                                        size="md"
                                        fillOpacity={0}
                                    />
                                }
                                onClick={handleOpenDrillIntoModal}
                            >
                                Drill into{' '}
                                <Text span fw={500}>
                                    {value.formatted}
                                </Text>
                            </Menu.Item>
                        ) : null}
                    </>
                ) : null}
                {isDashboardPage && filters.length > 0 && (
                    <FilterDashboardTo filters={filters} />
                )}
            </Menu.Dropdown>
        </Menu>
    );
};

export default ValueCellMenu;
