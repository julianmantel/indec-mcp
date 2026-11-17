export type PostgrestOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike" | "in" | "is";

export interface PostgrestFilter {
  column: string;
  operator: PostgrestOperator;
  value: string | number | boolean | Array<string | number>;
}

export interface PostgrestQueryParamsOptions {
  select?: string | string[];
  filters?: PostgrestFilter[];
  order?: string | string[];
  limit?: number;
  offset?: number;
}

export interface ParsedContentRange {
  start: number | null;
  end: number | null;
  total: number | null;
  raw: string | null;
}

function formatInValue(value: string | number): string {
  const raw = String(value);

  if (/[(),"]/.test(raw)) {
    return `"${raw.replace(/"/g, '\\"')}"`;
  }
  return raw;
}

export function formatFilterValue(
  operator: PostgrestOperator,
  value: string | number | boolean | Array<string | number>
): string {
  if (operator === "in") {
    if (Array.isArray(value)) {
      return `in.(${value.map(formatInValue).join(",")})`;
    }
    const stringVal = String(value).trim();
    if (stringVal.startsWith("(") && stringVal.endsWith(")")) {
      return `in.${stringVal}`;
    }
    return `in.(${formatInValue(stringVal)})`;
  }

  return `${operator}.${String(value)}`;
}

export function buildQueryParams(
  options: PostgrestQueryParamsOptions
): URLSearchParams {
  const params = new URLSearchParams();

  // 1. select
  if (options.select) {
    const selectStr = Array.isArray(options.select)
      ? options.select.join(",")
      : options.select;
    if (selectStr.trim().length > 0) {
      params.set("select", selectStr.trim());
    }
  }

  // 2. order
  if (options.order) {
    const orderStr = Array.isArray(options.order)
      ? options.order.join(",")
      : options.order;
    if (orderStr.trim().length > 0) {
      params.set("order", orderStr.trim());
    }
  }

  // 3. limit
  if (options.limit !== undefined && options.limit !== null) {
    params.set("limit", String(options.limit));
  }

  // 4. offset
  if (options.offset !== undefined && options.offset !== null) {
    params.set("offset", String(options.offset));
  }

  // 5. filters
  if (options.filters) {
    for (const filter of options.filters) {
      if (!filter.column) continue;
      const formatted = formatFilterValue(filter.operator, filter.value);
      params.append(filter.column, formatted);
    }
  }

  return params;
}

export function parseContentRange(
  contentRange: string | null
): ParsedContentRange {
  if (!contentRange) {
    return { start: null, end: null, total: null, raw: null };
  }

  const trimmed = contentRange.trim();
  // Formatos esperados: "0-99/103545", "*/103545", "0-0/0", "*/0"
  const match = trimmed.match(/^(?:(\d+)-(\d+)|\*)\/(\d+|\*)$/);
  if (!match) {
    return { start: null, end: null, total: null, raw: trimmed };
  }

  const start = match[1] !== undefined ? parseInt(match[1], 10) : null;
  const end = match[2] !== undefined ? parseInt(match[2], 10) : null;
  const total =
    match[3] !== undefined && match[3] !== "*" ? parseInt(match[3], 10) : null;

  return {
    start,
    end,
    total,
    raw: trimmed,
  };
}
