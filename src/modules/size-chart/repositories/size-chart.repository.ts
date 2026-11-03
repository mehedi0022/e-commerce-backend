import { db } from "../../../prisma/db.js";
import type { CreateSizeChartInput, UpdateSizeChartInput } from "../size-chart.types.js";

const fields = [
  "id",
  "name",
  "description",
  "unit",
  "columns",
  "rows",
  "tips",
  "image",
  "createdAt",
  "updatedAt",
] as const;

export const findAll = async () => {
  return db.orm.public.SizeChart.select(...fields)
    .orderBy((sc: any) => sc.name.asc())
    .all();
};

export const findById = async (id: number) => {
  return db.orm.public.SizeChart.select(...fields).first({ id });
};

export const findByName = async (name: string, excludeId?: number) => {
  const norm = name.trim().toLowerCase();
  const all = await findAll();
  return all.find(
    (sc: any) =>
      sc.name.toLowerCase().trim() === norm && (!excludeId || sc.id !== excludeId)
  ) || null;
};

export const create = async (data: CreateSizeChartInput) => {
  return db.orm.public.SizeChart.create({
    name: data.name,
    description: data.description ?? null,
    unit: data.unit || "inches",
    columns: data.columns as any,
    rows: data.rows as any,
    tips: data.tips ?? null,
    image: data.image ?? null,
  });
};

export const update = async (id: number, data: UpdateSizeChartInput) => {
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.unit !== undefined) updateData.unit = data.unit;
  if (data.columns !== undefined) updateData.columns = data.columns;
  if (data.rows !== undefined) updateData.rows = data.rows;
  if (data.tips !== undefined) updateData.tips = data.tips;
  if (data.image !== undefined) updateData.image = data.image;

  await db.orm.public.SizeChart.where({ id }).update(updateData);
  return findById(id);
};

export const remove = async (id: number) => {
  await db.orm.public.Product.where({ sizeChartId: id }).update({ sizeChartId: null });
  await db.orm.public.SizeChart.where({ id }).delete();
};
