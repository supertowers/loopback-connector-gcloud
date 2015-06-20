var _ = require('lodash');
var q = require('q');
var assert = require('assert');
var util = require('util');
var uuid = require('uuid');

// Require the google cloud connector
var gcloud = require('gcloud');

// Require the base Connector class
var Connector = require('loopback-connector').Connector;

// Require the debug module with a pattern of loopback:connector:connectorName
var debug = require('debug')('loopback:connector:gcloud-datastore');

/**
 * Initialize the  connector against the given data source
 *
 * @param {DataSource} dataSource The loopback-datasource-juggler dataSource
 * @param {Function} [callback] The callback function
 */
exports.initialize = function initializeDataSource(dataSource, callback) {
    dataSource.connector = new GcloudDataStoreConnector(dataSource.settings);
    callback && callback();
};

exports.GcloudDataStoreConnector = GcloudDataStoreConnector;

/**
 * Define the basic connector
 */
function GcloudDataStoreConnector(settings) {
    // Call the super constructor with name and settings
    Connector.call(this, 'gcloud-datastore', settings);

    assert(settings, 'Missing settings');
    assert(settings.keyFilename, 'Missing settings.keyFilename');
    assert(settings.email, 'Missing settings.email');
    assert(settings.projectId, 'Missing settings.projectId');

    // Store properties
    this._dataSet = gcloud.datastore.dataset({
        keyFilename: settings.keyFilename,
        email: settings.email,
        projectId: settings.projectId,
        namespace: settings.namespace || undefined
    });
};

// Set up the prototype inheritence
util.inherits(GcloudDataStoreConnector, Connector);

GcloudDataStoreConnector.prototype.relational = false;

GcloudDataStoreConnector.prototype.getDataSet = function() {
    return this._dataSet;
};

GcloudDataStoreConnector.prototype.getDataSetKey = function(model, entityId) {
    return entityId ? this._dataSet.key([model, entityId]) : this._dataSet.key(model);
};

GcloudDataStoreConnector.prototype.getCorrectProperties = function(model, data) {
    var definition = this.getModelDefinition(model);
    return _.pick(data, _.keys(definition.properties));
};

GcloudDataStoreConnector.prototype.getTypes = function() {
    return ['db', 'nosql', 'gcloud-datastore'];
};

GcloudDataStoreConnector.prototype.connect = function(callback) {
    callback && callback();
};

GcloudDataStoreConnector.prototype.disconnect = function(callback) {
    callback && callback();
};

GcloudDataStoreConnector.prototype.all = function(model, filter, callback) {
    debug('all: model', model);
    debug('all: filter', filter);
    this.find(model, filter, callback);
};

GcloudDataStoreConnector.prototype.find = function(model, filter, callback) {
    debug('find: model', model);
    debug('find: filter', filter);

    // Setup
    var idName = this.idName(model);
    var ds = this.getDataSet();
    var query = ds.createQuery(model);

    // Limit, Offset restrictions
    if (filter.limit) {
        query = query.limit(filter.limit);
    }

    if (filter.offset) {
        query = query.offset(filter.offset);
    }

    // Where clauses (including filtering on primary key)
    _.each(filter.where, function(value, property) {
        if (idName == property) {
            query = query.filter('__key__ =', ds.key([model, value]));
        } else {
            query = query.filter(property + ' =', value);
        }
    });

    // SHow it
    debug('find() query details:', query);

    // Run the query
    ds.runQuery(query, function(errors, result, cursor) {
        debug('find.get()', 'errors', errors, 'result', result);
        assert(errors == null, errors);

        callback(null, _.map(result, function(entity) {
            entity.data[idName] = entity.key.path[1];
            return entity.data;
        }));
    });
};

