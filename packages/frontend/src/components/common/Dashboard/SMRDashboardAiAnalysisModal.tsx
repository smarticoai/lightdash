// SMR-START
import {
    ActionIcon,
    Box,
    Center,
    Loader,
    ScrollArea,
    Stack,
    Text,
} from '@mantine-8/core';
import { getErrorMessage } from '@lightdash/common';
import { IconBraces, IconSparkles } from '@tabler/icons-react';
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
    const [rawJson, setRawJson] = useState('');
    const [analysis, setAnalysis] = useState('');
    const [streamError, setStreamError] = useState<string | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [showCapturedData, setShowCapturedData] = useState(false);
    const abortRef = useRef<AbortController | null>(null);
    const getPayloadRef = useRef(getActiveTabCapturePayload);
    getPayloadRef.current = getActiveTabCapturePayload;

    useEffect(() => {
        if (!opened) {
            abortRef.current?.abort();
            abortRef.current = null;
            setRawJson('');
            setAnalysis('');
            setStreamError(null);
            setIsStreaming(false);
            setShowCapturedData(false);
            return;
        }

        if (!projectUuid || !dashboardUuid) {
            setStreamError('Missing project or dashboard.');
            return;
        }

        let cancelled = false;
        const payload = getPayloadRef.current();
        setRawJson(JSON.stringify(payload, null, 2));
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
        !showCapturedData &&
        !streamError &&
        isStreaming &&
        analysis.length === 0;

    return (
        <MantineModal
            opened={opened}
            onClose={handleClose}
            title="AI Analysis"
            icon={IconSparkles}
            fullScreen
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
                            <Box p="md">
                                {showCapturedData ? (
                                    <Box className={classes.jsonPane}>
                                        <Text
                                            component="pre"
                                            fz="xs"
                                            ff="monospace"
                                            className={classes.jsonContent}
                                        >
                                            {rawJson}
                                        </Text>
                                    </Box>
                                ) : streamError ? (
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
                    <ActionIcon
                        className={classes.toggleFab}
                        variant="light"
                        color="gray"
                        onClick={() => setShowCapturedData(!showCapturedData)}
                        aria-label={
                            showCapturedData
                                ? 'Show AI analysis content'
                                : 'Show original captured content'
                        }
                    >
                        {showCapturedData ? (
                            <IconSparkles size={14} />
                        ) : (
                            <IconBraces size={14} />
                        )}
                    </ActionIcon>
                </Box>
            </Box>
        </MantineModal>
    );
};

export default DashboardAiAnalysisModal;
// SMR-END
