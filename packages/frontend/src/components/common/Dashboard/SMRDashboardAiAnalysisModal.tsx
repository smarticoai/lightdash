// SMR-START
import {
    ActionIcon,
    Box,
    Center,
    Group,
    Loader,
    ScrollArea,
    Stack,
    Text,
} from '@mantine-8/core';
import { getErrorMessage } from '@lightdash/common';
import {
    IconLayoutSidebarLeftCollapse,
    IconLayoutSidebarRightCollapse,
    IconSparkles,
} from '@tabler/icons-react';
import ReactMarkdownPreview from '@uiw/react-markdown-preview';
import { useEffect, useRef, useState, type FC } from 'react';
import rehypeExternalLinks from 'rehype-external-links';
import { lightdashApiStream } from '../../../api';
import MantineModal from '../MantineModal';
import classes from './SMRDashboardAiAnalysisModal.module.css';

type Props = {
    opened: boolean;
    onClose: () => void;
    projectUuid: string | undefined;
    dashboardUuid: string | undefined;
    getActiveTabCapturePayload: () => Record<string, unknown>;
};

const DashboardAiAnalysisModal: FC<Props> = ({
    opened,
    onClose,
    projectUuid,
    dashboardUuid,
    getActiveTabCapturePayload,
}) => {
    const [analysis, setAnalysis] = useState('');
    const [streamError, setStreamError] = useState<string | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [panelSide, setPanelSide] = useState<'left' | 'right'>('right');
    const abortRef = useRef<AbortController | null>(null);
    const getPayloadRef = useRef(getActiveTabCapturePayload);
    getPayloadRef.current = getActiveTabCapturePayload;

    useEffect(() => {
        if (!opened) {
            abortRef.current?.abort();
            abortRef.current = null;
            setAnalysis('');
            setStreamError(null);
            setIsStreaming(false);
            return;
        }

        if (!projectUuid || !dashboardUuid) {
            setStreamError('Missing project or dashboard.');
            return;
        }

        let cancelled = false;
        const payload = getPayloadRef.current();
        setAnalysis('');
        setStreamError(null);
        setIsStreaming(true);

        const ac = new AbortController();
        abortRef.current = ac;

        void (async () => {
            try {
                const res = await lightdashApiStream({
                    method: 'POST',
                    url: `/projects/${projectUuid}/dashboards/${dashboardUuid}/active-tab/ai-analysis/stream`,
                    body: JSON.stringify(payload),
                    signal: ac.signal,
                });

                const reader = res.body?.getReader();
                if (!reader) {
                    throw new Error('No response body to read');
                }

                const decoder = new TextDecoder();
                let buffer = '';

                while (!cancelled) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });
                    if (!cancelled) {
                        setAnalysis(buffer);
                    }
                }
                if (!cancelled) {
                    setAnalysis(buffer);
                }
            } catch (e: unknown) {
                if (cancelled || ac.signal.aborted) return;
                const msg = getErrorMessage(e);
                setStreamError(msg);
            } finally {
                if (!cancelled) setIsStreaming(false);
            }
        })();

        return () => {
            cancelled = true;
            ac.abort();
        };
    }, [opened, projectUuid, dashboardUuid]);

    const handleClose = () => {
        abortRef.current?.abort();
        onClose();
    };

    const showCenteredLoading =
        !streamError && isStreaming && analysis.length === 0;

    return (
        <MantineModal
            opened={opened}
            onClose={handleClose}
            title="AI Analysis"
            icon={IconSparkles}
            fullScreen
            headerActions={
                <Group gap="xs">
                    <ActionIcon
                        variant={panelSide === 'left' ? 'filled' : 'default'}
                        onClick={() => setPanelSide('left')}
                        aria-label="Dock panel to the left"
                    >
                        <IconLayoutSidebarLeftCollapse size={14} />
                    </ActionIcon>
                    <ActionIcon
                        variant={panelSide === 'right' ? 'filled' : 'default'}
                        onClick={() => setPanelSide('right')}
                        aria-label="Dock panel to the right"
                    >
                        <IconLayoutSidebarRightCollapse size={14} />
                    </ActionIcon>
                </Group>
            }
            modalRootProps={{
                centered: false,
                lockScroll: false,
                trapFocus: false,
                returnFocus: false,
                classNames: {
                    inner: classes.modalInner,
                    content:
                        panelSide === 'right'
                            ? classes.modalContentRight
                            : classes.modalContentLeft,
                    overlay: classes.modalOverlay,
                },
            }}
            modalBodyProps={{
                px: 'md',
                py: 'sm',
            }}
            cancelLabel={false}
        >
            <Box className={classes.panel}>
                <Box className={classes.mainArea}>
                    {showCenteredLoading ? (
                        <Center className={classes.loadingArea}>
                            <Stack align="center" gap="xs">
                                <Loader size="sm" type="dots" />
                                <Text fz="sm" c="dimmed" ta="center">
                                    Preparing analysis...
                                </Text>
                            </Stack>
                        </Center>
                    ) : (
                        <ScrollArea className={classes.panelBody} type="scroll">
                            <Box p="xs">
                                {streamError ? (
                                    <Text c="red" fz="sm" className={classes.errorText}>
                                        {streamError}
                                    </Text>
                                ) : analysis ? (
                                    <ReactMarkdownPreview
                                        source={analysis}
                                        rehypePlugins={[
                                            [rehypeExternalLinks, { target: '_blank' }],
                                        ]}
                                        className={classes.markdown}
                                    />
                                ) : (
                                    <Text fz="sm" c="dimmed">
                                        No analysis available.
                                    </Text>
                                )}
                            </Box>
                        </ScrollArea>
                    )}
                    <Box className={classes.disclaimer}>
                        <Text fz={11} c="dimmed">
                            This analysis is generated by AI from the data
                            currently visible in this dashboard tab. It may
                            contain inaccuracies and should be reviewed before
                            making decisions.
                        </Text>
                    </Box>
                </Box>
            </Box>
        </MantineModal>
    );
};

export default DashboardAiAnalysisModal;
// SMR-END
