/*
 * The MIT License
 *
 * Copyright 2017 Kirill Scherba <kirill@scherba.ru>.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import { Injectable } from '@angular/core';
import { TeonetAuth } from './teocli.auth';
import { TeocliRTC } from './teocli.webrtc2';

export interface TeonetEventType {
  TEONET_INIT: string,
  TEONET_LOGGEDIN: string,
  TEONET_CLOSE: string
};

export type eventSubscribersFunc = (event: string, ...obj: object[]) => number;
export type onotherData = {
  cmd: number,
  from: string,
  data: any
};
export type onechoData = {
  cmd: number,
  from: string,
  data: {
    msg: string,
    time: number
  }
};

export const Teonet = {
  peer: {
    l0: 'ps-server',
    auth: 'teo-auth'
  },
  status: {
    offline: 0,
    connecting: 1,
    logining: 2,
    online: 3
  }
}

@Injectable()
export class TeonetCli extends TeocliRTC {

  status: number;
  protected client_name: string;
  private connect_url: string;
  private inited: boolean;
  private RECONNECT_TIMEOUT: number;
  private INIT_TIMEOUT: number;
  private isTeonetClientsActiveFunc: () => boolean;
  private eventSubscribers: Array<eventSubscribersFunc>;
  private login_page: any;
  private signup_page: any;
  private restore_page: any;  
  static EVENT: TeonetEventType = {
    TEONET_INIT: 'teonet-init',
    TEONET_CLOSE: 'teonet-close',
    TEONET_LOGGEDIN: 'teonet-loggedin'
  };

  constructor() {

    console.debug("TeonetCli::constructor");
    var connect_url = 'ws://' + 'teomac.ksproject.org:80' + '/ws';
    var ws = new WebSocket(connect_url);
    super(ws);
    this.status = Teonet.status.connecting
    this.isTeonetClientsActiveFunc = () => {return true;};
    this.connect_url = connect_url;
    this.RECONNECT_TIMEOUT = 1000;
    this.INIT_TIMEOUT = 7000;
    this.inited = false;
    this.eventSubscribers = [];
    this.ws = ws;
    this.init();
  }

  private init(): void {

    let authserver = new TeonetAuth(this);

    // When connected to websocket
    this.onopen = (ev) => {
      console.debug("TeonetCli::teocli.onopen");

      // Prepare client name
      this.status = Teonet.status.logining;
      if (!this.client_name) {
        // Get name from local storage
        let user = authserver.storage.get();
        console.debug("TeonetCli::init user", user);
        if (user.remember_me && user.accessToken) {
          this.setClientName(user.accessToken);
        }
        // Set temporary name
        else {
          this.setClientName('teo-cli-ts-ws-' + Math.floor((Math.random() * 100) + 1));
        }
      }
      
      // Send login command to teonet L0 server
      this.login(this.client_name);
      
      // Set reconnect timeout (reconnect if does not login during timeout
      setTimeout(() => {
        if (!this.isInit()) {
          console.debug("TeonetCli::teocli.onopen can't login - disconnect");
          this.disconnect();
        }
      }, this.INIT_TIMEOUT);
    };

    // When disconnect from web socket (reconnect)
    // Send 'teonet-close' to subscribers
    this.onclose = (ev) => {
      console.debug("TeonetCli::teocli.onclose");
      // Reconnect after timeout
      setTimeout(() => {
        delete this.ws;
        this.status = Teonet.status.connecting;
        this.ws = new WebSocket(this.connect_url);
        this.ws.onopen = this.onopen;
        this.ws.onclose = this.onclose;
        this.ws.onerror = this.onerror;
        this.ws.onmessage = (ev) => {
          if (!this.process(ev.data)) {
            //if (typeof this.onmessage === 'function') {
            //    this.onmessage(ev);
            //}
          }
        };
      }, this.RECONNECT_TIMEOUT);
      this.sendEvent(TeonetCli.EVENT.TEONET_CLOSE);
      this.status = Teonet.status.offline;
      this.inited = false;
    };

    // When get websocket error
    this.onerror = function (ev) {};

    // When get 'onother' message fom webspcket. Check cmd 96 - teo-auth answer
    // Send 'teonet-init' to subscribers
    // Send 'onother' to subscribers
    this.onother = (err, data: object) => {

      console.debug("TeonetCli::onother", err, data);

      var processed = 0;
      var d = <onotherData> data;

      // Check login answer
      if (d && d.cmd === 96) {
        console.debug("TeonetCli:: Got check login answer", d);

        // Set name
        this.setClientName(d.data.name);

        // Get user from storage
        const user = authserver.storage.get();

        // Send teocli-init event
        const sendEventInit = (loggedin = false) => {
          this.sendEvent(TeonetCli.EVENT.TEONET_INIT);
          this.status = Teonet.status.online;
          this.inited = true;
          if(loggedin) this.sendEvent(TeonetCli.EVENT.TEONET_LOGGEDIN);
          //$rootScope.networksItems = data.data.networks;
        };

        // Login success
        if (this.getClientName() == user.userId + ':' + user.clientId) {
          sendEventInit(true);
        }
        
        else {
          // Login with saved email and password if remember_me is set
          if (user.remember_me) {
            //authserver.refresh(); // refresh auth token
            authserver.login(user.email, authserver.base64.decode(user.password), 
              (err: any, response: any) => {
                if (err) {
                  // Goto Login screen
                  sendEventInit();
                  this.loginPage();
                }
                else {
                  // Reconect with new client name
                  this.setClientName(authserver.getUser().accessToken);
                  this.disconnect();
                }
              }
            );
          }
          // Goto Login page
          else {            
            sendEventInit();
            this.loginPage();
          }
        }
        processed = 1;
      }

      if (!processed) this.sendEvent('onother', data);

      return processed;
    }

    // Send 'onecho' to subscribers
    this.onecho = (err, data: object) => {
      console.debug("TeonetCli::onecho", err, data);
      this.sendEvent('onecho', data);
      return 1;
    }

    // Send 'onclients' to subscribers
    this.onclients = (err, data: object) => {
      console.debug("TeonetCli::onclients", err, data);
      this.sendEvent('onclients', data);
      return 1;
    }
  }

  /**
   * Disconnect TeonetCli
   *
   */
  disconnect(): void {
    super.disconnect();
    this.ws.close();
  }

  /**
   * Sel login page
   */
  setLoginPage(func:()=>void) {
    this.login_page = func;
  }

  /**
   * Load Login page
   */
  loginPage(push: boolean = undefined) {
    if (this.login_page) this.login_page(push);
    else {
      alert('TODO: Login page is udefined!');
    }
  }
  
  /**
   * Sel SignUp page
   */
  setSignupPage(func:()=>void) {
    this.signup_page = func;
  }
  
  /**
   * Load SignUp page
   */
  signupPage(push: boolean = undefined) {
    if (this.signup_page) this.signup_page(push);
    else {
      alert('TODO: SignUp page is udefined!');
    }
  }
  
  /**
   * Sel Restore page
   */
  setRestorePage(func:()=>void) {
    this.restore_page = func;
  }

  /**
   * Load Restore page
   */
  restorePage(push: boolean = undefined) {
    if (this.restore_page) this.restore_page(push);
    else {
      alert('TODO: Restore page is udefined!');
    }
  }
  
  /**
   * Is TeonetCli connected and initialized
   *
   * @returns {boolean} True if connected and initialized
   */
  isInit(): boolean {
    return this.inited;
  }

  /**
   * Get teonet status
   *
   * @return {number} Teonet status
   */
  getStatus(): number {
    return this.status;
  }

  /**
   * Get client name
   *
   * @return {string} Teonet client name
   */
  getClientName(): string {
    return this.client_name;
  }

  /**
   * Set client name
   *
   * @return {string} Teonet client name
   */
  setClientName(name: string = '') {
    this.client_name = name;
  }

  /**
   * Subscribe to even
   *
   * @param {eventSubscribersFunc} func
   */
  subscribe(func: eventSubscribersFunc) {
    this.eventSubscribers.push(func);
    return func;
  }

  /**
   * Unsubscribe from event
   * 
   * @param {eventSubscribersFunc} func
   */
  unsubscribe(func: eventSubscribersFunc): void {
    this.eventSubscribers = this.eventSubscribers.filter(f => f !== func);
  }

  /**
   * Send event to Event Subscriber
   *
   * @param {string} ev Event name
   * @param {object[]) ...obj Objects send to subscribers
   */
  sendEvent(ev: string, ...obj: object[]): void {
    for (var func of this.eventSubscribers) {
      func(ev, obj);
    }
  }

  whenEvent(event: string, func: (...obj: object[]) => number) {
    return this.subscribe((ev: string, ...obj: object[]): number => {
      if (ev == event) {
        func(obj);
      }
      return 0;
    });
  }

  whenInit(func: () => void) {
    if (this.isInit()) func();
    return this.whenEvent(TeonetCli.EVENT.TEONET_INIT, () => {
      func();
      return 0;
    });
  }

  whenClose(func: () => void) {
    return this.whenEvent(TeonetCli.EVENT.TEONET_CLOSE, () => {
      func();
      return 0;
    });
  }

  isTeonetClientsActive() {
    return this.isTeonetClientsActiveFunc();
  }

  setTeonetClientsActive(func: () => boolean) {
    this.isTeonetClientsActiveFunc = func;
  }
};


