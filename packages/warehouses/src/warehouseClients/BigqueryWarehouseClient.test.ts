import { Dataset } from '@google-cloud/bigquery';
import { WarehouseTypes } from '@lightdash/common';
import { EventEmitter } from 'events';
import { Readable } from 'stream';
import {
    BigquerySqlBuilder,
    BigqueryWarehouseClient,
} from './BigqueryWarehouseClient';
import {
    createJobResponse,
    credentials,
    getTableResponse,
} from './BigqueryWarehouseClient.mock';
import {
    config,
    expectedFields,
    expectedRow,
    expectedWarehouseSchema,
} from './WarehouseClient.mock';

describe('BigqueryWarehouseClient', () => {
    it('expect query rows with mapped values', async () => {
        const warehouse = new BigqueryWarehouseClient(credentials);

        (warehouse.client.createQueryJob as jest.Mock) = jest.fn(
            () => createJobResponse,
        );

        const results = await warehouse.runQuery('fake sql');

        expect(results.fields).toEqual(expectedFields);
        expect(results.rows[0]).toEqual(expectedRow);
        expect(
            warehouse.client.createQueryJob as jest.Mock,
        ).toHaveBeenCalledTimes(1);
    });
    it('expect schema with bigquery types mapped to dimension types', async () => {
        const getTableMock = jest
            .fn()
            .mockImplementationOnce(() => getTableResponse);
        Dataset.prototype.table = getTableMock;
        const warehouse = new BigqueryWarehouseClient(credentials);
        expect(await warehouse.getCatalog(config)).toEqual(
            expectedWarehouseSchema,
        );
        expect(getTableMock).toHaveBeenCalledTimes(1);
        expect(getTableResponse.getMetadata).toHaveBeenCalledTimes(1);
    });

    // SMR-START
    describe('executeAsyncQuery extracts smrWarehouseResponseMeta', () => {
        function createMockJob(queryStats: Record<string, unknown>) {
            const emitter = new EventEmitter();
            const job = Object.assign(emitter, {
                id: 'test-job-id',
                location: 'US',
                metadata: {
                    statistics: {
                        startTime: 1000,
                        endTime: 2000,
                        query: queryStats,
                    },
                },
                getQueryResults: jest.fn(() => [
                    [],
                    undefined,
                    { totalRows: '5', schema: { fields: [] } },
                ]),
                getQueryResultsStream: jest.fn(
                    () =>
                        new Readable({
                            objectMode: true,
                            read() {
                                this.push(null);
                            },
                        }),
                ),
            });
            setTimeout(() => emitter.emit('complete'), 0);
            return job;
        }

        it('should extract all BQ query statistics', async () => {
            const warehouse = new BigqueryWarehouseClient(credentials);

            const mockJob = createMockJob({
                totalBytesBilled: '1048576',
                totalBytesProcessed: '2097152',
                cacheHit: false,
                totalSlotMs: '5000',
                timeline: [{ elapsedMs: 1234 }],
            });

            (warehouse.client.createQueryJob as jest.Mock) = jest.fn(() => [
                mockJob,
            ]);

            const result = await warehouse.executeAsyncQuery({
                sql: 'SELECT 1',
                tags: {},
            });

            expect(result.smrWarehouseResponseMeta).toEqual({
                totalBytesBilled: 1048576,
                totalBytesProcessed: 2097152,
                cacheHit: false,
                totalSlotMs: 5000,
                elapsedMs: 1234,
            });

            expect(result.queryId).toBe('test-job-id');
            expect(result.queryMetadata).toEqual({
                type: WarehouseTypes.BIGQUERY,
                jobLocation: 'US',
            });
            expect(result.totalRows).toBe(5);
            expect(result.durationMs).toBe(1000);
        });

        it('should return null when query stats are absent', async () => {
            const warehouse = new BigqueryWarehouseClient(credentials);

            const emitter = new EventEmitter();
            const mockJob = Object.assign(emitter, {
                id: 'test-job-id-2',
                location: 'EU',
                metadata: {
                    statistics: {
                        startTime: 100,
                        endTime: 200,
                    },
                },
                getQueryResults: jest.fn(() => [
                    [],
                    undefined,
                    { totalRows: '0', schema: { fields: [] } },
                ]),
                getQueryResultsStream: jest.fn(
                    () =>
                        new Readable({
                            objectMode: true,
                            read() {
                                this.push(null);
                            },
                        }),
                ),
            });
            setTimeout(() => emitter.emit('complete'), 0);

            (warehouse.client.createQueryJob as jest.Mock) = jest.fn(() => [
                mockJob,
            ]);

            const result = await warehouse.executeAsyncQuery({
                sql: 'SELECT 1',
                tags: {},
            });

            expect(result.smrWarehouseResponseMeta).toBeNull();
        });

        it('should handle cache hit with zero bytes billed', async () => {
            const warehouse = new BigqueryWarehouseClient(credentials);

            const mockJob = createMockJob({
                totalBytesBilled: '0',
                totalBytesProcessed: '524288',
                cacheHit: true,
                totalSlotMs: '0',
                timeline: [{ elapsedMs: 50 }],
            });

            (warehouse.client.createQueryJob as jest.Mock) = jest.fn(() => [
                mockJob,
            ]);

            const result = await warehouse.executeAsyncQuery({
                sql: 'SELECT 1',
                tags: {},
            });

            expect(result.smrWarehouseResponseMeta).toEqual({
                totalBytesBilled: 0,
                totalBytesProcessed: 524288,
                cacheHit: true,
                totalSlotMs: 0,
                elapsedMs: 50,
            });
        });
    });
});
// SMR-END
describe('BigquerySqlBuilder escaping', () => {
    const bigquerySqlBuilder = new BigquerySqlBuilder();

    test('Should escape backslashes and quotes in bigquery', () => {
        expect(bigquerySqlBuilder.escapeString("\\') OR (1=1) --")).toBe(
            "\\\\\\') OR (1=1) ",
        );
    });

    test('Should handle SQL injection attempts', () => {
        // Test with a typical SQL injection pattern
        const maliciousInput = "'; DROP TABLE users; --";
        const escaped = bigquerySqlBuilder.escapeString(maliciousInput);
        expect(escaped).toBe("\\'; DROP TABLE users; ");

        // Test with another common SQL injection pattern
        const anotherMaliciousInput = "' OR '1'='1";
        const anotherEscaped = bigquerySqlBuilder.escapeString(
            anotherMaliciousInput,
        );
        expect(anotherEscaped).toBe("\\' OR \\'1\\'=\\'1");
    });

    test('Should NOT remove # comments from strings', () => {
        // Test that # symbols are preserved in strings (not treated as comments)
        const stringWithHash = 'Column name with # symbol';
        const escaped = bigquerySqlBuilder.escapeString(stringWithHash);
        expect(escaped).toBe('Column name with # symbol');

        // Test that # at start of line is preserved
        const hashAtStart = '#important-tag';
        const escapedHashStart = bigquerySqlBuilder.escapeString(hashAtStart);
        expect(escapedHashStart).toBe('#important-tag');

        // Test multiple # symbols are preserved
        const multipleHashes = 'value1#value2#value3';
        const escapedMultiple = bigquerySqlBuilder.escapeString(multipleHashes);
        expect(escapedMultiple).toBe('value1#value2#value3');
    });

    test('Should still remove -- and /* */ comments', () => {
        // Test that -- comments are still removed
        const stringWithDashComment = 'test value -- this is a comment';
        const escapedDash = bigquerySqlBuilder.escapeString(
            stringWithDashComment,
        );
        expect(escapedDash).toBe('test value ');

        // Test that /* */ comments are still removed
        const stringWithBlockComment = 'test /* block comment */ value';
        const escapedBlock = bigquerySqlBuilder.escapeString(
            stringWithBlockComment,
        );
        expect(escapedBlock).toBe('test  value');
    });
});
