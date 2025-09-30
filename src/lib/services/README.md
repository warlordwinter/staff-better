# Improved Service Architecture

This directory contains a completely redesigned service architecture that follows SOLID principles and modern design patterns.

## Key Improvements

### 1. **Dependency Injection**

- Services now receive their dependencies through constructors
- No more hard-coded dependencies on external services
- Easy to test and mock

### 2. **Interface Segregation**

- Clear interfaces for different responsibilities
- `IReminderRepository` for reminder data access
- `IMessageService` for SMS operations
- `ILogger` for logging operations
- `IAssociateRepository` for associate data access
- `IAssignmentRepository` for assignment data access

### 3. **Strategy Pattern**

- Message handlers are now separate, testable components
- `ConfirmationHandler` for confirmation messages
- `HelpHandler` for help requests
- `OptOutHandler` for opt-out requests

### 4. **Factory Pattern**

- `ServiceFactory` for creating properly configured services
- `ServiceContainer` for dependency injection container
- Centralized service creation and configuration

### 5. **Better Error Handling**

- Centralized logging with structured logging
- Consistent error handling patterns
- Proper error propagation

## Architecture Overview

```
src/lib/services/
├── interfaces/           # Abstract interfaces
│   ├── IReminderRepository.ts
│   ├── IMessageService.ts
│   ├── ILogger.ts
│   ├── IAssociateRepository.ts
│   └── IAssignmentRepository.ts
├── implementations/      # Concrete implementations
│   ├── ConsoleLogger.ts
│   ├── TwilioMessageService.ts
│   ├── ReminderRepositorySupabase.ts
│   ├── AssociateRepositorySupabase.ts
│   └── AssignmentRepositorySupabase.ts
├── messageHandlers/      # Strategy pattern handlers
│   ├── IMessageHandler.ts
│   ├── ConfirmationHandler.ts
│   ├── HelpHandler.ts
│   └── OptOutHandler.ts
├── types.ts              # Common types
├── ServiceFactory.ts     # Factory for service creation
├── ServiceContainer.ts   # Dependency injection container
└── examples/             # Usage examples
    └── UsageExample.ts
```

## Usage

### Basic Usage with Service Container

```typescript
import { serviceContainer } from "./ServiceContainer";

// Get services from the container
const reminderService = serviceContainer.getReminderService();
const incomingMessageService = serviceContainer.getIncomingMessageService();
const schedulerService = serviceContainer.getSchedulerService();

// Use the services
await reminderService.processScheduledReminders();
await incomingMessageService.processIncomingMessage(phoneNumber, message);
schedulerService.start();
```

### Manual Service Creation

```typescript
import { ServiceFactory } from "./ServiceFactory";
import {
  ConsoleLogger,
  TwilioMessageService,
  ReminderRepositorySupabase,
} from "./implementations";

// Create dependencies
const logger = new ConsoleLogger();
const messageService = new TwilioMessageService();
const reminderRepository = new ReminderRepositorySupabase();

// Create service with dependencies
const reminderService = ServiceFactory.createReminderService(
  reminderRepository,
  messageService,
  logger
);
```

### Testing

The new architecture makes testing much easier:

```typescript
// Mock dependencies
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

const mockMessageService = {
  sendSMS: jest.fn(),
  formatPhoneNumber: jest.fn(),
};

const mockReminderRepository = {
  getDueReminders: jest.fn(),
  updateReminderStatus: jest.fn(),
};

// Create service with mocks
const reminderService = new ReminderService(
  mockReminderRepository,
  mockMessageService,
  mockLogger
);

// Test the service
await reminderService.processScheduledReminders();
expect(mockReminderRepository.getDueReminders).toHaveBeenCalled();
```

## Benefits

1. **Testability**: Services can be easily mocked and tested in isolation
2. **Maintainability**: Clear separation of concerns and single responsibility
3. **Flexibility**: Easy to swap implementations (e.g., different databases, message services)
4. **Scalability**: Services are loosely coupled and can be scaled independently
5. **Type Safety**: Full TypeScript support with proper interfaces
6. **Error Handling**: Centralized and consistent error handling
7. **Logging**: Structured logging with different levels

## Migration Guide

### Old Service Usage

```typescript
// Old way - direct instantiation
const reminderService = new ReminderService();
await reminderService.processScheduledReminders();
```

### New Service Usage

```typescript
// New way - dependency injection
const reminderService = serviceContainer.getReminderService();
await reminderService.processScheduledReminders();
```

## Configuration

Services can be configured through the service container:

```typescript
// Update scheduler configuration
serviceContainer.updateSchedulerConfig({
  intervalMinutes: 30,
  maxRetries: 5,
});
```

This architecture provides a solid foundation for building maintainable, testable, and scalable services.
