import { Observable } from 'rxjs';
import {
    pathValue as $pathValue,
    pathInvalidation as $invalidation
} from '@graphistry/falcor-json-graph';
import {
    getHandler,
    logErrorWithCode,
    mapObjectsToAtoms
} from './support';

export function templates({ loadTemplatesById }) {
    const getTemplateHandler = getHandler(['template'], loadTemplatesById);

    return [{
        route: `templatesById[{keys}]['name', 'id']`,
        returns: `String`,
        get: getTemplateHandler
    }, {
        route: `['templatesById'][{keys}]['pivotParameterKeys'].length`,
        returns: `Number`,
        get: getTemplateHandler

    }, {
        route: `templatesById[{keys}]['pivotParameterKeys'][{integers}]`,
        returns: `String`,
        get: getTemplateHandler
    }, {
        route: `templatesById[{keys}]['pivotParametersUI'][{keys}]`,
        returns: `Object`,
        get: getTemplateHandler
    }];
}
