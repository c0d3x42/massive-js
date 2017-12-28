'use strict';

const Entity = require('../../lib/entity');
const Executable = require('../../lib/executable');
const Table = require('../../lib/table');

describe('connecting', function () {
  let db;

  before(function () {
    return resetDb('loader').then(instance => db = instance);
  });

  beforeEach(function* () {
    db = yield db.reload();
  });

  describe('object merges', function () {
    it('merges schemas and folders', function () {
      db.attach(new Entity({
        schema: 'newschema',
        name: 't1',
        db
      }));

      db.attach(new Entity({
        path: 'newschema.script1',
        name: 'script1',
        db
      }));

      assert.isOk(db.newschema.t1);
      assert.isOk(db.newschema.script1);
    });

    it('merges schemas and tables', function () {
      db.attach(new Table({
        schema: 'schema_or_table',
        name: 't1',
        db
      }));

      db.attach(new Table({
        schema: 'public',
        name: 'schema_or_table',
        db
      }));

      assert.isOk(db.schema_or_table);
      assert.isOk(db.schema_or_table.t1);
      assert.isOk(db.schema_or_table.find);
      assert.isTrue(db.schema_or_table instanceof Table);
      assert.isTrue(db.schema_or_table.t1 instanceof Table);
    });

    it('merges schemas and executables', function* () {
      db.attach(new Table({
        schema: 'schema_or_function',
        name: 't1',
        db
      }));

      db.attach(new Executable({
        name: 'schema_or_function',
        path: 'schema_or_function',
        sql: 'select 1 as val',
        isVariadic: false,
        singleRow: false,
        singleValue: false,
        db
      }));

      assert.isOk(db.schema_or_function);
      assert.isOk(db.schema_or_function.t1);
      assert.isFunction(db.schema_or_function);
      assert.isTrue(db.schema_or_function.t1 instanceof Table);

      const result = yield db.schema_or_function();

      assert.equal(result[0].val, 1);
    });

    it('merges folders and tables', function* () {
      db.attach(new Executable({
        name: 'script',
        path: 'folder_or_table.script1',
        sql: 'select 1 as val',
        isVariadic: false,
        singleRow: false,
        singleValue: false,
        db
      }));

      db.attach(new Table({
        schema: 'public',
        name: 'folder_or_table',
        db
      }));

      db.attach(new Executable({
        name: 'script',
        path: 'folder_or_table.subfolder.script2',
        sql: 'select 2 as val',
        isVariadic: false,
        singleRow: false,
        singleValue: false,
        db
      }));

      assert.isFunction(db.folder_or_table.script1);
      assert.isFunction(db.folder_or_table.subfolder.script2);
      assert.isTrue(db.folder_or_table instanceof Table);
      assert.isFunction(db.folder_or_table.find);

      const result1 = yield db.folder_or_table.script1();
      const result2 = yield db.folder_or_table.subfolder.script2();

      assert.equal(result1[0].val, 1);
      assert.equal(result2[0].val, 2);
    });

    it('errors if an existing entity method is shadowed', function () {
      db.attach(new Table({
        schema: 'public',
        name: 'folder_or_table',
        db
      }));

      assert.throws(() => {
        db.attach(new Executable({
          name: 'script',
          path: 'folder_or_table.findOne',
          sql: 'select 1 as val',
          isVariadic: false,
          singleRow: false,
          singleValue: false,
          db
        }));
      });
    });

    it('errors if a new entity method will shadow an existing node', function () {
      db.attach(new Executable({
        name: 'script',
        path: 'folder_or_table.findOne',
        sql: 'select 1 as val',
        isVariadic: false,
        singleRow: false,
        singleValue: false,
        db
      }));

      assert.throws(() => {
        db.attach(new Table({
          schema: 'public',
          name: 'folder_or_table',
          db
        }));
      });
    });

    it('merges folders and executables', function* () {
      db.attach(new Executable({
        name: 'folder_or_function',
        path: 'folder_or_function',
        sql: 'select 1 as val',
        isVariadic: false,
        singleRow: false,
        singleValue: false,
        db
      }));

      db.attach(new Executable({
        name: 'script',
        path: 'folder_or_function.script',
        sql: 'select 2 as val',
        isVariadic: false,
        singleRow: false,
        singleValue: false,
        db
      }));

      assert.isFunction(db.folder_or_function);
      assert.isFunction(db.folder_or_function.script);

      const result1 = yield db.folder_or_function();
      const result2 = yield db.folder_or_function.script();

      assert.equal(result1[0].val, 1);
      assert.equal(result2[0].val, 2);
    });

    it('merges tables and executables', function* () {
      db.attach(new Executable({
        name: 'function_or_table',
        path: 'function_or_table',
        sql: 'select 1 as val',
        isVariadic: false,
        singleRow: false,
        singleValue: false,
        db
      }));

      db.attach(new Table({
        schema: 'public',
        name: 'function_or_table',
        db
      }));

      assert.isFunction(db.function_or_table);
      assert.isTrue(db.function_or_table instanceof Table);

      const result1 = yield db.function_or_table();
      const result2 = yield db.function_or_table.find({}, {build: true});

      assert.equal(result1[0].val, 1);
      assert.deepEqual(result2, {
        sql: 'SELECT * FROM "function_or_table" WHERE TRUE ORDER BY 1',
        params: []
      });
    });

    it('errors if a script overwrites a function', function () {
      db.attach(new Executable({
        name: 'function_or_script',
        path: 'function_or_script',
        sql: 'select 1 as val',
        isVariadic: false,
        singleRow: false,
        singleValue: false,
        db
      }));

      assert.throws(() => {
        db.attach(new Executable({
          name: 'function_or_script',
          path: 'function_or_script',
          sql: 'select 2 as val',
          paramCount: 0,
          singleRow: false,
          singleValue: false,
          db
        }));
      });
    });

    it('errors if a function overwrites a script', function () {
      db.attach(new Executable({
        name: 'function_or_script',
        path: 'function_or_script',
        sql: 'select 1 as val',
        singleRow: false,
        singleValue: false,
        db
      }));

      assert.throws(() => {
        db.attach(new Executable({
          name: 'function_or_script',
          path: 'function_or_script',
          sql: 'select 2 as val',
          paramCount: 0,
          isVariadic: false,
          singleRow: false,
          singleValue: false,
          db
        }));
      });
    });

    it('allows multiple function signatures', function () {
      db.attach(new Executable({
        name: 'myfunc',
        path: 'myfunc',
        sql: 'select 1 as val',
        isVariadic: false,
        singleRow: false,
        singleValue: false,
        db
      }));

      db.attach(new Executable({
        name: 'myfunc',
        path: 'myfunc',
        sql: 'select 2 as val',
        isVariadic: false,
        singleRow: false,
        singleValue: false,
        db
      }));
    });
  });
});