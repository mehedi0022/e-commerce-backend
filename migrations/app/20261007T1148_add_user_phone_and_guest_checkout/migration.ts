#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/3feda7e7d7be5b8b2823aec82ca548fff1796c292a99656f32391582504cef37/contract';
import startContract from '../../snapshots/3feda7e7d7be5b8b2823aec82ca548fff1796c292a99656f32391582504cef37/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/bec62e13c82eb5e569059a5062a5c0c61503e15122aa7abdbb5e37bacaf2d3cf/contract';
import endContract from '../../snapshots/bec62e13c82eb5e569059a5062a5c0c61503e15122aa7abdbb5e37bacaf2d3cf/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'store_setting',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('value', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('mustChangePassword', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'user',
        column: col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dropNotNull({ schema: 'public', table: 'user', column: 'email' }),
      this.addUnique({
        schema: 'public',
        table: 'store_setting',
        constraint: 'store_setting_key_key',
        columns: ['key'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'user',
        constraint: 'user_phone_key',
        columns: ['phone'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'store_setting',
        index: 'store_setting_key_idx_2077e847',
        columns: ['key'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
