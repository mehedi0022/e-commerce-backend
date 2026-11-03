import * as repo from "../repositories/size-chart.repository.js";
import { ConflictError, NotFoundError } from "../../../errors/AppError.js";
import type { CreateSizeChartInput, UpdateSizeChartInput } from "../size-chart.types.js";

export const list = async () => {
  return repo.findAll();
};

export const get = async (id: number) => {
  const chart = await repo.findById(id);
  if (!chart) throw new NotFoundError("Size chart not found");
  return chart;
};

export const create = async (data: CreateSizeChartInput) => {
  const existing = await repo.findByName(data.name);
  if (existing) throw new ConflictError("A size chart with this name already exists");
  return repo.create(data);
};

export const update = async (id: number, data: UpdateSizeChartInput) => {
  await get(id);
  if (data.name) {
    const existing = await repo.findByName(data.name, id);
    if (existing) throw new ConflictError("A size chart with this name already exists");
  }
  return repo.update(id, data);
};

export const remove = async (id: number) => {
  await get(id);
  await repo.remove(id);
};
