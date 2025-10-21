import { LoggerConfig } from './types';

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
export function createLambdaLogger(config?: Partial<LoggerConfig>) {
    const { Logger } = require('./core/Logger');
    const { awsLambdaEnricher, tracingEnricher } = require('./enrichers');
    const { ConsoleDestination } = require('./destinations/ConsoleDestination');
    const { jsonFormatter } = require('./formatters');

    const logger = new Logger({
        service: config?.service || process.env.AWS_LAMBDA_FUNCTION_NAME || 'lambda-function',
        environment: config?.environment || process.env.ENVIRONMENT || 'production',
        destinations: config?.destinations || [new ConsoleDestination({ formatter: jsonFormatter })],
        enrichers: [awsLambdaEnricher, tracingEnricher, ...(config?.enrichers || [])],
        ...config,
    });

    return logger;
}
