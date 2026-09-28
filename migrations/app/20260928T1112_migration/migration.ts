#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/66cefaee5fa7ee6a6da47c9e1e79e20b7ab592842706e5bc3794e8849389ff3d/contract';
import startContract from '../../snapshots/66cefaee5fa7ee6a6da47c9e1e79e20b7ab592842706e5bc3794e8849389ff3d/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/6782d61ce0e2a0216d99b8aad8e2ae2dcc3ab2747c6145513c27428aa646336b/contract';
import endContract from '../../snapshots/6782d61ce0e2a0216d99b8aad8e2ae2dcc3ab2747c6145513c27428aa646336b/contract.json' with { type: 'json' };
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
        table: 'refund',
        columns: [
          col('amount', 'numeric(12,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('cancelledAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('completedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('failedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('method', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('orderId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('processedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('processedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('reason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('refundNumber', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('returnId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'refund_method_check_e3050dc7',
            "\"method\" IN ('CASH', 'BANK_TRANSFER', 'MOBILE_BANKING', 'ORIGINAL_PAYMENT_METHOD', 'OTHER')",
          ),
          checkExpression(
            'refund_status_check_c85a3565',
            "\"status\" IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'refund_status_history',
        columns: [
          col('changedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('fromStatus', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('refundId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('toStatus', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'refund_status_history_fromStatus_check_56975dbf',
            "\"fromStatus\" IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')",
          ),
          checkExpression(
            'refund_status_history_toStatus_check_8187a37d',
            "\"toStatus\" IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'return',
        columns: [
          col('adminNote', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('approvedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('cancelledAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('completedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('customerNote', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('orderId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('receivedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('rejectedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('requestedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('returnNumber', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('REQUESTED'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('userId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'return_status_check_6ffe6862',
            "\"status\" IN ('REQUESTED', 'APPROVED', 'REJECTED', 'IN_TRANSIT', 'RECEIVED', 'COMPLETED', 'CANCELLED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'return_item',
        columns: [
          col('adminNote', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('condition', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('customerNote', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('orderItemId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('quantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('reason', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('restockQuantity', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('restockStatus', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('returnId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'return_item_condition_check_775c8094',
            "\"condition\" IN ('UNOPENED', 'GOOD', 'DAMAGED', 'DEFECTIVE', 'USED')",
          ),
          checkExpression(
            'return_item_reason_check_e9e2f3b2',
            "\"reason\" IN ('DAMAGED', 'DEFECTIVE', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'SIZE_OR_FIT', 'CHANGED_MIND', 'OTHER')",
          ),
          checkExpression(
            'return_item_restockStatus_check_05294ac9',
            "\"restockStatus\" IN ('PENDING', 'RESTOCKED', 'NOT_RESTOCKABLE')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'return_status_history',
        columns: [
          col('changedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('fromStatus', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('returnId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('toStatus', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'return_status_history_fromStatus_check_4f355bbd',
            "\"fromStatus\" IN ('REQUESTED', 'APPROVED', 'REJECTED', 'IN_TRANSIT', 'RECEIVED', 'COMPLETED', 'CANCELLED')",
          ),
          checkExpression(
            'return_status_history_toStatus_check_158cd2f5',
            "\"toStatus\" IN ('REQUESTED', 'APPROVED', 'REJECTED', 'IN_TRANSIT', 'RECEIVED', 'COMPLETED', 'CANCELLED')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'refund',
        constraint: 'refund_refundNumber_key',
        columns: ['refundNumber'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'refund',
        constraint: 'refund_returnId_key',
        columns: ['returnId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'return',
        constraint: 'return_returnNumber_key',
        columns: ['returnNumber'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'return_item',
        constraint: 'return_item_returnId_orderItemId_key',
        columns: ['returnId', 'orderItemId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'refund',
        index: 'refund_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'refund',
        index: 'refund_orderId_idx_d284871b',
        columns: ['orderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'refund',
        index: 'refund_processedById_idx_92dfd8d4',
        columns: ['processedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'refund',
        index: 'refund_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'refund_status_history',
        index: 'refund_status_history_changedById_idx_d6e6aadb',
        columns: ['changedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'refund_status_history',
        index: 'refund_status_history_refundId_createdAt_idx_df1e85fb',
        columns: ['refundId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'refund_status_history',
        index: 'refund_status_history_refundId_idx_903a170a',
        columns: ['refundId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'return',
        index: 'return_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'return',
        index: 'return_orderId_idx_d284871b',
        columns: ['orderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'return',
        index: 'return_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'return',
        index: 'return_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'return_item',
        index: 'return_item_orderItemId_idx_99e2d9f7',
        columns: ['orderItemId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'return_item',
        index: 'return_item_returnId_idx_721617a6',
        columns: ['returnId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'return_status_history',
        index: 'return_status_history_changedById_idx_d6e6aadb',
        columns: ['changedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'return_status_history',
        index: 'return_status_history_returnId_createdAt_idx_a8c4f9ee',
        columns: ['returnId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'return_status_history',
        index: 'return_status_history_returnId_idx_721617a6',
        columns: ['returnId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'refund',
        foreignKey: {
          name: 'refund_orderId_fkey',
          columns: ['orderId'],
          references: { schema: 'public', table: 'order', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'refund',
        foreignKey: {
          name: 'refund_returnId_fkey',
          columns: ['returnId'],
          references: { schema: 'public', table: 'return', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'refund',
        foreignKey: {
          name: 'refund_processedById_fkey',
          columns: ['processedById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'refund_status_history',
        foreignKey: {
          name: 'refund_status_history_refundId_fkey',
          columns: ['refundId'],
          references: { schema: 'public', table: 'refund', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'refund_status_history',
        foreignKey: {
          name: 'refund_status_history_changedById_fkey',
          columns: ['changedById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'return',
        foreignKey: {
          name: 'return_orderId_fkey',
          columns: ['orderId'],
          references: { schema: 'public', table: 'order', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'return',
        foreignKey: {
          name: 'return_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'return_item',
        foreignKey: {
          name: 'return_item_returnId_fkey',
          columns: ['returnId'],
          references: { schema: 'public', table: 'return', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'return_item',
        foreignKey: {
          name: 'return_item_orderItemId_fkey',
          columns: ['orderItemId'],
          references: { schema: 'public', table: 'order_item', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'return_status_history',
        foreignKey: {
          name: 'return_status_history_returnId_fkey',
          columns: ['returnId'],
          references: { schema: 'public', table: 'return', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'return_status_history',
        foreignKey: {
          name: 'return_status_history_changedById_fkey',
          columns: ['changedById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
