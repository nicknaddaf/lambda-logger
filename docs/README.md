# Lambda Logger Documentation

## Table of Contents

-   [Installation](#installation)
-   [Understanding Log Levels](#understanding-log-levels)
-   [Quick Start](#quick-start)
-   [Configuration](#configuration)
    -   [Log Levels](#log-levels)
    -   [Destinations](#destinations)
    -   [Formatters](#formatters)
    -   [Enrichers](#enrichers)
-   [Advanced Usage](#advanced-usage)
-   [API Reference](#api-reference)
-   [Best Practices](#best-practices)
-   [Examples](#examples)
-   [Performance Considerations](#performance-considerations)
-   [Troubleshooting](#troubleshooting)

---

## Installation

```bash
npm install @nicknaddaf/lambda-logger
```

### Peer Dependencies

```bash
npm install @aws-sdk/client-cloudwatch-logs @aws-sdk/client-s3
```

---

## Understanding Log Levels

This library uses a **numerical priority scale** where **lower numbers indicate higher priority**:

```typescript
LogLevel.FATAL = 0; // Highest priority - System crashes, unrecoverable errors
LogLevel.ERROR = 1; // Errors that need attention
LogLevel.WARN = 2; // Warning conditions
LogLevel.INFO = 3; // Normal operational messages
LogLevel.DEBUG = 4; // Detailed debugging information
LogLevel.TRACE = 5; // Most verbose - execution traces
```

### How It Works

When you set a log level, **you get that level and ALL more critical levels (lower numbers)**:

```typescript
// Set to INFO (level 3)
logger.level = LogLevel.INFO;

// Outputs:
logger.fatal('...'); // ✅ Logged (0 ≤ 3)
logger.error('...'); // ✅ Logged (1 ≤ 3)
logger.warn('...'); // ✅ Logged (2 ≤ 3)
logger.info('...'); // ✅ Logged (3 ≤ 3)
logger.debug('...'); // ❌ NOT logged (4 > 3)
logger.trace('...'); // ❌ NOT logged (5 > 3)
```

### Recommended Level by Environment

| Environment     | Level       | Output                   | Use Case                   |
| --------------- | ----------- | ------------------------ | -------------------------- |
| **Production**  | `WARN` (2)  | FATAL, ERROR, WARN       | Only critical issues       |
| **Staging**     | `INFO` (3)  | FATAL, ERROR, WARN, INFO | Normal operations + issues |
| **Development** | `DEBUG` (4) | All except TRACE         | Full debugging             |
| **Testing**     | `TRACE` (5) | Everything               | Maximum verbosity          |

---

## Quick Start

### Basic Lambda Usage

```typescript
import { createLambdaLogger } from '@nicknaddaf/lambda-logger';

const logger = createLambdaLogger({
    service: 'my-service',
    level: LogLevel.INFO,
});

export const handler = async (event, context) => {
    logger.setContext({ requestId: context.requestId });

    logger.info('Processing request', { userId: event.userId });

    try {
        const result = await processRequest(event);
        logger.info('Request completed', { result });
        return result;
    } catch (error) {
        logger.error('Request failed', error);
        throw error;
    } finally {
        await logger.flush();
    }
};
```

---

## Configuration

### Log Levels

```typescript
import { Logger, LogLevel } from '@nicknaddaf/lambda-logger';

// Production: Only critical issues
const prodLogger = new Logger({
    service: 'api-service',
    level: LogLevel.ERROR, // Shows: FATAL, ERROR only
});

// Staging: Normal operations
const stagingLogger = new Logger({
    service: 'api-service',
    level: LogLevel.INFO, // Shows: FATAL, ERROR, WARN, INFO
});

// Development: Full debugging
const devLogger = new Logger({
    service: 'api-service',
    level: LogLevel.DEBUG, // Shows: FATAL, ERROR, WARN, INFO, DEBUG
});

// Deep debugging: Everything
const traceLogger = new Logger({
    service: 'api-service',
    level: LogLevel.TRACE, // Shows: All levels including TRACE
});
```

### Environment-Based Configuration

```typescript
const LOG_LEVEL_MAP: Record<string, LogLevel> = {
    FATAL: LogLevel.FATAL,
    ERROR: LogLevel.ERROR,
    WARN: LogLevel.WARN,
    INFO: LogLevel.INFO,
    DEBUG: LogLevel.DEBUG,
    TRACE: LogLevel.TRACE,
};

const logger = new Logger({
    service: 'my-service',
    level: LOG_LEVEL_MAP[process.env.LOG_LEVEL || 'INFO'] || LogLevel.INFO,
});

// Usage:
// LOG_LEVEL=DEBUG npm start  -> Shows FATAL, ERROR, WARN, INFO, DEBUG
// LOG_LEVEL=ERROR npm start  -> Shows FATAL, ERROR only
```

---

### Destinations

#### Console Destination

Perfect for development and Lambda (CloudWatch integration).

```typescript
import { ConsoleDestination, prettyFormatter } from '@nicknaddaf/lambda-logger';

new ConsoleDestination({
    formatter: prettyFormatter, // or jsonFormatter
    useColors: true, // Colored output for terminals
});
```

#### CloudWatch Destination

Direct integration with AWS CloudWatch Logs.

```typescript
import { CloudWatchDestination } from '@nicknaddaf/lambda-logger';

new CloudWatchDestination({
    logGroupName: '/aws/lambda/my-function',
    logStreamName: 'production-logs',
    region: 'us-east-1',
    batchSize: 25, // Number of logs to batch
    flushInterval: 5000, // Flush every 5 seconds
});
```

**Required IAM Permissions:**

```json
{
    "Effect": "Allow",
    "Action": ["logs:CreateLogStream", "logs:PutLogEvents"],
    "Resource": "arn:aws:logs:*:*:log-group:/aws/lambda/*"
}
```

#### S3 Destination

For long-term log storage and compliance.

```typescript
import { S3Destination } from '@nicknaddaf/lambda-logger';

new S3Destination({
    bucketName: 'my-logs-bucket',
    keyPrefix: 'logs/production',
    region: 'us-east-1',
    batchSize: 100, // Batch before uploading
    flushInterval: 60000, // Flush every 1 minute
});
```

**Required IAM Permissions:**

```json
{
    "Effect": "Allow",
    "Action": ["s3:PutObject"],
    "Resource": "arn:aws:s3:::my-logs-bucket/*"
}
```

#### File Destination

Local file system logging with rotation.

```typescript
import { FileDestination } from '@nicknaddaf/lambda-logger';

new FileDestination({
    filePath: './logs/app.log',
    formatter: prettyFormatter,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    rotateOnSize: true, // Auto-rotate when size exceeded
});
```

---

### Formatters

#### JSON Formatter (Default)

Structured JSON output, perfect for log aggregation tools.

```typescript
import { jsonFormatter } from '@nicknaddaf/lambda-logger';

// Output:
// {"timestamp":"2025-10-21T10:30:00Z","level":3,"levelName":"INFO","message":"User login","service":"auth-service",...}
```

#### Pretty Formatter

Human-readable format for development.

```typescript
import { prettyFormatter } from '@nicknaddaf/lambda-logger';

// Output:
// [2025-10-21T10:30:00Z] INFO [auth-service]: User login
//   Context: {"requestId":"abc-123","userId":"user-456"}
```

#### CSV Formatter

For spreadsheet analysis or data processing.

```typescript
import { csvFormatter } from '@nicknaddaf/lambda-logger';

// Output:
// "2025-10-21T10:30:00Z","INFO","auth-service","User login","abc-123","xyz-789",""
```

#### Custom Formatter

```typescript
import { LogFormatter, LogEntry } from '@nicknaddaf/lambda-logger';

const customFormatter: LogFormatter = (entry: LogEntry): string => {
    return `${entry.timestamp} | ${entry.levelName} | ${entry.message}`;
};

const logger = new Logger({
    destinations: [new ConsoleDestination({ formatter: customFormatter })],
});
```

---

### Enrichers

Enrichers automatically add data to every log entry.

#### AWS Lambda Enricher

Adds Lambda-specific context automatically.

```typescript
import { awsLambdaEnricher } from '@nicknaddaf/lambda-logger';

// Automatically adds:
// - functionName: AWS_LAMBDA_FUNCTION_NAME
// - functionVersion: AWS_LAMBDA_FUNCTION_VERSION
// - memoryLimit: AWS_LAMBDA_FUNCTION_MEMORY_SIZE
// - region: AWS_REGION
// - awsRequestId: Current request ID
```

#### Tracing Enricher

Adds AWS X-Ray tracing information.

```typescript
import { tracingEnricher } from '@nicknaddaf/lambda-logger';

// Automatically adds:
// - traceId: X-Ray trace ID
// - xrayTraceId: _X_AMZN_TRACE_ID from environment
```

#### Custom Enricher

```typescript
import { LogEnricher, LogEntry } from '@nicknaddaf/lambda-logger';

const tenantEnricher: LogEnricher = (entry: LogEntry): LogEntry => ({
    ...entry,
    context: {
        ...entry.context,
        tenantId: process.env.TENANT_ID,
        version: process.env.APP_VERSION,
        buildNumber: process.env.BUILD_NUMBER,
    },
});

const logger = new Logger({
    enrichers: [awsLambdaEnricher, tracingEnricher, tenantEnricher],
});
```

---

## Advanced Usage

### Multiple Destinations

Send logs to multiple targets simultaneously.

```typescript
import {
    Logger,
    LogLevel,
    ConsoleDestination,
    CloudWatchDestination,
    S3Destination,
    jsonFormatter,
} from '@nicknaddaf/lambda-logger';

const logger = new Logger({
    service: 'payment-service',
    level: LogLevel.INFO,
    destinations: [
        // Console for immediate viewing
        new ConsoleDestination({ formatter: jsonFormatter }),

        // CloudWatch for real-time monitoring
        new CloudWatchDestination({
            logGroupName: '/aws/lambda/payments',
            batchSize: 25,
        }),

        // S3 for compliance and long-term storage
        new S3Destination({
            bucketName: 'audit-logs',
            keyPrefix: 'payments',
            batchSize: 200,
        }),
    ],
});
```

### Context Management

Set context that persists across all log calls.

```typescript
// Set context for the entire request
logger.setContext({
    requestId: context.requestId,
    userId: event.userId,
    correlationId: event.headers['x-correlation-id'],
    sessionId: event.headers['session-id'],
});

// All subsequent logs include this context
logger.info('Processing payment'); // Includes all context
logger.info('Payment validated'); // Includes all context

// Clear context when done
logger.clearContext();
```

### Sensitive Data Redaction

Automatically redact sensitive fields.

```typescript
const logger = new Logger({
    service: 'user-service',
    redactFields: ['password', 'creditCard', 'ssn', 'apiKey', 'token', 'secret'],
});

logger.info('User registration', {
    username: 'john@example.com',
    password: 'MySecret123!', // Will be [REDACTED]
    email: 'john@example.com',
    apiKey: 'sk_live_123456', // Will be [REDACTED]
});

// Output:
// {
//   "username": "john@example.com",
//   "password": "[REDACTED]",
//   "email": "john@example.com",
//   "apiKey": "[REDACTED]"
// }
```

### Error Logging

Capture full error details with stack traces.

```typescript
try {
    await riskyOperation();
} catch (error) {
    logger.error('Operation failed', error as Error, {
        operation: 'updateUser',
        userId: '12345',
        attempt: 3,
    });
}

// Log entry includes:
// - error.name
// - error.message
// - error.stack
// - Any custom error properties
```

### Conditional Logging for Performance

Avoid expensive operations when logs won't be output.

```typescript
// ❌ BAD: Computation happens even if not logged
const expensiveData = JSON.stringify(massiveObject);
logger.debug('Data:', { expensiveData }); // Won't log if level > DEBUG

// ✅ GOOD: Check level first
if ((logger as any).config.level >= LogLevel.DEBUG) {
    const expensiveData = JSON.stringify(massiveObject);
    logger.debug('Data:', { expensiveData });
}
```

---

## API Reference

### Logger Class

#### Constructor

```typescript
new Logger(config: LoggerConfig)
```

#### Methods

| Method                              | Parameters                | Description                               |
| ----------------------------------- | ------------------------- | ----------------------------------------- |
| `fatal(message, error?, metadata?)` | `string, Error?, object?` | Log critical failures (Level 0)           |
| `error(message, error?, metadata?)` | `string, Error?, object?` | Log errors (Level 1)                      |
| `warn(message, metadata?)`          | `string, object?`         | Log warnings (Level 2)                    |
| `info(message, metadata?)`          | `string, object?`         | Log informational messages (Level 3)      |
| `debug(message, metadata?)`         | `string, object?`         | Log debug information (Level 4)           |
| `trace(message, metadata?)`         | `string, object?`         | Log detailed traces (Level 5)             |
| `setContext(context)`               | `LogContext`              | Set persistent context                    |
| `clearContext()`                    | -                         | Clear all context                         |
| `addDestination(destination)`       | `ILogDestination`         | Add a log destination                     |
| `addEnricher(enricher)`             | `LogEnricher`             | Add a log enricher                        |
| `flush()`                           | -                         | Flush all buffered logs (returns Promise) |

#### Static Methods

```typescript
Logger.getInstance(config?: LoggerConfig): Logger
```

### Helper Functions

```typescript
createLambdaLogger(config?: Partial<LoggerConfig>): Logger
```

Pre-configured logger with Lambda enrichers and console destination.

---

## Best Practices

### 1. Initialize Once at Module Level

```typescript
// ✅ GOOD: Initialize once
const logger = createLambdaLogger({ service: 'user-service' });

export const handler = async (event) => {
    logger.info('Processing...');
};

// ❌ BAD: Creating new logger per invocation
export const handler = async (event) => {
    const logger = createLambdaLogger({ service: 'user-service' });
    logger.info('Processing...');
};
```

### 2. Always Flush Before Exit

```typescript
export const handler = async (event, context) => {
    try {
        // Your logic
        return { statusCode: 200 };
    } catch (error) {
        logger.error('Handler failed', error);
        return { statusCode: 500 };
    } finally {
        await logger.flush(); // Ensures all logs are sent
    }
};
```

### 3. Use Appropriate Log Levels

```typescript
// FATAL (0): System cannot continue
logger.fatal('Database connection pool exhausted', error);

// ERROR (1): Operation failed, needs attention
logger.error('Payment processing failed', error);

// WARN (2): Something unexpected, but handled
logger.warn('API rate limit approaching', { current: 95, limit: 100 });

// INFO (3): Normal business events
logger.info('Order created', { orderId: '123', total: 99.99 });

// DEBUG (4): Diagnostic information
logger.debug('Cache lookup', { key: 'user:123', hit: true });

// TRACE (5): Detailed execution flow
logger.trace('Entering function processOrder');
```

### 4. Set Context Early

```typescript
export const handler = async (event, context) => {
    // Set context immediately
    logger.setContext({
        requestId: context.requestId,
        userId: event.userId,
        apiVersion: event.version,
    });

    // All logs now include this context automatically
    logger.info('Request started');
    logger.info('Validation passed');
    logger.info('Request completed');
};
```

### 5. Use Singleton Pattern for Consistency

```typescript
// logger.ts
import { Logger, LogLevel } from '@nicknaddaf/lambda-logger';

export const logger = Logger.getInstance({
    service: process.env.SERVICE_NAME,
    level: LogLevel.INFO,
});

// handler1.ts
import { logger } from './logger';
export const handler1 = async () => {
    logger.info('Handler 1');
};

// handler2.ts
import { logger } from './logger';
export const handler2 = async () => {
    logger.info('Handler 2');
};
```

---

## Examples

### Example 1: API Gateway Handler

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { createLambdaLogger, LogLevel } from '@nicknaddaf/lambda-logger';

const logger = createLambdaLogger({
    service: 'api-gateway-handler',
    level: LogLevel.INFO,
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const startTime = Date.now();

    logger.setContext({
        requestId: event.requestContext.requestId,
        path: event.path,
        method: event.httpMethod,
        sourceIp: event.requestContext.identity.sourceIp,
    });

    logger.info('Request received', {
        userAgent: event.headers['User-Agent'],
        queryParams: event.queryStringParameters,
    });

    try {
        const body = JSON.parse(event.body || '{}');
        const result = await processRequest(body);

        const duration = Date.now() - startTime;
        logger.info('Request successful', { duration, statusCode: 200 });

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(result),
        };
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Request failed', error as Error, { duration });

        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    } finally {
        await logger.flush();
    }
};
```

### Example 2: Multi-Environment Setup

```typescript
function createEnvironmentLogger() {
    const env = process.env.ENVIRONMENT || 'development';

    const logLevels: Record<string, LogLevel> = {
        production: LogLevel.WARN,
        staging: LogLevel.INFO,
        development: LogLevel.DEBUG,
        test: LogLevel.TRACE,
    };

    const destinations = [];

    // Console for all environments
    destinations.push(
        new ConsoleDestination({
            formatter: env === 'development' ? prettyFormatter : jsonFormatter,
        }),
    );

    // CloudWatch for non-dev environments
    if (env !== 'development') {
        destinations.push(
            new CloudWatchDestination({
                logGroupName: `/aws/lambda/${process.env.SERVICE_NAME}`,
                logStreamName: `${env}-${new Date().toISOString().split('T')[0]}`,
            }),
        );
    }

    // S3 for production
    if (env === 'production') {
        destinations.push(
            new S3Destination({
                bucketName: process.env.LOG_BUCKET!,
                keyPrefix: `logs/${process.env.SERVICE_NAME}`,
            }),
        );
    }

    return new Logger({
        service: process.env.SERVICE_NAME || 'unknown',
        environment: env,
        level: logLevels[env],
        destinations,
    });
}

export const logger = createEnvironmentLogger();
```

### Example 3: Custom Destination (Datadog)

```typescript
import { ILogDestination, LogEntry } from '@nicknaddaf/lambda-logger';
import axios from 'axios';

export class DatadogDestination implements ILogDestination {
    private apiKey: string;
    private buffer: LogEntry[] = [];
    private batchSize: number;

    constructor(apiKey: string, batchSize: number = 50) {
        this.apiKey = apiKey;
        this.batchSize = batchSize;
    }

    async write(entry: LogEntry): Promise<void> {
        this.buffer.push(entry);
        if (this.buffer.length >= this.batchSize) {
            await this.flush();
        }
    }

    async flush(): Promise<void> {
        if (this.buffer.length === 0) return;
        const logs = this.buffer.splice(0);

        try {
            await axios.post(
                'https://http-intake.logs.datadoghq.com/v1/input',
                logs.map((log) => ({
                    message: log.message,
                    level: log.levelName.toLowerCase(),
                    service: log.service,
                    timestamp: log.timestamp,
                    ...log.context,
                    ...log.metadata,
                })),
                {
                    headers: {
                        'DD-API-KEY': this.apiKey,
                        'Content-Type': 'application/json',
                    },
                },
            );
        } catch (error) {
            console.error('Failed to send logs to Datadog:', error);
            this.buffer.unshift(...logs);
        }
    }
}

// Usage
const logger = new Logger({
    destinations: [new DatadogDestination(process.env.DATADOG_API_KEY!)],
});
```

---

## Performance Considerations

### Batching Configuration

```typescript
// High-throughput applications
new CloudWatchDestination({
    batchSize: 50, // Larger batches reduce API calls
    flushInterval: 10000, // Less frequent flushes
});

// Low-latency applications
new CloudWatchDestination({
    batchSize: 10, // Smaller batches
    flushInterval: 2000, // More frequent flushes
});
```

### Memory Management

```typescript
// Monitor buffer sizes in memory-constrained environments
new S3Destination({
    batchSize: 50, // Reduce from default 100
    flushInterval: 30000, // Flush more frequently
});
```

### Async Flushing

```typescript
// Non-blocking flush (fire and forget)
logger.flush().catch((err) => console.error('Flush failed:', err));

// Blocking flush (ensure delivery)
await logger.flush();
```

---

## Troubleshooting

### Issue: Logs Not Appearing in CloudWatch

**Symptoms:** CloudWatch log group shows no logs.

**Solutions:**

1. Verify IAM permissions:

```json
{
    "Effect": "Allow",
    "Action": ["logs:CreateLogStream", "logs:PutLogEvents"],
    "Resource": "arn:aws:logs:*:*:log-group:/aws/lambda/*"
}
```

2. Check log group name matches configuration
3. Ensure `flush()` is called before Lambda exits
4. Verify VPC settings allow CloudWatch access

### Issue: Missing Logs at Lambda Timeout

**Symptoms:** Logs disappear when Lambda times out.

**Solution:** Flush with timeout protection:

```typescript
export const handler = async (event, context) => {
    try {
        // Your code
    } finally {
        // Flush with timeout safety
        await Promise.race([
            logger.flush(),
            new Promise((resolve) => setTimeout(resolve, context.getRemainingTimeInMillis() - 1000)),
        ]);
    }
};
```

### Issue: High Memory Usage

**Symptoms:** Lambda running out of memory.

**Solutions:**

1. Reduce batch sizes
2. Increase flush frequency
3. Avoid logging large objects

```typescript
// Instead of logging entire object
logger.debug('User data', { user: massiveUserObject });

// Log only relevant fields
logger.debug('User data', {
    userId: user.id,
    email: user.email,
});
```

### Issue: Logs Not Being Redacted

**Symptoms:** Sensitive data appearing in logs.

**Solution:** Ensure redact fields include your sensitive keys:

```typescript
const logger = new Logger({
    redactFields: [
        'password',
        'token',
        'secret',
        'apiKey',
        'creditCard',
        'ssn',
        'authorization', // Add custom fields
    ],
});
```

---

## CloudWatch Insights Queries

### Find All Errors

```sql
fields @timestamp, levelName, message, error.message
| filter levelName = "ERROR"
| sort @timestamp desc
| limit 100
```

### Average Request Duration

```sql
fields path, metadata.duration
| stats avg(metadata.duration) as avg_duration by path
| sort avg_duration desc
```

### Count by Log Level

```sql
fields levelName
| stats count() by levelName
| sort count desc
```

### Trace Specific Request

```sql
fields @timestamp, message, metadata
| filter context.requestId = "abc-123-def"
| sort @timestamp asc
```

---
