import express from "express";
import type { NextFunction, Request, Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ allowed: true, uploadLogo: vi.fn() }));
vi.mock("../../src/modules/brand/services/brand.service.js", () => ({ uploadLogo: mocks.uploadLogo }));
vi.mock("../../src/middlewares/auth.middleware.js", () => ({ requireAuth: (_req: Request, _res: Response, next: NextFunction) => next() }));
vi.mock("../../src/middlewares/authorization.middleware.js", () => ({ requirePermission: () => (_req: Request, res: Response, next: NextFunction) => mocks.allowed ? next() : res.status(403).json({ message: "Forbidden" }) }));
import routes from "../../src/modules/brand/brand.route.js";
const app = express(); app.use(routes);
app.use((error: { statusCode?: number; message: string }, _req: Request, res: Response, _next: NextFunction) => res.status(error.statusCode ?? 500).json({ message: error.message }));
beforeEach(() => { vi.clearAllMocks(); mocks.allowed = true; mocks.uploadLogo.mockResolvedValue({ id: 1, logo: "/uploads/brands/logo.jpg" }); });
describe("brand logo upload", () => {
  it("passes the multipart file and brand ID to the service", async () => {
    const response = await request(app).post("/1/logo").attach("image", Buffer.from([0xff, 0xd8, 0xff]), { filename: "logo.jpg", contentType: "image/jpeg" });
    expect(response.status).toBe(200); expect(mocks.uploadLogo).toHaveBeenCalledWith(1, expect.objectContaining({ originalname: "logo.jpg" }));
  });
  it("denies unauthorized uploads before parsing malformed multipart content", async () => {
    mocks.allowed = false;
    const response = await request(app).post("/1/logo").set("Content-Type", "multipart/form-data").send("invalid multipart");
    expect(response.status).toBe(403); expect(mocks.uploadLogo).not.toHaveBeenCalled();
  });
  it("validates the target ID", async () => { const response = await request(app).post("/0/logo"); expect(response.status).toBe(400); expect(mocks.uploadLogo).not.toHaveBeenCalled(); });
});
