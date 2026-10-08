#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/bec62e13c82eb5e569059a5062a5c0c61503e15122aa7abdbb5e37bacaf2d3cf/contract';
import startContract from '../../snapshots/bec62e13c82eb5e569059a5062a5c0c61503e15122aa7abdbb5e37bacaf2d3cf/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/dcaccebc7a2683b5a57c90353d44c960310774d821b5af3d2f8a04b17de91988/contract';
import endContract from '../../snapshots/dcaccebc7a2683b5a57c90353d44c960310774d821b5af3d2f8a04b17de91988/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'shipment',
        column: col('lastDispatchError', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
