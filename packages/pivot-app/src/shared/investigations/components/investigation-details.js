import Select from 'react-select';
import { layouts } from '../../services/layouts';
import styles from './investigation-details.less';
import { DescriptionFormControl } from 'pivot-shared/components';
import {
    Col, Panel, ControlLabel,
    Form, FormGroup//, FormControl
} from 'react-bootstrap';

export function InvestigationDetails({ layout, saveLayout, $falcor, description = '' }) {
    return (
        <Panel collapsible
               className={styles['investigation-details']}
               header={
                   <p className={styles['investigation-details-header']}>
                       <span>
                           Investigation Details
                           <i className={`fa fa-fw ${styles['fa-caret']}`}/>
                        </span>
                   </p>
               }>
            <form>
                <FormGroup controlId='investigation-description'>
                    <ControlLabel>Description</ControlLabel>
                    <DescriptionFormControl $falcor={$falcor}
                                            description={description}/>
                </FormGroup>
                <Form componentClass='fieldset' horizontal>
                    <FormGroup controlId='investigation-layout'>
                        <Col xs={4} componentClass={ControlLabel}>
                            Graph Layout:
                        </Col>
                        <Col xs={8}>
                            <Select
                                value={layout}
                                clearable={false}
                                name='layout-selector'
                                className={styles['layout-picker']}
                                onChange={({ value }) => saveLayout({layoutType: value})}
                                options={layouts.filter(({ id }) => id !== 'insideout').map(({ id, friendlyName }) => ({
                                    value: id, className: id, label: friendlyName
                                }))}
                            />
                        </Col>
                    </FormGroup>
                {/*
                    <FormGroup controlId='investigation-time-range'>
                        <Col xs={4} componentClass={ControlLabel}>
                            Date & Time Range:
                        </Col>
                        <Col xs={8}>
                            <FormControl type='text' />
                        </Col>
                    </FormGroup>
                */}
                </Form>
            </form>
        </Panel>
    );
}
