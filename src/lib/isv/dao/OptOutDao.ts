// DAO for Opt-outs
import { createAdminClient } from '@/lib/supabase/admin';
import { OptOut } from '../types';

export class OptOutDao {
  private supabase = createAdminClient();

  async create(data: {
    customer_id: string;
    phone_number: string;
    opt_out_type?: OptOut['opt_out_type'];
    opt_out_method?: OptOut['opt_out_method'];
    opt_in_proof?: Record<string, unknown>;
  }): Promise<OptOut> {
    const { data: optOut, error } = await this.supabase
      .from('opt_outs')
      .insert({
        customer_id: data.customer_id,
        phone_number: data.phone_number,
        opt_out_type: data.opt_out_type || 'SMS',
        opt_out_method: data.opt_out_method || 'STOP',
        opt_in_proof: data.opt_in_proof,
      })
      .select()
      .single();

    if (error) {
      // If duplicate, update existing record
      if (error.code === '23505') {
        const existing = await this.findByCustomerAndPhone(data.customer_id, data.phone_number, data.opt_out_type);
        if (existing) {
          return existing;
        }
      }
      throw new Error(`Failed to create opt-out: ${error.message}`);
    }

    return optOut as OptOut;
  }

  async findByCustomerAndPhone(
    customerId: string,
    phoneNumber: string,
    optOutType?: OptOut['opt_out_type']
  ): Promise<OptOut | null> {
    let query = this.supabase
      .from('opt_outs')
      .select('*')
      .eq('customer_id', customerId)
      .eq('phone_number', phoneNumber);

    if (optOutType) {
      query = query.eq('opt_out_type', optOutType);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find opt-out: ${error.message}`);
    }

    return data as OptOut;
  }

  async isOptedOut(
    customerId: string,
    phoneNumber: string,
    optOutType?: OptOut['opt_out_type']
  ): Promise<boolean> {
    const optOut = await this.findByCustomerAndPhone(customerId, phoneNumber, optOutType);
    return optOut !== null;
  }

  async remove(
    customerId: string,
    phoneNumber: string,
    optOutType?: OptOut['opt_out_type']
  ): Promise<void> {
    let query = this.supabase
      .from('opt_outs')
      .delete()
      .eq('customer_id', customerId)
      .eq('phone_number', phoneNumber);

    if (optOutType) {
      query = query.eq('opt_out_type', optOutType);
    }

    const { error } = await query;

    if (error) {
      throw new Error(`Failed to remove opt-out: ${error.message}`);
    }
  }
}

