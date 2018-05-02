const SimpleModel = require('../models/SimpleModel');
const ExtendedCommonModel = require('../models/ExtendedCommonModel');

const EntityRepository = require('../../lib/services/entity.repository');

const dbInitializer = require('../util/dbInitializer');
const dbConfig = require('../util/TestDatabaseConfigs').POSTGRESQL_CONFIG;

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const { assert, expect } = chai;

const TABLE_NAME = 'models';

describe('entity.repository', () => {
  let knex;

  /**
   * @type EntityRepository
   */
  let entities;
  before(() => {
    knex = dbInitializer.initialize(dbConfig);
    entities = new EntityRepository(knex, SimpleModel);
    return dbInitializer.createDb(knex);
  });
  beforeEach(() => {
    return dbInitializer.cleanDb(knex);
  });

  after(async () => {
    await dbInitializer.dropDb(knex);
    await knex.destroy();
  });

  describe('constructor', () => {
    it('validates intermediary subclasses correctly', () => {
      const repository = new EntityRepository(knex, ExtendedCommonModel);
      assert.isDefined(repository);
    });
  });

  describe('fromJson', () => {
    it('happy path', () => {
      const entity = entities.fromJson({ name: 'dummyName' });
      assert.deepEqual(entity, {
        name: 'dummyName'
      });
    });

    it('creates from undefined', () => {
      const entity = entities.fromJson();
      assert.deepEqual(entity, {});
    });
  });

  describe('create', () => {
    it('happy path', async () => {
      await entities.create({ name: 'dummyName' });
      const retrievedEntities = await knex(TABLE_NAME).select();
      assert.equal(retrievedEntities.length, 1);
      const [entity] = retrievedEntities;
      assert.equal(entity.name, 'dummyName');
    });
  });

  describe('update', () => {
    it('happy path', async () => {
      const persistedEntity = await entities.create({ name: 'dummyName' });
      await entities.update({
        ...persistedEntity,
        name: 'updatedName'
      });

      const retrievedEntities = await knex(TABLE_NAME).select();
      assert.equal(retrievedEntities.length, 1);
      const [entity] = retrievedEntities;
      assert.equal(entity.name, 'updatedName');
    });

    it('throws an error if entity was not found', async () => {
      await expect(
        entities.update({
          id: -1,
          name: 'updatedName'
        })
      ).to.be.rejectedWith(/Entity with id -1 does not exist/);

      const retrievedEntities = await knex(TABLE_NAME).select();
      assert.equal(retrievedEntities.length, 0);
    });

    it('correctly performs incremental update', async () => {
      const persistedEntity = await entities.create({ name: 'dummyName' });

      await entities.update({
        id: persistedEntity.id,
        description: 'desc'
      });

      const retrievedEntities = await knex(TABLE_NAME).select();
      assert.equal(retrievedEntities.length, 1);
      const [entity] = retrievedEntities;
      assert.equal(entity.name, 'dummyName');
      assert.equal(entity.description, 'desc');
    });
  });

  describe('find', () => {
    it('happy path', async () => {
      await entities.create({ name: 'dummyName' });
      await entities.create({ name: 'dummyName' });
      await entities.create({ name: 'testName' });

      const retrievedEntities = await entities.find({
        name: 'dummyName'
      });

      assert.equal(retrievedEntities.length, 2);
      const [entity] = retrievedEntities;
      assert.equal(entity.name, 'dummyName');
    });
  });

  describe('findWhereIn', () => {
    it('happy path', async () => {
      await entities.create({ name: 'dummyName1' });
      await entities.create({ name: 'dummyName2' });
      await entities.create({ name: 'dummyName3' });

      const retrievedEntities = await entities.findWhereIn('name', ['dummyName1', 'dummyName3']);

      assert.equal(retrievedEntities.length, 2);
      const [entity1, entity2] = retrievedEntities.sort(sortByName);
      assert.equal(entity1.name, 'dummyName1');
      assert.equal(entity2.name, 'dummyName3');
    });
  });

  describe('findOne', () => {
    it('happy path', async () => {
      await entities.create({ name: 'dummyName' });
      await entities.create({ name: 'dummyName' });
      await entities.create({ name: 'testName' });

      const entity = await entities.findOne({
        name: 'dummyName'
      });

      assert.equal(entity.name, 'dummyName');
    });
  });

  function sortByName(entityA, entityB) {
    const nameA = entityA.name.toUpperCase(); // ignore upper and lowercase
    const nameB = entityB.name.toUpperCase(); // ignore upper and lowercase
    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }

    // names must be equal
    return 0;
  }
});
