export interface LandingPageFeature {
  icon?: string;
  title: string;
  description?: string;
}

export interface LandingPageFaq {
  question: string;
  answer: string;
}

export interface LandingPage {
  id: number;
  title: string;
  slug: string;
  productId: number;
  product?: any;
  badgeText: string | null;
  headline: string | null;
  subHeadline: string | null;
  videoUrl: string | null;
  countdownTarget: string | Date | null;
  features: LandingPageFeature[];
  gallery: string[];
  faqs: LandingPageFaq[];
  customContent: string | null;
  isPublished: boolean;
  viewsCount: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CreateLandingPageInput {
  title: string;
  slug?: string;
  productId: number;
  badgeText?: string | null;
  headline?: string | null;
  subHeadline?: string | null;
  videoUrl?: string | null;
  countdownTarget?: string | Date | null;
  features?: LandingPageFeature[];
  gallery?: string[];
  faqs?: LandingPageFaq[];
  customContent?: string | null;
  isPublished?: boolean;
}

export type UpdateLandingPageInput = Partial<CreateLandingPageInput>;

export interface LandingPageQuery {
  page?: number;
  limit?: number;
  search?: string;
  productId?: number;
  isPublished?: boolean;
}
