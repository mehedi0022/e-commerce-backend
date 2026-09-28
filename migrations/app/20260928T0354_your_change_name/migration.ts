#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/e03f52194c4229e6c4cc56869f8b0d19b158518d2f8e76db9249d7c3e148ae0b/contract';
import endContract from '../../snapshots/e03f52194c4229e6c4cc56869f8b0d19b158518d2f8e76db9249d7c3e148ae0b/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/faa9d0e4b3f6360c994d4e21d616ef2930beafdf198e968b38184be4d654617d/contract';
import startContract from '../../snapshots/faa9d0e4b3f6360c994d4e21d616ef2930beafdf198e968b38184be4d654617d/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'product_variant',
        columns: [
          col('compareAtPrice', 'numeric(12,2)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('costPrice', 'numeric(12,2)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('price', 'numeric(12,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('productId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('sku', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
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
        table: 'variant_attribute_value',
        columns: [
          col('attributeValueId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('variantId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['variantId', 'attributeValueId'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'product_variant',
        constraint: 'product_variant_sku_key',
        columns: ['sku'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'product_variant',
        index: 'product_variant_productId_idx_5858600a',
        columns: ['productId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'product_variant',
        index: 'product_variant_productId_isActive_idx_5ca2948a',
        columns: ['productId', 'isActive'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'variant_attribute_value',
        index: 'variant_attribute_value_attributeValueId_idx_3b32dbec',
        columns: ['attributeValueId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'variant_attribute_value',
        index: 'variant_attribute_value_variantId_idx_e16bb45d',
        columns: ['variantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'product_variant',
        foreignKey: {
          name: 'product_variant_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'product', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'variant_attribute_value',
        foreignKey: {
          name: 'variant_attribute_value_variantId_fkey',
          columns: ['variantId'],
          references: { schema: 'public', table: 'product_variant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'variant_attribute_value',
        foreignKey: {
          name: 'variant_attribute_value_attributeValueId_fkey',
          columns: ['attributeValueId'],
          references: { schema: 'public', table: 'attribute_value', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
