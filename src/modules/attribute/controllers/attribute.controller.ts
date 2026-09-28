import { asyncHandler } from "../../../utils/asyncHandler.js";
import {
  paginatedResponse,
  successResponse,
} from "../../../utils/api-response.js";
import * as service from "../services/attribute.service.js";
export const list = asyncHandler(async (req, res) => {
  const x = await service.list(req.query as any);
  res.json(
    paginatedResponse("Attributes fetched successfully", x.attributes, x.meta),
  );
});
export const get = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Attribute fetched successfully",
      await service.get(Number(req.params.id)),
    ),
  ),
);
export const create = asyncHandler(async (req, res) =>
  res
    .status(201)
    .json(
      successResponse(
        "Attribute created successfully",
        await service.create(req.body),
      ),
    ),
);
export const update = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Attribute updated successfully",
      await service.update(Number(req.params.id), req.body),
    ),
  ),
);
export const remove = asyncHandler(async (req, res) => {
  await service.remove(Number(req.params.id));
  res.json(successResponse("Attribute deleted successfully", null));
});
export const status = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Attribute status updated successfully",
      await service.status(Number(req.params.id), req.body.isActive),
    ),
  ),
);
export const listValues = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Attribute values fetched successfully",
      await service.values(Number(req.params.attributeId)),
    ),
  ),
);
export const createValue = asyncHandler(async (req, res) =>
  res
    .status(201)
    .json(
      successResponse(
        "Attribute value created successfully",
        await service.createValue(Number(req.params.attributeId), req.body),
      ),
    ),
);
export const updateValue = asyncHandler(async (req, res) =>
  res.json(
    successResponse(
      "Attribute value updated successfully",
      await service.updateValue(
        Number(req.params.attributeId),
        Number(req.params.valueId),
        req.body,
      ),
    ),
  ),
);
export const removeValue = asyncHandler(async (req, res) => {
  await service.removeValue(
    Number(req.params.attributeId),
    Number(req.params.valueId),
  );
  res.json(successResponse("Attribute value deleted successfully", null));
});
