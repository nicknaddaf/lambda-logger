import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogStreamCommand } from '@aws-sdk/client-cloudwatch-logs';
import { LogDestination, LogEntry, LogFormatter } from '../types';
import { jsonFormatter } from '../formatters';

export interface CloudWatchDestinationConfig {
    logGroupName: string;
    logStreamName?: string;
    region?: string;
    formatter?: LogFormatter;
    batchSize?: number;
    flushInterval?: number;
}

export class CloudWatchDestination implements LogDestination {
    private readonly client: CloudWatchLogsClient;
    private readonly config: Required<CloudWatchDestinationConfig>;
    private readonly buffer: Array<{ message: string; timestamp: number }> = [];
    private sequenceToken?: string;
    private flushTimer?: NodeJS.Timeout;

    constructor(config: CloudWatchDestinationConfig) {
        this.client = new CloudWatchLogsClient({
            region: config.region || process.env.AWS_REGION,
        });

        this.config = {
            logGroupName: config.logGroupName,
            logStreamName: config.logStreamName || `log-stream-${Date.now()}`,
            region: config.region || process.env.AWS_REGION || 'us-east-1',
            formatter: config.formatter || jsonFormatter,
            batchSize: config.batchSize || 10,
            flushInterval: config.flushInterval || 5000,
        };

        this.ensureLogStream();
        this.startFlushTimer();
    }

    async write(entry: LogEntry): Promise<void> {
        const message = this.config.formatter(entry);

        this.buffer.push({
            message: typeof message === 'string' ? message : JSON.stringify(message),
            timestamp: new Date(entry.timestamp).getTime(),
        });

        if (this.buffer.length >= this.config.batchSize) {
            await this.flush();
        }
    }

    async flush(): Promise<void> {
        if (this.buffer.length === 0) return;

        const logEvents = this.buffer.splice(0, this.config.batchSize);

        try {
            const command = new PutLogEventsCommand({
                logGroupName: this.config.logGroupName,
                logStreamName: this.config.logStreamName,
                logEvents,
                sequenceToken: this.sequenceToken,
            });

            const response = await this.client.send(command);
            this.sequenceToken = response.nextSequenceToken;
        } catch (error) {
            console.error('Failed to send logs to CloudWatch:', error);
            // Put events back in buffer
            this.buffer.unshift(...logEvents);
        }
    }

    private async ensureLogStream(): Promise<void> {
        try {
            await this.client.send(
                new CreateLogStreamCommand({
                    logGroupName: this.config.logGroupName,
                    logStreamName: this.config.logStreamName,
                }),
            );
        } catch (error: any) {
            if (error.name !== 'ResourceAlreadyExistsException') {
                console.error('Failed to create log stream:', error);
            }
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
