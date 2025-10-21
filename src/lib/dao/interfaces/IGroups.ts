export interface IGroups {
  /**
   * Get all groups for a company
   */
  getGroups(companyId: string): Promise<
    {
      id: string;
      company_id: string;
      name: string;
      description: string | null;
      created_at: string;
      updated_at: string;
      member_count?: number;
    }[]
  >;

  /**
   * Get a single group by ID
   */
  getGroupById(
    groupId: string,
    companyId: string
  ): Promise<{
    id: string;
    company_id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    member_count?: number;
  } | null>;

  /**
   * Create a new group
   */
  createGroup(group: {
    company_id: string;
    name: string;
    description?: string | null;
  }): Promise<{
    id: string;
    company_id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
  }>;

  /**
   * Update an existing group
   */
  updateGroup(
    groupId: string,
    companyId: string,
    updates: {
      name?: string;
      description?: string | null;
    }
  ): Promise<{
    id: string;
    company_id: string;
    name: string;
    description: string | null;
    created_at: string;
    updated_at: string;
  } | null>;

  /**
   * Delete a group
   */
  deleteGroup(groupId: string, companyId: string): Promise<{ success: boolean }>;

  /**
   * Get all members of a group
   */
  getGroupMembers(
    groupId: string,
    companyId: string
  ): Promise<
    {
      id: string;
      first_name: string | null;
      last_name: string | null;
      phone_number: string;
      email_address: string | null;
      sms_opt_out: boolean | null;
    }[]
  >;

  /**
   * Add a member to a group
   */
  addMember(groupId: string, associateId: string): Promise<{ success: boolean }>;

  /**
   * Remove a member from a group
   */
  removeMember(groupId: string, associateId: string): Promise<{ success: boolean }>;

  /**
   * Add multiple members to a group
   */
  addMembers(groupId: string, associateIds: string[]): Promise<{ success: boolean }>;
}


