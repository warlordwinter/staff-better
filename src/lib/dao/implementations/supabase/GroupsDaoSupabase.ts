import { createClient } from "@/lib/supabase/server";
import { IGroups } from "../../interfaces/IGroups";

export class GroupsDaoSupabase implements IGroups {
  /**
   * Get all groups for a company with member counts
   */
  async getGroups(companyId: string) {
    const supabase = await createClient();

    // Get groups with member counts
    const { data: groups, error: groupsError } = await supabase
      .from("groups")
      .select(
        `
        id,
        company_id,
        name,
        description,
        created_at,
        updated_at
      `
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (groupsError) {
      console.error("Supabase fetch groups error:", groupsError);
      throw new Error("Failed to fetch groups");
    }

    // Get member counts for each group
    const groupsWithCounts = await Promise.all(
      (groups || []).map(async (group) => {
        const { count, error: countError } = await supabase
          .from("group_members")
          .select("*", { count: "exact", head: true })
          .eq("group_id", group.id);

        if (countError) {
          console.warn(`Error counting members for group ${group.id}:`, countError);
        }

        return {
          ...group,
          member_count: count || 0,
        };
      })
    );

    return groupsWithCounts;
  }

  /**
   * Get a single group by ID
   */
  async getGroupById(groupId: string, companyId: string) {
    const supabase = await createClient();

    const { data: group, error } = await supabase
      .from("groups")
      .select(
        `
        id,
        company_id,
        name,
        description,
        created_at,
        updated_at
      `
      )
      .eq("id", groupId)
      .eq("company_id", companyId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return null;
      }
      console.error("Supabase fetch group error:", error);
      throw new Error("Failed to fetch group");
    }

    // Get member count
    const { count, error: countError } = await supabase
      .from("group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    if (countError) {
      console.warn(`Error counting members for group ${groupId}:`, countError);
    }

    return {
      ...group,
      member_count: count || 0,
    };
  }

  /**
   * Create a new group
   */
  async createGroup(group: {
    company_id: string;
    name: string;
    description?: string | null;
  }) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("groups")
      .insert({
        company_id: group.company_id,
        name: group.name,
        description: group.description || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase create group error:", error);
      throw new Error("Failed to create group");
    }

    return data;
  }

  /**
   * Update an existing group
   */
  async updateGroup(
    groupId: string,
    companyId: string,
    updates: {
      name?: string;
      description?: string | null;
    }
  ) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("groups")
      .update(updates)
      .eq("id", groupId)
      .eq("company_id", companyId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return null;
      }
      console.error("Supabase update group error:", error);
      throw new Error("Failed to update group");
    }

    return data;
  }

  /**
   * Delete a group
   */
  async deleteGroup(groupId: string, companyId: string) {
    const supabase = await createClient();

    const { error } = await supabase
      .from("groups")
      .delete()
      .eq("id", groupId)
      .eq("company_id", companyId);

    if (error) {
      console.error("Supabase delete group error:", error);
      throw new Error("Failed to delete group");
    }

    return { success: true };
  }

  /**
   * Get all members of a group
   */
  async getGroupMembers(groupId: string, companyId: string) {
    const supabase = await createClient();

    // First verify the group belongs to the company
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("id")
      .eq("id", groupId)
      .eq("company_id", companyId)
      .single();

    if (groupError || !group) {
      throw new Error("Group not found or access denied");
    }

    // Get member IDs first
    const { data: groupMembers, error: membersError } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", groupId);

    if (membersError) {
      console.error("Supabase fetch group members error:", membersError);
      throw new Error("Failed to fetch group members");
    }

    // If no members, return empty array
    if (!groupMembers || groupMembers.length === 0) {
      return [];
    }

    // Get user details for all members
    const userIds = groupMembers.map((m) => m.user_id);
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, first_name, last_name, phone_number, email, sms_opt_out")
      .in("id", userIds);

    if (usersError) {
      console.error("Supabase fetch users error:", usersError);
      throw new Error("Failed to fetch user details");
    }

    // Map to the expected format (using email instead of email_address)
    return (users || []).map((user) => ({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number,
      email_address: user.email, // Map email to email_address for consistency
      sms_opt_out: user.sms_opt_out,
    }));
  }

  /**
   * Add a member to a group
   */
  async addMember(groupId: string, userId: string) {
    const supabase = await createClient();

    const { error } = await supabase
      .from("group_members")
      .insert({
        group_id: groupId,
        user_id: userId,
      });

    if (error) {
      // Check if it's a duplicate key error (member already in group)
      if (error.code === "23505") {
        console.log("Member already in group, skipping");
        return { success: true };
      }
      console.error("Supabase add member error:", error);
      throw new Error("Failed to add member to group");
    }

    return { success: true };
  }

  /**
   * Remove a member from a group
   */
  async removeMember(groupId: string, userId: string) {
    const supabase = await createClient();

    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);

    if (error) {
      console.error("Supabase remove member error:", error);
      throw new Error("Failed to remove member from group");
    }

    return { success: true };
  }

  /**
   * Add multiple members to a group
   */
  async addMembers(groupId: string, userIds: string[]) {
    const supabase = await createClient();

    const membersToInsert = userIds.map((userId) => ({
      group_id: groupId,
      user_id: userId,
    }));

    const { error } = await supabase
      .from("group_members")
      .insert(membersToInsert);

    if (error) {
      // If there are duplicate key errors, that's okay
      if (error.code === "23505") {
        console.log("Some members already in group, skipping duplicates");
        return { success: true };
      }
      console.error("Supabase add members error:", error);
      throw new Error("Failed to add members to group");
    }

    return { success: true };
  }
}


