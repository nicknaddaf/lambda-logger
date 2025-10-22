import { LoggerConfig } from './types';
import { Logger } from './core/Logger';
import { awsLambdaEnricher, tracingEnricher } from './enrichers';
import { ConsoleDestination } from './destinations/ConsoleDestination';
import { jsonFormatter } from './formatters';

export { Logger } from './core/Logger';

export {
    LogLevel,
    LogContext,
    ErrorContext,
    LogEntry,
    LogDestination,
    LoggerConfig,
    LogEnricher,
    LogFormatter,
} from './types';

export { awsLambdaEnricher, tracingEnricher } from './enrichers';

export { jsonFormatter, prettyFormatter, csvFormatter } from './formatters';

export { ConsoleDestination, ConsoleDestinationConfig } from './destinations/ConsoleDestination';

export { CloudWatchDestination, CloudWatchDestinationConfig } from './destinations/CloudWatchDestination';

export { S3Destination, S3DestinationConfig } from './destinations/S3Destination';

export { FileDestination, FileDestinationConfig } from './destinations/FileDestination';

// Helper function to create a pre-configured logger for Lambda
export function createLambdaLogger(config?: Partial<LoggerConfig>): Logger {
    const logger = new Logger({
        service: config?.service || process.env.AWS_LAMBDA_FUNCTION_NAME || 'lambda-function',
        environment: config?.environment || process.env.ENVIRONMENT || 'production',
        destinations: config?.destinations || [new ConsoleDestination({ formatter: jsonFormatter })],
        enrichers: [awsLambdaEnricher, tracingEnricher, ...(config?.enrichers || [])],
        ...config,
    });

    return logger;
}
