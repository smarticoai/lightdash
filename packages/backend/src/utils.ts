import {
    AnyType,
    ParameterError,
    SshKeyPair,
    validateEmail,
} from '@lightdash/common';
import { CustomSamplingContext, Scope } from '@sentry/core';
import * as Sentry from '@sentry/node';
import { generateKeyPair } from 'crypto';
import { parseKey } from 'sshpk';
import { Worker } from 'worker_threads';
import {
    DBPinnedSpace,
    DbPinnedChart,
    DbPinnedDashboard,
    DbPinnedItem,
} from './database/entities/pinnedList';
import Logger from './logging/logger';

export const isDbPinnedChart = (data: DbPinnedItem): data is DbPinnedChart =>
    'saved_chart_uuid' in data && !!data.saved_chart_uuid;

export const isDbPinnedDashboard = (
    data: DbPinnedItem,
): data is DbPinnedDashboard =>
    'dashboard_uuid' in data && !!data.dashboard_uuid;

export const isDbPinnedSpace = (data: DbPinnedItem): data is DBPinnedSpace =>
    'space_uuid' in data && !!data.space_uuid;

export const wrapSentryTransaction = <T>(
    name: string,
    context: CustomSamplingContext,
    funct: (span: Sentry.Span) => Promise<T>,
): Promise<T> => {
    const startTime = Date.now();
    return Sentry.startSpanManual<Promise<T>>(
        {
            op: name,
            name,
            attributes: context,
        },
        async (span, end) => {
            // Logger.debug(
            //     `Starting sentry transaction ${
            //         span?.spanContext().spanId
            //     } "${name}" with context: ${JSON.stringify(context)}`,
            // );

            try {
                return await funct(span);
            } catch (error) {
                Logger.error(
                    `Error in wrapped sentry transaction ${
                        span?.spanContext().spanId
                    } "${name}": ${error}`,
                );
                Sentry.captureException(error);
                throw error;
            } finally {
                // Logger.debug(
                //     `End sentry transaction ${
                //         span?.spanContext().spanId
                //     } "${name}", took: ${Date.now() - startTime}ms`,
                // );
                end();
            }
        },
    );
};

export function wrapSentryTransactionSync<T>(
    name: string,
    context: CustomSamplingContext,
    funct: (span: Sentry.Span) => T,
): T {
    const startTime = Date.now();

    return Sentry.startSpan(
        {
            op: name,
            name,
            attributes: context,
        },
        (span) => {
            Logger.debug(
                `Starting sync sentry transaction "${name}" with context: ${JSON.stringify(
                    context,
                )}`,
            );

            try {
                const result = funct(span);
                return result;
            } catch (error) {
                Logger.error(
                    `Error in wrapped sync sentry transaction "${name}": ${error}`,
                );
                Sentry.captureException(error);
                throw error;
            } finally {
                Logger.debug(
                    `End sync sentry transaction "${name}", took: ${
                        Date.now() - startTime
                    }ms`,
                );
            }
        },
    );
}

export function runWorkerThread<T>(worker: Worker): Promise<T> {
    return new Promise((resolve, reject) => {
        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', (code) => {
            if (code !== 0) {
                Logger.error(`Worker thread stopped with exit code ${code}`);
                reject(new Error(`Worker stopped with exit code ${code}`));
            }
        });
    });
}

export const generateOpenSshKeyPair = async (): Promise<SshKeyPair> =>
    new Promise<SshKeyPair>((resolve, reject) => {
        generateKeyPair(
            'rsa',
            {
                modulusLength: 4096,
                publicKeyEncoding: {
                    type: 'pkcs1',
                    format: 'pem',
                },
                privateKeyEncoding: {
                    type: 'pkcs1',
                    format: 'pem',
                },
            },
            (err, publicKey, privateKey) => {
                if (err) {
                    reject(err);
                } else {
                    const parsedPublicKey = parseKey(publicKey, 'pem');
                    parsedPublicKey.comment = `(generated_by_lightdash_at_${new Date().toISOString()})`;
                    const openSshPublicKey = parsedPublicKey.toString('ssh');
                    resolve({
                        publicKey: openSshPublicKey,
                        privateKey,
                    });
                }
            },
        );
    });
