// SMR-START
import {
    ActionIcon,
    Box,
    Center,
    Group,
    Loader,
    ScrollArea,
    Select,
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

// Languages the analysis can be generated in. The selected value is sent to the
// backend as-is and injected into the AI prompt ("respond in <language>").
const AI_ANALYSIS_LANGUAGES = [
    'Chinese (Traditional)',
    'Czech',
    'English',
    'French',
    'Japanese',
    'Portuguese (Brazil)',
    'Russian',
    'Slovak',
    'Spanish',
    'Turkish',
    'Ukrainian',
] as const;

const DEFAULT_AI_ANALYSIS_LANGUAGE = 'English';

// Persisted across dashboards/screens so the user's language sticks.
const AI_ANALYSIS_LANGUAGE_STORAGE_KEY = 'smr_ai_analysis_language';

const readStoredLanguage = (): string => {
    try {
        const stored = window.localStorage.getItem(
            AI_ANALYSIS_LANGUAGE_STORAGE_KEY,
        );
        if (
            stored &&
            (AI_ANALYSIS_LANGUAGES as readonly string[]).includes(stored)
        ) {
            return stored;
        }
    } catch {
        // localStorage may be unavailable (private mode) — fall back to default.
    }
    return DEFAULT_AI_ANALYSIS_LANGUAGE;
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
    const [language, setLanguage] = useState<string>(() => readStoredLanguage());
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
                    url: `/projects/${projectUuid}/dashboards/${dashboardUuid}/active-tab/ai-analysis/stream?language=${encodeURIComponent(
                        language,
                    )}`,
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
    }, [opened, projectUuid, dashboardUuid, language]);

    const handleClose = () => {
        abortRef.current?.abort();
        onClose();
    };

    const handleLanguageChange = (value: string | null) => {
        if (!value) return;
        setLanguage(value);
        try {
            window.localStorage.setItem(
                AI_ANALYSIS_LANGUAGE_STORAGE_KEY,
                value,
            );
        } catch {
            // localStorage may be unavailable (private mode) — ignore.
        }
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
                    <Select
                        size="xs"
                        w={180}
                        value={language}
                        onChange={handleLanguageChange}
                        data={AI_ANALYSIS_LANGUAGES.map((lang) => ({
                            value: lang,
                            label: lang,
                        }))}
                        allowDeselect={false}
                        checkIconPosition="right"
                        comboboxProps={{ withinPortal: true }}
                        aria-label="Analysis language"
                    />
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
