import React, {Fragment, useState} from 'react';
import {Page, Navbar, BlockTitle, List, ListItem, ListInput, ListButton, Icon, Link, NavLeft, NavRight, NavTitle, f7} from 'framework7-react';
import { useTranslation } from 'react-i18next';
import {Device} from "../../../../../common/mobile/utils/device";
import SvgIcon from '@common/lib/component/SvgIcon';
import IconClose from '@common-android-icons/icon-close.svg';
import IconDone from '@common-android-icons/icon-done.svg';
import IconDoneDisabled from '@common-android-icons/icon-done-disabled.svg';


const PageTypeLink = ({curType, changeType, isNavigate}) => {
    const { t } = useTranslation();
    const _t = t('View.Add', {returnObjects: true});
    const [typeLink, setTypeLink] = useState(curType);

    return (
        <Page>
            <Navbar className="navbar-link-settings" title={_t.textLinkType} backLink={_t.textBack}>
                {Device.phone &&
                    <NavRight>
                        <Link icon='icon-close' popupClose={!isNavigate ? "#add-link-popup" : ".add-popup"}></Link>
                    </NavRight>
                }
            </Navbar>
            <List>
                <ListItem title={_t.textExternalLink} radio checked={typeLink === 'ext'} onClick={() => {setTypeLink('ext'); changeType('ext');}}></ListItem>
                <ListItem title={_t.textInternalDataRange} radio checked={typeLink === 'int'} onClick={() => {setTypeLink('int'); changeType('int');}}></ListItem>
            </List>
        </Page>
    )
};

const PageSheet = ({curSheet, sheets, changeSheet, isNavigate}) => {
    const { t } = useTranslation();
    const _t = t('View.Add', {returnObjects: true});
    const [stateSheet, setSheet] = useState(curSheet.type + '-' + curSheet.value);
    const sheetItems = sheets.filter(item => item.type === 'sheet');
    const definedNameItems = sheets.filter(item => item.type === 'name');
    const getLinkItem = item => (
        <ListItem key={`${item.type}-${item.value}`} title={item.caption} radio checked={stateSheet === item.type + '-' + item.value} onClick={() => {
                setSheet(item.type + '-' + item.value);
                changeSheet(item);
            }}
        />
    );

    return (
        <Page>
            <Navbar className="navbar-link-settings" title={_t.textLinkTo} backLink={_t.textBack}>
                {Device.phone &&
                    <NavRight>
                        <Link icon='icon-close' popupClose={!isNavigate ? "#add-link-popup" : ".add-popup"}></Link>
                    </NavRight>
                }
            </Navbar>
            {sheetItems.length > 0 && <BlockTitle>{_t.textSheets}</BlockTitle>}
            <List>
                {sheetItems.map(getLinkItem)}
            </List>
            {definedNameItems.length > 0 &&
                <Fragment>
                    <BlockTitle>{_t.textDefinedName}</BlockTitle>
                    <List>
                        {definedNameItems.map(getLinkItem)}
                    </List>
                </Fragment>
            }
        </Page>
    )
};

const AddLink = props => {
    const isIos = Device.ios;
    const { t } = useTranslation();
    const _t = t('View.Add', {returnObjects: true});
    const isNavigate = props.isNavigate;

    const [typeLink, setTypeLink] = useState('ext');
    const textType = typeLink === 'ext' ? _t.textExternalLink : _t.textInternalDataRange;
    const changeType = (newType) => {
        setTypeLink(newType);
    };

    const [link, setLink] = useState('');

    let displayText = props.displayText;
    const displayDisabled = displayText === 'locked';
    displayText = displayDisabled ? _t.textSelectedRange : displayText;
    
    const [stateDisplayText, setDisplayText] = useState(displayText);
    const [stateAutoUpdate, setAutoUpdate] = useState(!stateDisplayText ? true : false);
    const [screenTip, setScreenTip] = useState('');

    const activeSheet = props.activeSheet;
    const [curSheet, setSheet] = useState(activeSheet);
    const changeSheet = (sheet) => {
        setSheet(sheet);
    };

    const [range, setRange] = useState('');
    const isDefinedName = curSheet.type === 'name';
    const doneDisabled = typeLink === 'ext' && link.length < 1 || typeLink === 'int' && !isDefinedName && range.length < 1;

    return (
        <Page routes={props.routes}>
            <Navbar className="navbar-link-settings">
                <NavLeft>
                    <Link text={Device.ios ? t('View.Add.textCancel') : ''} onClick={() => {
                        isNavigate ? f7.views.current.router.back() : props.closeModal('#add-link-popup', '#add-link-popover');
                    }}>
                        {Device.android && 
                            <SvgIcon symbolId={IconClose.id} className={'icon icon-svg close'} />
                        }
                    </Link>
                </NavLeft>
                <NavTitle>{t('View.Add.textLinkSettings')}</NavTitle>
                <NavRight>
                    <Link className={`${doneDisabled && 'disabled'}`} onClick={() => {
                        props.onInsertLink(typeLink === 'ext' ?
                            {type: 'ext', url: link, text: stateDisplayText} :
                            {type: 'int', url: isDefinedName ? curSheet.value : range, sheet: isDefinedName ? null : curSheet.caption, text: stateDisplayText, isDefinedName});
                        }} text={Device.ios ? t('View.Add.textDone') : ''}>
                        {Device.android && ( 
                            doneDisabled ? 
                                <SvgIcon symbolId={IconDoneDisabled.id} className={'icon icon-svg inactive'} /> :
                                <SvgIcon symbolId={IconDone.id} className={'icon icon-svg active'} />
                        )}
                    </Link>
                </NavRight>
            </Navbar>
            <List inlineLabels className='inputs-list'>
                {props.allowInternal &&
                    <ListItem link={'/add-link-type/'} title={_t.textLinkType} after={textType} routeProps={{
                        changeType: changeType,
                        curType: typeLink,
                        isNavigate
                    }}/>
                }
                {typeLink === 'ext' &&
                    <ListInput 
                        label={_t.textLink}
                        type="text"
                        placeholder={_t.textRequired}
                        value={link}
                        onChange={(event) => {
                            setLink(event.target.value);
                                if(stateAutoUpdate && !displayDisabled) setDisplayText(event.target.value);
                            }}   
                    />
                }
                {typeLink === 'int' &&
                    <ListItem link={'/add-link-sheet/'} title={_t.textLinkTo} after={curSheet.caption} routeProps={{
                        changeSheet: changeSheet,
                        sheets: props.sheets,
                        curSheet: curSheet,
                        isNavigate
                    }}/>
                }
                {typeLink === 'int' && !isDefinedName &&
                    <ListInput label={_t.textRange}
                               type="text"
                               placeholder={_t.textRequired}
                               value={range}
                               onChange={(event) => {setRange(event.target.value)}}
                    />
                }
                <ListInput label={_t.textDisplay}
                           type="text"
                           placeholder={t('View.Add.textRecommended')}
                           value={stateDisplayText}
                           disabled={displayDisabled}
                           onChange={(event) => {
                                setDisplayText(event.target.value);
                                setAutoUpdate(event.target.value == ''); 
                            }}
                />
                <ListInput label={_t.textScreenTip}
                           type="text"
                           placeholder={_t.textScreenTip}
                           value={screenTip}
                           onChange={(event) => {setScreenTip(event.target.value)}}
                />
            </List>
        </Page>
    )
};

export {AddLink, PageTypeLink, PageSheet};