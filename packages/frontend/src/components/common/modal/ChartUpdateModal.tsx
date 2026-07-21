import { type SavedChart } from '@lightdash/common';
import {
    Button,
    Stack,
    Textarea,
    TextInput,
    type ModalProps,
} from '@mantine-8/core';
import { useForm } from '@mantine/form';
import { IconPencil } from '@tabler/icons-react';
import { useEffect, type FC } from 'react';
import { useProjectUuid } from '../../../hooks/useProjectUuid';
import { useSavedQuery, useUpdateMutation } from '../../../hooks/useSavedQuery';
import useSearchParams from '../../../hooks/useSearchParams';
import MantineModal from '../MantineModal';

interface ChartUpdateModalProps extends Pick<ModalProps, 'opened' | 'onClose'> {
    uuid: string;
    onConfirm?: () => void;
}

type FormState = Pick<SavedChart, 'name' | 'description'> & {
    // SMR: empty string means "use the default no-results copy"
    smarticoNoResultsMessage: string;
};

const ChartUpdateModal: FC<ChartUpdateModalProps> = ({
    opened,
    onClose,
    uuid,
    onConfirm,
}) => {
    const projectUuid = useProjectUuid();
    const dashboardUuid = useSearchParams('fromDashboard');
    const { data: chart, isInitialLoading } = useSavedQuery({
        uuidOrSlug: uuid,
        projectUuid,
    });
    const { mutateAsync, isLoading: isUpdating } = useUpdateMutation(
        dashboardUuid ? dashboardUuid : undefined,
        uuid,
    );

    const form = useForm<FormState>({
        initialValues: {
            name: '',
            description: '',
            smarticoNoResultsMessage: '',
        },
    });

    const { setValues } = form;

    useEffect(() => {
        if (!chart) return;
        setValues({
            name: chart.name,
            description: chart.description,
            smarticoNoResultsMessage: chart.smarticoNoResultsMessage ?? '',
        });
    }, [chart, setValues]);

    if (isInitialLoading || !chart) {
        return null;
    }

    const handleConfirm = form.onSubmit(async (data) => {
        await mutateAsync({
            name: data.name,
            description: data.description,
            // SMR: null clears the override and restores the default copy
            smarticoNoResultsMessage:
                data.smarticoNoResultsMessage.trim() || null,
        });
        onConfirm?.();
    });

    return (
        <MantineModal
            opened={opened}
            onClose={onClose}
            title="Update Chart"
            icon={IconPencil}
            actions={
                <Button
                    disabled={!form.isValid()}
                    loading={isUpdating}
                    type="submit"
                    form="update-chart-form"
                >
                    Save
                </Button>
            }
        >
            <form
                id="update-chart-form"
                title="Update Chart"
                onSubmit={handleConfirm}
            >
                <Stack>
                    <TextInput
                        label="Chart name"
                        required
                        placeholder="eg. How many weekly active users do we have?"
                        disabled={isUpdating}
                        {...form.getInputProps('name')}
                    />

                    <Textarea
                        label="Chart description"
                        placeholder="A few words to give your team some context"
                        disabled={isUpdating}
                        autosize
                        maxRows={3}
                        {...form.getInputProps('description')}
                    />

                    {/* SMR-START: custom empty-results copy */}
                    <Textarea
                        label="Message for no results"
                        description="Shown instead of the default “No results” message when this chart returns no rows"
                        placeholder="eg. No VIPs to watch today — check back tomorrow"
                        disabled={isUpdating}
                        autosize
                        maxRows={3}
                        {...form.getInputProps('smarticoNoResultsMessage')}
                    />
                    {/* SMR-END */}
                </Stack>
            </form>
        </MantineModal>
    );
};

export default ChartUpdateModal;
