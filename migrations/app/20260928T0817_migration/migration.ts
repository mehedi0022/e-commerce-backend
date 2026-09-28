#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/b9d392fc05995c119638917e5d887e94c9448542e54d5533b33895c1ca6c495c/contract';
import endContract from '../../snapshots/b9d392fc05995c119638917e5d887e94c9448542e54d5533b33895c1ca6c495c/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e69c08e6d4489a3e9b3093414be67c91b3b98b1607326510109280ab9b6916a1/contract';
import startContract from '../../snapshots/e69c08e6d4489a3e9b3093414be67c91b3b98b1607326510109280ab9b6916a1/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'address',
        columns: [
          col('addressLine1', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('addressLine2', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('area', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('countryCode', 'text', {
            notNull: true,
            default: lit('BD'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('district', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('division', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('fullName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isDefaultBilling', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('isDefaultShipping', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('label', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('postalCode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('thana', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('upazila', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'shipping_method',
        columns: [
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
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
        table: 'shipping_zone',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
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
        table: 'shipping_zone_area',
        columns: [
          col('area', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('countryCode', 'text', {
            notNull: true,
            default: lit('BD'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('district', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('division', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('postalCode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('thana', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('upazila', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('zoneId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'shipping_zone_method',
        columns: [
          col('charge', 'numeric(12,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('estimatedMaxDays', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('estimatedMinDays', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('methodId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('sortOrder', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('zoneId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'shipping_method',
        constraint: 'shipping_method_code_key',
        columns: ['code'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'shipping_zone_method',
        constraint: 'shipping_zone_method_zoneId_methodId_key',
        columns: ['zoneId', 'methodId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'address',
        index: 'address_countryCode_district_idx_52e170dc',
        columns: ['countryCode', 'district'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'address',
        index: 'address_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'address',
        index: 'address_userId_isDefaultBilling_idx_3c3e82fc',
        columns: ['userId', 'isDefaultBilling'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'address',
        index: 'address_userId_isDefaultShipping_idx_5fc8b42b',
        columns: ['userId', 'isDefaultShipping'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shipping_method',
        index: 'shipping_method_isActive_sortOrder_idx_43c1fe34',
        columns: ['isActive', 'sortOrder'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shipping_zone',
        index: 'shipping_zone_isActive_sortOrder_idx_43c1fe34',
        columns: ['isActive', 'sortOrder'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shipping_zone_area',
        index: 'shipping_zone_area_countryCode_district_idx_52e170dc',
        columns: ['countryCode', 'district'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shipping_zone_area',
        index: 'shipping_zone_area_district_thana_idx_448bdee4',
        columns: ['district', 'thana'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shipping_zone_area',
        index: 'shipping_zone_area_district_upazila_idx_58c7a7f7',
        columns: ['district', 'upazila'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shipping_zone_area',
        index: 'shipping_zone_area_zoneId_idx_1b631e86',
        columns: ['zoneId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shipping_zone_method',
        index: 'shipping_zone_method_methodId_idx_537a2e84',
        columns: ['methodId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shipping_zone_method',
        index: 'shipping_zone_method_zoneId_idx_1b631e86',
        columns: ['zoneId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shipping_zone_method',
        index: 'shipping_zone_method_zoneId_isActive_idx_2f744d3a',
        columns: ['zoneId', 'isActive'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'address',
        foreignKey: {
          name: 'address_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'shipping_zone_area',
        foreignKey: {
          name: 'shipping_zone_area_zoneId_fkey',
          columns: ['zoneId'],
          references: { schema: 'public', table: 'shipping_zone', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'shipping_zone_method',
        foreignKey: {
          name: 'shipping_zone_method_zoneId_fkey',
          columns: ['zoneId'],
          references: { schema: 'public', table: 'shipping_zone', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'shipping_zone_method',
        foreignKey: {
          name: 'shipping_zone_method_methodId_fkey',
          columns: ['methodId'],
          references: { schema: 'public', table: 'shipping_method', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
