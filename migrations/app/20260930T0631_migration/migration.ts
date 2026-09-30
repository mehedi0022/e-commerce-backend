#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/17dc6fa73154b72514eb45d8790a935fd157d447553b6738d2bddda6beddae61/contract';
import startContract from '../../snapshots/17dc6fa73154b72514eb45d8790a935fd157d447553b6738d2bddda6beddae61/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d4066d5bb5755dfc57360a01d1c08333ec25ae6078e7bbaf1cb2a4c1fb827e99/contract';
import endContract from '../../snapshots/d4066d5bb5755dfc57360a01d1c08333ec25ae6078e7bbaf1cb2a4c1fb827e99/contract.json' with { type: 'json' };
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
        table: 'popup',
        columns: [
          col('buttonText', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('buttonUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('delaySeconds', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('displayType', 'text', {
            notNull: true,
            default: lit('ON_LOAD'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('endsAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('frequency', 'text', {
            notNull: true,
            default: lit('ONCE'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('imageUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('startsAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('storageKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'popup_displayType_check_caaa9db9',
            "\"displayType\" IN ('ON_LOAD', 'EXIT_INTENT', 'AFTER_DELAY')",
          ),
          checkExpression(
            'popup_frequency_check_0d3f030b',
            "\"frequency\" IN ('ONCE', 'DAILY', 'ALWAYS')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'slider',
        columns: [
          col('buttonText', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('buttonUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('endsAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('imageUrl', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('mobileImage', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('mobileKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sortOrder', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('startsAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('storageKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('subtitle', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'popup',
        index: 'popup_isActive_startsAt_endsAt_idx_5fd0e5be',
        columns: ['isActive', 'startsAt', 'endsAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'slider',
        index: 'slider_isActive_sortOrder_idx_43c1fe34',
        columns: ['isActive', 'sortOrder'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'slider',
        index: 'slider_startsAt_endsAt_idx_11b019e2',
        columns: ['startsAt', 'endsAt'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
