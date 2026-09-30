#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/17dc6fa73154b72514eb45d8790a935fd157d447553b6738d2bddda6beddae61/contract';
import endContract from '../../snapshots/17dc6fa73154b72514eb45d8790a935fd157d447553b6738d2bddda6beddae61/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/93ec263fc23c7e798de651b7941484ad8880e3cd842bdf81527a2f4292197cc2/contract';
import startContract from '../../snapshots/93ec263fc23c7e798de651b7941484ad8880e3cd842bdf81527a2f4292197cc2/contract.json' with { type: 'json' };
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
        table: 'navigation_entry',
        columns: [
          col('categoryId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('label', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('openNewTab', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('productId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('sectionId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('sortOrder', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('url', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'navigation_entry_type_check_3c2920b5',
            "\"type\" IN ('LINK', 'CATEGORY', 'PRODUCT')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'navigation_item',
        columns: [
          col('categoryId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('label', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('menuId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('openNewTab', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('sortOrder', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('url', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'navigation_item_type_check_f354af9f',
            "\"type\" IN ('LINK', 'CATEGORY', 'MEGA_MENU')",
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'navigation_menu',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('key', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'navigation_section',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('itemId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('sortOrder', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'navigation_menu',
        constraint: 'navigation_menu_key_key',
        columns: ['key'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'navigation_entry',
        index: 'navigation_entry_categoryId_idx_15c304f2',
        columns: ['categoryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'navigation_entry',
        index: 'navigation_entry_productId_idx_5858600a',
        columns: ['productId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'navigation_entry',
        index: 'navigation_entry_sectionId_idx_5d1ea56b',
        columns: ['sectionId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'navigation_entry',
        index: 'navigation_entry_sectionId_sortOrder_idx_6e3943b2',
        columns: ['sectionId', 'sortOrder'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'navigation_item',
        index: 'navigation_item_categoryId_idx_15c304f2',
        columns: ['categoryId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'navigation_item',
        index: 'navigation_item_menuId_idx_261f575e',
        columns: ['menuId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'navigation_item',
        index: 'navigation_item_menuId_sortOrder_idx_74d3f7a8',
        columns: ['menuId', 'sortOrder'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'navigation_menu',
        index: 'navigation_menu_isActive_idx_77fe3ba1',
        columns: ['isActive'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'navigation_section',
        index: 'navigation_section_itemId_idx_41357140',
        columns: ['itemId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'navigation_section',
        index: 'navigation_section_itemId_sortOrder_idx_ccf26c3d',
        columns: ['itemId', 'sortOrder'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'navigation_entry',
        foreignKey: {
          name: 'navigation_entry_sectionId_fkey',
          columns: ['sectionId'],
          references: { schema: 'public', table: 'navigation_section', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'navigation_entry',
        foreignKey: {
          name: 'navigation_entry_categoryId_fkey',
          columns: ['categoryId'],
          references: { schema: 'public', table: 'category', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'navigation_entry',
        foreignKey: {
          name: 'navigation_entry_productId_fkey',
          columns: ['productId'],
          references: { schema: 'public', table: 'product', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'navigation_item',
        foreignKey: {
          name: 'navigation_item_menuId_fkey',
          columns: ['menuId'],
          references: { schema: 'public', table: 'navigation_menu', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'navigation_item',
        foreignKey: {
          name: 'navigation_item_categoryId_fkey',
          columns: ['categoryId'],
          references: { schema: 'public', table: 'category', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'navigation_section',
        foreignKey: {
          name: 'navigation_section_itemId_fkey',
          columns: ['itemId'],
          references: { schema: 'public', table: 'navigation_item', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
