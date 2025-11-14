// Service for managing Twilio subaccounts
import {
  createSubaccount,
  createSubaccountApiKey,
  deleteSubaccount,
} from "../twilio/master-client";
import { TwilioSubaccountDao } from "../dao/TwilioSubaccountDao";
import { ISVCustomerDao } from "../dao/ISVCustomerDao";
import { getSubaccountClient } from "../twilio/master-client";
import { decrypt } from "../encryption/encrypt";
import { TwilioSubaccount } from "../types";

export class SubaccountService {
  private subaccountDao = new TwilioSubaccountDao();
  private customerDao = new ISVCustomerDao();

  /**
   * Create a Twilio subaccount for a customer
   */
  async createSubaccountForCustomer(
    customerId: string
  ): Promise<TwilioSubaccount> {
    // Get customer details
    const customer = await this.customerDao.findById(customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }

    // Create subaccount in Twilio
    const friendlyName = `${customer.name}_Subaccount`;
    const twilioSubaccount = await createSubaccount(friendlyName);

    // Generate auth token for the subaccount
    // Note: Twilio requires using the subaccount's own credentials
    // We'll need to fetch the auth token from Twilio after creation
    // For now, we'll create the subaccount and store the SID
    // The auth token will need to be retrieved separately

    // Store subaccount in database
    // Note: We'll need to get the auth token from Twilio API
    // This is a placeholder - actual implementation requires Twilio API call
    const authToken = await this.getSubaccountAuthToken(twilioSubaccount.sid);

    const subaccount = await this.subaccountDao.create(
      customerId,
      twilioSubaccount.sid,
      authToken,
      friendlyName
    );

    return subaccount;
  }

  /**
   * Get auth token for a subaccount
   * Creates an API key for the subaccount and returns its secret as the auth token
   * Note: This requires calling Twilio API with master account credentials
   */
  private async getSubaccountAuthToken(subaccountSid: string): Promise<string> {
    try {
      // Create an API key for the subaccount
      // The API key secret can be used as an auth token for the subaccount
      const apiKey = await createSubaccountApiKey(
        subaccountSid,
        `Subaccount-${subaccountSid}-AuthKey`
      );

      // The secret is only returned once when created, so we return it immediately
      // This secret can be used as the auth token for the subaccount
      if (!apiKey.secret) {
        throw new Error("Failed to retrieve API key secret from Twilio");
      }

      return apiKey.secret;
    } catch (error) {
      console.error("Error getting subaccount auth token:", error);
      throw new Error(
        `Failed to create auth token for subaccount ${subaccountSid}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Get Twilio client for a customer's subaccount
   */
  async getCustomerTwilioClient(customerId: string) {
    const subaccount = await this.subaccountDao.findByCustomerId(customerId);
    if (!subaccount) {
      throw new Error("Subaccount not found for customer");
    }

    const authToken = await this.subaccountDao.getDecryptedAuthTokenBySid(
      subaccount.subaccount_sid
    );
    return getSubaccountClient(subaccount.subaccount_sid, authToken);
  }

  /**
   * Get subaccount details
   */
  async getSubaccount(customerId: string): Promise<TwilioSubaccount | null> {
    return await this.subaccountDao.findByCustomerId(customerId);
  }

  /**
   * Delete a Twilio subaccount for a customer
   * This closes the subaccount in Twilio and marks it as deleted in the database
   * Note: This is irreversible - the subaccount cannot be reopened
   */
  async deleteSubaccountForCustomer(customerId: string): Promise<void> {
    // Get subaccount from database
    const subaccount = await this.subaccountDao.findByCustomerId(customerId);
    if (!subaccount) {
      throw new Error("Subaccount not found for customer");
    }

    // Check if already deleted
    if (subaccount.status === "deleted") {
      throw new Error("Subaccount is already deleted");
    }

    try {
      // Delete the subaccount in Twilio (close it)
      await deleteSubaccount(subaccount.subaccount_sid);

      // Update status in database to 'deleted'
      await this.subaccountDao.updateStatus(subaccount.id, "deleted");
    } catch (error) {
      console.error("Error deleting subaccount:", error);
      throw new Error(
        `Failed to delete subaccount: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Delete a subaccount by its SID
   * Useful when you only have the subaccount SID and not the customer ID
   */
  async deleteSubaccountBySid(subaccountSid: string): Promise<void> {
    // Get subaccount from database
    const subaccount = await this.subaccountDao.findBySubaccountSid(
      subaccountSid
    );
    if (!subaccount) {
      throw new Error("Subaccount not found");
    }

    // Check if already deleted
    if (subaccount.status === "deleted") {
      throw new Error("Subaccount is already deleted");
    }

    try {
      // Delete the subaccount in Twilio (close it)
      await deleteSubaccount(subaccountSid);

      // Update status in database to 'deleted'
      await this.subaccountDao.updateStatus(subaccount.id, "deleted");
    } catch (error) {
      console.error("Error deleting subaccount:", error);
      throw new Error(
        `Failed to delete subaccount: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
