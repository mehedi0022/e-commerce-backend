#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1515feffa0298874ddc353687c59a0bb1bbf4ccd1bed3cf56f91286f39d77e27/contract';
import startContract from '../../snapshots/1515feffa0298874ddc353687c59a0bb1bbf4ccd1bed3cf56f91286f39d77e27/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/66cefaee5fa7ee6a6da47c9e1e79e20b7ab592842706e5bc3794e8849389ff3d/contract';
import endContract from '../../snapshots/66cefaee5fa7ee6a6da47c9e1e79e20b7ab592842706e5bc3794e8849389ff3d/contract.json' with { type: 'json' };
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
        table: 'shipment',
        columns: [
          col('cancelledAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('courierName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('deliveredAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('failedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('orderId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('readyAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('returnedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('shippedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('trackingNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('trackingUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'shipment_status_check_806dcd4d',
            "\"status\" IN ('PENDING', 'READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'shipment_status_history',
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
          col('shipmentId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('toStatus', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'shipment_status_history_fromStatus_check_bf36b07a',
            "\"fromStatus\" IN ('PENDING', 'READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED')",
          ),
          checkExpression(
            'shipment_status_history_toStatus_check_0fe4bec5',
            "\"toStatus\" IN ('PENDING', 'READY_TO_SHIP', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'shipment',
        constraint: 'shipment_orderId_key',
        columns: ['orderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shipment',
        index: 'shipment_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shipment',
        index: 'shipment_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shipment',
        index: 'shipment_trackingNumber_idx_abd2abb3',
        columns: ['trackingNumber'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shipment_status_history',
        index: 'shipment_status_history_changedById_idx_d6e6aadb',
        columns: ['changedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shipment_status_history',
        index: 'shipment_status_history_shipmentId_createdAt_idx_0050e6c3',
        columns: ['shipmentId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shipment_status_history',
        index: 'shipment_status_history_shipmentId_idx_e3606ec1',
        columns: ['shipmentId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'shipment',
        foreignKey: {
          name: 'shipment_orderId_fkey',
          columns: ['orderId'],
          references: { schema: 'public', table: 'order', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'shipment_status_history',
        foreignKey: {
          name: 'shipment_status_history_shipmentId_fkey',
          columns: ['shipmentId'],
          references: { schema: 'public', table: 'shipment', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'shipment_status_history',
        foreignKey: {
          name: 'shipment_status_history_changedById_fkey',
          columns: ['changedById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
