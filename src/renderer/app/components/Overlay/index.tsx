import { observer } from 'mobx-react';
import * as React from 'react';

import store from '../../store';
import { remote } from "electron";
import { Client } from 'discord-rpc';
import {
  StyledOverlay,
  HeaderText,
  HeaderArrow,
  Scrollable,
  Title,
  Content,
  Container,
  Image,
  Dot,
  Preloader,
  Panel,
} from './style';
import { SearchBox } from '../SearchBox';
import { TabGroups } from '../TabGroups';
import { WeatherCard } from '../WeatherCard';
import { NewsCard } from '../NewsCard';
import { History } from '../History';
import { Bookmarks } from '../Bookmarks';
import { AdBlock } from '../AdBlock';
import { Settings } from '../Settings';
import { Extensions } from '../Extensions';
import { Preload } from '../Preload';
import { Dial } from '../Dial';
import { Snackbar } from '../Snackbar';
import { QuickMenu } from '../QuickMenu';
import { DownloadsSection } from '../DownloadsSection';
import { icons } from '../../constants';
import { Menu, MenuItem } from 'nersent-ui';
import { resolve } from 'path';
import { platform, homedir } from 'os';
const editJsonFile = require("edit-json-file");

import console = require('console');

// FCM Notifcation Handler
import { ipcRenderer } from 'electron';

let file = editJsonFile(`${remote.app.getPath('userData')}/dot/dot-options.json`);

const {
  START_NOTIFICATION_SERVICE,
  NOTIFICATION_SERVICE_STARTED,
  NOTIFICATION_SERVICE_ERROR,
  NOTIFICATION_RECEIVED,
  TOKEN_UPDATED,
} = require ('electron-push-receiver/src/constants')

// Listen for service successfully started
ipcRenderer.on(NOTIFICATION_SERVICE_STARTED, (_: any, token: any) => {
  console.log(`[FCMNS] The Firebase Cloud Messaging service has been launched using token ${token}`)
  ipcRenderer.send('fcm-ready', { token: token })
})

// Handle notification errors
ipcRenderer.on(NOTIFICATION_SERVICE_ERROR, (_: any, error: any) => {
  console.error(`[FCMNS] Notification error: ${error}`)
})

// Send FCM token to backend
ipcRenderer.on(TOKEN_UPDATED, (_: any, token: any) => {
  console.log(`[FCMNS] Token has been updated ${token}`)
})

// Display notification
ipcRenderer.on(NOTIFICATION_RECEIVED, (_: any, serverNotificationPayload: any) => {
  // check to see if payload contains a body string, if it doesn't consider it a silent push
  if (serverNotificationPayload.notification.body){
    // payload has a body, so show it to the user
    console.log(`[FCMNS] Recieved a notification from ${serverNotificationPayload.from}`, serverNotificationPayload)
    let myNotification = new Notification(serverNotificationPayload.notification.title, {
      body: serverNotificationPayload.notification.body
    })
    
    myNotification.onclick = () => {
      console.log('Notification clicked')
    }  
  } else {
    // payload has no body, so consider it silent (and just consider the data portion)
    console.log('do something with the key/value pairs in the data', serverNotificationPayload.data)
  }
})

//Discord Rich Presence
const clientId = '565573138146918421';

const rpclient = new Client({ transport: 'ipc'});
const startTimestamp = Math.round(+new Date()/1000)

window.onbeforeunload = () => {
  rpclient.destroy()
}

async function setActivity() {
  if (!rpclient) {
    return;
  }
  try {
    var details = 'Browsing on';

    if(store.tabs.selectedTab.audioPlaying == true) {
      details = 'Listening to audio on'
    }
    
    var state = store.tabs.getHostname(store.tabs.selectedTab.url);
    var largeImageKey = 'dlogo';
    var smallImageKey = 'dot-online';
    var smallImageText = `Browsing a webpage`;
  } catch(e) {
    var details = 'Dot Browser';
    var state = 'Idle';
    var largeImageKey = 'dlogo';
    var smallImageKey = 'dot-idle';
    var smallImageText = 'Idle';
  }
  rpclient.setActivity({
    details: details,
    state: state,
    startTimestamp,
    largeImageKey,
    smallImageKey,
    largeImageText: `Dot Browser ${remote.app.getVersion()}`,
    smallImageText,
    instance: false
  })
};

rpclient.on('ready', () => {
  // if(file.get("discordRichPresenceEnabled") == true) {
    setActivity();

    setInterval(() => {
      setActivity();
    }, 3e3);
  // }
});

rpclient.login({ clientId }).catch(console.error);
//Discord Rich Presence

store.downloads.load()

export const Header = ({ children, clickable }: any) => {
  return (
    <HeaderText clickable={clickable}>
      {children}
      {clickable && <HeaderArrow />}
    </HeaderText>
  );
};

const onClick = () => {
  if (store.tabGroups.currentGroup.tabs.length > 0) {
    store.overlay.visible = false;
  }
  store.overlay.dialTypeMenuVisible = false;
  store.user.menuVisible = false;
};

export const preventHiding = (e: any) => {
  e.stopPropagation();
  store.overlay.dialTypeMenuVisible = false;
  store.user.menuVisible = false;
  document.getElementById("search-engine-dp").style.opacity = "0";
  document.getElementById("search-engine-dp").style.pointerEvents = "none";
  store.bookmarks.menuVisible = false;
};

store.user.loadProfile()

const LoginSnackbar = () => {
  return (
    <Snackbar visible={store.user.loggedin == true}>
      Welcome back, {store.user.username}
    </Snackbar>
  )
};

interface Props {
  children: any;
}

const CardWrapper = observer(({ children }: Props) => {
  return (
    <div style={{ display: 'flex' }}>
      {children}
    </div>
  );
});

export const Overlay = observer(() => {

  return (
    <StyledOverlay visible={store.overlay.visible} onClick={onClick}>
      <Preload/>
      {store.user.loggedin == true && <LoginSnackbar />}
      <Container
        visible={
          store.overlay.currentContent === 'default' && store.overlay.visible
        }
      >
        <Scrollable ref={store.overlay.scrollRef} id="home">
          <Content>
            <Image src={icons.logo} center style={{ width: '250px' }}></Image>
            <SearchBox />
            <Dial />

            <Title>Overview</Title>
            <TabGroups />
            {store.downloads.list.length > 0 && <DownloadsSection />}
            <QuickMenu />
            <Title>World</Title>
            <CardWrapper>
              <WeatherCard />
              <NewsCard newsImage={"https://ichef.bbci.co.uk/news/660/cpsprodpb/15D32/production/_107449398_gettyimages-1146471727.jpg"} />
            </CardWrapper>
          </Content>
        </Scrollable>
      </Container>
      <History />
      <Bookmarks />
      <Extensions />
      <Settings />
      <AdBlock />
    </StyledOverlay>
  );
});

const senderId = '534960319282'
console.log("[FCMNS] Started service");
ipcRenderer.send(START_NOTIFICATION_SERVICE, senderId)
