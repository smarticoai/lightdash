import { Anchor } from '@mantine/core';
import { IconFolder } from '@tabler/icons-react';
import { type FC } from 'react';
import { Link } from 'react-router';
import { smrIsEmbeddedMode } from '../../../utils/smarticoUtils';
import InfoContainer from './InfoContainer';

interface Props {
    space: {
        link: string;
        name: string;
    };
    dashboard?: {
        link: string;
        name: string;
    };
}

const SpaceAndDashboardInfo: FC<Props> = ({
    space: { link, name },
    dashboard,
}) => {
    if (smrIsEmbeddedMode()) {
        return null;
    }

    return (
        <InfoContainer icon={IconFolder}>
            Space:{' '}
            <Anchor component={Link} to={link}>
                {name}
            </Anchor>
            {dashboard && (
                <>
                    /
                    <Anchor component={Link} to={dashboard.link}>
                        {dashboard.name}
                    </Anchor>
                </>
            )}
        </InfoContainer>
    );
};

export default SpaceAndDashboardInfo;
