// DAO for Brands
import { createAdminClient } from '@/lib/supabase/admin';
import { Brand } from '../types';

export class BrandDao {
  private supabase = createAdminClient();

  async create(data: {
    customer_id: string;
    twilio_brand_sid?: string;
    brand_name?: string;
    brand_type?: string;
    status?: Brand['status'];
  }): Promise<Brand> {
    const { data: brand, error } = await this.supabase
      .from('brands')
      .insert({
        customer_id: data.customer_id,
        twilio_brand_sid: data.twilio_brand_sid,
        brand_name: data.brand_name,
        brand_type: data.brand_type,
        status: data.status || 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create brand: ${error.message}`);
    }

    return brand as Brand;
  }

  async findById(id: string): Promise<Brand | null> {
    const { data, error } = await this.supabase
      .from('brands')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find brand: ${error.message}`);
    }

    return data as Brand;
  }

  async findByCustomerId(customerId: string): Promise<Brand[]> {
    const { data, error } = await this.supabase
      .from('brands')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find brands: ${error.message}`);
    }

    return (data || []) as Brand[];
  }

  async update(id: string, updates: Partial<Brand>): Promise<Brand> {
    const { data, error } = await this.supabase
      .from('brands')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update brand: ${error.message}`);
    }

    return data as Brand;
  }
}

