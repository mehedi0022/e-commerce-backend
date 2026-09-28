#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/9e1321a59d2fcee9d9857c6d8f96309a735578db8c9f6c57073791a2611a486c/contract';
import endContract from '../../snapshots/9e1321a59d2fcee9d9857c6d8f96309a735578db8c9f6c57073791a2611a486c/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/b9d392fc05995c119638917e5d887e94c9448542e54d5533b33895c1ca6c495c/contract';
import startContract from '../../snapshots/b9d392fc05995c119638917e5d887e94c9448542e54d5533b33895c1ca6c495c/contract.json' with { type: 'json' };
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
        table: 'order',
        columns: [
          col('adminNote', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('cancelledAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('confirmedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('customerEmail', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('customerName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('customerNote', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('customerPhone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('deliveredAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('discountAmount', 'numeric(12,2)', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('grandTotal', 'numeric(12,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('orderNumber', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('paymentMethod', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('paymentStatus', 'text', {
            notNull: true,
            default: lit('UNPAID'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('placedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('shippedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('shippingCharge', 'numeric(12,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('shippingMethodId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('shippingMethodName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('shippingZoneId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('shippingZoneName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('subtotal', 'numeric(12,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('taxAmount', 'numeric(12,2)', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
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
            'order_paymentMethod_check_191ce658',
            "\"paymentMethod\" IN ('CASH_ON_DELIVERY', 'ONLINE')",
          ),
          checkExpression(
            'order_paymentStatus_check_991aa452',
            "\"paymentStatus\" IN ('UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED')",
          ),
          checkExpression(
            'order_status_check_90625984',
            "\"status\" IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'order_address',
        columns: [
          col('addressLine1', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('addressLine2', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('area', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('countryCode', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('district', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('division', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('fullName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('orderId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('phone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('postalCode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('thana', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('upazila', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'order_address_type_check_f199e0c6',
            "\"type\" IN ('SHIPPING', 'BILLING')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'order_item',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('lineTotal', 'numeric(12,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('orderId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('productId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('productName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('productSlug', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('quantity', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('sku', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('unitPrice', 'numeric(12,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('variantId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'order_item_attribute',
        columns: [
          col('attributeName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('attributeValue', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('orderItemId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'order_status_history',
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
          col('orderId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('toStatus', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'order_status_history_fromStatus_check_2e0eb1b3',
            "\"fromStatus\" IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED')",
          ),
          checkExpression(
            'order_status_history_toStatus_check_b4a330f1',
            "\"toStatus\" IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'order',
        constraint: 'order_orderNumber_key',
        columns: ['orderNumber'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'order_address',
        constraint: 'order_address_orderId_type_key',
        columns: ['orderId', 'type'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order',
        index: 'order_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order',
        index: 'order_customerEmail_idx_7ee6d307',
        columns: ['customerEmail'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order',
        index: 'order_customerPhone_idx_1a740fd5',
        columns: ['customerPhone'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order',
        index: 'order_paymentStatus_idx_6874c030',
        columns: ['paymentStatus'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order',
        index: 'order_shippingMethodId_idx_bd10075d',
        columns: ['shippingMethodId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order',
        index: 'order_shippingZoneId_idx_b9f57c25',
        columns: ['shippingZoneId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order',
        index: 'order_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order',
        index: 'order_userId_createdAt_idx_f726f04a',
        columns: ['userId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order',
        index: 'order_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order_address',
        index: 'order_address_orderId_idx_d284871b',
        columns: ['orderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order_item',
        index: 'order_item_orderId_idx_d284871b',
        columns: ['orderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order_item',
        index: 'order_item_productId_idx_5858600a',
        columns: ['productId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order_item',
        index: 'order_item_variantId_idx_e16bb45d',
        columns: ['variantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order_item_attribute',
        index: 'order_item_attribute_orderItemId_idx_99e2d9f7',
        columns: ['orderItemId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order_status_history',
        index: 'order_status_history_changedById_idx_d6e6aadb',
        columns: ['changedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order_status_history',
        index: 'order_status_history_orderId_createdAt_idx_cf5e070a',
        columns: ['orderId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order_status_history',
        index: 'order_status_history_orderId_idx_d284871b',
        columns: ['orderId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'order',
        foreignKey: {
          name: 'order_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'order',
        foreignKey: {
          name: 'order_shippingZoneId_fkey',
          columns: ['shippingZoneId'],
          references: { schema: 'public', table: 'shipping_zone', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'order',
        foreignKey: {
          name: 'order_shippingMethodId_fkey',
          columns: ['shippingMethodId'],
          references: { schema: 'public', table: 'shipping_method', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'order_address',
        foreignKey: {
          name: 'order_address_orderId_fkey',
          columns: ['orderId'],
          references: { schema: 'public', table: 'order', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'order_item',
        foreignKey: {
          name: 'order_item_orderId_fkey',
          columns: ['orderId'],
          references: { schema: 'public', table: 'order', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'order_item',
        foreignKey: {
          name: 'order_item_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'product', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'order_item',
        foreignKey: {
          name: 'order_item_variantId_fkey',
          columns: ['variantId'],
          references: { schema: 'public', table: 'product_variant', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'order_item_attribute',
        foreignKey: {
          name: 'order_item_attribute_orderItemId_fkey',
          columns: ['orderItemId'],
          references: { schema: 'public', table: 'order_item', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'order_status_history',
        foreignKey: {
          name: 'order_status_history_orderId_fkey',
          columns: ['orderId'],
          references: { schema: 'public', table: 'order', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'order_status_history',
        foreignKey: {
          name: 'order_status_history_changedById_fkey',
          columns: ['changedById'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