import {Component} from '@angular/core';
import {AfterContentInit} from '@angular/core';
import {IntervalObservable} from 'rxjs/observable/IntervalObservable';

import {TeonetClientsNum} from './teocli.clients';

@Component({
  selector: 'teonet-status',
  inputs: ['peer', 'label', 'show_peer', 'reconnect'],
  styles: ['\n\
    .teonet-status { \n\
        opacity: 0.85;\n\
        position: absolute;\n\
        right: 10px;\n\
        top: 10px;\n\
        /*font-size: 60%;*/\n\
    }\n\
    /deep/ ion-nav.menu-content-open + teonet-status {\n\
        display: none;\n\
    }\n\
    /deep/ ion-app.platform-ios .teonet-status {\n\
        top: 22px;\n\
    }\n\
    .teonet-status-no-badge {\n\
        top: 3px;\n\
    }\n\
    /deep/ ion-app.platform-ios .teonet-status-no-badge {\n\
        top: 35px;\n\
    }\n\
    /deep/ ion-app.platform-android .teonet-status-no-badge {\n\
        top: 20px;\n\
    }\n\
    .teonet-status-badge {\n\
        position: absolute;\n\
        bottom: -15px;\n\
        right: 0;\n\
        font-size: 70%;\n\
    }\n\
    .teonet-badge {\n\
        padding: 3px 8px;\n\
        text-align: center;\n\
        display: inline-block;\n\
        min-width: 10px;\n\
        /* font-size: 1.3rem; */\n\
        font-weight: bold;\n\
        line-height: 1;\n\
        white-space: nowrap;\n\
        vertical-align: baseline;\n\
    }\n\
  '],
  template: '\n\
    <span class="teonet-status \n\
                 text-md-{{ getStatusColor(t.status) }}\n\
                 {{ (!ifPeer(peer) ? \' teonet-status-no-badge\' : \'\') }}">\n\
          {{\n\
            (ifOnline() ? label + " " : "") + \n\
            getStatusText(t.status) + \n\
            (ifOnline() && tcli.num_clients ? ": " + tcli.num_clients : "")\n\
          }}\n\
          <div *ngIf="ifPeer(peer)"\n\
            class="teonet-badge teonet-status-badge badge-md\n\
                   badge-md-{{ time >= 0 ? \'secondary\' : \'danger\'}}"\n\
            >\n\
              {{\n\
                (peer && show_peer == "true" ? (peer | titlecase) + ": " : "") + \n\
                (time >= 0 ? time + " ms" : "offline")\n\
              }}\n\
          </div>\n\
    </span>'
})

