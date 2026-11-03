export interface SizeChart {
  id: number;
  name: string;
  description: string | null;
  unit: string;
  columns: string[];
  rows: Record<string, string>[];
  tips: string | null;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSizeChartInput {
  name: string;
  description?: string | null;
  unit?: string;
  columns: string[];
  rows: Record<string, string>[];
  tips?: string | null;
  image?: string | null;
}

export type UpdateSizeChartInput = Partial<CreateSizeChartInput>;
