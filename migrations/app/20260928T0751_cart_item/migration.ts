#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/e69c08e6d4489a3e9b3093414be67c91b3b98b1607326510109280ab9b6916a1/contract';
import endContract from '../../snapshots/e69c08e6d4489a3e9b3093414be67c91b3b98b1607326510109280ab9b6916a1/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ea2269b3f719467ddd126ac76f6d5c43ac3533971c26ca79cd89f4972f7e9575/contract';
import startContract from '../../snapshots/ea2269b3f719467ddd126ac76f6d5c43ac3533971c26ca79cd89f4972f7e9575/contract.json' with { type: 'json' };
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
        table: 'cart',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('expiresAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('guestToken', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('ACTIVE'),
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
            'cart_status_check_45d4c716',
            "\"status\" IN ('ACTIVE', 'CONVERTED', 'ABANDONED')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'cart_item',
        columns: [
          col('cartId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('quantity', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('variantId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'product_image',
        column: col('storageKey', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'cart',
        constraint: 'cart_guestToken_key',
        columns: ['guestToken'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'cart_item',
        constraint: 'cart_item_cartId_variantId_key',
        columns: ['cartId', 'variantId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'cart',
        index: 'cart_status_expiresAt_idx_c206f415',
        columns: ['status', 'expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'cart',
        index: 'cart_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'cart',
        index: 'cart_userId_status_idx_e4a128ba',
        columns: ['userId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'cart_item',
        index: 'cart_item_cartId_idx_79939295',
        columns: ['cartId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'cart_item',
        index: 'cart_item_variantId_idx_e16bb45d',
        columns: ['variantId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'cart',
        foreignKey: {
          name: 'cart_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'user', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'cart_item',
        foreignKey: {
          name: 'cart_item_cartId_fkey',
          columns: ['cartId'],
          references: { schema: 'public', table: 'cart', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'cart_item',
        foreignKey: {
          name: 'cart_item_variantId_fkey',
          columns: ['variantId'],
          references: { schema: 'public', table: 'product_variant', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
