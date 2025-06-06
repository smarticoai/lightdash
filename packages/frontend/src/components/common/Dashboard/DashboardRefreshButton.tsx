import { Button, Menu, Text, Tooltip } from '@mantine/core';
import { useInterval } from '@mantine/hooks';
import { IconChevronDown, IconRefresh } from '@tabler/icons-react';
import {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useState,
    type FC,
} from 'react';
import { useDashboardRefresh } from '../../../hooks/dashboard/useDashboardRefresh';
import useToaster from '../../../hooks/toaster/useToaster';
import useDashboardContext from '../../../providers/Dashboard/useDashboardContext';
import MantineIcon from '../MantineIcon';
import { smrIsEmbeddedMode } from '../../../utils/smarticoUtils';

const REFRESH_INTERVAL_OPTIONS = [
    {
        value: '5',
        label: '5m',
    },
    {
        value: '15',
        label: '15m',
    },
    {
        value: '30',
        label: '30m',
    },
    {
        value: '60',
        label: '1h',
    },
    {
        value: '120',
        label: '2h',
    },
    {
        value: '240',
        label: '4h',
    },
    {
        value: '480',
        label: '8h',
    }
];

if (smrIsEmbeddedMode()) {
    REFRESH_INTERVAL_OPTIONS.splice(0, REFRESH_INTERVAL_OPTIONS.length - 2)
}

type DashboardRefreshButtonProps = {
    onIntervalChange: (intervalMin?: number) => void;
};

export const DashboardRefreshButton: FC<DashboardRefreshButtonProps> = memo(
    ({ onIntervalChange }) => {
        const { showToastSuccess } = useToaster();
        const [isOpen, setIsOpen] = useState(false);
        const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(
            null,
        );
        const [refreshInterval, setRefreshInterval] = useState<
            undefined | number
        >();
        const hasInterval = useMemo(
            () => Boolean(refreshInterval),
            [refreshInterval],
        );

        const {
            isFetching,
            invalidateDashboardRelatedQueries,
            invalidateDashboardResultsQueries,
        } = useDashboardRefresh();

        const clearCacheAndFetch = useDashboardContext(
            (c) => c.clearCacheAndFetch,
        );
        const invalidateCache = useDashboardContext((c) => c.invalidateCache);

        const setIsAutoRefresh = useDashboardContext((c) => c.setIsAutoRefresh);
        const isOneAtLeastFetching = isFetching > 0;

        const invalidateAndSetRefreshTime = useCallback(async () => {
            if (invalidateCache) {
                // only invalidate results queries manually if cache is invalidated in the state
                // if it isn't, the queries will be refetched because `clearCacheAndFetch` will change `invalidateCache` to `true` which will invalidate the results queries
                await invalidateDashboardResultsQueries();
            }

            clearCacheAndFetch();
            await invalidateDashboardRelatedQueries();
            setLastRefreshTime(new Date());
        }, [
            clearCacheAndFetch,
            invalidateDashboardRelatedQueries,
            invalidateDashboardResultsQueries,
            invalidateCache,
        ]);

        const interval = useInterval(
            () => invalidateAndSetRefreshTime(),
            refreshInterval ? refreshInterval * 1000 * 60 : 0,
        );

        useEffect(() => {
            return () => {
                if (!hasInterval) return;
                onIntervalChange(undefined);
            };
        }, [hasInterval, onIntervalChange]);

        useEffect(() => {
            if (refreshInterval !== undefined) {
                interval.start();
            }
            return interval.stop;
        }, [interval, refreshInterval]);

        return (
            <Button.Group>
                <Tooltip
                    withinPortal
                    position="bottom"
                    label={
                        <Text>
                            Last refreshed at:{' '}
                            {lastRefreshTime
                                ? lastRefreshTime.toLocaleTimeString()
                                : 'Never'}
                        </Text>
                    }
                >
                    <Button
                        size="xs"
                        h={28}
                        miw="sm"
                        variant="default"
                        loading={isOneAtLeastFetching}
                        loaderPosition="center"
                        onClick={() => invalidateAndSetRefreshTime()}
                    >
                        {interval.active && refreshInterval ? (
                            <Text
                                span
                                mr="xs"
                                c={
                                    isOneAtLeastFetching
                                        ? 'transparent'
                                        : 'gray.7'
                                }
                            >
                                Every{' '}
                                {
                                    REFRESH_INTERVAL_OPTIONS.find(
                                        ({ value }) =>
                                            refreshInterval === +value,
                                    )?.label
                                }
                            </Text>
                        ) : null}
                        <MantineIcon
                            icon={IconRefresh}
                            color={
                                isOneAtLeastFetching ? 'transparent' : 'black'
                            }
                        />
                    </Button>
                </Tooltip>
                <Menu
                    withinPortal
                    withArrow
                    closeOnItemClick
                    closeOnClickOutside
                    opened={isOpen}
                    onClose={() => setIsOpen((prev) => !prev)}
                >
                    <Menu.Target>
                        <Button
                            size="xs"
                            variant="default"
                            h={28}
                            w="md"
                            disabled={isOneAtLeastFetching}
                            p={0}
                            onClick={() => setIsOpen((prev) => !prev)}
                        >
                            <MantineIcon size="sm" icon={IconChevronDown} />
                        </Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                        <Menu.Label>Auto-refresh</Menu.Label>
                        <Menu.Item
                            fz="xs"
                            onClick={() => {
                                setRefreshInterval(undefined);
                                setIsAutoRefresh(false);
                            }}
                            disabled={refreshInterval === undefined}
                            bg={
                                refreshInterval === undefined ? 'blue' : 'white'
                            }
                            sx={{
                                '&[disabled]': {
                                    color:
                                        refreshInterval === undefined
                                            ? 'white'
                                            : 'black',
                                },
                            }}
                        >
                            Off
                        </Menu.Item>
                        {REFRESH_INTERVAL_OPTIONS.map(({ value, label }) => (
                            <Menu.Item
                                fz="xs"
                                key={value}
                                onClick={() => {
                                    const valNum = +value;
                                    setRefreshInterval(valNum);
                                    onIntervalChange(valNum);
                                    setIsAutoRefresh(true);
                                    showToastSuccess({
                                        title: `Your dashboard will refresh every ${
                                            REFRESH_INTERVAL_OPTIONS.find(
                                                (option) =>
                                                    value === option.value,
                                            )?.label
                                        }`,
                                    });
                                }}
                                bg={
                                    refreshInterval === +value
                                        ? 'blue'
                                        : 'white'
                                }
                                disabled={refreshInterval === +value}
                                sx={{
                                    '&[disabled]': {
                                        color:
                                            refreshInterval === +value
                                                ? 'white'
                                                : 'black',
                                    },
                                }}
                            >
                                {label}
                            </Menu.Item>
                        ))}
                    </Menu.Dropdown>
                </Menu>
            </Button.Group>
        );
    },
);
