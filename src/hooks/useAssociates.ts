import { useState, useEffect, useCallback } from "react";
import { AssociateGroup } from "@/model/interfaces/AssociateGroup";
import { GroupsDataService } from "@/lib/services/groupsDataService";

export interface UseAssociatesReturn {
  associates: AssociateGroup[];
  loading: boolean;
  loadAssociates: () => Promise<void>;
  saveAssociate: (updatedAssociate: AssociateGroup) => Promise<void>;
  deleteAssociate: (associateId: string) => Promise<void>;
  createAssociate: (associateData: {
    first_name: string;
    last_name: string;
    phone_number: string | null;
    email_address: string | null;
  }) => Promise<AssociateGroup>;
}

export function useAssociates(
  isAuthenticated: boolean,
  authLoading: boolean,
  onError?: (message: string) => void
): UseAssociatesReturn {
  const [associates, setAssociates] = useState<AssociateGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all associates
  const loadAssociates = useCallback(async () => {
    try {
      const associatesData = await GroupsDataService.fetchAllAssociates();
      setAssociates(associatesData);
    } catch (error) {
      console.error("Error loading associates:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadAssociates();
    }
  }, [authLoading, isAuthenticated, loadAssociates]);

  // Handle save associate
  const saveAssociate = async (updatedAssociate: AssociateGroup) => {
    try {
      const response = await fetch(`/api/associates/${updatedAssociate.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: updatedAssociate.firstName.trim(),
          last_name: updatedAssociate.lastName.trim(),
          phone_number: updatedAssociate.phoneNumber.trim(),
          email_address: updatedAssociate.emailAddress.trim() || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update associate");
      }

      // Update local state
      setAssociates((prev) =>
        prev.map((a) => (a.id === updatedAssociate.id ? updatedAssociate : a))
      );
    } catch (error) {
      console.error("Error updating associate:", error);
      if (onError) {
        onError("Failed to update associate. Please try again.");
      }
    }
  };

  // Handle delete associate
  const deleteAssociate = async (associateId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this associate? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/associates/${associateId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || "Failed to delete associate";
        throw new Error(errorMessage);
      }

      setAssociates((prev) => prev.filter((a) => a.id !== associateId));
    } catch (error) {
      console.error("Error deleting associate:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to delete associate. Please try again.";
      if (onError) {
        onError(errorMessage);
      }
    }
  };

  // Handle create associate
  const createAssociate = async (associateData: {
    first_name: string;
    last_name: string;
    phone_number: string | null;
    email_address: string | null;
  }): Promise<AssociateGroup> => {
    const response = await fetch("/api/associates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(associateData),
    });

    if (!response.ok) {
      throw new Error("Failed to create associate");
    }

    const createdAssociates = await response.json();
    const newAssociate = createdAssociates[0];

    // Convert to AssociateGroup format
    const associateGroup: AssociateGroup = {
      id: newAssociate.id,
      firstName: newAssociate.first_name || "",
      lastName: newAssociate.last_name || "",
      phoneNumber: newAssociate.phone_number || "",
      emailAddress: newAssociate.email_address || "",
      groupId: "",
      createdAt: new Date(newAssociate.created_at || Date.now()),
      updatedAt: new Date(newAssociate.updated_at || Date.now()),
    };

    setAssociates((prev) => [associateGroup, ...prev]);
    return associateGroup;
  };

  return {
    associates,
    loading,
    loadAssociates,
    saveAssociate,
    deleteAssociate,
    createAssociate,
  };
}

