import { Box } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconFilterOff } from '@tabler/icons-react';
import { type ECElementEvent } from 'echarts';
import EChartsReact from 'echarts-for-react';
import { type EChartsReactProps, type Opts } from 'echarts-for-react/lib/types';
import { memo, useCallback, useEffect, useState, type FC } from 'react';
import useEchartsFunnelConfig, {
    type FunnelSeriesDataPoint,
} from '../../hooks/echarts/useEchartsFunnelConfig';
import { useLegendDoubleClickSelection } from '../../hooks/echarts/useLegendDoubleClickSelection';
import useApp from '../../providers/App/useApp';
import { useVisualizationContext } from '../LightdashVisualization/useVisualizationContext';
import SuboptimalState from '../common/SuboptimalState/SuboptimalState';
import FunnelChartContextMenu, {
    type FunnelChartContextMenuProps,
} from './FunnelChartContextMenu';

const EmptyChart = () => (
    <Box h="100%" w="100%" py="xl">
        <SuboptimalState
            title="No data available"
            // description="Query metrics and dimensions with results." -- SMR
            icon={IconFilterOff}
        />
    </Box>
);

const LoadingChart = () => (
    <Box h="100%" w="100%" py="xl">
        <SuboptimalState
            title="Loading chart"
            loading
            className="loading_chart"
        />
    </Box>
);

type FunnelChartProps = Omit<EChartsReactProps, 'option'> & {
    isInDashboard: boolean;
    $shouldExpand?: boolean;
    className?: string;
    'data-testid'?: string;
};

const EchartOptions: Opts = { renderer: 'svg' };

const FunnelChart: FC<FunnelChartProps> = memo((props) => {
    const { chartRef, isLoading, resultsData } = useVisualizationContext();
    const { selectedLegends, onLegendChange } = useLegendDoubleClickSelection();

    const funnelChartOptions = useEchartsFunnelConfig(
        selectedLegends,
        props.isInDashboard,
    );

    const { user } = useApp();

    const [isOpen, { open, close }] = useDisclosure();

    const [menuProps, setMenuProps] = useState<{
        position: FunnelChartContextMenuProps['menuPosition'];
        value: FunnelChartContextMenuProps['value'];
        rows: FunnelChartContextMenuProps['rows'];
    }>();

    useEffect(() => {
        // Load all the rows
        resultsData?.setFetchAll(true);
    }, [resultsData]);

    useEffect(() => {
        const listener = () => chartRef.current?.getEchartsInstance().resize();
        window.addEventListener('resize', listener);
        return () => window.removeEventListener('resize', listener);
    });

    const handleOpenContextMenu = useCallback(
        (e: ECElementEvent) => {
            const event = e.event?.event as unknown as PointerEvent;
            const data = e.data as FunnelSeriesDataPoint;

            setMenuProps({
                value: data.meta.value,
                position: {
                    left: event.clientX,
                    top: event.clientY,
                },
                rows: data.meta.rows,
            });

            open();
        },
        [open],
    );

    const handleCloseContextMenu = useCallback(() => {
        setMenuProps(undefined);
        close();
    }, [close]);

    if (isLoading) return <LoadingChart />;
    if (!funnelChartOptions) return <EmptyChart />;

    return (
        <>
            <EChartsReact
                ref={chartRef}
                data-testid={props['data-testid']}
                className={props.className}
                style={
                    props.$shouldExpand
                        ? {
                              minHeight: 'inherit',
                              height: '100%',
                              width: '100%',
                          }
                        : {
                              minHeight: 'inherit',
                              // height defaults to 300px
                              width: '100%',
                          }
                }
                opts={EchartOptions}
                option={funnelChartOptions}
                notMerge
                {...props}
                onEvents={{
                    click: handleOpenContextMenu,
                    oncontextmenu: handleOpenContextMenu,
                    legendselectchanged: onLegendChange,
                }}
            />

            {user.data && (
                <FunnelChartContextMenu
                    value={menuProps?.value}
                    menuPosition={menuProps?.position}
                    rows={menuProps?.rows}
                    opened={isOpen}
                    onClose={handleCloseContextMenu}
                />
            )}
        </>
    );
});

export default FunnelChart;
