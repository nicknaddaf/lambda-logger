import {
    ErrorContext,
    LogContext,
    LogDestination,
    LogEnricher,
    LogEntry,
    LoggerConfig,
    LogLevel,
    LogLevelNames,
} from '../types';

export class Logger {
    private readonly config: Required<LoggerConfig>;
    private context: LogContext = {};
    private static instance: Logger;

    constructor(config: LoggerConfig = {}) {
        this.config = {
            level: config.level || LogLevel.INFO,
            service: config.service || 'unknown-service',
            version: config.version || '1.0.0',
            environment: config.environment || process.env.NODE_ENV || 'development',
            destinations: config.destinations || [],
            enrichers: config.enrichers || [],
            formatters: config.formatters || [],
            redactFields: config.redactFields || ['password', 'token', 'secret', 'apiKey'],
        };
    }

    static getInstance(config?: LoggerConfig): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger(config);
        }
        return Logger.instance;
    }

    setContext(context: LogContext): void {
        this.context = { ...this.context, ...context };
    }

    clearContext(): void {
        this.context = {};
    }

    addDestination(destination: LogDestination): void {
        this.config.destinations.push(destination);
    }

    addEnricher(enricher: LogEnricher): void {
        this.config.enrichers.push(enricher);
    }

    debug(message: string, metadata?: Record<string, any>): void {
        this.log(LogLevel.DEBUG, message, metadata);
    }

    info(message: string, metadata?: Record<string, any>): void {
        this.log(LogLevel.INFO, message, metadata);
    }

    warn(message: string, metadata?: Record<string, any>): void {
        this.log(LogLevel.WARN, message, metadata);
    }

    error(message: string, error?: Error, metadata?: Record<string, any>): void {
        const errorContext = error ? this.extractErrorContext(error) : undefined;
        this.log(LogLevel.ERROR, message, metadata, errorContext);
    }

    fatal(message: string, error?: Error, metadata?: Record<string, any>): void {
        const errorContext = error ? this.extractErrorContext(error) : undefined;
        this.log(LogLevel.FATAL, message, metadata, errorContext);
    }

    trace(message: string, metadata?: Record<string, any>): void {
        this.log(LogLevel.TRACE, message, metadata);
    }

    private log(level: LogLevel, message: string, metadata?: Record<string, any>, error?: ErrorContext): void {
        if (!this.shouldLog(level)) {
            return;
        }

        let entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            levelName: LogLevelNames[level],
            message,
            context: { ...this.context },
            error,
            metadata: metadata ? this.redactSensitiveData(metadata) : undefined,
            environment: this.config.environment,
            service: this.config.service,
            version: this.config.version,
        };

        // Apply enrichers
        for (const enricher of this.config.enrichers) {
            entry = enricher(entry);
        }

        // Write to all destinations
        this.writeToDestinations(entry);
    }

    private shouldLog(level: LogLevel): boolean {
        // Lower number = higher priority
        // If configured level is 4 (DEBUG), log levels 0-4 (FATAL, ERROR, WARN, INFO, DEBUG)
        // If configured level is 2 (WARN), log only levels 0-2 (FATAL, ERROR, WARN)
        return level <= this.config.level;
    }

    private extractErrorContext(error: Error): ErrorContext {
        return {
            name: error.name,
            message: error.message,
            stack: error.stack,
            ...(error as any),
        };
    }

    private redactSensitiveData(data: any): any {
        if (typeof data !== 'object' || data === null) {
            return data;
        }

        const redacted = Array.isArray(data) ? [...data] : { ...data };

        for (const key in redacted) {
            if (this.config.redactFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
                redacted[key] = '[REDACTED]';
            } else if (typeof redacted[key] === 'object') {
                redacted[key] = this.redactSensitiveData(redacted[key]);
            }
        }

        return redacted;
    }

    private async writeToDestinations(entry: LogEntry): Promise<void> {
        const writePromises = this.config.destinations.map((destination) =>
            destination.write(entry).catch((err) => {
                console.error('Failed to write to destination:', err);
            }),
        );

        await Promise.allSettled(writePromises);
    }

    async flush(): Promise<void> {
        const flushPromises = this.config.destinations.filter((d) => d.flush).map((d) => d.flush());

        await Promise.allSettled(flushPromises);
    }
}
