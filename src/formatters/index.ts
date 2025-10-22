import { LogEntry, LogFormatter } from '../types';

export const jsonFormatter: LogFormatter = (entry: LogEntry): string => {
    return JSON.stringify(entry);
};

export const prettyFormatter: LogFormatter = (entry: LogEntry): string => {
    const { timestamp, levelName, message, service, context, error, metadata } = entry;

    let output = `[${timestamp}] ${levelName} [${service}]: ${message}`;

    if (context && Object.keys(context).length > 0) {
        output += `\n  Context: ${JSON.stringify(context, null, 2)}`;
    }

    if (metadata && Object.keys(metadata).length > 0) {
        output += `\n  Metadata: ${JSON.stringify(metadata, null, 2)}`;
    }

    if (error) {
        output += `\n  Error: ${error.name}: ${error.message}`;
        if (error.stack) {
            output += `\n${error.stack}`;
        }
    }

    return output;
};

export const csvFormatter: LogFormatter = (entry: LogEntry): string => {
    const { timestamp, levelName, message, service, context, error } = entry;

    const escapeCSV = (value: unknown): string => {
        const str = String(value || '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    return [
        escapeCSV(timestamp),
        escapeCSV(levelName),
        escapeCSV(service),
        escapeCSV(message),
        escapeCSV(context?.requestId || ''),
        escapeCSV(context?.traceId || ''),
        escapeCSV(error?.message || ''),
    ].join(',');
};
