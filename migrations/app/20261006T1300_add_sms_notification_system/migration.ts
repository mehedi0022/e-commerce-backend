#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/16a9b73455ab735b126d9e24f8b667f49de136aca370451e462c79adce4c6faf/contract';
import startContract from '../../snapshots/16a9b73455ab735b126d9e24f8b667f49de136aca370451e462c79adce4c6faf/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e3fc77dd3c51db5997048215d3abb3ecc4be3b7af219c450b19e100f0080a7e8/contract';
import endContract from '../../snapshots/e3fc77dd3c51db5997048215d3abb3ecc4be3b7af219c450b19e100f0080a7e8/contract.json' with { type: 'json' };
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
        table: 'notification_template',
        columns: [
          col('availableVars', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('emailEnabled', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('emailSubject', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('emailTemplate', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('event', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('smsEnabled', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('smsTemplate', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'sms_log',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('message', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('orderId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('providerCode', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('recipientPhone', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('responsePayload', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('smsProviderConfigId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('PENDING'),
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'sms_log_status_check_cbc544c0',
            "\"status\" IN ('PENDING', 'SENT', 'FAILED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'sms_provider_config',
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
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('senderId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('settings', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'notification_template',
        constraint: 'notification_template_event_key',
        columns: ['event'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'sms_provider_config',
        constraint: 'sms_provider_config_code_key',
        columns: ['code'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sms_log',
        index: 'sms_log_createdAt_idx_9575dbd7',
        columns: ['createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sms_log',
        index: 'sms_log_orderId_idx_d284871b',
        columns: ['orderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sms_log',
        index: 'sms_log_recipientPhone_idx_3d769e58',
        columns: ['recipientPhone'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sms_log',
        index: 'sms_log_smsProviderConfigId_idx_627b7301',
        columns: ['smsProviderConfigId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sms_log',
        index: 'sms_log_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sms_provider_config',
        index: 'sms_provider_config_isActive_idx_77fe3ba1',
        columns: ['isActive'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'sms_log',
        foreignKey: {
          name: 'sms_log_smsProviderConfigId_fkey',
          columns: ['smsProviderConfigId'],
          references: { schema: 'public', table: 'sms_provider_config', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
