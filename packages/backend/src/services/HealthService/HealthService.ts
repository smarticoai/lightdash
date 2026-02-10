import {
    HealthState,
    LightdashInstallType,
    LightdashMode,
    SessionUser,
    UnexpectedDatabaseError,
} from '@lightdash/common';
import { createHmac } from 'crypto';
import { getDockerHubVersion } from '../../clients/DockerHub/DockerHub';
import { LightdashConfig } from '../../config/parseConfig';
import { MigrationModel } from '../../models/MigrationModel/MigrationModel';
import { OrganizationModel } from '../../models/OrganizationModel';
import { VERSION } from '../../version';
import { BaseService } from '../BaseService';

// SMR-START
const HEALTH_CACHE_TTL_MS = 180_000;
// SMR-END

type HealthServiceArguments = {
    lightdashConfig: LightdashConfig;
    organizationModel: OrganizationModel;
    migrationModel: MigrationModel;
};

// SMR-START
type HealthCache = {
    state: HealthState;
    timestamp: number;
    isAuthenticated: boolean;
};
// SMR-END

export class HealthService extends BaseService {
    private readonly lightdashConfig: LightdashConfig;

    private readonly organizationModel: OrganizationModel;

    private readonly migrationModel: MigrationModel;

    // SMR-START
    private healthCache: HealthCache | undefined;
    // SMR-END

    constructor({
        organizationModel,
        migrationModel,
        lightdashConfig,
    }: HealthServiceArguments) {
        super();
        this.lightdashConfig = lightdashConfig;
        this.organizationModel = organizationModel;
        this.migrationModel = migrationModel;
    }

    private isEnterpriseEnabled(): boolean {
        return this.lightdashConfig.license.licenseKey !== undefined;
    }

