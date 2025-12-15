// DAO for Webhook Events
import { createAdminClient } from '@/lib/supabase/admin';
import { WebhookEvent } from '../types';

export class WebhookEventDao {
  private supabase = createAdminClient();

  async create(data: {
    event_type: string;
    event_payload: Record<string, unknown>;
    customer_id?: string;
  }): Promise<WebhookEvent> {
    const { data: event, error } = await this.supabase
      .from('webhook_events')
      .insert({
        event_type: data.event_type,
        event_payload: data.event_payload,
        customer_id: data.customer_id,
        processed: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create webhook event: ${error.message}`);
    }

    return event as WebhookEvent;
  }

  async markProcessed(id: string, error?: string): Promise<void> {
    const { error: updateError } = await this.supabase
      .from('webhook_events')
      .update({
        processed: true,
        error: error || null,
        processed_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      throw new Error(`Failed to mark webhook event as processed: ${updateError.message}`);
    }
  }

  async findUnprocessed(limit = 100): Promise<WebhookEvent[]> {
    const { data, error } = await this.supabase
      .from('webhook_events')
      .select('*')
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to find unprocessed webhook events: ${error.message}`);
    }

    return (data || []) as WebhookEvent[];
  }
}

