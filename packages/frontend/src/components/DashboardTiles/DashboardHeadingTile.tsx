import { type DashboardHeadingTile as DashboardHeadingTileType } from '@lightdash/common';
import { Text } from '@mantine-8/core';
import { clsx } from '@mantine/core';
// SMR-START
import React, { useEffect, type FC } from 'react';
import useDashboardContext from '../../providers/Dashboard/useDashboardContext';
// SMR-END
import styles from './DashboardHeadingTile.module.css';
import TileBase from './TileBase/index';

export type Props = Pick<
    React.ComponentProps<typeof TileBase>,
    'tile' | 'onEdit' | 'onDelete' | 'isEditMode'
> & {
    tile: DashboardHeadingTileType;
};

const DashboardHeadingTile: FC<Props> = (props) => {
    const {
        tile: {
            properties: { text, showDivider },
            // SMR-START
            uuid,
            // SMR-END
        },
    } = props;
    // SMR-START
    const updateTileCaptureSnapshot = useDashboardContext(
        (c) => c.updateTileCaptureSnapshot,
    );

    useEffect(() => {
        updateTileCaptureSnapshot(uuid, {
            kind: 'heading',
            tileUuid: uuid,
            text,
            showDivider,
        });
        return () => updateTileCaptureSnapshot(uuid, null);
    }, [showDivider, text, updateTileCaptureSnapshot, uuid]);
    // SMR-END
    return (
        <TileBase title="" transparent {...props}>
            <Text
                size="24px"
                fw="bold"
                className={clsx(
                    styles.heading,
                    showDivider && styles.withDivider,
                )}
            >
                {text}
            </Text>
        </TileBase>
    );
};

export default DashboardHeadingTile;
