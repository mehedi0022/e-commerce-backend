#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/3feda7e7d7be5b8b2823aec82ca548fff1796c292a99656f32391582504cef37/contract';
import endContract from '../../snapshots/3feda7e7d7be5b8b2823aec82ca548fff1796c292a99656f32391582504cef37/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d19867458f197ae5c7c140f6e1753f693a23bef0ac3dde5163e566e6b9adba11/contract';
import startContract from '../../snapshots/d19867458f197ae5c7c140f6e1753f693a23bef0ac3dde5163e566e6b9adba11/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'courier_provider_config',
        columns: [
          col('apiKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('apiSecret', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('apiUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('isDefault', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('isLive', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('settings', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'shipment',
        column: col('codAmount', 'numeric(12,2)', {
          codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'shipment',
        column: col('consignmentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'shipment',
        column: col('courierCode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'shipment',
        column: col('courierPayload', 'json', { codecRef: { codecId: 'pg/json@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'shipment',
        column: col('courierStatus', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'courier_provider_config',
        constraint: 'courier_provider_config_code_key',
        columns: ['code'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'courier_provider_config',
        index: 'courier_provider_config_isActive_idx_77fe3ba1',
        columns: ['isActive'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
