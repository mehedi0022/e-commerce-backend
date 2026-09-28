import { Router } from "express";

import authRoutes from "../modules/auth/auth.route.js";
import userRoutes from "../modules/user/user.route.js";
import categoryRoutes from "../modules/category/category.route.js";
import brandRoutes from "../modules/brand/brand.route.js";
import attributeRoutes from "../modules/attribute/attribute.route.js";
import productRoutes from "../modules/product/product.route.js";
import inventoryRoutes from "../modules/inventory/inventory.route.js";
import productImageRoutes from "../modules/product/product-image.route.js";
import cartRoutes from "../modules/cart/cart.route.js";
import shippingRoutes from "../modules/shipping/shipping.route.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/categories", categoryRoutes);
router.use("/brands", brandRoutes);
router.use("/attributes", attributeRoutes);
router.use("/products", productRoutes);
router.use(inventoryRoutes);
router.use(productImageRoutes);
router.use(cartRoutes);
router.use(shippingRoutes);

export default router;
