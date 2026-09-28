#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1515feffa0298874ddc353687c59a0bb1bbf4ccd1bed3cf56f91286f39d77e27/contract';
import endContract from '../../snapshots/1515feffa0298874ddc353687c59a0bb1bbf4ccd1bed3cf56f91286f39d77e27/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/9e1321a59d2fcee9d9857c6d8f96309a735578db8c9f6c57073791a2611a486c/contract';
import startContract from '../../snapshots/9e1321a59d2fcee9d9857c6d8f96309a735578db8c9f6c57073791a2611a486c/contract.json' with { type: 'json' };
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
        table: 'coupon',
        columns: [
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('discountType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('discountValue', 'numeric(12,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('expiresAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('maximumDiscountAmount', 'numeric(12,2)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('minimumOrderAmount', 'numeric(12,2)', {
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('startsAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('usageLimit', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('usageLimitPerUser', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'coupon_discountType_check_61e0971f',
            "\"discountType\" IN ('PERCENTAGE', 'FIXED_AMOUNT')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'coupon_usage',
        columns: [
          col('couponId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('orderId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('usedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('userId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'order',
        column: col('couponCode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'order',
        column: col('couponId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'order',
        column: col('guestAccessTokenExpiresAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-temporal@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'order',
        column: col('guestAccessTokenHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'coupon',
        constraint: 'coupon_code_key',
        columns: ['code'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'coupon_usage',
        constraint: 'coupon_usage_couponId_orderId_key',
        columns: ['couponId', 'orderId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'order',
        constraint: 'order_guestAccessTokenHash_key',
        columns: ['guestAccessTokenHash'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'coupon',
        index: 'coupon_expiresAt_idx_6b6b8c10',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'coupon',
        index: 'coupon_isActive_idx_77fe3ba1',
        columns: ['isActive'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'coupon',
        index: 'coupon_startsAt_idx_5ff0df68',
        columns: ['startsAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'coupon_usage',
        index: 'coupon_usage_couponId_idx_a9dd19dc',
        columns: ['couponId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'coupon_usage',
        index: 'coupon_usage_couponId_usedAt_idx_7523333b',
        columns: ['couponId', 'usedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'coupon_usage',
        index: 'coupon_usage_orderId_idx_d284871b',
        columns: ['orderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'coupon_usage',
        index: 'coupon_usage_userId_couponId_idx_7ed26970',
        columns: ['userId', 'couponId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'coupon_usage',
        index: 'coupon_usage_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order',
        index: 'order_couponId_idx_a9dd19dc',
        columns: ['couponId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'coupon_usage',
        foreignKey: {
          name: 'coupon_usage_couponId_fkey',
          columns: ['couponId'],
          references: { schema: 'public', table: 'coupon', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'coupon_usage',
        foreignKey: {
          name: 'coupon_usage_orderId_fkey',
          columns: ['orderId'],
          references: { schema: 'public', table: 'order', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'coupon_usage',
        foreignKey: {
          name: 'coupon_usage_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'order',
        foreignKey: {
          name: 'order_couponId_fkey',
          columns: ['couponId'],
          references: { schema: 'public', table: 'coupon', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
