import { Group } from "@/model/interfaces/Group";
import { AssociateGroup } from "@/model/interfaces/AssociateGroup";

/**
 * Groups Data Service
 *
 * This service handles all data operations for groups and associates.
 * Connects to the backend API for database operations.
 */

/**
 * Groups API Service
 */
export class GroupsDataService {
  /**
   * Fetch all groups for the authenticated user's company
   */
  static async fetchGroups(): Promise<Group[]> {
    const response = await fetch("/api/groups");

    if (!response.ok) {
      throw new Error("Failed to fetch groups");
    }

    const data = await response.json();

    // Transform the API response to match the Group interface
    return data.map((group: any) => ({
      id: group.id,
      group_name: group.group_name,
      description: group.description,
      totalAssociates: group.member_count || 0,
      createdAt: new Date(group.created_at),
    }));
  }

  /**
   * Fetch a specific group by ID
   */
  static async fetchGroupById(id: string): Promise<Group | null> {
    const response = await fetch(`/api/groups/${id}`);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error("Failed to fetch group");
    }

    const group = await response.json();

    return {
      id: group.id,
      group_name: group.group_name,
      description: group.description,
      totalAssociates: group.member_count || 0,
      createdAt: new Date(group.created_at),
    };
  }

  /**
   * Fetch associates for a specific group
   */
  static async fetchAssociatesByGroupId(
    groupId: string
  ): Promise<AssociateGroup[]> {
    const response = await fetch(`/api/groups/${groupId}/members`);

    if (!response.ok) {
      throw new Error("Failed to fetch group members");
    }

    const members = await response.json();

    // Transform the API response to match the AssociateGroup interface
    return members.map((member: any) => ({
      id: member.id,
      firstName: member.first_name || "",
      lastName: member.last_name || "",
      phoneNumber: member.phone_number || "",
      emailAddress: member.email_address || "",
      groupId: groupId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }

  /**
   * Create a new group
   */
  static async createGroup(
    groupData: Omit<Group, "id" | "createdAt" | "updatedAt">
  ): Promise<Group> {
    const response = await fetch("/api/groups", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        group_name: groupData.group_name,
        description: groupData.description,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to create group");
    }

    const group = await response.json();

    return {
      id: group.id,
      group_name: group.group_name,
      description: group.description,
      totalAssociates: 0,
      createdAt: new Date(group.created_at),
    };
  }

  /**
   * Update an existing group
   */
  static async updateGroup(
    id: string,
    updates: Partial<Group>
  ): Promise<Group | null> {
    const response = await fetch(`/api/groups/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        group_name: updates.group_name,
        description: updates.description,
      }),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error("Failed to update group");
    }

    const group = await response.json();

    return {
      id: group.id,
      group_name: group.group_name,
      description: group.description,
      totalAssociates: group.member_count || 0,
      createdAt: new Date(group.created_at),
    };
  }

  /**
   * Delete a group
   */
  static async deleteGroup(id: string): Promise<boolean> {
    const response = await fetch(`/api/groups/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete group");
    }

    return true;
  }

  /**
   * Create a new associate and add to group
   */
  static async createAssociate(
    associateData: Omit<AssociateGroup, "id" | "createdAt" | "updatedAt">
  ): Promise<AssociateGroup> {
    // First, create the associate in the associates table
    const createResponse = await fetch("/api/associates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        first_name: associateData.firstName,
        last_name: associateData.lastName,
        phone_number: associateData.phoneNumber || "000-000-0000", // Required field, provide default
        email_address: associateData.emailAddress || null,
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error("Failed to create associate:", errorText);
      throw new Error("Failed to create associate");
    }

    const newAssociates = await createResponse.json();

    // Debug logging
    console.log("Created associates:", newAssociates);

    // The API returns an array, so get the first (and only) associate
    if (!Array.isArray(newAssociates) || newAssociates.length === 0) {
      throw new Error("No associate was created");
    }

    const newAssociate = newAssociates[0];
    const associateId = newAssociate.id;

    console.log("Associate ID:", associateId, "Type:", typeof associateId);

    // Ensure associateId is a string
    const associateIdString = String(associateId);

    // Then, add the associate to the group
    const addToGroupResponse = await fetch(
      `/api/groups/${associateData.groupId}/members`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          associate_ids: [associateIdString],
        }),
      }
    );

    if (!addToGroupResponse.ok) {
      const errorText = await addToGroupResponse.text();
      console.error("Failed to add associate to group:", errorText);
      throw new Error("Failed to add associate to group");
    }

    return {
      id: associateId,
      firstName: associateData.firstName,
      lastName: associateData.lastName,
      phoneNumber: associateData.phoneNumber,
      emailAddress: associateData.emailAddress,
      groupId: associateData.groupId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Update an existing associate
   */
  static async updateAssociate(
    id: string,
    updates: Partial<AssociateGroup>
  ): Promise<AssociateGroup | null> {
    const response = await fetch(`/api/associates/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        first_name: updates.firstName,
        last_name: updates.lastName,
        phone_number: updates.phoneNumber,
        email_address: updates.emailAddress,
      }),
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error("Failed to update associate");
    }

    const associate = await response.json();
    const updatedAssociate = Array.isArray(associate)
      ? associate[0]
      : associate;

    return {
      id: updatedAssociate.id,
      firstName: updatedAssociate.first_name || "",
      lastName: updatedAssociate.last_name || "",
      phoneNumber: updatedAssociate.phone_number || "",
      emailAddress: updatedAssociate.email_address || "",
      groupId: updates.groupId || "",
      createdAt: new Date(updatedAssociate.created_at || Date.now()),
      updatedAt: new Date(),
    };
  }

  /**
   * Delete an associate (from the database, not just the group)
   */
  static async deleteAssociate(id: string): Promise<boolean> {
    const response = await fetch(`/api/associates/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to delete associate");
    }

    return true;
  }

  /**
   * Send message to individual associate
   */
  static async sendMessageToAssociate(
    associateId: string,
    message: string
  ): Promise<boolean> {
    const response = await fetch(`/api/associates/${associateId}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to send message");
    }

    return true;
  }

  /**
   * Send message to all associates in a group
   */
  static async sendMassMessageToGroup(
    groupId: string,
    message: string
  ): Promise<boolean> {
    const response = await fetch(`/api/groups/${groupId}/message`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to send mass message");
    }

    return true;
  }

  /**
   * Fetch all associates in the company
   */
  static async fetchAllAssociates(): Promise<AssociateGroup[]> {
    const response = await fetch("/api/associates");

    if (!response.ok) {
      throw new Error("Failed to fetch associates");
    }

    const associates = await response.json();

    // Transform the API response to match the AssociateGroup interface
    return associates.map((associate: any) => ({
      id: associate.id,
      firstName: associate.first_name || "",
      lastName: associate.last_name || "",
      phoneNumber: associate.phone_number || "",
      emailAddress: associate.email_address || "",
      groupId: "", // Will be set when adding to a specific group
      createdAt: new Date(associate.created_at || Date.now()),
      updatedAt: new Date(associate.updated_at || Date.now()),
    }));
  }

  /**
   * Add existing associates to a group
   */
  static async addExistingAssociatesToGroup(
    groupId: string,
    userIds: string[]
  ): Promise<boolean> {
    const response = await fetch(`/api/groups/${groupId}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        associate_ids: userIds,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to add users to group");
    }

    return true;
  }

  /**
   * Remove an associate from a group (but keep them in the database)
   */
  static async removeAssociateFromGroup(
    groupId: string,
    associateId: string
  ): Promise<boolean> {
    const response = await fetch(
      `/api/groups/${groupId}/members?associate_id=${associateId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to remove user from group");
    }

    return true;
  }
}
