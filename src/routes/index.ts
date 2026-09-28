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
import checkoutRoutes from "../modules/checkout/checkout.route.js";
import orderRoutes from "../modules/order/order.route.js";
import couponRoutes from "../modules/coupon/coupon.route.js";
import shipmentRoutes from "../modules/shipment/shipment.route.js";
import returnRoutes from "../modules/return/return.route.js";
import refundRoutes from "../modules/refund/refund.route.js";
import reviewRoutes from "../modules/review/review.route.js";
import wishlistRoutes from "../modules/wishlist/wishlist.route.js";

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
router.use(checkoutRoutes);
router.use(orderRoutes);
router.use(couponRoutes);
router.use(shipmentRoutes);
router.use(returnRoutes);
router.use(refundRoutes);
router.use(reviewRoutes);
router.use(wishlistRoutes);

export default router;
