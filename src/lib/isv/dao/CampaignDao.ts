// DAO for Campaigns
import { createAdminClient } from '@/lib/supabase/admin';
import { Campaign } from '../types';

export class CampaignDao {
  private supabase = createAdminClient();

  async create(data: {
    customer_id: string;
    brand_id: string;
    campaign_sid?: string;
    use_case?: string;
    sample_message?: string;
    estimated_volume?: number;
    messaging_service_sid?: string;
    status?: Campaign['status'];
  }): Promise<Campaign> {
    const { data: campaign, error } = await this.supabase
      .from('campaigns')
      .insert({
        customer_id: data.customer_id,
        brand_id: data.brand_id,
        campaign_sid: data.campaign_sid,
        use_case: data.use_case,
        sample_message: data.sample_message,
        estimated_volume: data.estimated_volume,
        messaging_service_sid: data.messaging_service_sid,
        status: data.status || 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create campaign: ${error.message}`);
    }

    return campaign as Campaign;
  }

  async findById(id: string): Promise<Campaign | null> {
    const { data, error } = await this.supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find campaign: ${error.message}`);
    }

    return data as Campaign;
  }

  async findByCustomerId(customerId: string): Promise<Campaign[]> {
    const { data, error } = await this.supabase
      .from('campaigns')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find campaigns: ${error.message}`);
    }

    return (data || []) as Campaign[];
  }

  async findByBrandId(brandId: string): Promise<Campaign[]> {
    const { data, error } = await this.supabase
      .from('campaigns')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find campaigns: ${error.message}`);
    }

    return (data || []) as Campaign[];
  }

  async update(id: string, updates: Partial<Campaign>): Promise<Campaign> {
    const { data, error } = await this.supabase
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update campaign: ${error.message}`);
    }

    return data as Campaign;
  }
}

