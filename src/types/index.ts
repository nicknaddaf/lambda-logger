export enum LogLevel {
    FATAL = 0, // Highest priority
    ERROR = 1,
    WARN = 2,
    INFO = 3,
    DEBUG = 4, // Lowest priority
    TRACE = 5, // Most verbose
}

// String representations for output
export const LogLevelNames: Record<LogLevel, string> = {
    [LogLevel.FATAL]: 'FATAL',
    [LogLevel.ERROR]: 'ERROR',
    [LogLevel.WARN]: 'WARN',
    [LogLevel.INFO]: 'INFO',
    [LogLevel.DEBUG]: 'DEBUG',
    [LogLevel.TRACE]: 'TRACE',
};

export interface LogContext {
    requestId?: string;
    traceId?: string;
    spanId?: string;
    userId?: string;
    correlationId?: string;
    [key: string]: any;
}

export interface ErrorContext {
    name: string;
    message: string;
    stack?: string;
    code?: string;
    statusCode?: number;
    [key: string]: any;
}

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    levelName: string; // Human-readable level name
    message: string;
    context?: LogContext;
    error?: ErrorContext;
    metadata?: Record<string, any>;
    environment?: string;
    service?: string;
    version?: string;
}

export interface LogDestination {
    write(entry: LogEntry): Promise<void>;
    flush?(): Promise<void>;
}

export interface LoggerConfig {
    level?: LogLevel;
    service?: string;
    version?: string;
    environment?: string;
    destinations?: LogDestination[];
    enrichers?: LogEnricher[];
    formatters?: LogFormatter[];
    redactFields?: string[];
}

export type LogEnricher = (entry: LogEntry) => LogEntry;
export type LogFormatter = (entry: LogEntry) => any;
