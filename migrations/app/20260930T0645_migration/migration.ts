#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/977ad3ec267c4ec1b1586ba730a001e399bd4ac2e4ddb7a6355913263d2c2ec5/contract';
import endContract from '../../snapshots/977ad3ec267c4ec1b1586ba730a001e399bd4ac2e4ddb7a6355913263d2c2ec5/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d4066d5bb5755dfc57360a01d1c08333ec25ae6078e7bbaf1cb2a4c1fb827e99/contract';
import startContract from '../../snapshots/d4066d5bb5755dfc57360a01d1c08333ec25ae6078e7bbaf1cb2a4c1fb827e99/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [this.dropNotNull({ schema: 'public', table: 'slider', column: 'imageUrl' })];
  }
}

MigrationCLI.run(import.meta.url, M);
