# Service Architecture Migration Guide

## Overview
This guide explains the new improved service architecture and how to migrate from the old monolithic services to the new modular design.

## New Architecture Benefits

### Before (Monolithic)
- `IncomingMessageService` (457 lines) - handled everything
- `ReminderService` (413 lines) - mixed concerns
- `SchedulerService` (280 lines) - tightly coupled

### After (Modular)
- **Shared Services**: Reusable components
- **Specialized Handlers**: Single responsibility
- **Service Container**: Dependency management
- **Clear Separation**: Easy to test and maintain

## New Service Structure

```
src/lib/services/
├── shared/                    # Shared utilities
│   ├── SMSService.ts         # SMS operations
│   ├── MessageParserService.ts # Message parsing
│   ├── AssignmentService.ts  # Assignment logic
│   ├── MessageGeneratorService.ts # Message generation
│   └── DateTimeService.ts    # Date/time utilities
├── handlers/                 # Message action handlers
│   ├── MessageActionHandler.ts # Base handler
│   ├── ConfirmationHandler.ts
│   ├── HelpRequestHandler.ts
│   ├── OptOutHandler.ts
│   └── UnknownMessageHandler.ts
├── MessageRouter.ts          # New IncomingMessageService
├── ReminderOrchestrator.ts   # New ReminderService
├── ServiceContainer.ts       # Dependency injection
└── schedulerService.ts       # Unchanged
```

## Migration Steps

### 1. Update Imports
Replace old service imports with new ones:

```typescript
// OLD
import { IncomingMessageService } from './services/IncomingMessageService';

// NEW
import { getMessageRouter } from './services/ServiceContainer';
```

### 2. Update Service Usage

#### Incoming Messages
```typescript
// OLD
const service = new IncomingMessageService();
const result = await service.processIncomingMessage(phone, message);

// NEW
const router = getMessageRouter();
const result = await router.processIncomingMessage(phone, message);
```

#### Reminders
```typescript
// OLD
const reminderService = new ReminderService();
const results = await reminderService.processScheduledReminders();

// NEW
const orchestrator = getReminderOrchestrator();
const results = await orchestrator.processScheduledReminders();
```

#### Scheduler
```typescript
// OLD
const scheduler = new SchedulerService(reminderService);

// NEW
const scheduler = getSchedulerService();
```

### 3. Testing Updates

#### Unit Testing
```typescript
// OLD - Hard to test monolithic service
const service = new IncomingMessageService();
// Difficult to mock dependencies

// NEW - Easy to test individual components
const smsService = new SMSService();
const handler = new ConfirmationHandler(assignmentService, smsService, messageGenerator);
// Easy to mock and test
```

#### Integration Testing
```typescript
// NEW - Test with service container
const container = ServiceContainer.getInstance();
const router = container.getMessageRouter();
// Test full integration
```

## Key Improvements

### 1. Single Responsibility
- Each service has one clear purpose
- Easy to understand and maintain
- Changes are isolated

### 2. Reusability
- Shared services used across different contexts
- No code duplication
- Consistent behavior

### 3. Testability
- Easy to mock individual components
- Clear dependencies
- Isolated unit tests

### 4. Extensibility
- Easy to add new message handlers
- Simple to add new reminder types
- Clear extension points

### 5. Dependency Management
- Service container handles dependencies
- Easy to swap implementations
- Clear service lifecycle

## Backward Compatibility

The old services are still available but deprecated. The new services provide the same public API with improved internal architecture.

## Performance Benefits

- **Reduced Memory Usage**: Shared services are singletons
- **Faster Startup**: Lazy initialization
- **Better Caching**: Shared state management
- **Improved Error Handling**: Isolated error boundaries

## Monitoring & Debugging

```typescript
// Get service health status
const container = ServiceContainer.getInstance();
const health = container.getHealthStatus();
console.log('Service Health:', health);

// Get processing statistics
const router = getMessageRouter();
const stats = router.getProcessingStats();
console.log('Router Stats:', stats);
```

## Next Steps

1. Update all imports to use new services
2. Update tests to use new architecture
3. Remove old service files after migration
4. Add monitoring and logging
5. Consider adding service interfaces for better abstraction
