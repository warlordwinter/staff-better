// DAO for ISV Numbers
import { createAdminClient } from '@/lib/supabase/admin';
import { ISVNumber } from '../types';

export class ISVNumberDao {
  private supabase = createAdminClient();

  async create(data: {
    customer_id: string;
    twilio_number_sid: string;
    phone_number: string;
    messaging_service_sid?: string;
    country_code?: string;
    provisioned_for_whatsapp?: boolean;
  }): Promise<ISVNumber> {
    const { data: number, error } = await this.supabase
      .from('isv_numbers')
      .insert({
        customer_id: data.customer_id,
        twilio_number_sid: data.twilio_number_sid,
        phone_number: data.phone_number,
        messaging_service_sid: data.messaging_service_sid,
        country_code: data.country_code,
        provisioned_for_whatsapp: data.provisioned_for_whatsapp || false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create number: ${error.message}`);
    }

    return number as ISVNumber;
  }

  async findById(id: string): Promise<ISVNumber | null> {
    const { data, error } = await this.supabase
      .from('isv_numbers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find number: ${error.message}`);
    }

    return data as ISVNumber;
  }

  async findByCustomerId(customerId: string): Promise<ISVNumber[]> {
    const { data, error } = await this.supabase
      .from('isv_numbers')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find numbers: ${error.message}`);
    }

    return (data || []) as ISVNumber[];
  }

  async findByPhoneNumber(phoneNumber: string): Promise<ISVNumber | null> {
    const { data, error } = await this.supabase
      .from('isv_numbers')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find number: ${error.message}`);
    }

    return data as ISVNumber;
  }

  async update(id: string, updates: Partial<ISVNumber>): Promise<ISVNumber> {
    const { data, error } = await this.supabase
      .from('isv_numbers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update number: ${error.message}`);
    }

    return data as ISVNumber;
  }
}