/**
 * Show teonet connection status
 */
export class TeonetStatus implements AfterContentInit {

  peer: string = '';           //! Peer name Component input
  label: string = 'Teo is';    //! Label of state Component input
  reconnect: string = 'true';  //! Reconnect when peer don't answer
  show_peer: string = 'false'; //! Show peer name Component input

  tcli: TeonetClientsNum;      //! TeonetClientsNum object
  time: number = (this.t.status == Teonet.status.online) ? 0 : -1; //! Peer answer time in ms

  private last_answere = 0.00; //! Last peer answer time

  private SEND_ECHO_AFTER = 1.00;
  private SET_LOGOFF_AFTER = 2.00;
  private RECONNECT_AFTER = 15.00;

  /**
   * Constructor connect to Teonet and load TeonetClientsNum class
   */
  constructor(public t: TeonetCli) {
    console.debug('TeonetStatus::constructor, peer = ' + this.peer);
    this.tcli = new TeonetClientsNum(t);
  }

  /**
   * This function calls by angular after html content init
   */
  ngAfterContentInit() {
    console.debug('TeonetStatus::ngAfterContentInit, peer = ' + this.peer +
      ', reconnect: ' + this.reconnect);
    if (this.peer) {

      //Send ping to peer
      this.sendEcho();
      IntervalObservable.create(1000).subscribe(() => {
        if (this.t.isInit()) {
          let date = new Date();
          let current = date.valueOf() / 1000.0;
          if ((current - this.last_answere) > this.SEND_ECHO_AFTER) {
            this.sendEcho();
          }
          if (!this.last_answere) this.last_answere = current;
          if (this.time >= 0 && this.last_answere &&
            (current - this.last_answere) > this.SET_LOGOFF_AFTER) {
            console.debug('TeonetStatus::IntervalObservable - set "peer logoff"');
            this.time = -1;
          }
          if (this.last_answere &&
            (current - this.last_answere) > this.RECONNECT_AFTER &&
            this.reconnect == 'true') {
            console.debug('TeonetStatus::IntervalObservable' +
                        '- disconnect from teonet, ' +
                        '(current - this.last_answere) = ',
                        (current - this.last_answere)
            );
            this.last_answere = 0;
            this.t.disconnect();
          }
        }
        else this.time = -1;
      });

      // Process echo answer
      this.t.whenEvent('onecho', (data: any): number => {

        let d: onechoData = data[0][0];
        console.debug('TeonetStatus::onecho', data, d, 'this.peer:', this.peer);
        if (d.from == this.peer) {
          let date = new Date();
          this.time = d.data.time;
          this.last_answere = date.valueOf() / 1000.0;
          console.debug('TeonetStatus::onecho this.last_answere:', this.last_answere);
        }

        return 0;
      });
    }
  }

