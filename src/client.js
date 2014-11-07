'use strict';

/*
    Client networking layer for connecting a local canvas to remote layout engine
*/

var debug        = require('debug')('StreamGL:main'),
    $            = require('jquery'),
    Rx           = require('rx'),
    rx_jquery    = require('rx-jquery'),
    _            = require('underscore');

var renderConfig = require('render-config'),
    renderer     = require('./renderer.js'),
    ui           = require('./ui.js');


//string * {socketHost: string, socketPort: int} -> (... -> ...)
// where fragment == 'vbo?buffer' or 'texture?name'
function makeFetcher (fragment, url) {
    //string * {<name> -> int} * name -> Subject ArrayBuffer
    return function (socketID, bufferByteLengths, bufferName) {

        debug('fetching', bufferName);

        var res = new Rx.Subject();

        //https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Sending_and_Receiving_Binary_Data?redirectlocale=en-US&redirectslug=DOM%2FXMLHttpRequest%2FSending_and_Receiving_Binary_Data
        var oReq = new XMLHttpRequest();
        oReq.open('GET', url + '/' + fragment + '=' + bufferName + '&id=' + socketID, true);
        oReq.responseType = 'arraybuffer';

        var now = Date.now();
        oReq.onload = function () {
            try {
                debug('got texture/vbo data', bufferName, Date.now() - now, 'ms');

                var arrayBuffer = oReq.response; // Note: not oReq.responseText
                var trimmedArray = new Uint8Array(arrayBuffer, 0, bufferByteLengths[bufferName]);

                res.onNext(trimmedArray);

            } catch (e) {
                ui.error('Render error on loading data into WebGL:', e, new Error().stack);
            }
        };

        oReq.send(null);

        return res.take(1);
    };
}


// Filter for server resource names that have changed (or not previously present)
//[ String ] * ?{?<name>: int} * ?{?<name>: int} -> [ String ]
function getUpdatedNames (names, originalVersions, newVersions) {
    if (!originalVersions || !newVersions) {
        return names;
    }
    return names.filter(function (name) {
        return originalVersions[name] !== newVersions[name];
    });
}


/**
 * Fetches the URL for the viz server to use
 */
function getVizServerAddress() {
    return $.ajaxAsObservable({
            url: '/vizaddr/graph',
            dataType: 'json'
        })
        .map(function(reply) {
            debug('Got viz server address', reply.data);

            return {
                'hostname': reply.data.hostname,
                'port': reply.data.port,
                'url': '//' + reply.data.hostname + ':' + reply.data.port
            };
        })
        .take(1);
}


