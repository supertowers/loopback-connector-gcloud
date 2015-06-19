var _ = require('lodash');

// Require the google cloud connector
var gcloud = require('gcloud');

// Require the base SqlConnector class
var SqlConnector = require('loopback-connector').SqlConnector;

// Require the debug module with a pattern of loopback:connector:connectorName
var debug = require('debug')('loopback:connector:mysql');

/**
 * Initialize the  connector against the given data source
 *
 * @param {DataSource} dataSource The loopback-datasource-juggler dataSource
 * @param {Function} [callback] The callback function
 */
exports.initialize = function initializeDataSource(dataSource, callback) {

};
