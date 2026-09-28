#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/6782d61ce0e2a0216d99b8aad8e2ae2dcc3ab2747c6145513c27428aa646336b/contract';
import startContract from '../../snapshots/6782d61ce0e2a0216d99b8aad8e2ae2dcc3ab2747c6145513c27428aa646336b/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/dcf1f7df5214e27a31e0a5dde3c43c912e6bee69a0db047a70bb790ed090690f/contract';
import endContract from '../../snapshots/dcf1f7df5214e27a31e0a5dde3c43c912e6bee69a0db047a70bb790ed090690f/contract.json' with { type: 'json' };
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
      this.dropConstraint({ schema: 'public', table: 'refund', constraint: 'refund_returnId_key' }),
      this.createTable({
        schema: 'public',
        table: 'product_review',
        columns: [
          col('approvedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('comment', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isVerifiedPurchase', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('moderatedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('orderItemId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('productId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('rating', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('rejectedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('title', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'product_review_status_check_56005a61',
            "\"status\" IN ('PENDING', 'APPROVED', 'REJECTED')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'product_review',
        constraint: 'product_review_orderItemId_key',
        columns: ['orderItemId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'product_review',
        constraint: 'product_review_userId_productId_key',
        columns: ['userId', 'productId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'product_review',
        index: 'product_review_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'product_review',
        index: 'product_review_moderatedById_idx_4b155aa3',
        columns: ['moderatedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'product_review',
        index: 'product_review_productId_idx_5858600a',
        columns: ['productId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'product_review',
        index: 'product_review_productId_rating_idx_e3693ff8',
        columns: ['productId', 'rating'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'product_review',
        index: 'product_review_productId_status_idx_285a0d76',
        columns: ['productId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'product_review',
        index: 'product_review_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'product_review',
        index: 'product_review_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'refund',
        index: 'refund_returnId_idx_721617a6',
        columns: ['returnId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'product_review',
        foreignKey: {
          name: 'product_review_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'product', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'product_review',
        foreignKey: {
          name: 'product_review_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'product_review',
        foreignKey: {
          name: 'product_review_orderItemId_fkey',
          columns: ['orderItemId'],
          references: { schema: 'public', table: 'order_item', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'product_review',
        foreignKey: {
          name: 'product_review_moderatedById_fkey',
          columns: ['moderatedById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