  /**
   * Send ping to peer
   */
  private sendEcho() {
    console.debug('TeonetStatus::sendEcho to peer: ' + this.peer);
    this.t.echo(this.peer, 'TeonetStatus');
  }

  /**
   * Return true if Teonet is online
   * @return {boolean}
   */
  ifOnline() {
    return this.t.status == Teonet.status.online;
  }

  /**
   * Return true if peer input is set
   *
   * @param {string} peer Peer name
   */
  ifPeer(peer: string) {
    if (peer) return true;
    else return false;
  }

  /**
   * Get  Teonet status color
   *
   * @param {number} Teonet status
   * @return Teonet status color string
   */
  getStatusColor(status: number): string {

    let color: string;

    switch (status) {

      case Teonet.status.offline:
        color = 'danger';
        break;

      case Teonet.status.connecting:
        color = 'dark';
        break;

      case Teonet.status.logining:
        color = 'primary';
        break;

      case Teonet.status.online:
        color = 'secondary';
        break;

      default:
        color = 'light';
    }

    return color;
  }

  /**
   * Get name of Teonet status
   *
   * @param {number} Teonet status
   * @return Teonet status string
   */
  getStatusText(status: number): string {

    let text: string;

    switch (status) {

      case Teonet.status.offline:
        text = 'Offline';
        break;

      case Teonet.status.connecting:
        text = 'Connecting...';
        break;

      case Teonet.status.logining:
        text = 'Logining';
        break;

      case Teonet.status.online:
        text = 'online';
        break;

      default:
        text = '';
    }

    return text;
  }
}
