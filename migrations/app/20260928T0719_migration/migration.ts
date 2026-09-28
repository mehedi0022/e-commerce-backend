#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/e03f52194c4229e6c4cc56869f8b0d19b158518d2f8e76db9249d7c3e148ae0b/contract';
import startContract from '../../snapshots/e03f52194c4229e6c4cc56869f8b0d19b158518d2f8e76db9249d7c3e148ae0b/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/ea2269b3f719467ddd126ac76f6d5c43ac3533971c26ca79cd89f4972f7e9575/contract';
import endContract from '../../snapshots/ea2269b3f719467ddd126ac76f6d5c43ac3533971c26ca79cd89f4972f7e9575/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'inventory',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('lowStockThreshold', 'int4', {
            notNull: true,
            default: lit(5),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('quantity', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('reservedQuantity', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('variantId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'inventory_movement',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('inventoryId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('quantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('referenceId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('referenceType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'inventory_movement_type_check_5f7cd620',
            "\"type\" IN ('INITIAL_STOCK', 'RESTOCK', 'ORDER', 'ORDER_CANCELLED', 'RETURN', 'DAMAGED', 'ADJUSTMENT')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'product_image',
        columns: [
          col('altText', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('imageUrl', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isPrimary', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('productId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('sortOrder', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'product_image_attribute_value',
        columns: [
          col('attributeValueId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('productImageId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['productImageId', 'attributeValueId'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'inventory',
        constraint: 'inventory_variantId_key',
        columns: ['variantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'inventory_movement',
        index: 'inventory_movement_inventoryId_createdAt_idx_02b14844',
        columns: ['inventoryId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'inventory_movement',
        index: 'inventory_movement_inventoryId_idx_367f33d0',
        columns: ['inventoryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'inventory_movement',
        index: 'inventory_movement_referenceType_referenceId_idx_d11658f3',
        columns: ['referenceType', 'referenceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'product_image',
        index: 'product_image_productId_idx_5858600a',
        columns: ['productId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'product_image',
        index: 'product_image_productId_isPrimary_idx_73499847',
        columns: ['productId', 'isPrimary'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'product_image',
        index: 'product_image_productId_sortOrder_idx_fe80956b',
        columns: ['productId', 'sortOrder'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'product_image_attribute_value',
        index: 'product_image_attribute_value_attributeValueId_idx_3b32dbec',
        columns: ['attributeValueId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'product_image_attribute_value',
        index: 'product_image_attribute_value_productImageId_idx_aeb05ee6',
        columns: ['productImageId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'inventory',
        foreignKey: {
          name: 'inventory_variantId_fkey',
          columns: ['variantId'],
          references: { schema: 'public', table: 'product_variant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'inventory_movement',
        foreignKey: {
          name: 'inventory_movement_inventoryId_fkey',
          columns: ['inventoryId'],
          references: { schema: 'public', table: 'inventory', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'product_image',
        foreignKey: {
          name: 'product_image_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'product', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'product_image_attribute_value',
        foreignKey: {
          name: 'product_image_attribute_value_productImageId_fkey',
          columns: ['productImageId'],
          references: { schema: 'public', table: 'product_image', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'product_image_attribute_value',
        foreignKey: {
          name: 'product_image_attribute_value_attributeValueId_fkey',
          columns: ['attributeValueId'],
          references: { schema: 'public', table: 'attribute_value', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
