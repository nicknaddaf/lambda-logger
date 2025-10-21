import { LogEnricher, LogEntry } from '../types';

export const awsLambdaEnricher: LogEnricher = (entry: LogEntry): LogEntry => {
    return {
        ...entry,
        context: {
            ...entry.context,
            functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
            functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
            memoryLimit: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
            region: process.env.AWS_REGION,
            awsRequestId: (globalThis as any).awsRequestId,
        },
    };
};

export const tracingEnricher: LogEnricher = (entry: LogEntry): LogEntry => {
    const traceId = process.env._X_AMZN_TRACE_ID || entry.context?.traceId;

    return {
        ...entry,
        context: {
            ...entry.context,
            traceId,
            xrayTraceId: traceId,
        },
    };
};
