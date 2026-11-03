import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import { permissions } from "../../auth/authorization.js";
import { imageUpload } from "../upload/upload.middleware.js";
import * as c from "./controllers/landing-page.controller.js";
import * as v from "./validations/landing-page.validation.js";

const router = Router();

// Public routes for storefront
router.get("/public/slug/:slug", validate(v.landingPageSlugSchema), c.getPublicBySlug);

// Admin routes
router.use(requireAuth);

router.post("/upload-image", requirePermission(permissions.productsCreate), imageUpload.single("image"), c.uploadImage);

router.get("/", validate(v.landingPageQuerySchema), requirePermission(permissions.productsReadAny), c.list);
router.get("/:id", validate(v.landingPageIdSchema), requirePermission(permissions.productsReadAny), c.getById);
router.post("/", validate(v.createLandingPageSchema), requirePermission(permissions.productsCreate), c.create);
router.put("/:id", validate(v.updateLandingPageSchema), requirePermission(permissions.productsUpdateAny), c.update);
router.patch("/:id", validate(v.updateLandingPageSchema), requirePermission(permissions.productsUpdateAny), c.update);
router.delete("/:id", validate(v.landingPageIdSchema), requirePermission(permissions.productsDeleteAny), c.remove);

export default router;
