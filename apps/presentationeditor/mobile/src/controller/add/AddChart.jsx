import React, {Component} from 'react';
import { f7 } from 'framework7-react';
import {Device} from '../../../../../common/mobile/utils/device';

import AddChart from '../../view/add/AddChart';

class AddChartController extends Component {
    constructor (props) {
        super(props);
        this.onChartClick = this.onChartClick.bind(this);
    }

    closeModal () {
        if ( Device.phone ) {
            f7.sheet.close('.add-popup', true);
        } else {
            f7.popover.close('#add-popover');
        }
    }

    onChartClick (type) {
        const api = Common.EditorApi.get();
        api.asc_addChartDrawingObject(type, undefined, true);
        this.closeModal();
    }

    render () {
        return (
            <AddChart onChartClick={this.onChartClick} />
        )
    }
}

export default AddChartController;
