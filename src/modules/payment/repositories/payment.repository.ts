import { Temporal } from "temporal-polyfill";
import { db } from "../../../prisma/db.js";
import type {
  CreatePaymentMethodInput,
  UpdatePaymentMethodInput,
} from "../payment.types.js";

export const findPublicMethods = async () => {
  const methods = await db.orm.public.PaymentMethodConfig
    .where({ isActive: true })
    .orderBy((m: any) => m.sortOrder.asc())
    .all();

  // Strip sensitive credentials from public view
  return methods.map((m: any) => {
    const { credentials, ...safeData } = m;
    return safeData;
  });
};

export const findAllMethods = async () => {
  return db.orm.public.PaymentMethodConfig
    .orderBy((m: any) => m.sortOrder.asc())
    .all();
};

export const findById = async (id: number) => {
  return db.orm.public.PaymentMethodConfig.first({ id });
};

export const findByCode = async (code: string) => {
  return db.orm.public.PaymentMethodConfig.first({ code });
};

export const createMethod = async (data: CreatePaymentMethodInput) => {
  return db.orm.public.PaymentMethodConfig.create(data as any);
};

export const updateMethod = async (
  id: number,
  data: UpdatePaymentMethodInput,
) => {
  await db.orm.public.PaymentMethodConfig.where({ id }).update(data as any);
  return findById(id);
};

export const deleteMethod = async (id: number) => {
  return db.orm.public.PaymentMethodConfig.where({ id }).delete();
};

// ─── Order Payment Transaction ───────────────────────────────────────────────

export const createTransaction = async (txOrDb: any, data: any) => {
  const client = txOrDb || db;
  return client.orm.public.OrderPaymentTransaction.create(data);
};

export const findTransactionsByOrderId = async (orderId: number) => {
  const transactions = await db.orm.public.OrderPaymentTransaction
    .where({ orderId })
    .orderBy((t: any) => t.createdAt.desc())
    .all();

  const userIds = transactions
    .map((t: any) => t.verifiedByUserId)
    .filter((id: any): id is number => typeof id === "number");

  const users = userIds.length
    ? await db.orm.public.User.where((u: any) => u.id.in(userIds)).all()
    : [];

  const userMap = new Map<number, any>(users.map((u: any) => [u.id, u]));

  return transactions.map((t: any) => ({
    ...t,
    verifiedByUser: t.verifiedByUserId
      ? {
          id: t.verifiedByUserId,
          fullName: userMap.get(t.verifiedByUserId)?.fullName || null,
          email: userMap.get(t.verifiedByUserId)?.email || "",
        }
      : null,
  }));
};

export const findTransactionById = async (id: number, txOrDb?: any) => {
  const client = txOrDb || db;
  const transaction = await client.orm.public.OrderPaymentTransaction.first({ id });
  if (!transaction) return null;

  let verifiedByUser = null;
  if (transaction.verifiedByUserId) {
    const user = await client.orm.public.User.first({ id: transaction.verifiedByUserId });
    if (user) {
      verifiedByUser = {
        id: user.id,
        fullName: user.fullName || null,
        email: user.email,
      };
    }
  }

  const order = await client.orm.public.Order.first({ id: transaction.orderId });

  return {
    ...transaction,
    verifiedByUser,
    order,
  };
};

export const updateTransactionVerification = async (
  txOrDb: any,
  id: number,
  status: "VERIFIED" | "REJECTED",
  verifiedByUserId: number,
  adminNote?: string,
) => {
  const client = txOrDb || db;
  await client.orm.public.OrderPaymentTransaction.where({ id }).update({
    status,
    verifiedByUserId,
    verifiedAt: Temporal.Now.instant(),
    ...(adminNote ? { adminNote } : {}),
  });

  return findTransactionById(id, client);
};
