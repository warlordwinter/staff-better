// DAO for Templates
import { createAdminClient } from '@/lib/supabase/admin';
import { Template } from '../types';

export class TemplateDao {
  private supabase = createAdminClient();

  async create(data: {
    customer_id: string;
    template_name: string;
    body: string;
    category?: Template['category'];
    language?: string;
    twilio_template_id?: string;
    status?: Template['status'];
  }): Promise<Template> {
    const { data: template, error } = await this.supabase
      .from('templates')
      .insert({
        customer_id: data.customer_id,
        template_name: data.template_name,
        body: data.body,
        category: data.category,
        language: data.language || 'en',
        twilio_template_id: data.twilio_template_id,
        status: data.status || 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create template: ${error.message}`);
    }

    return template as Template;
  }

  async findById(id: string): Promise<Template | null> {
    const { data, error } = await this.supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to find template: ${error.message}`);
    }

    return data as Template;
  }

  async findByCustomerId(customerId: string): Promise<Template[]> {
    const { data, error } = await this.supabase
      .from('templates')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find templates: ${error.message}`);
    }

    return (data || []) as Template[];
  }

  async update(id: string, updates: Partial<Template>): Promise<Template> {
    const { data, error } = await this.supabase
      .from('templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update template: ${error.message}`);
    }

    return data as Template;
  }
}

