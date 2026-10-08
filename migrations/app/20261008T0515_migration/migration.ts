#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/5276e22a2119246fd52bb60eeb9445ebabe8b30d096fc92a3b9c944a91014eb5/contract';
import endContract from '../../snapshots/5276e22a2119246fd52bb60eeb9445ebabe8b30d096fc92a3b9c944a91014eb5/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/dcaccebc7a2683b5a57c90353d44c960310774d821b5af3d2f8a04b17de91988/contract';
import startContract from '../../snapshots/dcaccebc7a2683b5a57c90353d44c960310774d821b5af3d2f8a04b17de91988/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'courier_webhook_event',
        columns: [
          col('consignmentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('courierCode', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('error', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('event', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('headers', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('merchantOrderId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('outcome', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('payload', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('receivedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('status', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('trackingCode', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'courier_webhook_event',
        index: 'courier_webhook_event_consignmentId_idx_f3252185',
        columns: ['consignmentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'courier_webhook_event',
        index: 'courier_webhook_event_courierCode_receivedAt_idx_320dc77f',
        columns: ['courierCode', 'receivedAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'courier_webhook_event',
        index: 'courier_webhook_event_merchantOrderId_idx_1327195c',
        columns: ['merchantOrderId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'shipment',
        index: 'shipment_consignmentId_idx_f3252185',
        columns: ['consignmentId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
