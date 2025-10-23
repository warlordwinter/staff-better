export interface AssociateGroup {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  emailAddress: string;
  groupId: string;
  createdAt: Date;
  updatedAt: Date;
  isNew?: boolean;
}
