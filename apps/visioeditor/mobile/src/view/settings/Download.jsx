import React from 'react';
import { Page, Navbar, List, ListItem, BlockTitle, Icon } from "framework7-react";
import { useTranslation } from "react-i18next";
import SvgIcon from '@common/lib/component/SvgIcon';
import SvgPdf from '@common-icons/formats/pdf.svg';
import SvgPdfa from '@common-icons/formats/pdfa.svg';

const Download = props => {
    const { t } = useTranslation();
    const _t = t("View.Settings", { returnObjects: true });

    return (
        <Page>
            <Navbar title={_t.textDownload} backLink={_t.textBack} />
            <BlockTitle>{_t.textDownloadAs}</BlockTitle>
            <List>
                <ListItem title="VSDX" onClick={() => props.onSaveFormat(Asc.c_oAscFileType.VSDX)}>
                    <Icon slot="media" icon="icon-format-vsdx"></Icon>
                </ListItem>
                <ListItem title="PDF" onClick={() => props.onSaveFormat(Asc.c_oAscFileType.PDF)}>
                    <SvgIcon slot="media" symbolId={SvgPdf.id} className={'icon icon-svg'} />
                </ListItem>
                <ListItem title="PDF/A" onClick={() => props.onSaveFormat(Asc.c_oAscFileType.PDFA)}>
                    <SvgIcon slot="media" symbolId={SvgPdfa.id} className={'icon icon-svg'} />
                </ListItem>
            </List>
        </Page>
    )
}

export default Download;