import React from 'react';
import {observer, inject} from "mobx-react";

const AddChart = props => {
    const storeChartSettings = props.storeChartSettings;
    const types = storeChartSettings.types;
    return (
        <div className={'dataview chart-types'}>
            {types && types.map((row, indexRow) => {
                return (
                    <ul className="row" key={'chart-row-' + indexRow}>
                        {row.map((chartType, index) => {
                            return (
                                <li key={'chart-' + indexRow + '-' + index} onClick={() => {props.onInsertChart(chartType.type)}}>
                                    <div className="thumb"
                                         style={{backgroundImage: `url('resources/img/charts/${chartType.thumb}')`}}></div>
                                </li>
                            )
                        })}
                    </ul>
                )
            })}
        </div>
    )
};

export default inject("storeChartSettings")(observer(AddChart));
