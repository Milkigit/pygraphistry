import { SplunkPivot } from './SplunkPivot';
import stringhash from 'string-hash';
import logger from '../../logger';
const log = logger.createLogger(__filename);


const splunkIndices = {
    FIREEYE: '"Alert Category"="Fire Eye" index="alert_graph_demo"',
    BLUECOAT: '"Alert Category"="Blue Coat Proxy" index="alert_graph_demo"',
    FIREWALL: '"Alert Category"="Firewall" index="alert_graph_demo"',
    IDS: '"Alert Category"="IDS/IPS" index="alert_graph_demo"',
    ALL: 'index=alert_graph_demo'
};

const ALERT_DEMO_NODE_COLORS = {
    'Host': 0,
    'Internal IPs': 1,
    'User': 2,
    'External IPs': 3,
    'Fire Eye MD5': 4,
    'Message': 5,
    'Fire Eye URL': 6,
    'EventID': 7,
    'Search': 8
};

const ALERT_DEMO_NODE_SIZES = {
    'Host':1.0,
    'Internal IPs':1.5,
    'Fire Eye Source IP': 10.1,
    'External IPs':1.5,
    'User':0.5,
    //    'AV Alert Name':5.1,
    'Fire Eye MD5':10.1,
    //'Fire Eye Alert Name':10.1,
    'Fire Eye URL':2.1,
    'Message': 7.1,
    'EventID':0.1,
    'Search': 1,
};

const alertDemoEncodings = {
    point: {
        pointColor: function(node) {
            node.pointColor = ALERT_DEMO_NODE_COLORS[node.type];
            if (node.pointColor === undefined) {
                node.pointColor = stringhash(node.type) % 12;
            }
        },
        pointSizes: function(node) {
            node.pointSize = ALERT_DEMO_NODE_SIZES[node.type];
        }
    }
}

const FIREEYE_FIELDS = [
    `Fire Eye MD5`,
    `Fire Eye URL`,
    `Internal IPs`,
    `Message`,
];

const FIELDS = [
    `Fire Eye MD5`,
    `Fire Eye URL`,
    `Internal IPs`,
    'Fire Eye URL',
    'External IPs',
    'Message'
];

export const searchAlertDemo = new SplunkPivot({
    id: 'search-splunk-alert-botnet-demo',
    name: 'Search Bootnet (all)',
    tags: ['Demo'],
    pivotParameterKeys: ['query'],
    pivotParametersUI: {
        query: {
            inputType: 'text',
            label: 'Query:',
            placeholder: 'Conficker'
        }
    },
    toSplunk: function (pivotParameters) {
        const query = `search ${splunkIndices.ALL} ${pivotParameters.query}`;

        return {
            searchQuery: query,
            searchParams: {earliest_time: '-1y'},
        };
    },
    encodings: alertDemoEncodings
});


export const searchFireeyeDemo = new SplunkPivot({
    id: 'search-splunk-fireeye-botnet-demo',
    name: 'Search FireEye',
    tags: ['Demo'],
    pivotParametersUI: {
        event: {
            inputType: 'text',
            label: 'EventId:',
            placeholder: 'BRO8ZA4A'
        }
    },
    connections: FIREEYE_FIELDS,
    encodings: alertDemoEncodings,
    toSplunk: function (pivotParameters) {
        const query = `search EventID=${pivotParameters.event} ${splunkIndices.FIREEYE} ${this.constructFieldString()}`;

        return {
            searchQuery: query,
            searchParams: {earliest_time: '-1y'},
        };
    }
});

