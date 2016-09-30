import {
    ref as $ref,
    atom as $atom,
    pathValue as $pathValue,
    pathInvalidation as $invalidation
} from '@graphistry/falcor-json-graph';
import _ from 'underscore';
import { simpleflake } from 'simpleflakes';
import { clonePivotModel } from './pivots';

function defaults(index) {
    return {
        name: `Untitled Investigation ${index}`,
        url: process.env.BLANK_PAGE || 'http://www.graphistry.com',
        id: simpleflake().toJSON(),
        pivots: []
    };
}

function initialSoftState(pivots) {
    return {
        status: {ok: true},
        pivots: pivots.map((pivotId) =>
            $ref(`pivotsById['${pivotId}']`)
        )
    };
}

export function createInvestigationModel(serializedInvestigation, index) {
    const normalizedInvestigation = {
        ...defaults(index),
        ...serializedInvestigation
    };
    return {
        ...normalizedInvestigation,
        ...initialSoftState(normalizedInvestigation.pivots)
    };
}

export function serializeInvestigationModel(investigation) {
    const hardState = _.pick(investigation, _.keys(defaults()))
    hardState.pivots = hardState.pivots.map(pivotRef => pivotRef.value[1])
    return hardState;
}

export function cloneInvestigationModel(investigation, clonedPivots) {
    const deepCopy = JSON.parse(JSON.stringify(serializeInvestigationModel(investigation)));

    return {
        ...deepCopy,
        ...initialSoftState(_.pluck(clonedPivots, 'id')),
        id: simpleflake().toJSON(),
        name: `Copy of ${investigation.name}`,
    };
}
