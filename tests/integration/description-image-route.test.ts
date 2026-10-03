import express from "express";
import type { NextFunction, Request, Response } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ permissions: ['products:create'], upload: vi.fn() }));
vi.mock("../../src/modules/product/services/product.service.js", () => ({}));
vi.mock("../../src/modules/product/services/product-variant.service.js", () => ({}));
vi.mock("../../src/modules/upload/upload.module.js", () => ({ uploadService: { upload: mocks.upload } }));
vi.mock("../../src/middlewares/auth.middleware.js", () => ({ requireAuth: (req: Request, _res: Response, next: NextFunction) => { Object.assign(req, { auth: { permissions: mocks.permissions } }); next(); } }));
import routes from "../../src/modules/product/product.route.js";
const app = express(); app.use(routes);
app.use((error: { statusCode?: number; message: string }, _req: Request, res: Response, _next: NextFunction) => res.status(error.statusCode ?? 500).json({ message: error.message }));
beforeEach(() => { vi.clearAllMocks(); mocks.permissions = ['products:create']; mocks.upload.mockResolvedValue({ url: '/uploads/product-descriptions/a.webp' }); });
describe("description image upload", () => {
  it.each(['products:create', 'products:update:any'])('allows %s without requiring a draft', async permission => { mocks.permissions = [permission]; const response = await request(app).post('/description-images').attach('image', Buffer.from([0xff, 0xd8, 0xff]), { filename: 'a.jpg', contentType: 'image/jpeg' }); expect(response.status).toBe(201); expect(response.body.data.url).toContain('/uploads/'); expect(mocks.upload).toHaveBeenCalledWith(expect.objectContaining({ originalname: 'a.jpg' }), 'product-descriptions'); });
  it('denies permission before parsing multipart', async () => { mocks.permissions = []; const response = await request(app).post('/description-images').set('Content-Type', 'multipart/form-data').send('invalid'); expect(response.status).toBe(403); expect(mocks.upload).not.toHaveBeenCalled(); });
  it('rejects missing files', async () => { const response = await request(app).post('/description-images'); expect(response.status).toBe(400); expect(mocks.upload).not.toHaveBeenCalled(); });
});
