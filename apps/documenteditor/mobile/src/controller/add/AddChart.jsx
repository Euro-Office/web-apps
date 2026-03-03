import React, {Component} from 'react';
import { f7 } from 'framework7-react';
import {Device} from '../../../../../common/mobile/utils/device';

import AddChart from '../../view/add/AddChart';

class AddChartController extends Component {
    constructor (props) {
        super(props);
        this.onInsertChart = this.onInsertChart.bind(this);
    }

    closeModal () {
        if ( Device.phone ) {
            f7.sheet.close('.add-popup', true);
        } else {
            f7.popover.close('#add-popover');
        }
    }

    onInsertChart (type) {
        const api = Common.EditorApi.get();
        api.asc_addChartDrawingObject(type, undefined, true);
        this.closeModal();
    }

    render () {
        return (
            <AddChart onInsertChart={this.onInsertChart} />
        )
    }
}

export default AddChartController;
