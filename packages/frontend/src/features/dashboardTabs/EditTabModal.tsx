import { type DashboardTab } from '@lightdash/common';
// SMR-START
import { Button, Checkbox, Textarea, TextInput } from '@mantine-8/core';
// SMR-END
import { useForm } from '@mantine/form';
import { IconPencil } from '@tabler/icons-react';
// SMR-START
import { type FC, useEffect, useRef } from 'react';
// SMR-END
import MantineModal from '../../components/common/MantineModal';

type EditProps = {
    opened: boolean;
    onClose: () => void;
    tab: DashboardTab;
    // SMR-START
    onConfirm: (tabName: string, tabUuid: string, smarticoEnableAiAnalysis: boolean, smarticoAiAnalysisPrompt: string) => void;
    // SMR-END
};

export const TabEditModal: FC<EditProps> = ({
    opened,
    onClose,
    tab,
    onConfirm,
}) => {
    // SMR-START
    const form = useForm<{ newTabName: string, smarticoEnableAiAnalysis: boolean, smarticoAiAnalysisPrompt: string }>({
        initialValues: {
            newTabName: tab.name,
            smarticoEnableAiAnalysis: tab.smarticoEnableAiAnalysis ?? false,
            smarticoAiAnalysisPrompt: tab.smarticoAiAnalysisPrompt ?? '',
        },
    });

    const wasOpenedRef = useRef(false);

    useEffect(() => {
        if (!opened) {
            wasOpenedRef.current = false;
            return;
        }

        if (!wasOpenedRef.current) {
            form.setValues({
                newTabName: tab.name,
                smarticoEnableAiAnalysis: tab.smarticoEnableAiAnalysis ?? false,
                smarticoAiAnalysisPrompt: tab.smarticoAiAnalysisPrompt ?? '',
            });
        }
        wasOpenedRef.current = true;

        // form.setValues is stable; omitting `form` avoids effect loops on identity change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        opened,
        tab.uuid,
        tab.name,
        tab.smarticoEnableAiAnalysis,
        tab.smarticoAiAnalysisPrompt,
    ]);

    const handleConfirm = form.onSubmit(({ newTabName, smarticoEnableAiAnalysis, smarticoAiAnalysisPrompt }) => {
        onConfirm(newTabName, tab.uuid, smarticoEnableAiAnalysis, smarticoAiAnalysisPrompt);
        form.reset();
    });

    const handleClose = () => {
        form.reset();
        onClose();
    };

    return (
        <MantineModal
            opened={opened}
            onClose={handleClose}
            title="Edit your tab"
            icon={IconPencil}
            size="sm"
            actions={
                <Button
                    type="submit"
                    form="edit-tab-form"
                    disabled={!form.isValid()}
                >
                    Update
                </Button>
            }
        >
            <form id="edit-tab-form" onSubmit={handleConfirm}>
                <TextInput
                    label="Tab name"
                    placeholder="Name your tab"
                    data-autofocus
                    required
                    {...form.getInputProps('newTabName')}
                />
                // SMR-START
                <br/>
                <Checkbox
                    label="Enable AI analysis"
                    placeholder="Enable AI analysis for this tab"
                    {...form.getInputProps('smarticoEnableAiAnalysis', {
                        type: 'checkbox',
                    })}
                />
                <br/>
                <Textarea
                    label="AI analysis prompt"
                    placeholder="Enter a prompt for the AI analysis"
                    {...form.getInputProps('smarticoAiAnalysisPrompt')}
                />
                // SMR-END
            </form>
        </MantineModal>
    );
};
