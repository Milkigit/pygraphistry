import {
    ref as $ref,
    pathValue as $value,
    pathInvalidation as $invalidate
} from '@graphistry/falcor-json-graph';
import { getHandler,
         setHandler,
         mapObjectsToAtoms,
         captureErrorStacks } from 'viz-shared/routes';

export function views(path, view) {
    return function views({ loadViewsById }) {

        const getValues = getHandler(path, loadViewsById);
        const setValues = setHandler(path, loadViewsById);

        return [{
            get: getValues,
            route: `${view}['id', 'title']`,
            returns: `String`
        }, {
            get: getValues,
            set: setValues,
            route: `${view}.panels['left', 'right', 'bottom']`,
            returns: `Reference`
        }];
    }
}