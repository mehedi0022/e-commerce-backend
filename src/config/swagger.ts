import swaggerJSDoc from "swagger-jsdoc";

import { config } from "./env.js";

const success = (description: string, schema?: object) => ({
  description,
  content: schema ? { "application/json": { schema } } : undefined,
});

const errorResponses = {
  "400": { $ref: "#/components/responses/ValidationError" },
  "401": { $ref: "#/components/responses/AuthenticationError" },
  "403": { $ref: "#/components/responses/AuthorizationError" },
  "404": { $ref: "#/components/responses/NotFoundError" },
  "409": { $ref: "#/components/responses/ConflictError" },
};

const idParameter = {
  name: "id",
  in: "path",
  required: true,
  description: "Positive numeric user ID.",
  schema: { type: "integer", minimum: 1 },
};

const cookieAuth = [{ cookieAuth: [] }];

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "E-Commerce Backend API",
      version: "1.0.0",
      description: "Production-ready REST API for the e-commerce platform",
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: "Current local server",
      },
    ],
    tags: [
      {
        name: "Authentication",
        description: "Session, password, and email verification endpoints",
      },
      {
        name: "Users",
        description:
          "Authenticated user and RBAC-protected user management endpoints",
      },
      {
        name: "Catalog",
        description: "Categories, brands, attributes, and category attribute assignments",
      },
      { name: "Cart", description: "Guest and authenticated shopping carts" },
      { name: "Addresses", description: "Authenticated customer addresses" },
      { name: "Shipping", description: "Shipping zones, methods, and options" },
      { name: "Inventory", description: "Variant inventory operations and movement history" },
      { name: "Checkout", description: "Authenticated and guest checkout" },
      { name: "Orders", description: "Customer and admin order management" },
      { name: "Coupons", description: "Coupon administration and cart validation" },
      { name: "Shipments", description: "Shipment fulfillment and delivery tracking" },
      { name: "Returns", description: "Customer return requests and admin processing" },
      { name: "Refunds", description: "Manual refund records and status management" },
      { name: "Reviews", description: "Product reviews, ratings, and moderation" },
      { name: "Wishlist", description: "Authenticated customer wishlist" },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "accessToken",
          description:
            "The httpOnly access-token cookie issued by login or refresh. Swagger UI sends it automatically for same-origin requests.",
        },
        guestCartAuth: {
          type: "apiKey",
          in: "cookie",
          name: "guest_cart",
          description: "Guest cart cookie. Authenticated users may use accessToken instead.",
        },
      },
      schemas: {
        Role: {
          type: "object",
          required: ["id", "key", "name", "rank", "isSystem"],
          properties: {
            id: { type: "integer", example: 2 },
            key: { type: "string", example: "admin" },
            name: { type: "string", example: "Administrator" },
            rank: { type: "integer", example: 100 },
            isSystem: { type: "boolean", example: true },
          },
        },
        User: {
          type: "object",
          required: [
            "id",
            "email",
            "userName",
            "fullName",
            "roleId",
            "role",
            "isActive",
            "emailVerifiedAt",
            "createdAt",
            "updatedAt",
          ],
          properties: {
            id: { type: "integer", example: 42 },
            email: {
              type: "string",
              format: "email",
              example: "ada@example.com",
            },
            userName: { type: "string", example: "ada" },
            fullName: {
              type: "string",
              nullable: true,
              example: "Ada Lovelace",
            },
            roleId: { type: "integer", example: 2 },
            role: { $ref: "#/components/schemas/Role" },
            isActive: { type: "boolean", example: true },
            emailVerifiedAt: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        AuthenticatedUser: {
          allOf: [
            { $ref: "#/components/schemas/User" },
            {
              type: "object",
              required: ["permissions"],
              properties: {
                permissions: {
                  type: "array",
                  items: { type: "string" },
                  example: ["users:read:any"],
                },
              },
            },
          ],
        },
        LoginRequest: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", format: "password" },
            rememberMe: { type: "boolean", default: false },
          },
        },
        RegisterRequest: {
          type: "object",
          additionalProperties: false,
          required: ["fullName", "email", "password"],
          properties: {
            userName: { type: "string", minLength: 3 },
            fullName: { type: "string", minLength: 4 },
            email: { type: "string", format: "email" },
            password: {
              type: "string",
              format: "password",
              minLength: 8,
              description:
                "Must contain uppercase, lowercase, number, and special character.",
            },
          },
        },
        LoginResponse: {
          type: "object",
          required: ["success", "message", "data"],
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Login successful" },
            data: {
              type: "object",
              required: ["user"],
              properties: {
                user: { $ref: "#/components/schemas/AuthenticatedUser" },
              },
            },
          },
        },
        CreateUserRequest: {
          type: "object",
          additionalProperties: false,
          required: ["userName", "fullName", "email", "password", "roleId"],
          properties: {
            userName: { type: "string", minLength: 3 },
            fullName: { type: "string", minLength: 4 },
            email: { type: "string", format: "email" },
            password: {
              type: "string",
              format: "password",
              minLength: 8,
              description:
                "Must contain uppercase, lowercase, number, and special character.",
            },
            roleId: { type: "integer", minimum: 1 },
          },
        },
        UpdateUserRequest: {
          type: "object",
          additionalProperties: false,
          minProperties: 1,
          properties: {
            userName: { type: "string", minLength: 2, nullable: true },
            fullName: { type: "string", minLength: 3, nullable: true },
          },
        },
        ChangeUserRoleRequest: {
          type: "object",
          additionalProperties: false,
          required: ["roleId"],
          properties: { roleId: { type: "integer", minimum: 1 } },
        },
        ChangeUserStatusRequest: {
          type: "object",
          additionalProperties: false,
          required: ["isActive"],
          properties: { isActive: { type: "boolean" } },
        },
        ResetUserPasswordRequest: {
          type: "object",
          additionalProperties: false,
          required: ["newPassword"],
          properties: {
            newPassword: {
              type: "string",
              format: "password",
              minLength: 8,
              description:
                "Must contain uppercase, lowercase, number, and special character.",
            },
          },
        },
        ChangePasswordRequest: {
          type: "object",
          required: ["currentPassword", "newPassword"],
          properties: {
            currentPassword: { type: "string", format: "password" },
            newPassword: { type: "string", format: "password", minLength: 8 },
          },
        },
        TokenRequest: {
          type: "object",
          required: ["token"],
          properties: { token: { type: "string" } },
        },
        EmailRequest: {
          type: "object",
          required: ["email"],
          properties: { email: { type: "string", format: "email" } },
        },
        PaginationMeta: {
          type: "object",
          required: ["page", "limit", "total", "totalPages"],
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 20 },
            total: { type: "integer", example: 57 },
            totalPages: { type: "integer", example: 3 },
          },
        },
        ValidationError: {
          type: "object",
          required: ["success", "message", "code"],
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Validation failed" },
            code: { type: "string", example: "VALIDATION_ERROR" },
            requestId: { type: "string" },
            details: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string", example: "body.email" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
        ErrorResponse: {
          type: "object",
          required: ["success", "message", "code"],
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
            code: { type: "string" },
            requestId: { type: "string" },
          },
        },
        UserResponse: {
          type: "object",
          required: ["success", "message", "data"],
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string" },
            data: { $ref: "#/components/schemas/User" },
          },
        },
        UsersResponse: {
          type: "object",
          required: ["success", "message", "data", "meta"],
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string" },
            data: {
              type: "array",
              items: { $ref: "#/components/schemas/User" },
            },
            meta: { $ref: "#/components/schemas/PaginationMeta" },
          },
        },
        MessageResponse: {
          type: "object",
          required: ["success", "message"],
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string" },
          },
        },
        Category: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 }, name: { type: "string", example: "Electronics" }, slug: { type: "string", example: "electronics" },
            description: { type: "string", nullable: true }, image: { type: "string", nullable: true }, parentId: { type: "integer", nullable: true },
            isActive: { type: "boolean", example: true }, sortOrder: { type: "integer", example: 0 }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" },
          },
        },
        Brand: {
          type: "object",
          properties: {
            id: { type: "integer", example: 1 }, name: { type: "string", example: "Apple" }, slug: { type: "string", example: "apple" }, logo: { type: "string", nullable: true }, description: { type: "string", nullable: true }, isActive: { type: "boolean" }, sortOrder: { type: "integer" }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" },
          },
        },
        Attribute: {
          type: "object",
          properties: { id: { type: "integer" }, name: { type: "string", example: "Color" }, slug: { type: "string", example: "color" }, isActive: { type: "boolean" }, sortOrder: { type: "integer" }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" } },
        },
        AttributeValue: {
          type: "object",
          properties: { id: { type: "integer" }, attributeId: { type: "integer" }, value: { type: "string", example: "Red" }, slug: { type: "string", example: "red" }, sortOrder: { type: "integer" }, isActive: { type: "boolean" }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" } },
        },
        CategoryAttributeAssignment: {
          type: "object", required: ["attributeId"],
          properties: { attributeId: { type: "integer", minimum: 1 }, isRequired: { type: "boolean", default: false }, sortOrder: { type: "integer", minimum: 0, default: 0 } },
        },
        CategoryAttributesRequest: {
          type: "object", required: ["attributes"], additionalProperties: false,
          properties: { attributes: { type: "array", items: { $ref: "#/components/schemas/CategoryAttributeAssignment" } } },
        },
        ProductCategoryInput: {
          type: "object", required: ["categoryId"], additionalProperties: false,
          properties: { categoryId: { type: "integer", minimum: 1 }, isPrimary: { type: "boolean", default: false }, sortOrder: { type: "integer", minimum: 0, default: 0 } },
        },
        Product: {
          type: "object",
          properties: { id: { type: "integer" }, name: { type: "string", example: "Nike Air Max" }, slug: { type: "string", example: "nike-air-max" }, shortDescription: { type: "string", nullable: true }, description: { type: "string", nullable: true }, brandId: { type: "integer", nullable: true }, brand: { $ref: "#/components/schemas/Brand" }, status: { type: "string", enum: ["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"] }, isFeatured: { type: "boolean" }, categories: { type: "array", items: { $ref: "#/components/schemas/ProductCategoryInput" } }, createdAt: { type: "string", format: "date-time" }, updatedAt: { type: "string", format: "date-time" } },
        },
        ProductCreateRequest: {
          type: "object", required: ["name"], additionalProperties: false,
          description: "Slug is generated by the backend from name. When categories are provided, exactly one category must have isPrimary=true.",
          properties: { name: { type: "string", minLength: 1, maxLength: 250 }, shortDescription: { type: "string", maxLength: 500, nullable: true }, description: { type: "string", maxLength: 10000, nullable: true }, brandId: { type: "integer", minimum: 1, nullable: true }, status: { type: "string", enum: ["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"], default: "DRAFT" }, isFeatured: { type: "boolean", default: false }, categories: { type: "array", maxItems: 100, items: { $ref: "#/components/schemas/ProductCategoryInput" } } },
        },
        ProductUpdateRequest: {
          type: "object", minProperties: 1, additionalProperties: false,
          properties: { name: { type: "string" }, shortDescription: { type: "string", nullable: true }, description: { type: "string", nullable: true }, brandId: { type: "integer", nullable: true }, status: { type: "string", enum: ["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"] }, isFeatured: { type: "boolean" }, categories: { type: "array", items: { $ref: "#/components/schemas/ProductCategoryInput" } } },
        },
        ProductStatusRequest: {
          type: "object", required: ["status"], additionalProperties: false,
          properties: { status: { type: "string", enum: ["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"] } },
        },
        ProductListResponse: {
          type: "object", required: ["success", "message", "data", "meta"],
          properties: { success: { type: "boolean" }, message: { type: "string" }, data: { type: "array", items: { $ref: "#/components/schemas/Product" } }, meta: { $ref: "#/components/schemas/PaginationMeta" } },
        },
        ProductVariant: { type: "object", properties: { id: { type: "integer" }, productId: { type: "integer" }, sku: { type: "string" }, price: { type: "string", example: "1200.00" }, compareAtPrice: { type: "string", nullable: true }, costPrice: { type: "string", nullable: true }, isActive: { type: "boolean" }, sortOrder: { type: "integer" }, attributeValues: { type: "array", items: { type: "object" } } } },
        Inventory: { type: "object", properties: { variantId: { type: "integer" }, quantity: { type: "integer" }, reservedQuantity: { type: "integer" }, availableQuantity: { type: "integer" }, lowStockThreshold: { type: "integer" }, isLowStock: { type: "boolean" }, isOutOfStock: { type: "boolean" } } },
        Address: { type: "object", properties: { id: { type: "integer" }, label: { type: "string", nullable: true }, fullName: { type: "string" }, phone: { type: "string" }, addressLine1: { type: "string" }, addressLine2: { type: "string", nullable: true }, division: { type: "string", nullable: true }, district: { type: "string" }, upazila: { type: "string", nullable: true }, thana: { type: "string", nullable: true }, area: { type: "string", nullable: true }, postalCode: { type: "string", nullable: true }, countryCode: { type: "string" }, isDefaultShipping: { type: "boolean" }, isDefaultBilling: { type: "boolean" } } },
        ShippingZone: { type: "object", properties: { id: { type: "integer" }, name: { type: "string" }, description: { type: "string", nullable: true }, isActive: { type: "boolean" }, sortOrder: { type: "integer" } } },
        ShippingMethod: { type: "object", properties: { id: { type: "integer" }, name: { type: "string" }, code: { type: "string" }, description: { type: "string", nullable: true }, isActive: { type: "boolean" }, sortOrder: { type: "integer" } } },
        Cart: { type: "object", properties: { id: { type: "integer", nullable: true }, type: { type: "string", enum: ["guest", "user"] }, items: { type: "array", items: { type: "object" } }, summary: { type: "object", properties: { itemCount: { type: "integer" }, subtotal: { type: "string" } } } } },
        ProductImage: { type: "object", properties: { id: { type: "integer" }, imageUrl: { type: "string" }, altText: { type: "string", nullable: true }, isPrimary: { type: "boolean" }, sortOrder: { type: "integer" }, attributeValues: { type: "array", items: { type: "object" } } } },
        CatalogListResponse: {
          type: "object", required: ["success", "message", "data", "meta"],
          properties: { success: { type: "boolean" }, message: { type: "string" }, data: { type: "array", items: {} }, meta: { $ref: "#/components/schemas/PaginationMeta" } },
        },
        Coupon: { type: "object", properties: { id: { type: "integer" }, code: { type: "string", example: "EID20" }, name: { type: "string" }, description: { type: "string", nullable: true }, discountType: { type: "string", enum: ["PERCENTAGE", "FIXED_AMOUNT"] }, discountValue: { type: "string", example: "20.00" }, minimumOrderAmount: { type: "string", nullable: true }, maximumDiscountAmount: { type: "string", nullable: true }, usageLimit: { type: "integer", nullable: true }, usageLimitPerUser: { type: "integer", nullable: true }, startsAt: { type: "string", format: "date-time", nullable: true }, expiresAt: { type: "string", format: "date-time", nullable: true }, isActive: { type: "boolean" } } },
        Shipment: { type: "object", properties: { id: { type: "integer" }, status: { type: "string", enum: ["PENDING", "READY_TO_SHIP", "SHIPPED", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "FAILED", "RETURNED", "CANCELLED"] }, courierName: { type: "string", nullable: true }, trackingNumber: { type: "string", nullable: true }, trackingUrl: { type: "string", format: "uri", nullable: true }, shippedAt: { type: "string", format: "date-time", nullable: true }, deliveredAt: { type: "string", format: "date-time", nullable: true } } },
        Return: { type: "object", properties: { id: { type: "integer" }, returnNumber: { type: "string", example: "RET-20260928-A1B2C3D4" }, status: { type: "string", enum: ["REQUESTED", "APPROVED", "REJECTED", "IN_TRANSIT", "RECEIVED", "COMPLETED", "CANCELLED"] }, items: { type: "array", items: { type: "object" } }, requestedAt: { type: "string", format: "date-time" }, approvedAt: { type: "string", format: "date-time", nullable: true }, receivedAt: { type: "string", format: "date-time", nullable: true }, completedAt: { type: "string", format: "date-time", nullable: true } } },
        Refund: { type: "object", properties: { id: { type: "integer" }, refundNumber: { type: "string", example: "REF-20260928-A1B2C3D4" }, amount: { type: "string", example: "500.00" }, status: { type: "string", enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"] }, method: { type: "string", enum: ["CASH", "BANK_TRANSFER", "MOBILE_BANKING", "ORIGINAL_PAYMENT_METHOD", "OTHER"], nullable: true } } },
        Order: { type: "object", properties: { id: { type: "integer" }, orderNumber: { type: "string", example: "ORD-20260928-000123" }, userId: { type: "integer", nullable: true }, customerName: { type: "string" }, customerEmail: { type: "string", format: "email", nullable: true }, customerPhone: { type: "string" }, status: { type: "string", enum: ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] }, paymentMethod: { type: "string", enum: ["CASH_ON_DELIVERY", "ONLINE"] }, paymentStatus: { type: "string", enum: ["UNPAID", "PENDING", "PAID", "FAILED", "REFUNDED"] }, couponCode: { type: "string", nullable: true }, subtotal: { type: "string", example: "2400.00" }, shippingCharge: { type: "string", example: "80.00" }, discountAmount: { type: "string", example: "0.00" }, taxAmount: { type: "string", example: "0.00" }, grandTotal: { type: "string", example: "2480.00" }, shippingZoneName: { type: "string", nullable: true }, shippingMethodName: { type: "string", nullable: true }, items: { type: "array", items: { type: "object" } }, addresses: { type: "array", items: { type: "object" } }, statusHistory: { type: "array", items: { type: "object" } }, shipment: { $ref: "#/components/schemas/Shipment" } } },
        OrderStatusTransitionRequest: { type: "object", required: ["status"], properties: { status: { type: "string", enum: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] }, note: { type: "string", maxLength: 500 } } },
        CheckoutRequest: { type: "object", properties: { shippingAddressId: { type: "integer" }, billingSameAsShipping: { type: "boolean", default: true }, billingAddressId: { type: "integer" }, shippingMethodId: { type: "integer" }, paymentMethod: { type: "string", enum: ["CASH_ON_DELIVERY", "ONLINE"] }, couponCode: { type: "string", nullable: true }, customerNote: { type: "string", nullable: true } }, required: ["shippingAddressId", "shippingMethodId", "paymentMethod"] },
        GuestCheckoutRequest: { type: "object", required: ["customer", "shippingAddress", "shippingMethodId", "paymentMethod"], properties: { customer: { type: "object", required: ["name", "phone"], properties: { name: { type: "string", example: "John Doe" }, email: { type: "string", format: "email" }, phone: { type: "string", example: "01700000000" } } }, shippingAddress: { $ref: "#/components/schemas/GuestAddress" }, billingSameAsShipping: { type: "boolean", default: true }, billingAddress: { $ref: "#/components/schemas/GuestAddress" }, shippingMethodId: { type: "integer", example: 2 }, paymentMethod: { type: "string", enum: ["CASH_ON_DELIVERY", "ONLINE"] }, couponCode: { type: "string", nullable: true }, customerNote: { type: "string", nullable: true } } },
        GuestAddress: { type: "object", required: ["fullName", "phone", "addressLine1", "district"], properties: { fullName: { type: "string" }, phone: { type: "string" }, addressLine1: { type: "string" }, addressLine2: { type: "string", nullable: true }, division: { type: "string", nullable: true }, district: { type: "string" }, upazila: { type: "string", nullable: true }, thana: { type: "string", nullable: true }, area: { type: "string", nullable: true }, postalCode: { type: "string", nullable: true }, countryCode: { type: "string", example: "BD" } } },
        ReturnRequest: { type: "object", required: ["items"], properties: { items: { type: "array", items: { type: "object", required: ["orderItemId", "quantity", "reason"], properties: { orderItemId: { type: "integer" }, quantity: { type: "integer", minimum: 1 }, reason: { type: "string", enum: ["DAMAGED", "DEFECTIVE", "WRONG_ITEM", "NOT_AS_DESCRIBED", "SIZE_OR_FIT", "CHANGED_MIND", "OTHER"] }, customerNote: { type: "string" } } } }, customerNote: { type: "string" } } },
      },
      responses: {
        ValidationError: {
          description: "Request validation failed",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ValidationError" },
            },
          },
        },
        AuthenticationError: {
          description: "Authentication failed or access token is missing",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        AuthorizationError: {
          description:
            "Authenticated user lacks the required database-driven permission",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        NotFoundError: {
          description: "Resource not found",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
        ConflictError: {
          description: "Resource conflict",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorResponse" },
            },
          },
        },
      },
    },
    paths: {
      "/api/v1/auth/login": {
        post: {
          tags: ["Authentication"],
          summary: "Sign in and set authentication cookies",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LoginRequest" },
              },
            },
          },
          responses: {
            "200": success(
              "Login successful; sets httpOnly accessToken and refresh-token cookies.",
              { $ref: "#/components/schemas/LoginResponse" },
            ),
            "400": errorResponses["400"],
            "401": errorResponses["401"],
          },
        },
      },
      "/api/v1/auth/register": {
        post: {
          tags: ["Authentication"],
          summary: "Register a customer account",
          description:
            "Creates an active account with the database CUSTOMER role. The role cannot be supplied by the request.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/RegisterRequest" },
              },
            },
          },
          responses: {
            "201": success("Registration successful", {
              $ref: "#/components/schemas/UserResponse",
            }),
            "400": errorResponses["400"],
            "409": errorResponses["409"],
          },
        },
      },
      "/api/v1/auth/refresh": {
        post: {
          tags: ["Authentication"],
          summary: "Rotate refresh token and issue a new access token",
          description:
            "Requires the configured refresh-token cookie. Sets new accessToken and refresh cookies.",
          responses: {
            "200": success("Token refreshed", {
              $ref: "#/components/schemas/MessageResponse",
            }),
            "401": errorResponses["401"],
          },
        },
      },
      "/api/v1/auth/logout": {
        post: {
          tags: ["Authentication"],
          summary: "Sign out the current refresh session",
          responses: {
            "200": success("Logout successful", {
              $ref: "#/components/schemas/MessageResponse",
            }),
          },
        },
      },
      "/api/v1/auth/logout-all": {
        post: {
          tags: ["Authentication"],
          summary: "Revoke all sessions for the authenticated user",
          security: cookieAuth,
          responses: {
            "200": success("All sessions revoked", {
              $ref: "#/components/schemas/MessageResponse",
            }),
            "401": errorResponses["401"],
          },
        },
      },
      "/api/v1/auth/forgot-password": {
        post: {
          tags: ["Authentication"],
          summary: "Request a password-reset email",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/EmailRequest" },
              },
            },
          },
          responses: {
            "202": success("Password reset email request accepted", {
              $ref: "#/components/schemas/MessageResponse",
            }),
            "400": errorResponses["400"],
          },
        },
      },
      "/api/v1/auth/reset-password": {
        post: {
          tags: ["Authentication"],
          summary: "Reset a password using a one-time token",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  allOf: [
                    { $ref: "#/components/schemas/TokenRequest" },
                    {
                      type: "object",
                      required: ["password"],
                      properties: {
                        password: {
                          type: "string",
                          format: "password",
                          minLength: 8,
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
          responses: {
            "200": success("Password reset", {
              $ref: "#/components/schemas/MessageResponse",
            }),
            "400": errorResponses["400"],
            "401": errorResponses["401"],
          },
        },
      },
      "/api/v1/auth/change-password": {
        post: {
          tags: ["Authentication"],
          summary: "Change the authenticated user's password",
          security: cookieAuth,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ChangePasswordRequest" },
              },
            },
          },
          responses: {
            "200": success("Password changed", {
              $ref: "#/components/schemas/MessageResponse",
            }),
            "400": errorResponses["400"],
            "401": errorResponses["401"],
            "409": errorResponses["409"],
          },
        },
      },
      "/api/v1/auth/resend-verification": {
        post: {
          tags: ["Authentication"],
          summary: "Request a new email-verification message",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/EmailRequest" },
              },
            },
          },
          responses: {
            "202": success("Verification email request accepted", {
              $ref: "#/components/schemas/MessageResponse",
            }),
            "400": errorResponses["400"],
          },
        },
      },
      "/api/v1/auth/verify-email": {
        post: {
          tags: ["Authentication"],
          summary: "Verify an email using a one-time token",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TokenRequest" },
              },
            },
          },
          responses: {
            "200": success("Email verified", {
              $ref: "#/components/schemas/MessageResponse",
            }),
            "400": errorResponses["400"],
            "401": errorResponses["401"],
          },
        },
      },
      "/api/v1/categories": {
        get: { tags: ["Catalog"], summary: "List categories", security: cookieAuth, parameters: [{ name: "page", in: "query", schema: { type: "integer", default: 1 } }, { name: "limit", in: "query", schema: { type: "integer", default: 20 } }, { name: "search", in: "query", schema: { type: "string" } }, { name: "parentId", in: "query", schema: { type: "integer", nullable: true } }, { name: "status", in: "query", schema: { type: "string", enum: ["ACTIVE", "INACTIVE"] } }], responses: { "200": success("Categories", { $ref: "#/components/schemas/CatalogListResponse" }), ...errorResponses } },
        post: { tags: ["Catalog"], summary: "Create category", security: cookieAuth, requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string" }, description: { type: "string", nullable: true }, image: { type: "string", nullable: true }, parentId: { type: "integer", nullable: true } } } } } }, responses: { "201": success("Category created", { $ref: "#/components/schemas/Category" }), ...errorResponses } },
      },
      "/api/v1/categories/{id}": {
        get: { tags: ["Catalog"], summary: "Get category", security: cookieAuth, parameters: [idParameter], responses: { "200": success("Category", { $ref: "#/components/schemas/Category" }), ...errorResponses } },
        patch: { tags: ["Catalog"], summary: "Update category", security: cookieAuth, parameters: [idParameter], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, description: { type: "string", nullable: true }, image: { type: "string", nullable: true }, parentId: { type: "integer", nullable: true } } } } } }, responses: { "200": success("Category updated", { $ref: "#/components/schemas/Category" }), ...errorResponses } },
        delete: { tags: ["Catalog"], summary: "Delete category", security: cookieAuth, parameters: [idParameter], responses: { "200": success("Category deleted", { $ref: "#/components/schemas/MessageResponse" }), ...errorResponses } },
      },
      "/api/v1/categories/{id}/status": { patch: { tags: ["Catalog"], summary: "Activate or deactivate category", security: cookieAuth, parameters: [idParameter], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ChangeUserStatusRequest" } } } }, responses: { "200": success("Category status updated", { $ref: "#/components/schemas/Category" }), ...errorResponses } } },
      "/api/v1/categories/{categoryId}/attributes": {
        get: { tags: ["Catalog"], summary: "List attributes assigned to a category", security: cookieAuth, parameters: [{ name: "categoryId", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": success("Category attributes", { type: "array", items: { $ref: "#/components/schemas/CategoryAttributeAssignment" } }), ...errorResponses } },
        put: { tags: ["Catalog"], summary: "Replace category attribute assignments", security: cookieAuth, parameters: [{ name: "categoryId", in: "path", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CategoryAttributesRequest" } } } }, responses: { "200": success("Category attributes updated", { type: "array", items: { $ref: "#/components/schemas/CategoryAttributeAssignment" } }), ...errorResponses } },
      },
      "/api/v1/brands": {
        get: { tags: ["Catalog"], summary: "List brands", security: cookieAuth, parameters: [{ name: "page", in: "query", schema: { type: "integer", default: 1 } }, { name: "limit", in: "query", schema: { type: "integer", default: 20 } }, { name: "search", in: "query", schema: { type: "string" } }, { name: "status", in: "query", schema: { type: "string", enum: ["ACTIVE", "INACTIVE"] } }], responses: { "200": success("Brands", { $ref: "#/components/schemas/CatalogListResponse" }), ...errorResponses } },
        post: { tags: ["Catalog"], summary: "Create brand", security: cookieAuth, requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string" }, logo: { type: "string", nullable: true }, description: { type: "string", nullable: true } } } } } }, responses: { "201": success("Brand created", { $ref: "#/components/schemas/Brand" }), ...errorResponses } },
      },
      "/api/v1/brands/{id}": {
        get: { tags: ["Catalog"], summary: "Get brand", security: cookieAuth, parameters: [idParameter], responses: { "200": success("Brand", { $ref: "#/components/schemas/Brand" }), ...errorResponses } },
        patch: { tags: ["Catalog"], summary: "Update brand", security: cookieAuth, parameters: [idParameter], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { name: { type: "string" }, logo: { type: "string", nullable: true }, description: { type: "string", nullable: true } } } } } }, responses: { "200": success("Brand updated", { $ref: "#/components/schemas/Brand" }), ...errorResponses } },
        delete: { tags: ["Catalog"], summary: "Delete brand", security: cookieAuth, parameters: [idParameter], responses: { "200": success("Brand deleted", { $ref: "#/components/schemas/MessageResponse" }), ...errorResponses } },
      },
      "/api/v1/brands/{id}/status": { patch: { tags: ["Catalog"], summary: "Activate or deactivate brand", security: cookieAuth, parameters: [idParameter], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ChangeUserStatusRequest" } } } }, responses: { "200": success("Brand status updated", { $ref: "#/components/schemas/Brand" }), ...errorResponses } } },
      "/api/v1/attributes": {
        get: { tags: ["Catalog"], summary: "List attributes", security: cookieAuth, parameters: [{ name: "page", in: "query", schema: { type: "integer", default: 1 } }, { name: "limit", in: "query", schema: { type: "integer", default: 20 } }, { name: "search", in: "query", schema: { type: "string" } }, { name: "status", in: "query", schema: { type: "string", enum: ["ACTIVE", "INACTIVE"] } }], responses: { "200": success("Attributes", { $ref: "#/components/schemas/CatalogListResponse" }), ...errorResponses } },
        post: { tags: ["Catalog"], summary: "Create attribute", security: cookieAuth, requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string" } } } } } }, responses: { "201": success("Attribute created", { $ref: "#/components/schemas/Attribute" }), ...errorResponses } },
      },
      "/api/v1/attributes/{id}": {
        get: { tags: ["Catalog"], summary: "Get attribute", security: cookieAuth, parameters: [idParameter], responses: { "200": success("Attribute", { $ref: "#/components/schemas/Attribute" }), ...errorResponses } },
        patch: { tags: ["Catalog"], summary: "Update attribute", security: cookieAuth, parameters: [idParameter], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name"], properties: { name: { type: "string" } } } } } }, responses: { "200": success("Attribute updated", { $ref: "#/components/schemas/Attribute" }), ...errorResponses } },
        delete: { tags: ["Catalog"], summary: "Delete attribute", security: cookieAuth, parameters: [idParameter], responses: { "200": success("Attribute deleted", { $ref: "#/components/schemas/MessageResponse" }), ...errorResponses } },
      },
      "/api/v1/attributes/{id}/status": { patch: { tags: ["Catalog"], summary: "Activate or deactivate attribute", security: cookieAuth, parameters: [idParameter], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ChangeUserStatusRequest" } } } }, responses: { "200": success("Attribute status updated", { $ref: "#/components/schemas/Attribute" }), ...errorResponses } } },
      "/api/v1/attributes/{attributeId}/values": {
        get: { tags: ["Catalog"], summary: "List attribute values", security: cookieAuth, parameters: [{ name: "attributeId", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": success("Attribute values", { type: "array", items: { $ref: "#/components/schemas/AttributeValue" } }), ...errorResponses } },
        post: { tags: ["Catalog"], summary: "Create attribute value", security: cookieAuth, parameters: [{ name: "attributeId", in: "path", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["value"], properties: { value: { type: "string" } } } } } }, responses: { "201": success("Attribute value created", { $ref: "#/components/schemas/AttributeValue" }), ...errorResponses } },
      },
      "/api/v1/attributes/{attributeId}/values/{valueId}": {
        patch: { tags: ["Catalog"], summary: "Update attribute value", security: cookieAuth, parameters: [{ name: "attributeId", in: "path", required: true, schema: { type: "integer" } }, { name: "valueId", in: "path", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["value"], properties: { value: { type: "string" } } } } } }, responses: { "200": success("Attribute value updated", { $ref: "#/components/schemas/AttributeValue" }), ...errorResponses } },
        delete: { tags: ["Catalog"], summary: "Delete attribute value", security: cookieAuth, parameters: [{ name: "attributeId", in: "path", required: true, schema: { type: "integer" } }, { name: "valueId", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": success("Attribute value deleted", { $ref: "#/components/schemas/MessageResponse" }), ...errorResponses } },
      },
      "/api/v1/products": {
        get: { tags: ["Catalog"], summary: "List products", security: cookieAuth, parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } }, { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }, { name: "search", in: "query", schema: { type: "string" } }, { name: "status", in: "query", schema: { type: "string", enum: ["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"] } }, { name: "brandId", in: "query", schema: { type: "integer", minimum: 1 } }, { name: "categoryId", in: "query", schema: { type: "integer", minimum: 1 } }, { name: "isFeatured", in: "query", schema: { type: "boolean" } }, { name: "sortBy", in: "query", schema: { type: "string", enum: ["id", "name", "createdAt"], default: "createdAt" } }, { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
        ], responses: { "200": success("Products", { $ref: "#/components/schemas/ProductListResponse" }), ...errorResponses } },
        post: { tags: ["Catalog"], summary: "Create product", security: cookieAuth, requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ProductCreateRequest" } } } }, responses: { "201": success("Product created", { $ref: "#/components/schemas/Product" }), ...errorResponses } },
      },
      "/api/v1/products/{id}": {
        get: { tags: ["Catalog"], summary: "Get product details", security: cookieAuth, parameters: [idParameter], responses: { "200": success("Product", { $ref: "#/components/schemas/Product" }), ...errorResponses } },
        patch: { tags: ["Catalog"], summary: "Update product", security: cookieAuth, parameters: [idParameter], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ProductUpdateRequest" } } } }, responses: { "200": success("Product updated", { $ref: "#/components/schemas/Product" }), ...errorResponses } },
        delete: { tags: ["Catalog"], summary: "Delete product", security: cookieAuth, parameters: [idParameter], responses: { "200": success("Product deleted", { $ref: "#/components/schemas/MessageResponse" }), ...errorResponses } },
      },
      "/api/v1/products/{id}/status": { patch: { tags: ["Catalog"], summary: "Update product status", security: cookieAuth, parameters: [idParameter], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ProductStatusRequest" } } } }, responses: { "200": success("Product status updated", { $ref: "#/components/schemas/Product" }), ...errorResponses } } },
      "/api/v1/cart": { get: { tags: ["Cart"], summary: "Get current guest or user cart", security: [{ cookieAuth: [] }, { guestCartAuth: [] }], responses: { "200": success("Cart", { $ref: "#/components/schemas/Cart" }) } } },
      "/api/v1/cart/items": {
        post: { tags: ["Cart"], summary: "Add item to cart", security: [{ cookieAuth: [] }, { guestCartAuth: [] }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["variantId", "quantity"], properties: { variantId: { type: "integer" }, quantity: { type: "integer", minimum: 1 } } } } } }, responses: { "200": success("Cart updated", { $ref: "#/components/schemas/Cart" }), ...errorResponses } },
        delete: { tags: ["Cart"], summary: "Clear cart", security: [{ cookieAuth: [] }, { guestCartAuth: [] }], responses: { "200": success("Cart cleared", { $ref: "#/components/schemas/Cart" }) } },
      },
      "/api/v1/cart/items/{itemId}": { patch: { tags: ["Cart"], summary: "Update cart item quantity", security: [{ cookieAuth: [] }, { guestCartAuth: [] }], parameters: [{ name: "itemId", in: "path", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["quantity"], properties: { quantity: { type: "integer", minimum: 1 } } } } } }, responses: { "200": success("Cart item updated", { $ref: "#/components/schemas/Cart" }), ...errorResponses } }, delete: { tags: ["Cart"], summary: "Remove cart item", security: [{ cookieAuth: [] }, { guestCartAuth: [] }], parameters: [{ name: "itemId", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": success("Cart item removed", { $ref: "#/components/schemas/Cart" }), ...errorResponses } } },
      "/api/v1/addresses": { get: { tags: ["Addresses"], summary: "List my addresses", security: cookieAuth, responses: { "200": success("Addresses", { type: "array", items: { $ref: "#/components/schemas/Address" } }) } }, post: { tags: ["Addresses"], summary: "Create address", security: cookieAuth, requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Address" } } } }, responses: { "201": success("Address created", { $ref: "#/components/schemas/Address" }), ...errorResponses } } },
      "/api/v1/addresses/{addressId}": { get: { tags: ["Addresses"], summary: "Get address", security: cookieAuth, parameters: [{ name: "addressId", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": success("Address", { $ref: "#/components/schemas/Address" }), ...errorResponses } }, patch: { tags: ["Addresses"], summary: "Update address", security: cookieAuth, parameters: [{ name: "addressId", in: "path", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Address" } } } }, responses: { "200": success("Address updated", { $ref: "#/components/schemas/Address" }), ...errorResponses } }, delete: { tags: ["Addresses"], summary: "Delete address", security: cookieAuth, parameters: [{ name: "addressId", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": success("Address deleted", { $ref: "#/components/schemas/MessageResponse" }), ...errorResponses } } },
      "/api/v1/addresses/{addressId}/default-shipping": { patch: { tags: ["Addresses"], summary: "Set default shipping address", security: cookieAuth, parameters: [{ name: "addressId", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": success("Default shipping address updated", { $ref: "#/components/schemas/Address" }), ...errorResponses } } },
      "/api/v1/addresses/{addressId}/default-billing": { patch: { tags: ["Addresses"], summary: "Set default billing address", security: cookieAuth, parameters: [{ name: "addressId", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": success("Default billing address updated", { $ref: "#/components/schemas/Address" }), ...errorResponses } } },
      "/api/v1/shipping/options": { get: { tags: ["Shipping"], summary: "Get available shipping options", security: cookieAuth, parameters: [{ name: "addressId", in: "query", required: true, schema: { type: "integer" } }], responses: { "200": success("Shipping options", { type: "object" }), ...errorResponses } } },
      "/api/v1/shipping-zones": { get: { tags: ["Shipping"], summary: "List shipping zones", security: cookieAuth, responses: { "200": success("Shipping zones", { type: "array", items: { $ref: "#/components/schemas/ShippingZone" } }) } }, post: { tags: ["Shipping"], summary: "Create shipping zone", security: cookieAuth, requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ShippingZone" } } } }, responses: { "201": success("Zone created", { $ref: "#/components/schemas/ShippingZone" }), ...errorResponses } } },
      "/api/v1/shipping-zones/{zoneId}": { get: { tags: ["Shipping"], summary: "Get shipping zone", security: cookieAuth, parameters: [{ name: "zoneId", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": success("Zone", { $ref: "#/components/schemas/ShippingZone" }), ...errorResponses } }, patch: { tags: ["Shipping"], summary: "Update shipping zone", security: cookieAuth, parameters: [{ name: "zoneId", in: "path", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ShippingZone" } } } }, responses: { "200": success("Zone updated", { $ref: "#/components/schemas/ShippingZone" }), ...errorResponses } }, delete: { tags: ["Shipping"], summary: "Delete shipping zone", security: cookieAuth, parameters: [{ name: "zoneId", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": success("Zone deleted", { $ref: "#/components/schemas/MessageResponse" }), ...errorResponses } } },
      "/api/v1/shipping-zones/{zoneId}/areas": { get: { tags: ["Shipping"], summary: "List zone areas", security: cookieAuth, parameters: [{ name: "zoneId", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": success("Zone areas", { type: "array", items: { type: "object" } }) } }, post: { tags: ["Shipping"], summary: "Create zone area rule", security: cookieAuth, parameters: [{ name: "zoneId", in: "path", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { "201": success("Area created", { type: "object" }), ...errorResponses } } },
      "/api/v1/shipping-methods": { get: { tags: ["Shipping"], summary: "List shipping methods", security: cookieAuth, responses: { "200": success("Shipping methods", { type: "array", items: { $ref: "#/components/schemas/ShippingMethod" } }) } }, post: { tags: ["Shipping"], summary: "Create shipping method", security: cookieAuth, requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ShippingMethod" } } } }, responses: { "201": success("Method created", { $ref: "#/components/schemas/ShippingMethod" }), ...errorResponses } } },
      "/api/v1/variants/{variantId}/inventory": { get: { tags: ["Inventory"], summary: "Get variant inventory", security: cookieAuth, parameters: [{ name: "variantId", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": success("Inventory", { $ref: "#/components/schemas/Inventory" }), ...errorResponses } } },
      "/api/v1/variants/{variantId}/inventory/initialize": { post: { tags: ["Inventory"], summary: "Initialize inventory", security: cookieAuth, parameters: [{ name: "variantId", in: "path", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["quantity"], properties: { quantity: { type: "integer", minimum: 0 }, lowStockThreshold: { type: "integer", minimum: 0 }, note: { type: "string" } } } } } }, responses: { "201": success("Inventory initialized", { $ref: "#/components/schemas/Inventory" }), ...errorResponses } } },
      "/api/v1/variants/{variantId}/inventory/restock": { post: { tags: ["Inventory"], summary: "Restock variant inventory", security: cookieAuth, parameters: [{ name: "variantId", in: "path", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["quantity"], properties: { quantity: { type: "integer", minimum: 1 }, note: { type: "string" } } } } } }, responses: { "200": success("Inventory restocked", { $ref: "#/components/schemas/Inventory" }), ...errorResponses } } },
      "/api/v1/variants/{variantId}/inventory/damage": { post: { tags: ["Inventory"], summary: "Record damaged stock", security: cookieAuth, parameters: [{ name: "variantId", in: "path", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["quantity"], properties: { quantity: { type: "integer", minimum: 1 }, note: { type: "string" } } } } } }, responses: { "200": success("Damage recorded", { $ref: "#/components/schemas/Inventory" }), ...errorResponses } } },
      "/api/v1/variants/{variantId}/inventory/adjust": { post: { tags: ["Inventory"], summary: "Adjust inventory", security: cookieAuth, parameters: [{ name: "variantId", in: "path", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["quantity", "note"], properties: { quantity: { type: "integer", exclusiveMinimum: 0 }, note: { type: "string" } } } } } }, responses: { "200": success("Inventory adjusted", { $ref: "#/components/schemas/Inventory" }), ...errorResponses } } },
      "/api/v1/variants/{variantId}/inventory/movements": { get: { tags: ["Inventory"], summary: "List inventory movements", security: cookieAuth, parameters: [{ name: "variantId", in: "path", required: true, schema: { type: "integer" } }, { name: "page", in: "query", schema: { type: "integer", default: 1 } }, { name: "limit", in: "query", schema: { type: "integer", default: 20 } }, { name: "type", in: "query", schema: { type: "string" } }], responses: { "200": success("Inventory movements", { $ref: "#/components/schemas/CatalogListResponse" }), ...errorResponses } } },
      "/api/v1/products/{productId}/images/{imageId}": { patch: { tags: ["Catalog"], summary: "Update product image", security: cookieAuth, parameters: [{ name: "productId", in: "path", required: true, schema: { type: "integer" } }, { name: "imageId", in: "path", required: true, schema: { type: "integer" } }], requestBody: { content: { "multipart/form-data": { schema: { type: "object", properties: { image: { type: "string", format: "binary" }, altText: { type: "string" }, isPrimary: { type: "boolean" }, sortOrder: { type: "integer" }, attributeValueIds: { type: "string" } } } } } }, responses: { "200": success("Image updated", { $ref: "#/components/schemas/ProductImage" }), ...errorResponses } }, delete: { tags: ["Catalog"], summary: "Delete product image", security: cookieAuth, parameters: [{ name: "productId", in: "path", required: true, schema: { type: "integer" } }, { name: "imageId", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": success("Image deleted", { $ref: "#/components/schemas/MessageResponse" }), ...errorResponses } } },
      "/api/v1/products/{productId}/variants/{variantId}": { get: { tags: ["Catalog"], summary: "Get product variant", security: cookieAuth, parameters: [{ name: "productId", in: "path", required: true, schema: { type: "integer" } }, { name: "variantId", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": success("Variant", { $ref: "#/components/schemas/ProductVariant" }), ...errorResponses } }, patch: { tags: ["Catalog"], summary: "Update product variant", security: cookieAuth, parameters: [{ name: "productId", in: "path", required: true, schema: { type: "integer" } }, { name: "variantId", in: "path", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ProductVariant" } } } }, responses: { "200": success("Variant updated", { $ref: "#/components/schemas/ProductVariant" }), ...errorResponses } }, delete: { tags: ["Catalog"], summary: "Delete product variant", security: cookieAuth, parameters: [{ name: "productId", in: "path", required: true, schema: { type: "integer" } }, { name: "variantId", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": success("Variant deleted", { $ref: "#/components/schemas/MessageResponse" }), ...errorResponses } } },
      "/api/v1/shipping-zones/{zoneId}/areas/{areaId}": { patch: { tags: ["Shipping"], summary: "Update zone area", security: cookieAuth, parameters: [{ name: "zoneId", in: "path", required: true, schema: { type: "integer" } }, { name: "areaId", in: "path", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object" } } } }, responses: { "200": success("Area updated", { type: "object" }), ...errorResponses } }, delete: { tags: ["Shipping"], summary: "Delete zone area", security: cookieAuth, parameters: [{ name: "zoneId", in: "path", required: true, schema: { type: "integer" } }, { name: "areaId", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": success("Area deleted", { $ref: "#/components/schemas/MessageResponse" }), ...errorResponses } } },
      "/api/v1/shipping-methods/{methodId}": { get: { tags: ["Shipping"], summary: "Get shipping method", security: cookieAuth, parameters: [{ name: "methodId", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": success("Method", { $ref: "#/components/schemas/ShippingMethod" }), ...errorResponses } }, patch: { tags: ["Shipping"], summary: "Update shipping method", security: cookieAuth, parameters: [{ name: "methodId", in: "path", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ShippingMethod" } } } }, responses: { "200": success("Method updated", { $ref: "#/components/schemas/ShippingMethod" }), ...errorResponses } }, delete: { tags: ["Shipping"], summary: "Delete shipping method", security: cookieAuth, parameters: [{ name: "methodId", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": success("Method deleted", { $ref: "#/components/schemas/MessageResponse" }), ...errorResponses } } },
      "/api/v1/shipping-zones/{zoneId}/methods": { post: { tags: ["Shipping"], summary: "Configure shipping method for zone", security: cookieAuth, parameters: [{ name: "zoneId", in: "path", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["methodId", "charge"], properties: { methodId: { type: "integer" }, charge: { type: "number", minimum: 0 }, estimatedMinDays: { type: "integer", minimum: 0 }, estimatedMaxDays: { type: "integer", minimum: 0 }, isActive: { type: "boolean" }, sortOrder: { type: "integer" } } } } } }, responses: { "201": success("Zone method configured", { type: "object" }), ...errorResponses } } },
      "/api/v1/products/{productId}/images": { get: { tags: ["Catalog"], summary: "List product images", security: cookieAuth, parameters: [{ name: "productId", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": success("Product images", { type: "array", items: { $ref: "#/components/schemas/ProductImage" } }) } }, post: { tags: ["Catalog"], summary: "Upload product image", security: cookieAuth, parameters: [{ name: "productId", in: "path", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "multipart/form-data": { schema: { type: "object", required: ["image"], properties: { image: { type: "string", format: "binary" }, altText: { type: "string" }, isPrimary: { type: "boolean" }, sortOrder: { type: "integer" }, attributeValueIds: { type: "string", example: "[10,20]" } } } } } }, responses: { "201": success("Image uploaded", { $ref: "#/components/schemas/ProductImage" }), ...errorResponses } } },
      "/api/v1/products/{productId}/variants": { get: { tags: ["Catalog"], summary: "List product variants", security: cookieAuth, parameters: [{ name: "productId", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": success("Product variants", { type: "array", items: { $ref: "#/components/schemas/ProductVariant" } }) } }, post: { tags: ["Catalog"], summary: "Create product variant", security: cookieAuth, parameters: [{ name: "productId", in: "path", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["sku", "price", "attributeValueIds"], properties: { sku: { type: "string" }, price: { type: "number", minimum: 0 }, compareAtPrice: { type: "number", nullable: true }, costPrice: { type: "number", nullable: true }, isActive: { type: "boolean" }, sortOrder: { type: "integer" }, attributeValueIds: { type: "array", items: { type: "integer" } } } } } } }, responses: { "201": success("Variant created", { $ref: "#/components/schemas/ProductVariant" }), ...errorResponses } } },
      "/api/v1/users/me": {
        get: {
          tags: ["Users"],
          summary: "Get the current authenticated user",
          security: cookieAuth,
          responses: {
            "200": success("Current user", {
              $ref: "#/components/schemas/UserResponse",
            }),
            "401": errorResponses["401"],
          },
        },
      },
      "/api/v1/users": {
        get: {
          tags: ["Users"],
          summary: "List users",
          description:
            "Requires the `users:read:any` permission. Authorization is resolved from Role → RolePermission → Permission.",
          security: cookieAuth,
          parameters: [
            {
              name: "page",
              in: "query",
              schema: { type: "integer", minimum: 1, default: 1 },
            },
            {
              name: "limit",
              in: "query",
              schema: {
                type: "integer",
                minimum: 1,
                maximum: 100,
                default: 20,
              },
            },
            {
              name: "sortOrder",
              in: "query",
              schema: {
                type: "string",
                enum: ["asc", "desc"],
                default: "desc",
              },
            },
            {
              name: "roleId",
              in: "query",
              schema: { type: "integer", minimum: 1 },
            },
            {
              name: "status",
              in: "query",
              schema: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
            },
            {
              name: "search",
              in: "query",
              schema: { type: "string", minLength: 1, maxLength: 100 },
            },
            {
              name: "sortBy",
              in: "query",
              schema: {
                type: "string",
                enum: [
                  "id",
                  "email",
                  "userName",
                  "fullName",
                  "roleId",
                  "createdAt",
                ],
                default: "createdAt",
              },
            },
          ],
          responses: {
            "200": success("Users", {
              $ref: "#/components/schemas/UsersResponse",
            }),
            ...errorResponses,
          },
        },
        post: {
          tags: ["Users"],
          summary: "Create a user",
          description:
            "Requires the `users:create` permission. Role hierarchy is enforced by the application.",
          security: cookieAuth,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateUserRequest" },
              },
            },
          },
          responses: {
            "201": success("User created", {
              $ref: "#/components/schemas/UserResponse",
            }),
            "400": errorResponses["400"],
            "401": errorResponses["401"],
            "403": errorResponses["403"],
            "409": errorResponses["409"],
          },
        },
      },
      "/api/v1/users/{id}": {
        get: {
          tags: ["Users"],
          summary: "Get a user by ID",
          description: "Requires the `users:read:any` permission.",
          security: cookieAuth,
          parameters: [idParameter],
          responses: {
            "200": success("User", {
              $ref: "#/components/schemas/UserResponse",
            }),
            ...errorResponses,
          },
        },
        patch: {
          tags: ["Users"],
          summary: "Update a user's profile",
          description:
            "Requires the `users:update:any` permission. Role hierarchy is enforced by the application.",
          security: cookieAuth,
          parameters: [idParameter],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UpdateUserRequest" },
              },
            },
          },
          responses: {
            "200": success("User updated", {
              $ref: "#/components/schemas/UserResponse",
            }),
            ...errorResponses,
          },
        },
      },
      "/api/v1/users/{id}/role": {
        patch: {
          tags: ["Users"],
          summary: "Change a user's role",
          description:
            "Requires the `users:change-role` permission. Role hierarchy is enforced using Role.rank.",
          security: cookieAuth,
          parameters: [idParameter],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ChangeUserRoleRequest" },
              },
            },
          },
          responses: {
            "200": success("Role updated", {
              $ref: "#/components/schemas/UserResponse",
            }),
            ...errorResponses,
          },
        },
      },
      "/api/v1/users/{id}/status": {
        patch: {
          tags: ["Users"],
          summary: "Change a user's active status",
          description:
            "Requires the `users:change-status` permission. Role hierarchy is enforced by the application.",
          security: cookieAuth,
          parameters: [idParameter],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ChangeUserStatusRequest",
                },
              },
            },
          },
          responses: {
            "200": success("Status updated", {
              $ref: "#/components/schemas/UserResponse",
            }),
            ...errorResponses,
          },
        },
      },
      "/api/v1/checkout": { post: { tags: ["Checkout"], summary: "Checkout authenticated cart", security: cookieAuth, requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CheckoutRequest" } } } }, responses: { "201": success("Checkout completed"), ...errorResponses } } },
      "/api/v1/checkout/guest": { post: { tags: ["Checkout"], summary: "Checkout guest cart", description: "Uses the guest_cart httpOnly cookie to resolve the guest cart. The response returns a secure guest order access token.", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/GuestCheckoutRequest" } } } }, responses: { "201": success("Guest checkout completed", { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { type: "object", properties: { orderNumber: { type: "string" }, status: { type: "string", example: "PENDING" }, paymentMethod: { type: "string", example: "CASH_ON_DELIVERY" }, paymentStatus: { type: "string", example: "UNPAID" }, subtotal: { type: "string" }, shippingCharge: { type: "string" }, discountAmount: { type: "string" }, grandTotal: { type: "string" }, guestAccessToken: { type: "string" } } } } }), ...errorResponses } } },
      "/api/v1/orders": { get: { tags: ["Orders"], summary: "List authenticated customer's orders", description: "Returns only orders owned by the authenticated customer.", security: cookieAuth, parameters: [{ name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } }, { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }, { name: "status", in: "query", schema: { type: "string", enum: ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] } }], responses: { "200": success("Orders fetched", { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { type: "array", items: { $ref: "#/components/schemas/Order" } }, meta: { $ref: "#/components/schemas/PaginationMeta" } } }), ...errorResponses } } },
      "/api/v1/orders/{orderNumber}": { get: { tags: ["Orders"], summary: "Get authenticated customer's order detail", description: "Returns the order only when it belongs to the authenticated customer.", security: cookieAuth, parameters: [{ name: "orderNumber", in: "path", required: true, schema: { type: "string" }, example: "ORD-20260928-000123" }], responses: { "200": success("Order fetched", { $ref: "#/components/schemas/Order" }), ...errorResponses } } },
      "/api/v1/orders/guest/{orderNumber}": { get: { tags: ["Orders"], summary: "Get guest order detail securely", description: "Requires the guest access token returned by guest checkout. Order number alone is not sufficient.", parameters: [{ name: "orderNumber", in: "path", required: true, schema: { type: "string" } }, { name: "accessToken", in: "query", required: true, schema: { type: "string", minLength: 32 } }], responses: { "200": success("Guest order fetched", { $ref: "#/components/schemas/Order" }), ...errorResponses } } },
      "/api/v1/admin/orders": { get: { tags: ["Orders"], summary: "List all orders", description: "Requires the orders:read:any permission.", security: cookieAuth, parameters: [{ name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } }, { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }, { name: "orderNumber", in: "query", schema: { type: "string", minLength: 1, maxLength: 80 } }, { name: "status", in: "query", schema: { type: "string", enum: ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] } }, { name: "paymentStatus", in: "query", schema: { type: "string", enum: ["UNPAID", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"] } }, { name: "customerPhone", in: "query", schema: { type: "string", minLength: 1, maxLength: 30 } }, { name: "customerEmail", in: "query", schema: { type: "string", format: "email" } }], responses: { "200": success("Orders fetched", { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, data: { type: "array", items: { $ref: "#/components/schemas/Order" } }, meta: { $ref: "#/components/schemas/PaginationMeta" } } }), ...errorResponses } } },
      "/api/v1/admin/orders/{orderNumber}": { get: { tags: ["Orders"], summary: "Get admin order detail", description: "Returns complete operational order information, including status history and shipment summary.", security: cookieAuth, parameters: [{ name: "orderNumber", in: "path", required: true, schema: { type: "string" } }], responses: { "200": success("Order fetched", { $ref: "#/components/schemas/Order" }), ...errorResponses } } },
      "/api/v1/admin/orders/{orderNumber}/status": { patch: { tags: ["Orders"], summary: "Transition order status", description: "Uses the dedicated order transition map. If a shipment exists, PROCESSING to SHIPPED must use the Shipment workflow.", security: cookieAuth, parameters: [{ name: "orderNumber", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/OrderStatusTransitionRequest" } } } }, responses: { "200": success("Order status updated", { $ref: "#/components/schemas/Order" }), ...errorResponses } } },
      "/api/v1/products/{slug}/reviews": { get: { tags: ["Reviews"], summary: "List approved product reviews", parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }, { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } }, { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }, { name: "sort", in: "query", schema: { type: "string", enum: ["newest", "oldest", "highest", "lowest"], default: "newest" } }], responses: { "200": success("Product reviews") , ...errorResponses } } },
      "/api/v1/products/{slug}/rating-summary": { get: { tags: ["Reviews"], summary: "Get product rating summary", parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }], responses: { "200": success("Rating summary"), ...errorResponses } } },
      "/api/v1/reviews": { post: { tags: ["Reviews"], summary: "Create a product review", security: cookieAuth, requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["orderItemId", "rating"], properties: { orderItemId: { type: "integer", minimum: 1 }, rating: { type: "integer", minimum: 1, maximum: 5 }, title: { type: "string", nullable: true }, comment: { type: "string", nullable: true } } } } } }, responses: { "201": success("Review created"), ...errorResponses } } },
      "/api/v1/reviews/me": { get: { tags: ["Reviews"], summary: "List my reviews", security: cookieAuth, responses: { "200": success("Reviews fetched"), ...errorResponses } } },
      "/api/v1/reviews/{id}": { get: { tags: ["Reviews"], summary: "Get my review", security: cookieAuth, parameters: [idParameter], responses: { "200": success("Review fetched"), ...errorResponses } }, patch: { tags: ["Reviews"], summary: "Update my review", security: cookieAuth, parameters: [idParameter], requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { rating: { type: "integer", minimum: 1, maximum: 5 }, title: { type: "string", nullable: true }, comment: { type: "string", nullable: true } } } } } }, responses: { "200": success("Review updated"), ...errorResponses } }, delete: { tags: ["Reviews"], summary: "Delete my review", security: cookieAuth, parameters: [idParameter], responses: { "200": success("Review deleted"), ...errorResponses } } },
      "/api/v1/admin/reviews": { get: { tags: ["Reviews"], summary: "List reviews for moderation", security: cookieAuth, parameters: [{ name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } }, { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }, { name: "status", in: "query", schema: { type: "string", enum: ["PENDING", "APPROVED", "REJECTED"] } }, { name: "rating", in: "query", schema: { type: "integer", minimum: 1, maximum: 5 } }, { name: "productId", in: "query", schema: { type: "integer", minimum: 1 } }, { name: "userId", in: "query", schema: { type: "integer", minimum: 1 } }], responses: { "200": success("Reviews fetched"), ...errorResponses } } },
      "/api/v1/admin/reviews/{id}": { get: { tags: ["Reviews"], summary: "Get review for moderation", security: cookieAuth, parameters: [idParameter], responses: { "200": success("Review fetched"), ...errorResponses } } },
      "/api/v1/admin/reviews/{id}/approve": { post: { tags: ["Reviews"], summary: "Approve review", security: cookieAuth, parameters: [idParameter], responses: { "200": success("Review approved"), ...errorResponses } } },
      "/api/v1/admin/reviews/{id}/reject": { post: { tags: ["Reviews"], summary: "Reject review", security: cookieAuth, parameters: [idParameter], responses: { "200": success("Review rejected"), ...errorResponses } } },
      "/api/v1/wishlist": { get: { tags: ["Wishlist"], summary: "List my wishlist", security: cookieAuth, parameters: [{ name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } }, { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }], responses: { "200": success("Wishlist fetched"), ...errorResponses } } },
      "/api/v1/wishlist/items/{productId}": { post: { tags: ["Wishlist"], summary: "Add product to wishlist", security: cookieAuth, parameters: [{ name: "productId", in: "path", required: true, schema: { type: "integer", minimum: 1 } }], responses: { "201": success("Product added to wishlist"), ...errorResponses } }, delete: { tags: ["Wishlist"], summary: "Remove product from wishlist", security: cookieAuth, parameters: [{ name: "productId", in: "path", required: true, schema: { type: "integer", minimum: 1 } }], responses: { "200": success("Product removed from wishlist"), ...errorResponses } } },
      "/api/v1/coupons/validate": { post: { tags: ["Coupons"], summary: "Validate coupon against current cart", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["code"], properties: { code: { type: "string", example: "EID20" } } } } } }, responses: { "200": success("Coupon preview calculated"), ...errorResponses } } },
      "/api/v1/admin/coupons": { get: { tags: ["Coupons"], summary: "List coupons", security: cookieAuth, responses: { "200": success("Coupons fetched") , ...errorResponses } }, post: { tags: ["Coupons"], summary: "Create coupon", security: cookieAuth, requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Coupon" } } } }, responses: { "201": success("Coupon created", { $ref: "#/components/schemas/Coupon" }), ...errorResponses } } },
      "/api/v1/admin/coupons/{id}": { get: { tags: ["Coupons"], summary: "Get coupon", security: cookieAuth, parameters: [idParameter], responses: { "200": success("Coupon fetched", { $ref: "#/components/schemas/Coupon" }), ...errorResponses } }, patch: { tags: ["Coupons"], summary: "Update coupon", security: cookieAuth, parameters: [idParameter], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Coupon" } } } }, responses: { "200": success("Coupon updated", { $ref: "#/components/schemas/Coupon" }), ...errorResponses } }, delete: { tags: ["Coupons"], summary: "Delete unused coupon", security: cookieAuth, parameters: [idParameter], responses: { "200": success("Coupon deleted"), ...errorResponses } } },
      "/api/v1/admin/orders/{orderNumber}/shipment": { get: { tags: ["Shipments"], summary: "Get shipment", security: cookieAuth, parameters: [{ name: "orderNumber", in: "path", required: true, schema: { type: "string" } }], responses: { "200": success("Shipment fetched", { $ref: "#/components/schemas/Shipment" }), ...errorResponses } }, post: { tags: ["Shipments"], summary: "Create shipment for PROCESSING order", security: cookieAuth, parameters: [{ name: "orderNumber", in: "path", required: true, schema: { type: "string" } }], requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/Shipment" } } } }, responses: { "201": success("Shipment created", { $ref: "#/components/schemas/Shipment" }), ...errorResponses } }, patch: { tags: ["Shipments"], summary: "Update courier metadata", security: cookieAuth, parameters: [{ name: "orderNumber", in: "path", required: true, schema: { type: "string" } }], requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/Shipment" } } } }, responses: { "200": success("Shipment updated", { $ref: "#/components/schemas/Shipment" }), ...errorResponses } } },
      "/api/v1/admin/orders/{orderNumber}/shipment/transition": { post: { tags: ["Shipments"], summary: "Transition shipment status", security: cookieAuth, parameters: [{ name: "orderNumber", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["status"], properties: { status: { $ref: "#/components/schemas/Shipment/properties/status" }, note: { type: "string" } } } } } }, responses: { "200": success("Shipment transitioned", { $ref: "#/components/schemas/Shipment" }), ...errorResponses } } },
      "/api/v1/orders/{orderNumber}/returns": { post: { tags: ["Returns"], summary: "Request return for delivered order", security: cookieAuth, parameters: [{ name: "orderNumber", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/ReturnRequest" } } } }, responses: { "201": success("Return requested", { $ref: "#/components/schemas/Return" }), ...errorResponses } } },
      "/api/v1/returns": { get: { tags: ["Returns"], summary: "List my returns", security: cookieAuth, responses: { "200": success("Returns fetched"), ...errorResponses } } },
      "/api/v1/returns/{returnNumber}": { get: { tags: ["Returns"], summary: "Get my return", security: cookieAuth, parameters: [{ name: "returnNumber", in: "path", required: true, schema: { type: "string" } }], responses: { "200": success("Return fetched", { $ref: "#/components/schemas/Return" }), ...errorResponses } } },
      "/api/v1/admin/returns/{returnNumber}/transition": { post: { tags: ["Returns"], summary: "Transition return", security: cookieAuth, parameters: [{ name: "returnNumber", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["status"], properties: { status: { type: "string", enum: ["APPROVED", "REJECTED", "IN_TRANSIT", "RECEIVED", "COMPLETED", "CANCELLED"] }, note: { type: "string" } } } } } }, responses: { "200": success("Return transitioned"), ...errorResponses } } },
      "/api/v1/admin/returns/{returnNumber}/items/{itemId}": { patch: { tags: ["Returns"], summary: "Inspect and restock return item", security: cookieAuth, parameters: [{ name: "returnNumber", in: "path", required: true, schema: { type: "string" } }, { name: "itemId", in: "path", required: true, schema: { type: "integer" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["condition", "restockQuantity"], properties: { condition: { type: "string", enum: ["UNOPENED", "GOOD", "DAMAGED", "DEFECTIVE", "USED"] }, restockQuantity: { type: "integer", minimum: 0 }, adminNote: { type: "string" } } } } } }, responses: { "200": success("Return item inspected"), ...errorResponses } } },
      "/api/v1/admin/returns/{returnNumber}/refunds": { post: { tags: ["Refunds"], summary: "Create refund", security: cookieAuth, parameters: [{ name: "returnNumber", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["amount"], properties: { amount: { type: "string", example: "500.00" }, method: { type: "string", enum: ["CASH", "BANK_TRANSFER", "MOBILE_BANKING", "ORIGINAL_PAYMENT_METHOD", "OTHER"] }, reason: { type: "string" }, note: { type: "string" } } } } } }, responses: { "201": success("Refund created", { $ref: "#/components/schemas/Refund" }), ...errorResponses } } },
      "/api/v1/admin/refunds": { get: { tags: ["Refunds"], summary: "List refunds", security: cookieAuth, responses: { "200": success("Refunds fetched"), ...errorResponses } } },
      "/api/v1/admin/refunds/{refundNumber}/transition": { post: { tags: ["Refunds"], summary: "Transition refund", security: cookieAuth, parameters: [{ name: "refundNumber", in: "path", required: true, schema: { type: "string" } }], requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["status"], properties: { status: { type: "string", enum: ["PROCESSING", "COMPLETED", "FAILED", "CANCELLED"] }, note: { type: "string" } } } } } }, responses: { "200": success("Refund transitioned"), ...errorResponses } } },
      "/api/v1/users/{id}/reset-password": {
        post: {
          tags: ["Users"],
          summary: "Reset a user's password",
          description:
            "Requires the `users:reset-password` permission. Existing sessions are revoked.",
          security: cookieAuth,
          parameters: [idParameter],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ResetUserPasswordRequest",
                },
              },
            },
          },
          responses: {
            "200": success("Password reset", {
              $ref: "#/components/schemas/MessageResponse",
            }),
            ...errorResponses,
          },
        },
      },
    },
  },
  apis: [],
});