export const expandFireeyeDemo = new SplunkPivot({
    id: 'expand-fireeye-botnet-demo',
    name: 'Expand with Fire Eye',
    tags: ['Demo'],
    pivotParameterKeys: ['ref', 'fields'],
    pivotParametersUI: {
        ref: {
            inputType: 'pivotCombo',
            label: 'Any field in:',
        },
        fields: {
            inputType: 'multi',
            label: 'Expand on',
            options: FIELDS.map(x => ({id:x, name:x})),
        }

    },
    connections: FIREEYE_FIELDS,
    encodings: alertDemoEncodings,
    toSplunk: function (pivotParameters, pivotCache) {
        const refPivot = pivotParameters.ref.value;
        const rawSearch =
            `[{{${refPivot}}}] -[${pivotParameters.fields.value.join(', ')}]-> [${splunkIndices.FIREEYE}]`;
        const query = `search ${this.expandTemplate(rawSearch, pivotCache)} ${this.constructFieldString()}`;

        return {
            searchQuery: query,
            searchParams: {earliest_time: '-1y'},
        };
    },
});

export const expandBlueCoatDemo = new SplunkPivot({
    id: 'expand-bluecoat-botnet-demo',
    name: 'Expand with Blue Coat',
    tags: ['Demo'],
    pivotParameterKeys: ['pivotRef', 'fields'],
    pivotParametersUI: {
        pivotRef: {
            inputType: 'pivotCombo',
            label: 'Any URL in:',
        },
        fields: {
            inputType: 'multi',
            label: 'Expand on',
            options: FIELDS.map(x => ({id:x, name:x})),
        }

    },
    connections: [ 'Fire Eye URL', 'External IPs' ],
    encodings: alertDemoEncodings,
    toSplunk: function (pivotParameters, pivotCache) {
        const refPivot = pivotParameters.pivotRef.value[0];
        const rawSearch =
            `[{{${refPivot}}}] -[${pivotParameters.fields.value.join(', ')}]-> [${splunkIndices.BLUECOAT}]`;
        const query = `search ${this.expandTemplate(rawSearch, pivotCache)} ${this.constructFieldString()}`;

        return {
            searchQuery: query,
            searchParams: {earliest_time: '-1y'},
        };
    }
});

export const expandFirewallDemo = new SplunkPivot({
    id: 'expand-firewall-botnet-demo',
    name: 'Expand with Firewall',
    tags: ['Demo'],
    pivotParameterKeys: ['pRef', 'fields'],
    pivotParametersUI: {
        pRef: {
            inputType: 'pivotCombo',
            label: 'Any IP in:',
        },
        fields: {
            inputType: 'multi',
            label: 'Expand on',
            options: FIELDS.map(x => ({id:x, name:x})),
        }

    },
    connections: [ 'External IPs', 'Internal IPs' ],
    encodings: alertDemoEncodings,
    toSplunk: function (pivotParameters, pivotCache) {
        const refPivot = pivotParameters.pRef.value[0];
        const rawSearch =
            `[{{${refPivot}}}] -[${pivotParameters.fields.value.join(', ')}]-> [${splunkIndices.FIREWALL}]`;
        const query = `search ${this.expandTemplate(rawSearch, pivotCache)} ${this.constructFieldString()}`;

        return {
            searchQuery: query,
            searchParams: {earliest_time: '-1y'},
        };
    }
});

export const expandIDSDemo = new SplunkPivot({
    id: 'expand-ids-botnet-demo',
    name: 'Expand with IDS/IPS',
    tags: ['Demo'],
    pivotParameterKeys: ['pRef', 'fields'],
    pivotParametersUI: {
        pRef: {
            inputType: 'pivotCombo',
            label: 'Any IP in:',
        },
        fields: {
            inputType: 'multi',
            label: 'Expand on',
            options: FIELDS.map(x => ({id:x, name:x})),
        }

    },
    connections: [ 'Internal IPs', 'Message' ],
    encodings: alertDemoEncodings,
    toSplunk: function (pivotParameters, pivotCache) {
        const refPivot = pivotParameters.pRef.value[0];
        const rawSearch =
            `[{{${refPivot}}}] -[${pivotParameters.fields.value.join(', ')}]-> [${splunkIndices.IDS}]`;
        const query = `search ${this.expandTemplate(rawSearch, pivotCache)} ${this.constructFieldString()}`;

        return {
            searchQuery: query,
            searchParams: {earliest_time: '-1y'},
        };
    }
});
