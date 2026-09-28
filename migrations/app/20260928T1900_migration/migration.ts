#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/93ec263fc23c7e798de651b7941484ad8880e3cd842bdf81527a2f4292197cc2/contract';
import endContract from '../../snapshots/93ec263fc23c7e798de651b7941484ad8880e3cd842bdf81527a2f4292197cc2/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/dcf1f7df5214e27a31e0a5dde3c43c912e6bee69a0db047a70bb790ed090690f/contract';
import startContract from '../../snapshots/dcf1f7df5214e27a31e0a5dde3c43c912e6bee69a0db047a70bb790ed090690f/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'wishlist_item',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('productId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'wishlist_item',
        constraint: 'wishlist_item_userId_productId_key',
        columns: ['userId', 'productId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'wishlist_item',
        index: 'wishlist_item_productId_idx_5858600a',
        columns: ['productId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'wishlist_item',
        index: 'wishlist_item_userId_createdAt_idx_f726f04a',
        columns: ['userId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'wishlist_item',
        index: 'wishlist_item_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'wishlist_item',
        foreignKey: {
          name: 'wishlist_item_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'wishlist_item',
        foreignKey: {
          name: 'wishlist_item_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'product', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
