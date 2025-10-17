import { Group } from "@/model/interfaces/Group";
import { AssociateGroup } from "@/model/interfaces/AssociateGroup";

/**
 * Groups Data Service
 * 
 * This service handles all data operations for groups and associates.
 * Currently uses mock data, but is structured for easy database integration.
 * 
 * TODO FOR DATABASE INTEGRATION:
 * 1. Replace mock data with actual API calls
 * 2. Add proper error handling
 * 3. Add loading states
 * 4. Add caching if needed
 * 5. Add optimistic updates for better UX
 */

// Mock data - Replace with actual database calls
const MOCK_GROUPS: Group[] = [
  {
    id: "1",
    name: "All Associates",
    description: "All company associates",
    totalAssociates: 107,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01")
  },
  {
    id: "2", 
    name: "Forklift Drivers",
    description: "Certified forklift operators",
    totalAssociates: 107,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01")
  },
  {
    id: "3",
    name: "Welders", 
    description: "Skilled welding professionals",
    totalAssociates: 107,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01")
  }
];

const MOCK_ASSOCIATES: AssociateGroup[] = [
  {
    id: "1",
    firstName: "John",
    lastName: "Gilbert",
    phoneNumber: "+1(801)-364-7666",
    emailAddress: "example@example.com",
    groupId: "1", // All Associates
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01")
  },
  {
    id: "2",
    firstName: "Henrietta",
    lastName: "Whitney",
    phoneNumber: "+1(801)-321-4456",
    emailAddress: "john@mailinator.com",
    groupId: "1", // All Associates
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01")
  },
  {
    id: "3",
    firstName: "Seth",
    lastName: "McDaniel",
    phoneNumber: "+1(385)-165-4625",
    emailAddress: "mark@gmail.com",
    groupId: "2", // Forklift Drivers
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01")
  },
  {
    id: "4",
    firstName: "Edward",
    lastName: "King",
    phoneNumber: "+1(480)-608-5985",
    emailAddress: "zuchman@gmail.com",
    groupId: "3", // Welders
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01")
  }
];

/**
 * Groups API - Replace with actual API calls
 */
export class GroupsDataService {
  /**
   * Fetch all groups
   * TODO: Replace with: const response = await fetch('/api/groups');
   */
  static async fetchGroups(): Promise<Group[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return [...MOCK_GROUPS];
  }

  /**
   * Fetch a specific group by ID
   * TODO: Replace with: const response = await fetch(`/api/groups/${id}`);
   */
  static async fetchGroupById(id: string): Promise<Group | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return MOCK_GROUPS.find(group => group.id === id) || null;
  }

  /**
   * Fetch associates for a specific group
   * TODO: Replace with: const response = await fetch(`/api/groups/${groupId}/associates`);
   */
  static async fetchAssociatesByGroupId(groupId: string): Promise<AssociateGroup[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return MOCK_ASSOCIATES.filter(associate => associate.groupId === groupId);
  }

  /**
   * Create a new group
   * TODO: Replace with: await fetch('/api/groups', { method: 'POST', body: JSON.stringify(groupData) });
   */
  static async createGroup(groupData: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>): Promise<Group> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const newGroup: Group = {
      ...groupData,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    MOCK_GROUPS.push(newGroup);
    return newGroup;
  }

  /**
   * Update an existing group
   * TODO: Replace with: await fetch(`/api/groups/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
   */
  static async updateGroup(id: string, updates: Partial<Group>): Promise<Group | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const groupIndex = MOCK_GROUPS.findIndex(group => group.id === id);
    if (groupIndex === -1) return null;
    
    MOCK_GROUPS[groupIndex] = {
      ...MOCK_GROUPS[groupIndex],
      ...updates,
      updatedAt: new Date()
    };
    
    return MOCK_GROUPS[groupIndex];
  }

  /**
   * Delete a group
   * TODO: Replace with: await fetch(`/api/groups/${id}`, { method: 'DELETE' });
   */
  static async deleteGroup(id: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const groupIndex = MOCK_GROUPS.findIndex(group => group.id === id);
    if (groupIndex === -1) return false;
    
    MOCK_GROUPS.splice(groupIndex, 1);
    return true;
  }

  /**
   * Create a new associate
   * TODO: Replace with: await fetch('/api/associates', { method: 'POST', body: JSON.stringify(associateData) });
   */
  static async createAssociate(associateData: Omit<AssociateGroup, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssociateGroup> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const newAssociate: AssociateGroup = {
      ...associateData,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    MOCK_ASSOCIATES.push(newAssociate);
    return newAssociate;
  }

  /**
   * Update an existing associate
   * TODO: Replace with: await fetch(`/api/associates/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
   */
  static async updateAssociate(id: string, updates: Partial<AssociateGroup>): Promise<AssociateGroup | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const associateIndex = MOCK_ASSOCIATES.findIndex(associate => associate.id === id);
    if (associateIndex === -1) return null;
    
    MOCK_ASSOCIATES[associateIndex] = {
      ...MOCK_ASSOCIATES[associateIndex],
      ...updates,
      updatedAt: new Date()
    };
    
    return MOCK_ASSOCIATES[associateIndex];
  }

  /**
   * Delete an associate
   * TODO: Replace with: await fetch(`/api/associates/${id}`, { method: 'DELETE' });
   */
  static async deleteAssociate(id: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const associateIndex = MOCK_ASSOCIATES.findIndex(associate => associate.id === id);
    if (associateIndex === -1) return false;
    
    MOCK_ASSOCIATES.splice(associateIndex, 1);
    return true;
  }

  /**
   * Send message to individual associate
   * TODO: Replace with: await fetch('/api/messages', { method: 'POST', body: JSON.stringify({ associateId, message }) });
   */
  static async sendMessageToAssociate(associateId: string, message: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Sending message to associate ${associateId}:`, message);
    return true;
  }

  /**
   * Send message to all associates in a group
   * TODO: Replace with: await fetch('/api/messages/mass', { method: 'POST', body: JSON.stringify({ groupId, message }) });
   */
  static async sendMassMessageToGroup(groupId: string, message: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`Sending mass message to group ${groupId}:`, message);
    return true;
  }
}
