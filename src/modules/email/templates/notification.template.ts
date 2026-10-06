import { config } from "../../../config/env.js";
import { escapeHtml } from "./base.template.js";

interface NotificationEmailParams {
  subject: string;
  bodyContent: string;
  orderNumber?: string;
  customerName?: string;
  trackingUrl?: string;
  brandName?: string;
}

/**
 * Wraps custom email body into a responsive, branded eCommerce master layout.
 * If the bodyContent is already a full HTML document (contains <!doctype or <html),
 * it returns bodyContent as-is.
 */
export const renderNotificationEmail = ({
  subject,
  bodyContent,
  orderNumber,
  customerName,
  trackingUrl,
  brandName,
}: NotificationEmailParams): string => {
  // If admin provided a complete standalone HTML document, do not double-wrap
  if (
    bodyContent.toLowerCase().includes("<!doctype") ||
    bodyContent.toLowerCase().includes("<html")
  ) {
    return bodyContent;
  }

  const brand = brandName || config.email?.brandName || "Premium E-Commerce";
  const primaryColor = config.email?.primaryColor || "#4f46e5";
  const supportEmail = config.email?.supportEmail || "support@example.com";
  const frontendUrl =
    (config.cors?.origins && config.cors.origins[0]) || "http://localhost:3000";

  const resolvedTrackingUrl = trackingUrl
    ? trackingUrl.startsWith("http")
      ? trackingUrl
      : `${frontendUrl}${trackingUrl}`
    : null;

  // Convert plain text linebreaks to <p> tags if user wrote plain text instead of HTML tags
  const isHtml = /<[a-z][\s\S]*>/i.test(bodyContent);
  const formattedBody = isHtml
    ? bodyContent
    : bodyContent
        .split("\n\n")
        .map((p) => `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #374151;">${escapeHtml(p).replaceAll("\n", "<br/>")}</p>`)
        .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    table { border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; border-radius: 0 !important; }
      .content-padding { padding: 24px 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 30px 10px; background-color: #f3f4f6; color: #1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <!-- Container Card -->
        <table role="presentation" class="email-container" width="580" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 18px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb;">
          
          <!-- Top Accent Gradient Line -->
          <tr>
            <td style="height: 5px; background: linear-gradient(90deg, ${primaryColor} 0%, #06b6d4 100%);"></td>
          </tr>

          <!-- Header / Brand Logo -->
          <tr>
            <td align="center" style="padding: 28px 24px 20px 24px; border-bottom: 1px solid #f3f4f6;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <span style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px; color: #111827; text-decoration: none;">
                      ${escapeHtml(brand)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td class="content-padding" style="padding: 32px 36px 28px 36px;">
              <!-- Subject Header -->
              <h1 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #111827; line-height: 1.4;">
                ${escapeHtml(subject)}
              </h1>

              <!-- Greeting -->
              ${
                customerName
                  ? `<p style="margin: 0 0 18px 0; font-size: 15px; font-weight: 600; color: #374151;">
                      Hello ${escapeHtml(customerName)},
                    </p>`
                  : ""
              }

              <!-- Body Content (Admin Template) -->
              <div style="font-size: 15px; color: #4b5563; line-height: 1.65;">
                ${formattedBody}
              </div>

              <!-- Call To Action Button (If tracking URL is available) -->
              ${
                resolvedTrackingUrl
                  ? `<div style="margin: 28px 0 10px 0; text-align: center;">
                      <a href="${escapeHtml(resolvedTrackingUrl)}" target="_blank" style="display: inline-block; background-color: ${primaryColor}; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; text-decoration: none; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                        Track Order ${orderNumber ? `#${escapeHtml(orderNumber)}` : ""} &rarr;
                      </a>
                    </div>`
                  : ""
              }
            </td>
          </tr>

          <!-- Footer Area -->
          <tr>
            <td style="padding: 24px 36px; background-color: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; line-height: 1.5;">
                Need assistance? Feel free to contact us at 
                <a href="mailto:${escapeHtml(supportEmail)}" style="color: ${primaryColor}; text-decoration: none; font-weight: 500;">
                  ${escapeHtml(supportEmail)}
                </a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                &copy; ${new Date().getFullYear()} ${escapeHtml(brand)}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
