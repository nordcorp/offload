import { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import postgres from 'postgres';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

const ColumnType = {
  Int32: 0,
  Int64: 1,
  Float: 2,
  Double: 3,
  Numeric: 4,
  Boolean: 5,
  Character: 6,
  Text: 7,
  Date: 8,
  Time: 9,
  DateTime: 10,
  Json: 11,
  Enum: 12,
  Bytes: 13,
  Uuid: 15,
};

function mapPostgresType(oid: number): number {
  switch (oid) {
    case 21:
    case 23:
      return ColumnType.Int32;
    case 20:
      return ColumnType.Int64;
    case 700:
      return ColumnType.Float;
    case 701:
      return ColumnType.Double;
    case 1700:
      return ColumnType.Numeric;
    case 16:
      return ColumnType.Boolean;
    case 18:
    case 1042:
      return ColumnType.Character;
    case 25:
    case 1043:
      return ColumnType.Text;
    case 1082:
      return ColumnType.Date;
    case 1083:
      return ColumnType.Time;
    case 1114:
    case 1184:
      return ColumnType.DateTime;
    case 114:
    case 3802:
      return ColumnType.Json;
    case 17:
      return ColumnType.Bytes;
    case 2950:
      return ColumnType.Uuid;
    default:
      return ColumnType.Text;
  }
}

function wrapDriverError(e: any) {
  if (e?.code === '23505') {
    const err: any = new Error('Unique constraint violation');
    err.name = 'DriverAdapterError';
    err.cause = {
      kind: 'UniqueConstraintViolation',
      constraint: { index: e.constraint_name || 'unique' },
    };
    return err;
  }
  if (e?.code === '23503') {
    const err: any = new Error('Foreign key constraint violation');
    err.name = 'DriverAdapterError';
    err.cause = {
      kind: 'ForeignKeyConstraintViolation',
      constraint: { foreignKey: e.constraint_name || 'foreign_key' },
    };
    return err;
  }
  return e;
}

function createQueryable(client: any) {
  return {
    provider: 'postgres',
    adapterName: '@prisma/adapter-pg',
    queryRaw: async (params: any) => {
      try {
        const res = await client.unsafe(params.sql, params.args);
        const cols = res.columns || [];
        const columnNames = cols.map((c: any) => c.name);
        const columnTypes = cols.map((c: any) => mapPostgresType(c.type));
        const rows = res.map((row: any) => columnNames.map((name: string) => row[name]));
        return { columnNames, columnTypes, rows };
      } catch (e) {
        throw wrapDriverError(e);
      }
    },
    executeRaw: async (params: any) => {
      try {
        const res = await client.unsafe(params.sql, params.args);
        return res.count ?? 0;
      } catch (e) {
        throw wrapDriverError(e);
      }
    },
  };
}

export function createPostgresAdapter(connectionString: string) {
  const sql = postgres(connectionString);
  return {
    provider: 'postgres',
    adapterName: '@prisma/adapter-pg',
    connect: async () => ({
      ...createQueryable(sql),
      getConnectionInfo: () => ({ supportsRelationJoins: true }),
      startTransaction: async (isolationLevel?: string) => {
        const reserved = await sql.reserve();
        const isolationSql = isolationLevel ? ` ISOLATION LEVEL ${isolationLevel}` : '';
        await reserved.unsafe(`BEGIN${isolationSql}`);
        return {
          ...createQueryable(reserved),
          options: { usePhantomQuery: false },
          commit: async () => {
            reserved.release();
          },
          rollback: async () => {
            reserved.release();
          },
        };
      },
      dispose: async () => {
        await sql.end();
      },
    }),
  };
}

export default fp(async (fastify: FastifyInstance) => {
  const connectionString =
    process.env.DATABASE_URL || 'postgresql://offload:offload@localhost:5432/offload';
  const adapter = createPostgresAdapter(connectionString);
  const prisma = new PrismaClient({ adapter: adapter as any });
  await prisma.$connect();
  fastify.decorate('prisma', prisma);
  fastify.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});
