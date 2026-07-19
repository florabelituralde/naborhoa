// A Base44-compatible entity API implemented on a Supabase client. This mirrors
// the frontend shim (src/api/base44Client.js) but runs in Deno and is used with
// the service-role client, so it bypasses RLS.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { ENTITY_TABLES } from './entity-map.ts';

type AnyRecord = Record<string, any>;

function applySort(query: any, sort?: string) {
  if (!sort) return query;
  const descending = sort.startsWith('-');
  const column = descending ? sort.slice(1) : sort;
  return query.order(column, { ascending: !descending });
}

function applyFilter(query: any, filters: AnyRecord) {
  for (const [key, value] of Object.entries(filters || {})) {
    if (Array.isArray(value)) {
      query = query.in(key, value);
    } else if (value === null) {
      query = query.is(key, null);
    } else if (value && typeof value === 'object') {
      const v = value as AnyRecord;
      if ('$in' in v) query = query.in(key, v.$in);
      if ('$gt' in v) query = query.gt(key, v.$gt);
      if ('$gte' in v) query = query.gte(key, v.$gte);
      if ('$lt' in v) query = query.lt(key, v.$lt);
      if ('$lte' in v) query = query.lte(key, v.$lte);
      if ('$ne' in v) query = query.neq(key, v.$ne);
      if ('$contains' in v) query = query.ilike(key, `%${v.$contains}%`);
    } else {
      query = query.eq(key, value);
    }
  }
  return query;
}

function raise(error: any) {
  if (error) throw new Error(error.message || 'Database request failed');
}

function makeEntity(client: SupabaseClient, entityName: string) {
  const table = ENTITY_TABLES[entityName] || entityName.toLowerCase();
  return {
    async list(sort: string = '-created_date', limit?: number) {
      let q = client.from(table).select('*');
      q = applySort(q, sort);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      raise(error);
      return data || [];
    },
    async filter(filters: AnyRecord = {}, sort: string = '-created_date', limit?: number) {
      let q = client.from(table).select('*');
      q = applyFilter(q, filters);
      q = applySort(q, sort);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      raise(error);
      return data || [];
    },
    async get(id: string) {
      const { data, error } = await client.from(table).select('*').eq('id', id).maybeSingle();
      raise(error);
      if (!data) throw new Error(`${entityName} not found`);
      return data;
    },
    async create(values: AnyRecord) {
      const { data, error } = await client.from(table).insert(values).select().single();
      raise(error);
      return data;
    },
    async bulkCreate(rows: AnyRecord[]) {
      const { data, error } = await client.from(table).insert(rows || []).select();
      raise(error);
      return data || [];
    },
    async update(id: string, values: AnyRecord) {
      const patch = { ...values };
      delete patch.id;
      delete patch.created_date;
      const { data, error } = await client.from(table).update(patch).eq('id', id).select().single();
      raise(error);
      return data;
    },
    async bulkUpdate(rows: AnyRecord[]) {
      const results: any[] = [];
      for (const row of rows || []) {
        const { id, ...values } = row;
        delete (values as AnyRecord).created_date;
        const { data, error } = await client.from(table).update(values).eq('id', id).select().single();
        raise(error);
        results.push(data);
      }
      return results;
    },
    async delete(id: string) {
      const { error } = await client.from(table).delete().eq('id', id);
      raise(error);
      return { id };
    },
  };
}

export function makeEntities(client: SupabaseClient) {
  const cache: AnyRecord = {};
  return new Proxy(cache, {
    get(target, prop: string) {
      if (typeof prop !== 'string') return undefined;
      if (!target[prop]) target[prop] = makeEntity(client, prop);
      return target[prop];
    },
  });
}