//DOM * ?{?meter, ?camera, ?socket} ->
//  {
//      renderFrame: () -> (),
//      setCamera: camera -> (),
//      disconnect: () -> (),
//      socket
//  }
function init (canvas, opts, cb) {
    cb = cb || function() { };

    getVizServerAddress().subscribe(function(addr) {
        debug('Got viz server address', addr);

        //string * {<name> -> int} * name -> Subject ArrayBuffer
        //socketID, bufferByteLengths, bufferName
        var fetchBuffer = makeFetcher('vbo?buffer', addr.hostname, addr.port);

        //string * {<name> -> int} * name -> Subject ArrayBuffer
        //socketID, textureByteLengths, textureName
        var fetchTexture = makeFetcher('texture?texture', addr.hostname, addr.port);


        debug('initializing networking client');
        opts = opts || {};

        debug('connected');

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        var meter = opts.meter || {tick: function(){}, pause: function(){}};

        var socket = opts.socket;
        if (!socket) {
            socket = io.connect(addr.url, {reconnection: false, transports: ['websocket']});
            socket.io.engine.binaryType = 'arraybuffer';
        } else if (!socket.io || !socket.io.engine || socket.io.engine !== 'arraybuffer') {
            debug('Expected binary socket');
        } else {
            debug('Using existing socket');
        }

        var renderState = renderer.init(renderConfig, canvas, opts);
        var gl = renderState.get('gl');
        var programs = renderState.get('programs').toJS();
        var buffers = renderState.get('buffers').toJS();
        var camera = renderState.get('camera');

        var bufferNames = renderer.getServerBufferNames(renderConfig),
            textureNames = renderer.getServerTextureNames(renderConfig);
        debug('  Server buffers/textures', bufferNames, textureNames);

        var lastHandshake = Date.now();

        var previousVersions = {};
        socket.on('vbo_update', function (data, handshake) {
        try {
            debug('VBO update');

            var now = new Date().getTime();
            debug('got VBO update message', now - lastHandshake, data, 'ms');

            var changedBufferNames  = getUpdatedNames(bufferNames,  previousVersions.buffers,  data.versions ? data.versions.buffers : null),
                changedTextureNames = getUpdatedNames(textureNames, previousVersions.textures, data.versions ? data.versions.textures : null);

            socket.emit('planned_binary_requests', {buffers: changedBufferNames, textures: changedTextureNames});

            debug('changed buffers/textures', previousVersions, data.versions, changedBufferNames, changedTextureNames);

            var readyBuffers = new Rx.ReplaySubject(1);
            var readyTextures = new Rx.ReplaySubject(1);

            Rx.Observable.zip(readyBuffers, readyTextures, _.identity)
                .subscribe(function () {
                    debug('All buffers and textures received, completing');
                    handshake(Date.now() - lastHandshake);
                    lastHandshake = Date.now();
                    meter.tick();
                    renderer.render(renderState);
                });

            var bufferVBOs = Rx.Observable.zipArray(
                [Rx.Observable.return()]
                    .concat(changedBufferNames.map(fetchBuffer.bind('', socket.io.engine.id, data.bufferByteLengths))))
                .take(1);
            bufferVBOs
                .subscribe(function (vbos) {
                    vbos.shift();

                    debug('Got VBOs:', vbos.length);
                    var bindings = _.object(_.zip(changedBufferNames, vbos));

                    debug('got all VBO data', Date.now() - now, 'ms', bindings);
                    socket.emit('received_buffers'); //TODO fire preemptively based on guess

                    try {
                        renderer.loadBuffers(renderState, buffers, bindings);
                        renderer.setNumElements(data.elements);
                        readyBuffers.onNext();
                    } catch (e) {
                        ui.error('Render error on loading data into WebGL:', e, new Error().stack);
                    }

                });

            var textureLengths =
                _.object(_.pairs(_.pick(data.textures, changedTextureNames))
                    .map(function (pair) {
                        var name = pair[0];
                        var nfo = pair[1];
                        return [name, nfo.bytes]; }));
            var texturesData = Rx.Observable.zipArray(
                [Rx.Observable.return()]
                    .concat(changedTextureNames.map(fetchTexture.bind('', socket.io.engine.id, textureLengths))))
                .take(1);
            texturesData
                .subscribe(function (textures) {
                    textures.shift();

                    var textureNfos = changedTextureNames.map(function (name, i) {
                        return _.extend(data.textures[name], {buffer: textures[i]});
                    });

                    var bindings = _.object(_.zip(changedTextureNames, textureNfos));

                    debug('Got textures', textures);
                    renderer.loadTextures(renderState, bindings);

                    readyTextures.onNext();
                });

            previousVersions = data.versions || {};

        } catch (e) {
            debug('ERROR vbo_update', e, e.stack);
        }
        });


        socket.on('error', meter.pause.bind(meter));
        socket.on('disconnect', meter.pause.bind(meter));

        //////

        cb({
            //on events: error, disconnect
            socket: socket,

            camera: camera,
            disconnect: socket.disconnect.bind(socket),
            setCamera: renderer.setCamera.bind(renderer, renderConfig, gl, programs),

            //itemName * int * int -> int
            hitTest: renderer.hitTest.bind(renderer, renderState),

            //string -> {read, write}
            localAttributeProxy: renderer.localAttributeProxy(renderState),

            renderer: renderer,
            renderState: renderState,

            //call to render with current camera
            renderFrame: function () {
                renderer.setCamera(renderConfig, gl, programs, camera);
                renderer.render(renderState);
            }
        });

    });
}

module.exports = init;
