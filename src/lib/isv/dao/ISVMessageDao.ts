// DAO for ISV Messages
import { createAdminClient } from '@/lib/supabase/admin';
import { ISVMessage } from '../types';

export class ISVMessageDao {
  private supabase = createAdminClient();

  async create(data: {
    customer_id: string;
    direction: 'inbound' | 'outbound';
    to_number: string;
    from_number: string;
    body?: string;
    status?: string;
    twilio_sid?: string;
    error_code?: string;
    error_message?: string;
    template_id?: string;
  }): Promise<ISVMessage> {
    const { data: message, error } = await this.supabase
      .from('isv_messages')
      .insert({
        customer_id: data.customer_id,
        direction: data.direction,
        to_number: data.to_number,
        from_number: data.from_number,
        body: data.body,
        status: data.status,
        twilio_sid: data.twilio_sid,
        error_code: data.error_code,
        error_message: data.error_message,
        template_id: data.template_id,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create message: ${error.message}`);
    }

    return message as ISVMessage;
  }

  async findByCustomerId(customerId: string, limit = 100): Promise<ISVMessage[]> {
    const { data, error } = await this.supabase
      .from('isv_messages')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to find messages: ${error.message}`);
    }

    return (data || []) as ISVMessage[];
  }

  async updateByTwilioSid(twilioSid: string, updates: Partial<ISVMessage>): Promise<void> {
    const { error } = await this.supabase
      .from('isv_messages')
      .update(updates)
      .eq('twilio_sid', twilioSid);

    if (error) {
      throw new Error(`Failed to update message: ${error.message}`);
    }
  }
}

