#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/47d30b2cae42e9d89603f14c05eb386e978a838f8fe4bcb82f5c766a3016c318/contract';
import endContract from '../../snapshots/47d30b2cae42e9d89603f14c05eb386e978a838f8fe4bcb82f5c766a3016c318/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ecf60091d34ec53a17ee8c509f0377a3cad597c4b439d6e8c96138a896cf420b/contract';
import startContract from '../../snapshots/ecf60091d34ec53a17ee8c509f0377a3cad597c4b439d6e8c96138a896cf420b/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'attribute',
        columns: [
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
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
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
        table: 'attribute_value',
        columns: [
          col('attributeId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
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
          col('slug', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sortOrder', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('value', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'category_attribute',
        columns: [
          col('attributeId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('categoryId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isRequired', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
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
      this.addUnique({
        schema: 'public',
        table: 'attribute',
        constraint: 'attribute_name_key',
        columns: ['name'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'attribute',
        constraint: 'attribute_slug_key',
        columns: ['slug'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'attribute_value',
        constraint: 'attribute_value_attributeId_value_key',
        columns: ['attributeId', 'value'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'attribute_value',
        constraint: 'attribute_value_attributeId_slug_key',
        columns: ['attributeId', 'slug'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'category_attribute',
        constraint: 'category_attribute_categoryId_attributeId_key',
        columns: ['categoryId', 'attributeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'attribute',
        index: 'attribute_isActive_sortOrder_idx_43c1fe34',
        columns: ['isActive', 'sortOrder'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'attribute_value',
        index: 'attribute_value_attributeId_idx_58ec5fae',
        columns: ['attributeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'attribute_value',
        index: 'attribute_value_attributeId_isActive_sortOrder_idx_35c1d5ed',
        columns: ['attributeId', 'isActive', 'sortOrder'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'category_attribute',
        index: 'category_attribute_attributeId_idx_58ec5fae',
        columns: ['attributeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'category_attribute',
        index: 'category_attribute_categoryId_idx_15c304f2',
        columns: ['categoryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'category_attribute',
        index: 'category_attribute_categoryId_sortOrder_idx_36348c58',
        columns: ['categoryId', 'sortOrder'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'attribute_value',
        foreignKey: {
          name: 'attribute_value_attributeId_fkey',
          columns: ['attributeId'],
          references: { schema: 'public', table: 'attribute', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'category_attribute',
        foreignKey: {
          name: 'category_attribute_categoryId_fkey',
          columns: ['categoryId'],
          references: { schema: 'public', table: 'category', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'category_attribute',
        foreignKey: {
          name: 'category_attribute_attributeId_fkey',
          columns: ['attributeId'],
          references: { schema: 'public', table: 'attribute', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
