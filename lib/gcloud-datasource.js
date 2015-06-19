var _ = require('lodash');
var q = require('q');
var assert = require('assert');
var util = require('util');

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
    dataSource.connector = new GcloudDataSourceConnector(dataSource.settings);
};

exports.GcloudDataSourceConnector = GcloudDataSourceConnector;

/**
 * Define the basic connector
 */
function GcloudDataSourceConnector(settings) {
    // Call the super constructor with name and settings
    Connector.call(this, 'gcloud-datasource', settings);

    assert(settings, 'Missing dataSource settings');
    assert(settings.keyFilename, 'Missing settings.keyFilename');
    assert(settings.email, 'Missing settings.email');
    assert(settings.projectId, 'Missing settings.projectId');

    // Store properties
    this._dataSource = gcloud.datastore.dataset({
        keyFilename: settings.keyFilename,
        email: settings.email,
        projectId: settings.projectId,
        namespace: settings.namespace || undefined
    });
};

// Set up the prototype inheritence
util.inherits(GcloudDataSourceConnector, Connector);

GcloudDataSourceConnector.prototype.relational = false;

GcloudDataSourceConnector.prototype.getDefaultIdType = function() {
    return Number;
};

GcloudDataSourceConnector.prototype.getTypes = function() {
    return ['db', 'nosql', 'gcloud-datasource'];
};

GcloudDataSourceConnector.prototype.connect = function(cb) {
    // do nothing
};

GcloudDataSourceConnector.prototype.disconnect = function(cb) {
    // do nothing
};

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
        key: key,
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
