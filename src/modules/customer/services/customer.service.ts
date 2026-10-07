import {
  listCustomers,
  getCustomerDetail,
  findCustomerUserById,
  updateCustomerStatus,
  type CustomerListQuery,
} from "../repositories/customer.repository.js";
import { NotFoundError } from "../../../errors/AppError.js";

export const CustomerService = {
  list: async (query: CustomerListQuery) => {
    return listCustomers(query);
  },

  getDetail: async (id: number) => {
    const detail = await getCustomerDetail(id);
    if (!detail) {
      throw new NotFoundError("Customer not found");
    }
    return detail;
  },

  setStatus: async (id: number, isActive: boolean) => {
    const existing = await findCustomerUserById(id);
    if (!existing) {
      throw new NotFoundError("Customer not found");
    }
    return updateCustomerStatus(id, isActive);
  },
};
