import { db } from "../../../prisma/db.js";
import { logger } from "../../../config/logger.js";
import * as smsRepo from "../repositories/sms.repository.js";
import * as smsService from "./sms.service.js";
import { emailService } from "../../email/email.service.js";
import { renderNotificationEmail } from "../../email/templates/notification.template.js";

export interface NotificationContext {
  orderId?: number;
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  grandTotal?: string | number;
  paymentMethod?: string;
  trxId?: string;
  amount?: string | number;
  courierName?: string;
  courierTrackingNumber?: string;
  courierTrackingUrl?: string;
  trackingUrl?: string;
  [key: string]: any;
}

const replacePlaceholders = (template: string, vars: Record<string, string>): string => {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value ?? "");
  }
  return result;
};

export const triggerNotification = async (
  event: "ORDER_PLACED" | "PAYMENT_VERIFIED" | "ORDER_SHIPPED" | "ORDER_DELIVERED" | string,
  context: NotificationContext,
): Promise<{ smsSent: boolean; emailSent: boolean; error?: string }> => {
  try {
    const template = await smsRepo.findTemplateByEvent(event);
    if (!template) {
      logger.info({ event }, "No notification template found for event");
      return { smsSent: false, emailSent: false };
    }

    // Hydrate order details if orderNumber or orderId was passed
    let order: any = null;
    let shippingAddress: any = null;
    let user: any = null;

    if (context.orderId) {
      order = await db.orm.public.Order.first({ id: context.orderId });
    } else if (context.orderNumber) {
      order = await db.orm.public.Order.first({ orderNumber: context.orderNumber });
    }

    if (order) {
      shippingAddress = await db.orm.public.OrderAddress.first({
        orderId: order.id,
        type: "SHIPPING",
      });
      if (order.userId) {
        user = await db.orm.public.User.first({ id: order.userId });
      }
    }

    const orderNumber = context.orderNumber || order?.orderNumber || "";
    const customerName =
      context.customerName ||
      shippingAddress?.fullName ||
      user?.name ||
      "Customer";
    const customerPhone =
      context.customerPhone ||
      shippingAddress?.phone ||
      user?.phone ||
      "";
    const customerEmail =
      context.customerEmail ||
      user?.email ||
      "";
    const grandTotal = String(context.grandTotal ?? order?.grandTotal ?? "0");
    const paymentMethod = context.paymentMethod || order?.paymentMethodName || order?.paymentMethod || "COD";
    const trxId = context.trxId || "";
    const amount = String(context.amount ?? grandTotal);
    const courierName = context.courierName || "";
    const courierTrackingNumber = context.courierTrackingNumber || "";
    const courierTrackingUrl = context.courierTrackingUrl || "";
    const trackingUrl =
      context.trackingUrl ||
      `/track-order?orderNumber=${encodeURIComponent(orderNumber)}&phone=${encodeURIComponent(customerPhone)}`;

    const vars: Record<string, string> = {
      customerName,
      customerPhone,
      customerEmail,
      orderNumber,
      grandTotal,
      paymentMethod,
      trxId,
      amount,
      courierName,
      courierTrackingNumber,
      courierTrackingUrl,
      trackingUrl,
    };

    let smsSent = false;
    let emailSent = false;

    // 1. Send SMS if template enabled and phone exists
    if (template.smsEnabled && template.smsTemplate && customerPhone) {
      try {
        const smsMessage = replacePlaceholders(template.smsTemplate, vars);
        const smsResult = await smsService.sendSms({
          to: customerPhone,
          message: smsMessage,
          orderId: order?.id || context.orderId,
        });
        smsSent = smsResult.success;
      } catch (err: any) {
        logger.error({ err: err?.message, event, customerPhone }, "Failed to send trigger SMS");
      }
    }

    // 2. Send Email if template enabled and email exists
    if (template.emailEnabled && template.emailTemplate && customerEmail) {
      try {
        const emailSubject = replacePlaceholders(template.emailSubject || "Notification", vars);
        const rawEmailBody = replacePlaceholders(template.emailTemplate, vars);
        const finalHtml = renderNotificationEmail({
          subject: emailSubject,
          bodyContent: rawEmailBody,
          orderNumber,
          customerName,
          trackingUrl,
        });

        await emailService.sendEmail({
          to: customerEmail,
          subject: emailSubject,
          html: finalHtml,
          text: rawEmailBody.replace(/<[^>]*>?/gm, ""),
        });
        emailSent = true;
      } catch (err: any) {
        logger.error({ err: err?.message, event, customerEmail }, "Failed to send trigger Email");
      }
    }

    return { smsSent, emailSent };
  } catch (error: any) {
    logger.error({ error: error?.message, event }, "Error in notification trigger service");
    return { smsSent: false, emailSent: false, error: error?.message };
  }
};
