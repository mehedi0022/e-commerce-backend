#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/6c36c816c9203b79e31b074d53b64f9165c55ab6c061c11bcfcce8cbf9faba57/contract';
import endContract from '../../snapshots/6c36c816c9203b79e31b074d53b64f9165c55ab6c061c11bcfcce8cbf9faba57/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/977ad3ec267c4ec1b1586ba730a001e399bd4ac2e4ddb7a6355913263d2c2ec5/contract';
import startContract from '../../snapshots/977ad3ec267c4ec1b1586ba730a001e399bd4ac2e4ddb7a6355913263d2c2ec5/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropTable({ schema: 'public', table: 'shipping_zone_area' }),
      this.createTable({
        schema: 'public',
        table: 'shipping_zone_location',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('districtId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('divisionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('unionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('upazilaId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('zoneId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'address',
        column: col('districtId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'address',
        column: col('divisionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'address',
        column: col('unionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'address',
        column: col('upazilaId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'order_address',
        column: col('districtId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'order_address',
        column: col('divisionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'order_address',
        column: col('unionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'order_address',
        column: col('upazilaId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'shipping_zone_method',
        column: col('freeShippingThreshold', 'numeric(12,2)', {
          codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
        }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'address',
        index: 'address_districtId_idx_a3818dd3',
        columns: ['districtId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shipping_zone_location',
        index: 'shipping_zone_location_districtId_idx_a3818dd3',
        columns: ['districtId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shipping_zone_location',
        index: 'shipping_zone_location_divisionId_idx_c61115f7',
        columns: ['divisionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shipping_zone_location',
        index: 'shipping_zone_location_unionId_idx_362d117a',
        columns: ['unionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shipping_zone_location',
        index: 'shipping_zone_location_upazilaId_idx_09579787',
        columns: ['upazilaId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shipping_zone_location',
        index: 'shipping_zone_location_zoneId_idx_1b631e86',
        columns: ['zoneId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'shipping_zone_location',
        foreignKey: {
          name: 'shipping_zone_location_zoneId_fkey',
          columns: ['zoneId'],
          references: { schema: 'public', table: 'shipping_zone', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
