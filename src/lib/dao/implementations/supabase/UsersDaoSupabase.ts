import { createClient } from "../../../supabase/server";
import { IUsers } from "../../interfaces/IUsers";
import { User } from "@/model/interfaces/User";

export class UsersDaoSupabase implements IUsers {
  async getUsers(): Promise<User[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("users").select("*");

    if (error) {
      console.error("Error fetching users:", error);
      throw new Error(JSON.stringify(error));
    }

    return data || [];
  }

  async insertUsers(
    users: {
      first_name: string;
      last_name: string;
      role: "MANAGER" | "ASSOCIATE";
      email?: string | null;
      phone_number: string;
      sms_opt_out?: boolean | null;
      whatsapp?: string | null;
      auth_id?: string | null;
    }[]
  ): Promise<User[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("users").insert(users).select();

    if (error) {
      console.error("Error inserting users:", error);
      throw new Error(JSON.stringify(error));
    }

    return data || [];
  }

  async updateUser(
    id: string,
    updates: Partial<{
      first_name: string;
      last_name: string;
      role: "MANAGER" | "ASSOCIATE";
      email: string | null;
      phone_number: string;
      sms_opt_out: boolean | null;
      whatsapp: string | null;
      auth_id: string | null;
    }>
  ): Promise<User[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error updating user:", error);
      throw new Error(JSON.stringify(error));
    }

    return data || [];
  }

  async deleteUser(id: string): Promise<{ success: boolean }> {
    const supabase = await createClient();
    const { error } = await supabase.from("users").delete().eq("id", id);

    if (error) {
      console.error("Error deleting user:", error);
      throw new Error(JSON.stringify(error));
    }

    return { success: true };
  }

  async getUserById(id: string): Promise<User | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching user by ID:", error);
      return null;
    }

    return data;
  }

  async getUserByPhone(phoneNumber: string): Promise<User | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("phone_number", phoneNumber)
      .single();

    if (error) {
      console.error("Error fetching user by phone:", error);
      return null;
    }

    return data;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (error) {
      console.error("Error fetching user by email:", error);
      return null;
    }

    return data;
  }

  async getUsersByRole(role: "MANAGER" | "ASSOCIATE"): Promise<User[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", role);

    if (error) {
      console.error("Error fetching users by role:", error);
      throw new Error(JSON.stringify(error));
    }

    return data || [];
  }
}