GcloudDataStoreConnector.prototype.findById = function(model, id, callback) {
    assert(id, 'Entity ID missing');
    debug('findById()', model, id);

    // Setup
    var idName = this.idName(model);
    var ds = this.getDataSet();
    var key = ds.key([model, id]);

    // Run the query
    ds.get(key, function(errors, result, cursor) {
        debug('findById.get()', 'errors', errors, 'result', result);
        assert(errors == null, errors);

        // Unknown entity?
        if (result == null) {
            return callback(null, []);
        }

        callback(null, _.map([result], function(entity) {
            entity.data[idName] = entity.key.path[1];
            return entity.data;
        }));
    });
};

GcloudDataStoreConnector.prototype.create = function(model, data, options, callback) {
    debug('create()', model, data, options);
    assert(data, 'Cannot save an empty entity into the database');
    assert(data.Id == undefined, 'Cannot create a entity that already has an existing ID');

    // Setup
    var ds = this.getDataSet();
    var key = ds.key(model);

    // Exclude invalid properties
    var definition = this.getModelDefinition(model);
    data = _.pick(data, _.keys(definition.properties));

    // Update the data
    ds.save({
        key: key,
        data: data
    }, function(errors, result) {
        debug('create.save()', 'errors', errors, 'result', result);
        assert(errors == null, errors);
        assert(key.path && key.path[1], 'An ID value was not generated');

        // Done
        callback(null, key.path[1]);
    });
};

GcloudDataStoreConnector.prototype.updateAttributes = function(model, id, data, options, callback) {
    assert(id, 'Entity ID missing');
    debug('updateAttributes(): starting', model, id, data, options);

    // For future reference
    var idName = this.idName(model);
    var ds = this.getDataSet();
    var key = ds.key([model, id]);
    var definition = this.getModelDefinition(model);

    // Find the existing data
    this.findById(model, id, function(errors, original) {
        if (errors) {
            return callback(errors, null);
        }

        // Exclude invalid properties
        data = _.pick(data, _.keys(definition.properties));

        // Merge in new data over the old data
        data = _.merge(original[0], data);

        // Delete the entityId from the incoming data if present
        data = _.omit(data, idName);

        debug('updateAttributes(): pushing new data', data);

        // Update the data
        ds.update({
            key: key,
            data: data
        }, function(errors, result) {
            debug('updateAttributes(): callback done, errors?', errors);
            assert(errors == null, errors);

            // Done
            callback(null, id);
        });
    });
};

/**
 * Delete all matching model instances
 *
 * https://googlecloudplatform.github.io/gcloud-node/#/docs/v0.15.0/datastore/dataset?method=delete
 *
 * @param {String} model The model name
 * @param {Object} where The where object
 * @param {Object} options The options object
 * @param {Function} callback The callback function
 */
GcloudDataStoreConnector.prototype.destroyAll = function(model, where, options, callback) {
    debug('destroyAll: model', model);
    debug('destroyAll: where', where);

    // Setup
    var idName = this.idName(model);
    var id = where[idName];
    var ds = this.getDataSet();
    var key = ds.key([model, id]);

    // Update the data
    ds.delete(key, function(errors, result) {
        debug('destroyAll: callback done: errors', errors);
        debug('destroyAll: callback done: result', result);
        callback(errors, null);
    });
};

/**
 * Count all the records in the dataset that match.
 *
 * Since (in loopback) this method is called with an explicity where clause that
 * restricts the search to a single record by ID, the result of this call will only
 * ever be a 0 (not found) or a 1 (found).
 *
 * @param {String} model The model name
 * @param {Object} where The where clause
 * @param {Object} options The options object
 * @param {Function} callback The callback function
 * @return {Number} The total size of the result set found.
 */
GcloudDataStoreConnector.prototype.count = function(model, where, options, callback) {
    debug('count: model', model);
    debug('count: where', where);

    // Setup
    var idName = this.idName(model);

    // Redirect
    return this.find(model, {
        where: where
    }, function(errors, result) {
        debug('count: callback done: errors', errors);
        debug('count: callback done: result', result);
        debug('count: callback done: result size', _.size(result || []));

        callback(errors, Number(_.size(result || [])));
    });
};

module.exports = GcloudDataStoreConnector;
