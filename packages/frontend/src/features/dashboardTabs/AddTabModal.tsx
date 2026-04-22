// SMR-START
import {
    Button,
    Checkbox,
    Stack,
    Textarea,
    TextInput,
    type ModalProps,
} from '@mantine-8/core';
// SMR-END
import { useForm } from '@mantine/form';
import { IconPlus } from '@tabler/icons-react';
import { type FC } from 'react';
import MantineModal from '../../components/common/MantineModal';

type AddProps = Pick<ModalProps, 'opened' | 'onClose'> & {
    // SMR-START
    onConfirm: (
        tabName: string,
        smarticoEnableAiAnalysis: boolean,
        smarticoAiAnalysisPrompt: string,
    ) => void;
    // SMR-END
};
    // SMR-START
export const AddTabModal: FC<AddProps> = ({ opened, onClose, onConfirm }) => {
    const form = useForm<{
        tabName: string;
        smarticoEnableAiAnalysis: boolean;
        smarticoAiAnalysisPrompt: string;
    }>({
        initialValues: {
            tabName: '',
            smarticoEnableAiAnalysis: false,
            smarticoAiAnalysisPrompt: '',
        },
    });

    const handleConfirm = form.onSubmit(
        ({ tabName, smarticoEnableAiAnalysis, smarticoAiAnalysisPrompt }) => {
            onConfirm(
                tabName,
                smarticoEnableAiAnalysis,
                smarticoAiAnalysisPrompt,
            );
            form.reset();
        },
    );

    const handleClose = () => {
        form.reset();
        onClose();
    };

    return (
        <MantineModal
            opened={opened}
            onClose={handleClose}
            title="Add new tab"
            icon={IconPlus}
            size="sm"
            actions={
                <Button
                    type="submit"
                    form="add-tab-form"
                    disabled={!form.isValid()}
                >
                    Add
                </Button>
            }
        >
            <form id="add-tab-form" onSubmit={handleConfirm}>
                <Stack gap="md">
                    <TextInput
                        label="Tab name"
                        placeholder="Name your tab"
                        data-autofocus
                        required
                        {...form.getInputProps('tabName')}
                    />
                    // SMR-START
                    <Checkbox
                        label="Enable AI analysis"
                        {...form.getInputProps('smarticoEnableAiAnalysis', {
                            type: 'checkbox',
                        })}
                    />
                    <Textarea
                        label="AI analysis prompt"
                        placeholder="Enter a prompt for the AI analysis"
                        {...form.getInputProps('smarticoAiAnalysisPrompt')}
                    />
                    // SMR-END
                </Stack>
            </form>
        </MantineModal>
    );
};
