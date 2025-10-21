import * as fs from 'fs/promises';
import * as path from 'path';
import { LogDestination, LogEntry, LogFormatter } from '../types';
import { jsonFormatter } from '../formatters';

export interface FileDestinationConfig {
    filePath: string;
    formatter?: LogFormatter;
    maxFileSize?: number;
    rotateOnSize?: boolean;
}

export class FileDestination implements LogDestination {
    private readonly config: Required<FileDestinationConfig>;
    private readonly writeStream?: fs.FileHandle;

    constructor(config: FileDestinationConfig) {
        this.config = {
            filePath: config.filePath,
            formatter: config.formatter || jsonFormatter,
            maxFileSize: config.maxFileSize || 10 * 1024 * 1024, // 10MB
            rotateOnSize: config.rotateOnSize ?? true,
        };

        this.ensureDirectory();
    }

    async write(entry: LogEntry): Promise<void> {
        const formatted = this.config.formatter(entry);
        const content = (typeof formatted === 'string' ? formatted : JSON.stringify(formatted)) + '\n';

        if (this.config.rotateOnSize) {
            await this.checkRotation();
        }

        await fs.appendFile(this.config.filePath, content, 'utf-8');
    }

    private async ensureDirectory(): Promise<void> {
        const dir = path.dirname(this.config.filePath);
        await fs.mkdir(dir, { recursive: true });
    }

    private async checkRotation(): Promise<void> {
        try {
            const stats = await fs.stat(this.config.filePath);

            if (stats.size >= this.config.maxFileSize) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const ext = path.extname(this.config.filePath);
                const base = this.config.filePath.slice(0, -ext.length);
                const newPath = `${base}-${timestamp}${ext}`;

                await fs.rename(this.config.filePath, newPath);
            }
        } catch (error: any) {
            if (error.code !== 'ENOENT') {
                console.error('Failed to check file rotation:', error);
            }
        }
    }

    async flush(): Promise<void> {
        // File writes are synchronous, no need to flush
    }
}
