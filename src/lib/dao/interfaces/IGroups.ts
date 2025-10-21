import { Group } from "@/model/interfaces/Group";

export interface IGroups {
  getGroups(): Promise<Group[]>;
  getGroupsByCompanyId(companyId: string): Promise<Group[]>;
  insertGroups(
    groups: {
      company_id: string;
      name: string;
      description?: string | null;
    }[]
  ): Promise<Group[]>;
  updateGroup(
    id: string,
    updates: Partial<{
      company_id: string;
      name: string;
      description: string | null;
    }>
  ): Promise<Group[]>;
  deleteGroup(id: string): Promise<{ success: boolean }>;
  getGroupById(id: string): Promise<Group | null>;
  addUserToGroup(groupId: string, userId: string): Promise<void>;
  removeUserFromGroup(groupId: string, userId: string): Promise<void>;
  getGroupMembers(groupId: string): Promise<string[]>; // Returns array of user IDs
}
