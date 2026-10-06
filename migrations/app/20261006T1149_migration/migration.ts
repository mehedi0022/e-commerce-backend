#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/16a9b73455ab735b126d9e24f8b667f49de136aca370451e462c79adce4c6faf/contract';
import endContract from '../../snapshots/16a9b73455ab735b126d9e24f8b667f49de136aca370451e462c79adce4c6faf/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/6c36c816c9203b79e31b074d53b64f9165c55ab6c061c11bcfcce8cbf9faba57/contract';
import startContract from '../../snapshots/6c36c816c9203b79e31b074d53b64f9165c55ab6c061c11bcfcce8cbf9faba57/contract.json' with { type: 'json' };
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
        table: 'order_payment_transaction',
        columns: [
          col('adminNote', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('amount', 'numeric(12,2)', {
            notNull: true,
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('bankTransferReference', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('chargeAmount', 'numeric(12,2)', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('gatewayPayload', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('gatewayResponse', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('orderId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('paymentMethodCode', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('paymentMethodConfigId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('receiptImageUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('senderNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING_VERIFICATION'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('transactionId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', {
            notNull: true,
            default: lit('MANUAL_MFS'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('verifiedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('verifiedByUserId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'order_payment_transaction_status_check_da7d3c1b',
            "\"status\" IN ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED', 'REFUNDED')",
          ),
          checkExpression(
            'order_payment_transaction_type_check_1f7143c2',
            "\"type\" IN ('COD', 'MANUAL_MFS', 'MANUAL_BANK', 'AUTOMATED_GATEWAY')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'payment_method_config',
        columns: [
          col('accountNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('accountType', 'text', {
            notNull: true,
            default: lit('PERSONAL'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('bankName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('branchName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('chargeFlat', 'numeric(10,2)', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
          }),
          col('chargePercentage', 'numeric(5,2)', {
            notNull: true,
            default: lit('0'),
            codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 5, scale: 2 } },
          }),
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('credentials', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('instructions', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('isLive', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('qrCodeUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('routingNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('sortOrder', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('type', 'text', {
            notNull: true,
            default: lit('MANUAL_MFS'),
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
            'payment_method_config_accountType_check_86f2d872',
            "\"accountType\" IN ('PERSONAL', 'AGENT', 'MERCHANT')",
          ),
          checkExpression(
            'payment_method_config_type_check_1f7143c2',
            "\"type\" IN ('COD', 'MANUAL_MFS', 'MANUAL_BANK', 'AUTOMATED_GATEWAY')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'payment_method_config',
        constraint: 'payment_method_config_code_key',
        columns: ['code'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order_payment_transaction',
        index: 'order_payment_transaction_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order_payment_transaction',
        index: 'order_payment_transaction_orderId_idx_d284871b',
        columns: ['orderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order_payment_transaction',
        index: 'order_payment_transaction_paymentMethodConfigId_idx_e890a84d',
        columns: ['paymentMethodConfigId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order_payment_transaction',
        index: 'order_payment_transaction_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order_payment_transaction',
        index: 'order_payment_transaction_transactionId_idx_d3180832',
        columns: ['transactionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'order_payment_transaction',
        index: 'order_payment_transaction_verifiedByUserId_idx_28ba6004',
        columns: ['verifiedByUserId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'payment_method_config',
        index: 'payment_method_config_sortOrder_idx_ebf2eac2',
        columns: ['sortOrder'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'payment_method_config',
        index: 'payment_method_config_type_isActive_idx_e554eeb4',
        columns: ['type', 'isActive'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'order_payment_transaction',
        foreignKey: {
          name: 'order_payment_transaction_orderId_fkey',
          columns: ['orderId'],
          references: { schema: 'public', table: 'order', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'order_payment_transaction',
        foreignKey: {
          name: 'order_payment_transaction_paymentMethodConfigId_fkey',
          columns: ['paymentMethodConfigId'],
          references: { schema: 'public', table: 'payment_method_config', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'order_payment_transaction',
        foreignKey: {
          name: 'order_payment_transaction_verifiedByUserId_fkey',
          columns: ['verifiedByUserId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
