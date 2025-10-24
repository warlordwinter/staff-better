import { Associate } from "@/model/interfaces/Associate";
import { AssociateGroup } from "@/model/interfaces/AssociateGroup";
import { AssociateFormData } from "@/components/shared/AssociateForm";

/**
 * Convert Associate (snake_case) to AssociateFormData
 */
export function associateToFormData(associate: Associate): AssociateFormData {
  return {
    firstName: associate.first_name || "",
    lastName: associate.last_name || "",
    phoneNumber: associate.phone_number || "",
    emailAddress: associate.email_address || "",
    workDate: associate.work_date || "",
    startTime: associate.start_date || "",
  };
}

/**
 * Convert AssociateGroup (camelCase) to AssociateFormData
 */
export function associateGroupToFormData(
  associate: AssociateGroup
): AssociateFormData {
  return {
    firstName: associate.firstName,
    lastName: associate.lastName,
    phoneNumber: associate.phoneNumber,
    emailAddress: associate.emailAddress,
  };
}

/**
 * Convert AssociateFormData to Associate (snake_case)
 */
export function formDataToAssociate(
  formData: AssociateFormData,
  id?: string
): Associate {
  return {
    id: id || crypto.randomUUID(),
    first_name: formData.firstName,
    last_name: formData.lastName,
    phone_number: formData.phoneNumber,
    email_address: formData.emailAddress,
    work_date: formData.workDate || null,
    start_date: formData.startTime || null,
  };
}

/**
 * Convert AssociateFormData to AssociateGroup (camelCase)
 */
export function formDataToAssociateGroup(
  formData: AssociateFormData,
  groupId: string,
  id?: string
): AssociateGroup {
  return {
    id: id || crypto.randomUUID(),
    firstName: formData.firstName,
    lastName: formData.lastName,
    phoneNumber: formData.phoneNumber,
    emailAddress: formData.emailAddress,
    groupId: groupId,
    createdAt: new Date(),
    updatedAt: new Date(),
    isNew: !id,
  };
}

/**
 * Create a new AssociateFormData with default values
 */
export function createEmptyAssociateFormData(): AssociateFormData {
  return {
    firstName: "",
    lastName: "",
    phoneNumber: "",
    emailAddress: "",
    workDate: "",
    startTime: "",
  };
}
