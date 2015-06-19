var _ = require('lodash');
var q = require('q');
var assert = require('assert');

// Require the google cloud connector
var gcloud = require('gcloud');

// Require the base Connector class
var Connector = require('loopback-connector').Connector;

// Require the debug module with a pattern of loopback:connector:connectorName
var debug = require('debug')('loopback:connector:gcloud-datasource');

/**
 * Initialize the  connector against the given data source
 *
 * @param {DataSource} dataSource The loopback-datasource-juggler dataSource
 * @param {Function} [callback] The callback function
 */
exports.initialize = function initializeDataSource(dataSource, callback) {
    assert(dataSource, 'Missing dataSource');
    assert(dataSource.settings, 'Missing dataSource settings');
    assert(dataSource.settings.keyFilename, 'Missing settings.keyFilename');
    assert(dataSource.settings.email, 'Missing settings.email');
    assert(dataSource.settings.projectId, 'Missing settings.projectId');
    assert(gcloud, 'Missing gcloud module/driver');

    dataSource.driver = gcloud;
    dataSource.client = gcloud.datastore.dataset({
        keyFilename: dataSource.settings.keyFilename,
        email: dataSource.settings.email,
        projectId: dataSource.settings.projectId,
        namespace: dataSource.settings.namespace || undefined
    });

    // Bridge to client
    dataSource.connector = new GcloudDataSourceConnector(dataSource);
};

/**
 * Define the basic connector
 */
function GcloudDataSourceConnector(dataSource) {
    assert(dataSource, 'Missing dataSource');
    assert(dataSource.client, 'Missing dataSource.client');

    // Call the super constructor with name and settings
    Connector.call(this, 'gcloud-datasource', dataSource.settings);

    // Store properties
    this._dataSource = dataSource;
};

// Set up the prototype inheritence
require('util').inherits(GcloudDataSourceConnector, Connector);

// Convenience
GcloudDataSourceConnector.prototype.dataset = function() {
    return this._dataSource.client;
}

// Connect to the database
GcloudDataSourceConnector.prototype.connect = function(cb) {
    // do nothing
};

// Disconnect from the database
GcloudDataSourceConnector.prototype.disconnect = function(cb) {
    // do nothing
};

// Not a relational database
GcloudDataSourceConnector.prototype.relational = false;

// How do we treat the ID?
GcloudDataSourceConnector.prototype.getDefaultIdType = function() {
    return Integer;
};

// Type definition
GcloudDataSourceConnector.prototype.getTypes = function() {
    return ['db', 'nosql', 'gcloud-datasource'];
};

// Explicit insert
GcloudDataSourceConnector.prototype.create = function(model, data, callback) {
    assert(data, 'Cannot save an empty document into the database');
    debug('insert:', model, data);

    var deferred = q.defer();
    var key = dataset().key(['Unknown']);

    // Setup the callback
    q.then(function(data) {
        if (callback) {
            callback(null, data);
        }
    }).catch(function(fail) {
        if (callback) {
            callback(fail, null);
        }
    }).done();

    // Push it
    dataset().insert({
        key: key
        data: data
    }, function(errors, result) {
        debug('insert result:', errors, result);

        try {
            assert(errors == null, errors);
            assert(result, 'No result data returned on update');
            return deferred.resolve();
        } catch (fail) {
            return deferred.reject(fail);
        }
    });

    return deferred.promise;
};


module.exports = GcloudDataSourceConnector;
