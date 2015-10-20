'use strict';

var $       = window.$;
//var _       = require('underscore');
//var Rx      = require('rx');
require('../rx-jquery-stub');
var Handlebars = require('handlebars');
var Backbone   = require('backbone');
    Backbone.$ = $;
var _          = require('underscore');
var util       = require('./util.js');
var Command    = require('./command.js');

/**
 * @typedef {Object} SelectionElement
 * @property {Number} dim - Enum: 1 for point, 2 for edge.
 * @property {Number} idx - Index into the filtered dataframe.
 */


function unionOfTwoMasks (x, y) {
    // TODO: this is a copy of DataframeMask.unionOfTwoMasks. de-duplicate through common code-share.
    var xLength = x.length, yLength = y.length;
    // Smallest result: one is a subset of the other.
    var result = new Array(Math.max(xLength, yLength));
    var xIndex = 0, yIndex = 0, resultIndex = 0;
    while (xIndex < xLength && yIndex < yLength) {
        if (x[xIndex] < y[yIndex]) {
            result[resultIndex++] = x[xIndex++];
        } else if (y[yIndex] < x[xIndex]) {
            result[resultIndex++] = y[yIndex++];
        } else /* x[xIndex] === y[yIndex] */ {
            result[resultIndex++] = y[yIndex++];
            xIndex++;
        }
    }
    while (xIndex < xLength) {
        result[resultIndex++] = x[xIndex++];
    }
    while (yIndex < yLength) {
        result[resultIndex++] = y[yIndex++];
    }
    return result;
}


var SetModel = Backbone.Model.extend({
    default: {
        title: undefined
    },
    /**
     * @returns {SelectionElement[]}
     */
    asSelection: function () {
        var mask = this.get('mask');
        if (mask === undefined) { return undefined; }
        var result = []; // new Array(mask.point.length + mask.edge.length);
        if (mask.point) {
            _.each(mask.point, function (pointIndex) {
                result.push({dim: 1, idx: pointIndex});
            });
        }
        if (mask.edge) {
            _.each(mask.edge, function (edgeIndex) {
                result.push({dim: 2, idx: edgeIndex});
            });
        }
        return result;
    },
    /**
     * @param {SelectionElement[]} selections
     */
    fromSelection: function (selections) {
        var mask = this.get('mask');
        if (mask === undefined) {
            mask = {point: [], edge: []};
            this.set('mask', mask);
        }
        _.each(selections, function (selection) {
            switch (selection.dim) {
                case 1:
                    mask.point.push(selection.idx);
                    break;
                case 2:
                    mask.edge.push(selection.idx);
                    break;
                default:
                    throw Error('Unrecognized dimension in selection: ' + selection.dim);
            }
        });
        mask.point = _.uniq(mask.point.sort(), true);
        mask.edge = _.uniq(mask.edge.sort(), true);
    },
    union: function (otherSet) {
        var result = new SetModel();
        var resultMask = result.get('mask'), thisMask = this.get('mask'), otherMask = otherSet.get('mask');
        resultMask.point = unionOfTwoMasks(thisMask.point, otherMask.point);
        resultMask.edge = unionOfTwoMasks(thisMask.edge, otherMask.edge);
        return result;
    }
});

var SetCollection = Backbone.Collection.extend({
    model: SetModel
});

var SetView = Backbone.View.extend({
    tagName: 'div',
    className: 'setEntry',
    events: {
    },
    initialize: function (/*options*/) {
        this.listenTo(this.model, 'destroy', this.remove);
        this.template = Handlebars.compile($('#setTemplate').html());
    },
    render: function () {
        var bindings = this.model.toJSON();
        bindings.isSystem = bindings.level === 'system';
        var html = this.template(bindings);
        this.$el.html(html);
        return this;
    }
});

var AllSetsView = Backbone.View.extend({
    events: {

    },
    initialize: function (options) {
        this.listenTo(this.collection, 'add', this.addSet);
        this.listenTo(this.collection, 'remove', this.removeSet);
        this.listenTo(this.collection, 'reset', this.refresh);
        this.listenTo(this.collection, 'all', this.render);

        this.el = options.el;
        this.setsContainer = $('#sets');
        this.emptyMessage = $('#setsEmptyMessage');

        // Show if we get no initial collection elements:
        this.updateEmptyMessage();
        this.collection.each(this.addSet, this);
    },
    render: function () {
        var $setsControlButton = $('#setsButton');
        $setsControlButton.attr('data-count', this.collection.length);
        $setsControlButton.toggleClass('iconBadge', !this.collection.isEmpty());
        return this;
    },
    addSet: function (set) {
        var view = new SetView({
            model: set,
            collection: this.collection
        });
        var childElement = view.render().el;
        this.setsContainer.append(childElement);
        set.set('$el', $(childElement));
        this.updateEmptyMessage();
    },
    updateEmptyMessage: function () {
        this.emptyMessage.toggleClass('hidden', this.collection.length !== 0);
    },
    removeSet: function (set) {
        var $el = set.get('$el');
        if ($el) {
            $el.remove();
        }
        this.updateEmptyMessage();
    },
    remove: function () {
    },
    /** Recreates the UI; do not call during interactions. */
    refresh: function () {
        this.setsContainer.empty();
        this.collection.each(this.addSet, this);
    }
});

function SetsPanel(socket/*, urlParams*/) {
    this.collection = new SetCollection([]);

    this.commands = {
        getAll: new Command('getting sets', 'get_sets', socket),
        create: new Command('creating a set', 'create_set', socket),
        update: new Command('updating a set', 'update_set', socket)
    };

    this.model = SetModel;

    this.view = new AllSetsView({
        collection: this.collection,
        el: $('#setsPanel')
    });

    this.commands.getAll.sendWithObservableResult().do(
        function (response) {
            var sets = response.sets;
            _.each(sets, function (vizSet) {
                this.collection.add(new SetModel(vizSet));
            }.bind(this));
        }.bind(this)).subscribe(
            _.identity,
            util.makeErrorHandler(this.commands.getAll.description));
}

SetsPanel.prototype.updateSet = function (vizSetModel) {
    this.commands.update.sendWithObservableResult(vizSetModel.id, vizSetModel);
};

/**
 * @param {Rx.ReplaySubject} activeSelection
 */
SetsPanel.prototype.setupSelectionInteraction = function (activeSelection) {
    this.activeSelection = activeSelection;
};

/**
 * @param {SetModel[]} setModels
 */
SetsPanel.prototype.updateActiveSelectionFrom = function (setModels) {
    var union = _.reduce(setModels, function (firstSet, secondSet) {
        return firstSet.union(secondSet);
    });
    this.activeSelection.onNext(union.asSelection());
};

module.exports = SetsPanel;