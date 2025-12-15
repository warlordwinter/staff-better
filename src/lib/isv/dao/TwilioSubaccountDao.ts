// DAO for Twilio Subaccounts
import { createAdminClient } from '@/lib/supabase/admin';
import { TwilioSubaccount } from '../types';
import { encrypt } from '../encryption/encrypt';

export class TwilioSubaccountDao {
  private supabase = createAdminClient();

  async create(
    customerId: string,
    subaccountSid: string,
    authToken: string,
    friendlyName?: string
  ): Promise<TwilioSubaccount> {
    // Encrypt the auth token before storing
    const encryptedToken = encrypt(authToken);

    const { data, error } = await this.supabase
      .from('twilio_subaccounts')
      .insert({
        customer_id: customerId,
        subaccount_sid: subaccountSid,
        auth_token_encrypted: encryptedToken,
        friendly_name: friendlyName,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create Twilio subaccount: ${error.message}`);
    }

    return data as TwilioSubaccount;
  }

  async findByCustomerId(customerId: string): Promise<TwilioSubaccount | null> {
    const { data, error } = await this.supabase
      .from('twilio_subaccounts')
      .select('*')
      .eq('customer_id', customerId)
      .eq('status', 'active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find Twilio subaccount: ${error.message}`);
    }

    return data as TwilioSubaccount;
  }

  async findBySubaccountSid(subaccountSid: string): Promise<TwilioSubaccount | null> {
    const { data, error } = await this.supabase
      .from('twilio_subaccounts')
      .select('*')
      .eq('subaccount_sid', subaccountSid)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find Twilio subaccount by SID: ${error.message}`);
    }

    return data as TwilioSubaccount;
  }

  async getDecryptedAuthToken(subaccountId: string): Promise<string> {
    const { decrypt } = await import('../encryption/encrypt');
    const subaccount = await this.findById(subaccountId);
    
    if (!subaccount) {
      throw new Error('Subaccount not found');
    }

    return decrypt(subaccount.auth_token_encrypted);
  }

  async getDecryptedAuthTokenBySid(subaccountSid: string): Promise<string> {
    const { decrypt } = await import('../encryption/encrypt');
    const subaccount = await this.findBySubaccountSid(subaccountSid);
    
    if (!subaccount) {
      throw new Error('Subaccount not found');
    }

    return decrypt(subaccount.auth_token_encrypted);
  }

  async findById(id: string): Promise<TwilioSubaccount | null> {
    const { data, error } = await this.supabase
      .from('twilio_subaccounts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find Twilio subaccount: ${error.message}`);
    }

    return data as TwilioSubaccount;
  }

  async updateStatus(id: string, status: TwilioSubaccount['status']): Promise<void> {
    const { error } = await this.supabase
      .from('twilio_subaccounts')
      .update({ status })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update subaccount status: ${error.message}`);
    }
  }
}

