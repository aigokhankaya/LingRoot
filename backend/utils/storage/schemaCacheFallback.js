const logger = require('../common/logger.js');

function extractMissingColumnName(error) {
  const message = error?.message || '';
  const match = message.match(/Could not find the '([^']+)' column of '([^']+)'/i);
  if (!match) return null;

  return {
    column: match[1],
    table: match[2],
  };
}

async function insertWithSchemaFallback(queryBuilder, tableName, payload, options = {}) {
  const selectMode = options.selectMode || 'multi';
  const insertPayload = { ...payload };
  const removedColumns = [];

  while (true) {
    let query = queryBuilder.from(tableName).insert(insertPayload).select();
    if (selectMode === 'single') {
      query = query.single();
    }

    const { data, error } = await query;
    if (!error) {
      return { data, error: null, removedColumns };
    }

    const missing = extractMissingColumnName(error);
    if (!missing || missing.table !== tableName || !(missing.column in insertPayload)) {
      return { data, error, removedColumns };
    }

    removedColumns.push(missing.column);
    delete insertPayload[missing.column];

    logger.warn(
      `[SCHEMA-FALLBACK] Retrying insert without missing column "${missing.column}" on table "${tableName}"`
    );
  }
}

module.exports = {
  extractMissingColumnName,
  insertWithSchemaFallback,
};
