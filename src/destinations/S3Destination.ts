import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { LogDestination, LogEntry, LogFormatter } from '../types';
import { jsonFormatter } from '../formatters';

export interface S3DestinationConfig {
    bucketName: string;
    keyPrefix?: string;
    region?: string;
    formatter?: LogFormatter;
    batchSize?: number;
    flushInterval?: number;
}

export class S3Destination implements LogDestination {
    private readonly client: S3Client;
    private readonly config: Required<S3DestinationConfig>;
    private readonly buffer: LogEntry[] = [];
    private flushTimer?: NodeJS.Timeout;

    constructor(config: S3DestinationConfig) {
        this.client = new S3Client({
            region: config.region || process.env.AWS_REGION,
        });

        this.config = {
            bucketName: config.bucketName,
            keyPrefix: config.keyPrefix || 'logs',
            region: config.region || process.env.AWS_REGION || 'us-east-1',
            formatter: config.formatter || jsonFormatter,
            batchSize: config.batchSize || 100,
            flushInterval: config.flushInterval || 60000,
        };

        this.startFlushTimer();
    }

    async write(entry: LogEntry): Promise<void> {
        this.buffer.push(entry);

        if (this.buffer.length >= this.config.batchSize) {
            await this.flush();
        }
    }

    async flush(): Promise<void> {
        if (this.buffer.length === 0) return;

        const entries = this.buffer.splice(0);
        const content = entries.map((e) => this.config.formatter(e)).join('\n');

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const key = `${this.config.keyPrefix}/${timestamp}-${Date.now()}.log`;

        try {
            await this.client.send(
                new PutObjectCommand({
                    Bucket: this.config.bucketName,
                    Key: key,
                    Body: content,
                    ContentType: 'application/json',
                }),
            );
        } catch (error) {
            console.error('Failed to send logs to S3:', error);
            this.buffer.unshift(...entries);
        }
    }

    private startFlushTimer(): void {
        this.flushTimer = setInterval(() => {
            this.flush().catch(console.error);
        }, this.config.flushInterval);
    }

    async close(): Promise<void> {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }
        await this.flush();
    }
}
