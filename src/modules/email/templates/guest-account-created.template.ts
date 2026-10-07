import { config } from "../../../config/env.js";
import type { EmailTemplate } from "../email.types.js";
import { renderBrandedEmail, type EmailBrand } from "./base.template.js";

export const createGuestAccountCreatedEmail = ({
  setPasswordUrl,
  recipientName,
  phone,
  email,
  expiresIn = "24 hours",
  brand,
}: {
  setPasswordUrl: string;
  recipientName?: string;
  phone: string;
  email?: string;
  expiresIn?: string;
  brand?: EmailBrand;
}): EmailTemplate => {
  const resolvedBrand = brand ?? config.email;
  const brandName = resolvedBrand.brandName || "our store";
  const greeting = recipientName ? `Hello ${recipientName},` : "Hello,";

  const details = [
    { label: "Login Phone", value: phone },
    ...(email ? [{ label: "Login Email", value: email }] : []),
    { label: "Link Validity", value: expiresIn },
  ];

  return {
    subject: `Your ${brandName} account has been created — Set your password`,
    text: `${greeting}\n\nYour order has been placed and an account was created for you at ${brandName}.\n\nYou can log in using your phone (${phone})${email ? ` or email (${email})` : ""}.\n\nPlease set your personal password using the secure link below:\n${setPasswordUrl}\n\nNote: This link is valid for ${expiresIn}.\n\nIf you have any questions, feel free to contact our support.`,
    html: renderBrandedEmail({
      previewText: `Your ${brandName} account has been created. Set your password now.`,
      title: "Account Created & Order Placed",
      greeting,
      paragraphs: [
        `Thank you for shopping with us! As requested during checkout, an account has been created for you.`,
        `You can log in anytime to track orders and view your account history.`,
        `Please click the button below to choose your personal password (link expires in ${expiresIn}):`,
      ],
      details,
      action: { label: "Set Your Password", url: setPasswordUrl },
      securityNote:
        "For your security, a temporary random password was generated. Please use the button above to set your own password. If you did not place this order, please contact support.",
      variant: "welcome",
      brand: resolvedBrand,
    }),
  };
};
