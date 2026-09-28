import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { permissions } from "../../auth/authorization.js";
import { requirePermission } from "../../middlewares/authorization.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import * as c from "./controllers/review.controller.js";
import * as v from "./validations/review.validation.js";
const router = Router();
router.get("/products/:slug/reviews", validate(v.product), c.publicList); router.get("/products/:slug/rating-summary", validate(v.product), c.summary);
router.use((req, res, next) =>
  req.path.startsWith("/reviews") || req.path.startsWith("/admin/reviews")
    ? authenticate(req, res, next)
    : next(),
); router.post("/reviews", validate(v.create), c.create); router.get("/reviews/me", c.mine); router.get("/reviews/:id", validate(v.id), c.detail); router.patch("/reviews/:id", validate(v.update), c.update); router.delete("/reviews/:id", validate(v.id), c.remove);
router.get("/admin/reviews", requirePermission(permissions.reviewsRead), validate(v.adminList), c.adminList); router.get("/admin/reviews/:id", requirePermission(permissions.reviewsRead), validate(v.id), c.adminDetail); router.post("/admin/reviews/:id/approve", requirePermission(permissions.reviewsModerate), validate(v.id), c.approve); router.post("/admin/reviews/:id/reject", requirePermission(permissions.reviewsModerate), validate(v.id), c.reject);
export default router;
