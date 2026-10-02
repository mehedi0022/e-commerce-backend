import express from "express";
import type { NextFunction, Request, Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), list: vi.fn(), remove: vi.fn() }));
vi.mock("../../src/modules/product/services/product-image.service.js", () => service);
vi.mock("../../src/middlewares/auth.middleware.js", () => ({ requireAuth: (_req: Request, _res: Response, next: NextFunction) => next() }));
vi.mock("../../src/middlewares/authorization.middleware.js", () => ({ requirePermission: () => (_req: Request, _res: Response, next: NextFunction) => next() }));
import routes from "../../src/modules/product/product-image.route.js";

const app = express();
app.use(express.json()); app.use(routes);
app.use((error: { statusCode?: number; message: string }, _req: Request, res: Response, _next: NextFunction) => res.status(error.statusCode ?? 500).json({ message: error.message }));
beforeEach(() => { vi.clearAllMocks(); service.create.mockResolvedValue({ id: 1 }); service.update.mockResolvedValue({ id: 1 }); });

describe("image route body validation after multipart parsing", () => {
  it("delivers typed multipart metadata to the service", async () => {
    const response = await request(app).post("/products/1/images").field("isPrimary", "false").field("sortOrder", "2").field("attributeValueIds", "[10]").attach("image", Buffer.from([0xff, 0xd8, 0xff]), { filename: "shirt.jpg", contentType: "image/jpeg" });
    expect(response.status).toBe(201);
    expect(service.create).toHaveBeenCalledWith(1, expect.objectContaining({ originalname: "shirt.jpg" }), { isPrimary: false, sortOrder: 2, attributeValueIds: [10] });
  });
  it("returns 400 for malformed multipart IDs without reaching persistence", async () => {
    const response = await request(app).post("/products/1/images").field("attributeValueIds", "[bad");
    expect(response.status).toBe(400); expect(service.create).not.toHaveBeenCalled();
  });
  it("supports JSON-only metadata patches", async () => {
    const response = await request(app).patch("/products/1/images/2").send({ isPrimary: true, attributeValueIds: [] });
    expect(response.status).toBe(200);
    expect(service.update).toHaveBeenCalledWith(1, 2, undefined, { isPrimary: true, attributeValueIds: [] });
  });
});
