import React from 'react'
import { container } from '@graphistry/falcor-react-redux';
import {
    ExpressionItem,
    ExpressionsList
} from 'viz-shared/components/expressions';

import {
    addExpression,
    removeExpression,
    updateExpression,
    setExpressionEnabled,
    cancelUpdateExpression
} from 'viz-shared/actions/expressions';

let Expressions = ({ templates = [], expressions = [], removeExpression, ...props }) => {
    return (
        <ExpressionsList templates={templates} {...props}>
        {expressions.map((expression, index) => (
            <Expression data={expression}
                        templates={templates}
                        key={`${index}: ${expression.id}`}
                        removeExpression={removeExpression}/>
        ))}
        </ExpressionsList>
    );
};

Expressions = container(
    ({ length = 0, templates = [], ...expressions } = {}) => `{
        id, name, length ${Array
            .from({ length }, (xs, i) => expressions[i])
            .reduce((xs, expression, index) => `
                ${xs},
                ${index}: ${
                    Expression.fragment(expression)
                }`
            , '')
        },
        templates: {
            length, [0...${templates.length || 0}]: {
                name, dataType, attribute, componentType
            }
        }
    }`,
    (expressions) => ({
        expressions,
        name: expressions.name,
        templates: expressions.templates
    }),
    { addExpression, removeExpression }
)(Expressions);

let Expression = container(
    () => `{
        id, input, level,
        name, enabled, attribute,
        dataType, componentType, expressionType
    }`,
    (expression) => expression,
    { updateExpression,
      setExpressionEnabled,
      cancelUpdateExpression }
)(ExpressionItem);

export { Expressions, Expression };
