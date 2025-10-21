import { createClient } from "../../../supabase/server";
import { IGroups } from "../../interfaces/IGroups";
import { Group } from "@/model/interfaces/Group";

export class GroupsDaoSupabase implements IGroups {
  async getGroups(): Promise<Group[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from("groups").select("*");

    if (error) {
      console.error("Error fetching groups:", error);
      throw new Error(JSON.stringify(error));
    }

    return data || [];
  }

  async getGroupsByCompanyId(companyId: string): Promise<Group[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .eq("company_id", companyId);

    if (error) {
      console.error("Error fetching groups by company ID:", error);
      throw new Error(JSON.stringify(error));
    }

    return data || [];
  }

  async insertGroups(
    groups: {
      company_id: string;
      name: string;
      description?: string | null;
    }[]
  ): Promise<Group[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("groups")
      .insert(groups)
      .select();

    if (error) {
      console.error("Error inserting groups:", error);
      throw new Error(JSON.stringify(error));
    }

    return data || [];
  }

  async updateGroup(
    id: string,
    updates: Partial<{
      company_id: string;
      name: string;
      description: string | null;
    }>
  ): Promise<Group[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("groups")
      .update(updates)
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error updating group:", error);
      throw new Error(JSON.stringify(error));
    }

    return data || [];
  }

  async deleteGroup(id: string): Promise<{ success: boolean }> {
    const supabase = await createClient();
    const { error } = await supabase.from("groups").delete().eq("id", id);

    if (error) {
      console.error("Error deleting group:", error);
      throw new Error(JSON.stringify(error));
    }

    return { success: true };
  }

  async getGroupById(id: string): Promise<Group | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("groups")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching group by ID:", error);
      return null;
    }

    return data;
  }

  async addUserToGroup(groupId: string, userId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("group_members")
      .insert({ group_id: groupId, user_id: userId });

    if (error) {
      console.error("Error adding user to group:", error);
      throw new Error(JSON.stringify(error));
    }
  }

  async removeUserFromGroup(groupId: string, userId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error removing user from group:", error);
      throw new Error(JSON.stringify(error));
    }
  }

  async getGroupMembers(groupId: string): Promise<string[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId);

    if (error) {
      console.error("Error fetching group members:", error);
      throw new Error(JSON.stringify(error));
    }

    return data?.map((member) => member.user_id) || [];
  }
}
