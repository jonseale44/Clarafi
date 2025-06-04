  Why you should do it regularly: https://github.com/browserslist/update-db#readme
Error seeding sample data: error: relation "patients" does not exist
    at file:///home/runner/workspace/node_modules/@neondatabase/serverless/index.mjs:1345:74
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async NeonPreparedQuery.execute (/home/runner/workspace/node_modules/src/neon-serverless/session.ts:102:18)
    at async DatabaseStorage.getAllPatients (/home/runner/workspace/server/storage.ts:117:12)
    at async seedSampleData (/home/runner/workspace/server/seed-data.ts:8:30) {
  length: 108,
  severity: 'ERROR',
  code: '42P01',
  detail: undefined,
  hint: undefined,
  position: '313',
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: undefined,
  table: undefined,
  column: undefined,
  dataType: undefined,
  constraint: undefined,
  file: 'parse_relation.c',
  line: '1449',
  routine: 'parserOpenTable'
}
6:52:38 PM [express] GET /api/user 401 in 2ms
file:///home/runner/workspace/node_modules/@neondatabase/serverless/index.mjs:1345
o?t(o):n(u)},"cb"),s=new r(function(o,u){n=o,t=u}).catch(o=>{throw Error.captureStackTrace(
                                                                         ^

error: relation "users" does not exist
    at file:///home/runner/workspace/node_modules/@neondatabase/serverless/index.mjs:1345:74
    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
    at async NeonPreparedQuery.execute (/home/runner/workspace/node_modules/src/neon-serverless/session.ts:102:18)
    at async DatabaseStorage.getUserByUsername (/home/runner/workspace/server/storage.ts:85:20)
    at async Strategy._verify (/home/runner/workspace/server/auth.ts:46:20) {
  length: 105,
  severity: 'ERROR',
  code: '42P01',
  detail: undefined,
  hint: undefined,
  position: '275',
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: undefined,
  table: undefined,
  column: undefined,
  dataType: undefined,
  constraint: undefined,
  file: 'parse_relation.c',
  line: '1449',
  routine: 'parserOpenTable'
}
