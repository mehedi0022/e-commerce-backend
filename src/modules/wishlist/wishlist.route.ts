import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import * as c from "./controllers/wishlist.controller.js";
import * as v from "./validations/wishlist.validation.js";
const router = Router();
router.use((req, res, next) =>
  req.path.startsWith("/wishlist") ? authenticate(req, res, next) : next(),
);
router.get("/wishlist", validate(v.list), c.list); router.post("/wishlist/items/:productId", validate(v.productId), c.add); router.delete("/wishlist/items/:productId", validate(v.productId), c.remove);
export default router;
