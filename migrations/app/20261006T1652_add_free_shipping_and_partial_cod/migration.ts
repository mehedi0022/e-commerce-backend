#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/d19867458f197ae5c7c140f6e1753f693a23bef0ac3dde5163e566e6b9adba11/contract';
import endContract from '../../snapshots/d19867458f197ae5c7c140f6e1753f693a23bef0ac3dde5163e566e6b9adba11/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e3fc77dd3c51db5997048215d3abb3ecc4be3b7af219c450b19e100f0080a7e8/contract';
import startContract from '../../snapshots/e3fc77dd3c51db5997048215d3abb3ecc4be3b7af219c450b19e100f0080a7e8/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'order',
        constraint: 'order_paymentMethod_check_191ce658',
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'order',
        constraint: 'order_paymentStatus_check_991aa452',
      }),
      this.addColumn({
        schema: 'public',
        table: 'order',
        column: col('advanceAmount', 'numeric(12,2)', {
          notNull: true,
          default: lit('0'),
          codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'order',
        column: col('dueAmount', 'numeric(12,2)', {
          notNull: true,
          default: lit('0'),
          codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 12, scale: 2 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'order',
        column: col('isAdvanceRequired', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'order',
        column: col('isFreeShipping', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'product',
        column: col('advancePaymentAmount', 'numeric(10,2)', {
          codecRef: { codecId: 'pg/numeric@1', typeParams: { precision: 10, scale: 2 } },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'product',
        column: col('isCodAvailable', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'product',
        column: col('isFreeShipping', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'product',
        column: col('requiresAdvancePayment', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'order',
        constraint: 'order_paymentMethod_check_d82c4bfd',
        expression: "\"paymentMethod\" IN ('CASH_ON_DELIVERY', 'ONLINE', 'PARTIAL_COD')",
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'order',
        constraint: 'order_paymentStatus_check_9ba965b9',
        expression:
          "\"paymentStatus\" IN ('UNPAID', 'PENDING', 'PARTIALLY_PAID', 'PAID', 'FAILED', 'REFUNDED')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
