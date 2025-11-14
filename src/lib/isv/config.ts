// ISV Platform Configuration

export const ISV_CONFIG = {
  // Twilio Master Account (ISV account)
  twilio: {
    masterAccountSid: process.env.TWILIO_MASTER_ACCOUNT_SID || '',
    masterAuthToken: process.env.TWILIO_MASTER_AUTH_TOKEN || '',
  },
  
  // Encryption (for storing subaccount tokens)
  encryption: {
    // In production, use AWS KMS, Google Cloud KMS, or similar
    // For now, we'll use environment variable encryption key
    encryptionKey: process.env.ENCRYPTION_KEY || '',
  },
  
  // Webhook configuration
  webhooks: {
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || '',
    inboundPath: '/api/isv/webhooks/twilio/inbound',
    statusCallbackPath: '/api/isv/webhooks/twilio/status',
  },
  
  // Queue configuration (for background jobs)
  queue: {
    // Redis connection string if using BullMQ
    redisUrl: process.env.REDIS_URL || '',
  },
  
  // Storage (for documents)
  storage: {
    // S3 or similar configuration
    bucketName: process.env.S3_BUCKET_NAME || '',
    region: process.env.S3_REGION || 'us-east-1',
  },
  
  // Monitoring
  monitoring: {
    // Datadog, Prometheus, etc.
    enabled: process.env.MONITORING_ENABLED === 'true',
  },
} as const;

// Validate required environment variables
export function validateISVConfig(): void {
  const required = [
    'TWILIO_MASTER_ACCOUNT_SID',
    'TWILIO_MASTER_AUTH_TOKEN',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required ISV environment variables: ${missing.join(', ')}`
    );
  }
}

