import * as sliderRepo from "../modules/slider/repositories/slider.repository.js";
import * as popupRepo from "../modules/popup/repositories/popup.repository.js";
import { closeDatabase } from "../prisma/db.js";

async function main() {
  console.log("Seeding Storefront Content: Promotional Sliders and Popups...");

  try {
    // 1. Check & Seed Sliders
    const existingSliders = await sliderRepo.findAll({});
    if (existingSliders.length === 0) {
      console.log("No sliders found. Inserting default promotional banners...");

      await sliderRepo.create({
        title: "Mega Lifestyle & Tech Fest 2026",
        subtitle: "Up to 50% discount on new gadgets, audio, and minimalist essentials. Limited stock!",
        imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1600&q=80",
        mobileImage: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
        buttonText: "Shop Flash Deals",
        buttonUrl: "/products",
        isActive: true,
        sortOrder: 0,
      });

      await sliderRepo.create({
        title: "Premium Handcrafted Collection",
        subtitle: "Designed for longevity, comfort, and everyday aesthetics across Bangladesh.",
        imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80",
        mobileImage: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80",
        buttonText: "Explore Collection",
        buttonUrl: "/products?sort=featured",
        isActive: true,
        sortOrder: 1,
      });

      await sliderRepo.create({
        title: "Nationwide Express Courier Dispatch",
        subtitle: "Fast cash on delivery with real-time tracking straight to your doorstep.",
        imageUrl: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=1600&q=80",
        mobileImage: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80",
        buttonText: "Start Shopping",
        buttonUrl: "/products",
        isActive: true,
        sortOrder: 2,
      });

      console.log("Seeded 3 default hero sliders successfully!");
    } else {
      console.log(`Found ${existingSliders.length} existing sliders in database. Skipping slider seed.`);
    }

    // 2. Check & Seed Popups
    const existingPopups = await popupRepo.findAll({});
    if (existingPopups.length === 0) {
      console.log("No popups found. Inserting default welcome promo modal...");

      await popupRepo.create({
        title: "🎉 Special Welcome Gift: FLAT 10% OFF!",
        description: "Subscribe to our updates and enjoy 10% instant discount on your very first order with coupon code WELCOME10 at checkout.",
        imageUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=900&q=80",
        buttonText: "Claim 10% Discount Now",
        buttonUrl: "/products",
        displayType: "AFTER_DELAY",
        delaySeconds: 3,
        frequency: "ONCE",
        isActive: true,
      });

      console.log("Seeded 1 default promotional popup modal successfully!");
    } else {
      console.log(`Found ${existingPopups.length} existing popups in database. Skipping popup seed.`);
    }

    console.log("Storefront Content & Promo Management seeding complete!");
  } catch (err) {
    console.error("Error during storefront promo seeding:", err);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}

main();
