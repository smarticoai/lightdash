/// <reference path="../../../@types/passport-openidconnect.d.ts" />
/// <reference path="../../../@types/express-session.d.ts" />
import jwt, { Secret, JwtPayload } from 'jsonwebtoken';
import { AuthorizationError } from '@lightdash/common';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import type { UserService } from '../../../services/UserService';
import { lightdashConfig } from '../../../config/lightdashConfig';


export const jwtStrategy = ({
    userService,
}: {
    userService: UserService;
}) =>
    new HeaderAPIKeyStrategy(
        { header: 'JWT', prefix: 'token ' },
        true,
        async (token, done) => {

            const x: JwtPayload = jwt.verify(token,lightdashConfig.lightdashSecret) as JwtPayload; 

            try {
                const user = await userService.loginWithPersonalAccessToken(
                    x.auth_token,
                    true
                );
                user.userAttributes = x;
                return done(null, user);
            } catch (error) {
                console.error('Error in jwtStrategy', error);
                return done(
                    new AuthorizationError(
                        'Personal access token is not recognised for jwtStrategy',
                    ),
                );
            }
        },
    );
