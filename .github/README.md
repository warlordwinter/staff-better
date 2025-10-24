# Staff Better

**Staff Better** is a communication platform for temp agencies remind their employees about upcoming jobs. This reduces the amount of "no shows" coming to a job.

## What We Do

### Core Problem We Solve

- **No-Show Reduction**: Staffing agencies lose significant revenue and client satisfaction due to temporary workers not showing up for scheduled shifts
- **Communication Gap**: Manual reminder processes are time-consuming and often ineffective
- **Scheduling Complexity**: Managing hundreds of temporary workers across multiple job sites and time zones

### Key Features

1. **Automated SMS Reminder System**

   - Sends strategic reminders 2 days before, 1 day before, and morning-of work assignments
   - Intelligent timing based on work start times and time zones
   - Rate limiting and retry mechanisms to ensure reliable delivery

2. **Associate Management**

   - Comprehensive associate database with contact information
   - Job assignment tracking and status management
   - Confirmation status tracking (Confirmed, Unconfirmed, No Response)

3. **Job Assignment System**

   - Create and manage job postings with customer details
   - Assign associates to specific jobs with work dates and times
   - Track reminder counts and confirmation status

4. **Two-Way Communication**

   - Associates can respond to SMS messages with confirmations
   - Automatic opt-out handling for associates who don't want reminders
   - Help system for associates to get assistance

5. **Company Setup & Onboarding**
   - Streamlined company registration process
   - Integration with Microsoft Azure AD for enterprise authentication
   - Google OAuth for smaller organizations

## Tech Stack

### Frontend & Framework

- **Next.js 15.3.5** - React-based full-stack framework with App Router
- **React 19.1.1** - Modern React with latest features
- **TypeScript 5** - Full type safety across the application
- **Tailwind CSS 4** - Utility-first CSS framework for styling

### Backend & Database

- **Supabase** - PostgreSQL database with real-time capabilities
  - Authentication and user management
  - Database operations with type-safe queries
  - Real-time subscriptions for live updates
- **Next.js API Routes** - Serverless API endpoints
- **Server-Side Rendering (SSR)** - Optimized performance and SEO

### Messaging & Communication

- **Twilio** - SMS messaging service for reminders
  - A2P 10DLC compliance for business messaging
  - Webhook handling for incoming messages
  - Phone number formatting and validation

### Authentication & Security

- **Supabase Auth** - Primary authentication system
- **Microsoft Azure AD** - Enterprise authentication integration
- **Google OAuth** - Alternative authentication method
- **Middleware-based route protection**

### AI & Data Processing

- **OpenAI API** - Intelligent column mapping for Excel imports
- **Google Gemini API** - Alternative AI service for data processing
- **ExcelJS** - Excel file parsing and processing

### Testing & Quality Assurance

- **Jest** - Unit testing framework
- **React Testing Library** - Component testing
- **Playwright** - End-to-end testing
- **TypeScript** - Compile-time error checking

### DevOps & Deployment

- **Vercel** - Hosting and deployment platform
- **GitHub Actions** - CI/CD pipeline
- **Automated Cron Jobs** - Scheduled reminder processing every 15 minutes
- **Environment-based configuration**

### Architecture Patterns

- **SOLID Principles** - Clean, maintainable code architecture
- **Dependency Injection** - Loose coupling between services
- **Repository Pattern** - Data access abstraction
- **Service Container** - Centralized dependency management
- **Strategy Pattern** - Pluggable message handlers

## How It Works

### 1. **Company Onboarding**

- Companies sign up and complete setup form
- Configure company information and preferences
- Set up authentication (Azure AD or Google)

### 2. **Job Management**

- Create job postings with customer details, work dates, and times
- Import associate data via Excel files with AI-powered column mapping
- Assign associates to specific jobs

### 3. **Automated Reminder System**

- **Scheduler Service** runs every 15 minutes via GitHub Actions
- **Reminder Service** identifies due reminders based on:
  - 2 days before work date
  - 1 day before work date
  - Morning of work (1-2 hours before start time)
- **Message Service** sends personalized SMS reminders via Twilio
- **Rate limiting** prevents message spam and ensures compliance

### 4. **Associate Interaction**

- Associates receive SMS reminders with job details
- Can respond with confirmations, help requests, or opt-out
- **Incoming Message Service** processes responses automatically
- Status updates are reflected in real-time in the dashboard

### 5. **Monitoring & Analytics**

- Real-time dashboard showing job assignments and status
- Reminder tracking and success rates
- Associate confirmation status monitoring
- Comprehensive logging and error handling

## Business Impact

- **Reduced No-Shows**: Automated reminders significantly decrease no-show rates
- **Time Savings**: Eliminates manual reminder processes
- **Compliance**: Built-in TCPA and A2P 10DLC compliance
- **Scalability**: Handles hundreds of associates across multiple time zones
- **Cost Efficiency**: Reduces lost revenue from no-shows and manual processes
