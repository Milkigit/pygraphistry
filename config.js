// WARNING: THIS FILE GETS OVER WRITTEN IN PRODUCTION.
// SEE ansible/roles/node-server/templates/config.j2

var _ = require('underscore');

module.exports = function() {
    var defaultOptions = {
        LISTEN_ADDRESS: '0.0.0.0',
        LISTEN_PORT: 10000,
        MONGO_SERVER: 'mongodb://graphistry:graphtheplanet@lighthouse.2.mongolayer.com:10048,lighthouse.3.mongolayer.com:10048/graphistry-prod'
    };

    var commandLineOptions = process.argv.length > 2 ? JSON.parse(process.argv[2]) : {};

    var options = _.extend(defaultOptions, commandLineOptions);

    return options;
};
