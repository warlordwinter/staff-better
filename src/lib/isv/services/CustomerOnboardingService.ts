// Service for customer onboarding orchestration
import { ISVCustomerDao } from "../dao/ISVCustomerDao";
import { SubaccountService } from "./SubaccountService";
import { CustomerOnboardingData, ISVCustomer } from "../types";

export class CustomerOnboardingService {
  private customerDao = new ISVCustomerDao();
  private subaccountService = new SubaccountService();

  /**
   * Complete customer onboarding process
   * 1. Create customer record
   * 2. Create Twilio subaccount
   * 3. Return customer with status
   */
  async onboardCustomer(
    data: CustomerOnboardingData,
    companyId?: string | null
  ): Promise<ISVCustomer> {
    // Step 1: Create customer record
    const customer = await this.customerDao.create(data, companyId);

    try {
      // Step 2: Create Twilio subaccount
      await this.subaccountService.createSubaccountForCustomer(customer.id);

      // Step 3: Update customer status to 'approved' (ready for next steps)
      await this.customerDao.updateStatus(customer.id, "approved");

      // Return updated customer
      const updatedCustomer = await this.customerDao.findById(customer.id);
      if (!updatedCustomer) {
        throw new Error("Failed to retrieve created customer");
      }

      return updatedCustomer;
    } catch (error) {
      // If subaccount creation fails, mark customer as pending for manual review
      console.error("Error during onboarding:", error);
      await this.customerDao.updateStatus(customer.id, "pending");
      throw error;
    }
  }

  /**
   * Get customer onboarding status
   */
  async getOnboardingStatus(customerId: string) {
    const customer = await this.customerDao.findById(customerId);
    if (!customer) {
      throw new Error("Customer not found");
    }

    const subaccount = await this.subaccountService.getSubaccount(customerId);

    return {
      customer,
      subaccount: subaccount
        ? {
            sid: subaccount.subaccount_sid,
            status: subaccount.status,
          }
        : null,
      onboardingComplete: customer.status === "active",
    };
  }
}