    async getHealthState(user: SessionUser | undefined): Promise<HealthState> {
        const isAuthenticated: boolean = !!user?.userUuid;

        // SMR-START
        if (
            this.healthCache &&
            this.healthCache.isAuthenticated === isAuthenticated &&
            Date.now() - this.healthCache.timestamp < HEALTH_CACHE_TTL_MS
        ) {
            this.logger.info('Health check served from cache');
            return {
                ...this.healthCache.state,
                pylon: {
                    appId: this.lightdashConfig.pylon.appId,
                    verificationHash: this.getPylonVerificationHash(
                        user?.email,
                    ),
                },
            };
        }
        // SMR-END

        const startTime = performance.now();

        // SMR-START
        const [migrationResult, hasOrgs] = await Promise.all([
            this.migrationModel.getMigrationStatus(),
            this.organizationModel.hasOrgs(),
        ]);
        // SMR-END

        const { status: migrationStatus, currentVersion } = migrationResult;
        const dbExecutionTime = performance.now() - startTime;

        if (migrationStatus < 0) {
            throw new UnexpectedDatabaseError(
                'Database has not been migrated yet',
                { currentVersion },
            );
        } else if (migrationStatus > 0) {
            console.warn(
                `There are more DB migrations than defined in the code (you are running old code against a newer DB). Current version: ${currentVersion}`,
            );
        }

        // SMR-START
        const requiresOrgRegistration = !hasOrgs;
        // SMR-END

        const localDbtEnabled =
            process.env.LIGHTDASH_INSTALL_TYPE !==
                LightdashInstallType.HEROKU &&
            this.lightdashConfig.mode !== LightdashMode.CLOUD_BETA;

        const dockerHubVersion = getDockerHubVersion();

        // SMR-START
        this.logger.info(
            `Health check execution times: DB queries (parallel) ${dbExecutionTime.toFixed(
                2,
            )}ms`,
        );
        // SMR-END

        // SMR-START
        const state: HealthState = {
            healthy: true,
            mode: this.lightdashConfig.mode,
            version: VERSION,
            localDbtEnabled,
            defaultProject: undefined,
            isAuthenticated,
            requiresOrgRegistration,
            latest: { version: dockerHubVersion },
            rudder: this.lightdashConfig.rudder,
            sentry: {
                frontend: this.lightdashConfig.sentry.frontend,
                environment: this.lightdashConfig.sentry.environment,
                release: this.lightdashConfig.sentry.release,
                tracesSampleRate: this.lightdashConfig.sentry.tracesSampleRate,
                profilesSampleRate:
                    this.lightdashConfig.sentry.profilesSampleRate,
            },
            intercom: this.lightdashConfig.intercom,
            pylon: {
                appId: this.lightdashConfig.pylon.appId,
                verificationHash: this.getPylonVerificationHash(user?.email),
            },
            headway: {
                enabled: this.lightdashConfig.headway.enabled,
            },
            siteUrl: this.lightdashConfig.siteUrl,
            staticIp: this.lightdashConfig.staticIp,
            signupUrl: this.lightdashConfig.signupUrl,
            helpMenuUrl: this.lightdashConfig.helpMenuUrl,
            posthog: this.lightdashConfig.posthog,
            query: {
                csvCellsLimit: this.lightdashConfig.query.csvCellsLimit,
                maxLimit: this.lightdashConfig.query.maxLimit,
                maxPageSize: this.lightdashConfig.query.maxPageSize,
                defaultLimit: this.lightdashConfig.query.defaultLimit,
            },
            dashboard: this.lightdashConfig.dashboard,
            pivotTable: this.lightdashConfig.pivotTable,
            hasSlack: this.hasSlackConfig(),
            hasGithub: process.env.GITHUB_PRIVATE_KEY !== undefined,
            hasGitlab:
                this.lightdashConfig.gitlab.clientId !== undefined &&
                this.lightdashConfig.gitlab.clientSecret !== undefined,
            auth: {
                disablePasswordAuthentication:
                    this.lightdashConfig.auth.disablePasswordAuthentication,
                google: {
                    loginPath: this.lightdashConfig.auth.google.loginPath,
                    oauth2ClientId:
                        this.lightdashConfig.auth.google.oauth2ClientId,
                    googleDriveApiKey:
                        this.lightdashConfig.auth.google.googleDriveApiKey,
                    enabled: this.isGoogleSSOEnabled(),
                    enableGCloudADC:
                        this.lightdashConfig.auth.google.enableGCloudADC,
                },
                okta: {
                    loginPath: this.lightdashConfig.auth.okta.loginPath,
                    enabled: !!this.lightdashConfig.auth.okta.oauth2ClientId,
                },
                oneLogin: {
                    loginPath: this.lightdashConfig.auth.oneLogin.loginPath,
                    enabled:
                        !!this.lightdashConfig.auth.oneLogin.oauth2ClientId,
                },
                azuread: {
                    loginPath: this.lightdashConfig.auth.azuread.loginPath,
                    enabled: !!this.lightdashConfig.auth.azuread.oauth2ClientId,
                },
                oidc: {
                    loginPath: this.lightdashConfig.auth.oidc.loginPath,
                    enabled: !!this.lightdashConfig.auth.oidc.clientId,
                },
                pat: {
                    maxExpirationTimeInDays:
                        this.lightdashConfig.auth.pat.maxExpirationTimeInDays,
                },
                snowflake: {
                    enabled:
                        !!this.lightdashConfig.auth.snowflake.clientId &&
                        this.isEnterpriseEnabled(),
                },
                databricks: {
                    // U2M OAuth only requires endpoints - client ID defaults to 'databricks-cli'
                    enabled:
                        !!this.lightdashConfig.auth.databricks.clientId &&
                        !!this.lightdashConfig.auth.databricks
                            .authorizationEndpoint &&
                        !!this.lightdashConfig.auth.databricks.tokenEndpoint,
                },
            },
            hasEmailClient: !!this.lightdashConfig.smtp,
            hasHeadlessBrowser:
                this.lightdashConfig.headlessBrowser?.host !== undefined,
            hasExtendedUsageAnalytics:
                this.lightdashConfig.extendedUsageAnalytics.enabled,
            hasCacheAutocompleResults:
                this.lightdashConfig.results.autocompleteEnabled,
            appearance: {
                overrideColorPalette:
                    this.lightdashConfig.appearance.overrideColorPalette,
                overrideColorPaletteName: this.lightdashConfig.appearance
                    .overrideColorPaletteName
                    ? this.lightdashConfig.appearance.overrideColorPaletteName
                    : undefined,
            },
            hasMicrosoftTeams: this.lightdashConfig.microsoftTeams.enabled,
            isServiceAccountEnabled:
                this.lightdashConfig.serviceAccount.enabled,
            isOrganizationWarehouseCredentialsEnabled:
                this.lightdashConfig.organizationWarehouseCredentials.enabled,
            isCustomRolesEnabled:
                this.isEnterpriseEnabled() &&
                this.lightdashConfig.customRoles.enabled,
            embedding: {
                enabled:
                    this.isEnterpriseEnabled() &&
                    this.lightdashConfig.embedding.enabled,
                events: this.isEnterpriseEnabled()
                    ? this.lightdashConfig.embedding.events
                    : undefined,
            },
            ai: {
                analyticsProjectUuid:
                    this.lightdashConfig.ai.analyticsProjectUuid,
                analyticsDashboardUuid:
                    this.lightdashConfig.ai.analyticsDashboardUuid,
                isAmbientAiEnabled:
                    !!this.lightdashConfig.ai.copilot.providers.anthropic
                        ?.apiKey,
            },
            echarts6: {
                enabled: this.lightdashConfig.echarts6.enabled,
            },
            funnelBuilder: {
                enabled: this.lightdashConfig.funnelBuilder.enabled,
            },
        };
        // SMR-END

        // SMR-START
        this.healthCache = {
            state,
            timestamp: Date.now(),
            isAuthenticated,
        };
        // SMR-END

        return state;
    }

    private hasSlackConfig(): boolean {
        return (
            this.lightdashConfig.slack?.clientId !== undefined &&
            this.lightdashConfig.slack.signingSecret !== undefined
        );
    }

    private isGoogleSSOEnabled(): boolean {
        return (
            this.lightdashConfig.auth.google.oauth2ClientId !== undefined &&
            this.lightdashConfig.auth.google.oauth2ClientSecret !== undefined &&
            this.lightdashConfig.auth.google.enabled
        );
    }

    private getPylonVerificationHash(email: string | undefined) {
        if (!this.lightdashConfig.pylon.identityVerificationSecret || !email) {
            return undefined;
        }

        const secretBytes = Buffer.from(
            this.lightdashConfig.pylon.identityVerificationSecret,
            'hex',
        );

        return createHmac('sha256', secretBytes).update(email).digest('hex');
    }
}
