import { createClient } from "@/lib/supabase/server";
import { IUsers } from "@/lib/dao/interfaces/IUsers";
import { User, UserInsert, UserUpdate } from "@/model/interfaces/User";

export class UsersDaoSupabase implements IUsers {
  async createUser(userData: UserInsert): Promise<User> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("users")
      .insert(userData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return data;
  }

  async getUserById(id: string): Promise<User | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // No rows returned
      }
      throw new Error(`Failed to get user: ${error.message}`);
    }

    return data;
  }

  async getUserByAuthId(authId: string): Promise<User | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("auth_id", authId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // No rows returned
      }
      throw new Error(`Failed to get user by auth ID: ${error.message}`);
    }

    return data;
  }

  async updateUser(id: string, userData: UserUpdate): Promise<User> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("users")
      .update(userData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return data;
  }

  async deleteUser(id: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase.from("users").delete().eq("id", id);

    if (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  async getAllUsers(): Promise<User[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to get users: ${error.message}`);
    }

    return data || [];
  }
}
