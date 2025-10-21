import { LogDestination, LogEntry, LogFormatter, LogLevel } from '../types';
import { prettyFormatter } from '../formatters';

export interface ConsoleDestinationConfig {
    formatter?: LogFormatter;
    useColors?: boolean;
}

export class ConsoleDestination implements LogDestination {
    private readonly formatter: LogFormatter;
    private readonly useColors: boolean;

    constructor(config: ConsoleDestinationConfig = {}) {
        this.formatter = config.formatter || prettyFormatter;
        this.useColors = config.useColors ?? true;
    }

    async write(entry: LogEntry): Promise<void> {
        const formatted = this.formatter(entry);
        const colorized = this.useColors ? this.colorize(entry.level, formatted) : formatted;

        // Route to appropriate console method based on level
        if (entry.level <= LogLevel.ERROR) {
            console.error(colorized);
        } else if (entry.level === LogLevel.WARN) {
            console.warn(colorized);
        } else {
            console.log(colorized);
        }
    }

    private colorize(level: LogLevel, message: string): string {
        const colors: Record<LogLevel, string> = {
            [LogLevel.FATAL]: '\x1b[35m', // Magenta
            [LogLevel.ERROR]: '\x1b[31m', // Red
            [LogLevel.WARN]: '\x1b[33m', // Yellow
            [LogLevel.INFO]: '\x1b[32m', // Green
            [LogLevel.DEBUG]: '\x1b[36m', // Cyan
            [LogLevel.TRACE]: '\x1b[90m', // Gray
        };
        const reset = '\x1b[0m';
        return `${colors[level] || ''}${message}${reset}`;
    }
}
