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

import {Component, OnDestroy} from '@angular/core';

import {TeonetCli, Teonet, onotherData, onechoData} from './teocli.module';
import {IntervalObservable} from 'rxjs/observable/IntervalObservable';

export type onclientDisplArEl = {name: string, translate: string, email: string, type: string, time: number};
export type onclientDisplAr = Array<onclientDisplArEl>;
//type onclientsDataAr = Array<{name: string}>;
//type onclientsData = {
//  cmd: number,
//  from: string,
//  data: {
//    length: number,
//    client_data_ar: onclientsDataAr
//  }
//};

export class TeonetPeersRequest {

  constructor(private t: TeonetCli) {}

//  /**
//   * Send user info request
//   *
//   * @param {string} name Clients accessToken
//   * @returns {undefined}
//   */
//  sendUserInfo (name: string) {
//
//    //console.debug("TeonetCli.send_user_info_request", name);
//
//    //if(teocli !== undefined)
//    this.t.send('{ "cmd": 132, "to": "' + Teonet.peer.auth + '", "data": ["' + name + '"] }');
//  }
//
//  /**
//   * Send clients info request
//   *
//   * @param {type} client
//   * @returns {undefined}
//   */
//  sendClientInfo(client: string) {
//
//    //console.debug("ClientsController.send_client_info_request", client);
//
//    //if(teocli !== undefined)
//    this.t.send('{ "cmd": 134, "to": "' + Teonet.peer.auth + '", "data": ["' + client + '"] }');
//  }

}

@Component({
  selector: 'teonet-peers',
  styles: ['\n\
  .border-right {\n\
    border-right: solid 1px #eee;\n\
  }\n\
  .header {\n\
    border: solid 1px #eee;\n\
  }\n\
  '],
  template: '\n\
    <div class="row item-divider item header toolbar-background-md">\n\
      <div class="col border-right" col-1>№</div>\n\
      <div class="col border-right">Name</div>\n\
      <div class="col border-right">Type</div>\n\
      <div class="col border-right">Version</div>\n\
      <div class="col" text-right>Ping</div>\n\
    </div>\n\
    \n\
    <div class="content">\n\
      <div class="teonet-clients-body row item {{ (i%2 ? \'toolbar-background-md\' : \'\') }}" \n\
        *ngFor="let client of clients; index as i; first as isFirst">\n\
        <div class="col border-right" col-1>{{i+1}}</div>\n\
        <div class="col border-right"><a href="#">{{client.name | slice:0:15}}</a></div>\n\
        <div class="col border-right">{{(client.type ? client.type : "") | slice:0:15}}</div>\n\
        <div class="col border-right">0.0.1</div>\n\
        <div class="col" col-2 text-right>{{client.triptime}}</div>\n\
      </div>\n\
    </div>\n\
    \n'
//    <div class="row text-center padding" [hidden]="clients.length">\n\
//      <ion-col col-1><ion-spinner icon="lines"></ion-spinner></ion-col>\n\
//      <ion-col class="padding">Clients loading...</ion-col>\n\
//    </div>\n\
})

/**
 * Peers class
 */
export class TeonetPeers implements OnDestroy {

  n: number = 0;
//  tabIndex: number;
  clients: onclientDisplAr = [];

  private f: Array<any> = [];
  private onpeers: any;
//  private cli = new TeonetClientsTranslate(this.t);
  
  private interval = IntervalObservable.create(1000).subscribe(() => { //.subscribe(n => this.n = n);
    this.n++;
    if (this.isComponentActive()) this.t.peers(Teonet.peer.l0);
  });

  constructor(private t: TeonetCli) {
    console.log('TeonetPeers::constructor');
    this.f.push(t.whenEvent('onpeers', (data: any): number => {
      console.log('TeonetPeers::constructor: onpeers',data);
      this.clients = data[0][0].data.arp_data_ar;
      if (this.onpeers) this.onpeers();
      return 0;
    }));
    this.t.peers(Teonet.peer.l0);
  }

  ngOnDestroy() {
    for (let f of this.f) this.t.unsubscribe(f);
    this.interval.unsubscribe();
  }

  setOnpeers(onpeers: any) {
    this.onpeers = onpeers;
  }
  
  private isComponentActive(): boolean {
    return this.t.isTeonetClientsActive();
  }

}

/**
 * Number of loggedin clients
 */
//export class TeonetClientsNum implements OnDestroy {
//
//  num_clients = 0;
//  private f: Array<any> = [];
//
//  constructor(public t: TeonetCli) {
//
//    //console.debug('TeonetClientsNum::constructor');
//
//    this.f.push(t.whenInit(() => {
//      //console.debug('TeonetClientsNum::whenInit');
//      // Send clients number request command to "teo-web" peer
//      this.sendClientsNum();
//    }));
//
//    this.f.push(t.whenEvent('onother', (data: any): number => {
//      let d: onotherData = data[0][0];
//      if(d.from == Teonet.peer.l0) {
//        //console.debug('TeonetClientsNum::onother', data, d);
//        // Process clients number responces
//        this.processClientsNum(d);
//      }
//      return 0;
//    }));
//  }
//
//  ngOnDestroy() {
//    //console.debug('TeonetClientsNum::destructor');
//    for (let f of this.f) this.t.unsubscribe(f);
//    this.sendClientsMumUnsubscribe();
//    this.num_clients = 0;
//  }
//
//  /**
//   * Get clients number answer callback function
//   *
//   * @param {onotherData} data
//   * @returns {number}
//   */
//  private processClientsNum(data: onotherData) {
//
//    let processed = 0;
//    let client = "";
//    let client_code = "";
//    let clientsNumber = this.num_clients;
//
//    // Process command #85 CMD_L0_CLIENTS_N_ANSWER
//    if (data.cmd === 85) {
//
//      type CMD_L0_CLIENTS_N_ANSWER = {numClients: number};
//
//      //console.debug("TeonetClientsNum::processClientsNum, data:", data);
//
//      clientsNumber = (<CMD_L0_CLIENTS_N_ANSWER> data.data).numClients;
//      this.sendClientsNumSubscribe();
//      processed = 1;
//    }
//
//    // Process command #83 CMD_SUBSCRIBE_ANSWER
//    else if (data.cmd === 83) {
//
//      type CMD_SUBSCRIBE_ANSWER = {ev: number, cmd: number, data: string}
//
//      let byteCharacters = atob((<CMD_SUBSCRIBE_ANSWER> data.data).data);
//      for (let i = 0; i < (byteCharacters.length); i++) {
//        client_code += byteCharacters.charCodeAt(i) + '.';
//      }
//
//      client = atob((<CMD_SUBSCRIBE_ANSWER> data.data).data);
//
//      // L0 client Connected
//      if ((<CMD_SUBSCRIBE_ANSWER> data.data).ev === 21) {
//        if (byteCharacters.charCodeAt(0)) clientsNumber += 1;
//        processed = 1;
//      }
//
//      // L0 client Disconnected
//      else if ((<CMD_SUBSCRIBE_ANSWER> data.data).ev === 22) {
//        clientsNumber -= 1;
//        processed = 1;
//      }
//    }
//
//    if (processed) {
//      //console.debug("TeonetClientsNum::processClientsNum, data:",
//      //  data, "client:", client, "client_code:", client_code);
//      this.num_clients = clientsNumber;
//    }
//
//    return processed;
//  }
//
//  /**
//   * Send clients number request
//   *
//   * @returns {undefined}
//   */
//  private sendClientsNum() {
//
//    // Send clients number request
//    this.t.send('{ "cmd": 84, "to": "' + Teonet.peer.l0 + '", "data": "JSON" }');
//  }
//
//  /**
//   * Send subscribe to connect / disconnect client events request
//   *
//   * @returns {undefined}
//   */
//  private sendClientsNumSubscribe() {
//
//    // Send CMD_SUBSCRIBE Subscribe to L0 client Connected / Disconnected
//    this.t.send('{ "cmd": 81, "to": "' + Teonet.peer.l0 + '", "data": "TEXT:21" }');
//    this.t.send('{ "cmd": 81, "to": "' + Teonet.peer.l0 + '", "data": "TEXT:22" }');
//  }
//
//  /**
//   * Request unsubscribe from Connected / Disconnected events
//   *
//   * @returns {undefined}
//   */
//  private sendClientsMumUnsubscribe() {
//
//    // Send CMD_SUBSCRIBE UnSubscribe to L0 client Connected / Disconnected
//    if (this.t && this.t.isInit()) {
//      this.t.send('{ "cmd": 82, "to": "' + Teonet.peer.l0 + '", "data": "TEXT:21" }');
//      this.t.send('{ "cmd": 82, "to": "' + Teonet.peer.l0 + '", "data": "TEXT:22" }');
//    }
//  }
//}

//export type TeonetUserInfo = {
//  userId: string,
//  username: string,
//  email: string
//};
//export type TeonetClientInfo = {
//  clientId: string,
//  registerDate: Date,
//  data: {
//    type: string;
//  }
//};

///**
// * Class to translate user and clien from code to human name (from teonet)
// */
//export class TeonetClientsTranslate implements OnDestroy {
//
//  //private f: Array<any> = [];
//  private cli = new TeonetClientsRequest(this.t);
//  private TIMEOUT = 3000;
//
//  // Register to TeonetCli onother event
//  constructor(private t: TeonetCli) {
//    //
//  }
//
//  ngOnDestroy() {
//    //
//  }
//
//  private setTimeout(f: any, done: any) {
//    return setTimeout(()=>{
//      done('Timeout');
//      this.t.unsubscribe(f);
//    }, this.TIMEOUT);
//  }
//
//  splitName(name: string): { user: string, client: string } {
//    let name_split = name.split(':');
//    return { user: name_split[0], client: name_split[1] };
//  }
//
//  private getInfo(id: string, type: boolean,
//    done: (err: any, info?: TeonetUserInfo | TeonetClientInfo) => void) {
//
//    let f = this.t.whenEvent('onother', (data: any): number => {
//      var d: onotherData = data[0][0];
//      // Process ansewers from teo-auth
//      if (d.from == Teonet.peer.auth) {
//        // Process user_info # 133
//        if (!type && d.cmd == 133) {
//          let user: TeonetUserInfo = d.data;
//          if (id == user.userId) _done(user);
//        }
//        // Process client_info # 135
//        else if (type && d.cmd == 135) {
//          let client: TeonetClientInfo = d.data;
//          if (id == client.clientId) _done(client);
//        }
//      }
//      return 0;
//    }),
//    timer = this.setTimeout(f, done),
//    _done = (arg: any) => {
//      this.t.unsubscribe(f);
//      clearTimeout(timer);
//      done(null, arg);
//    }
//
//    if(!type) this.cli.sendUserInfo(id);
//    else this.cli.sendClientInfo(id);
//  }
//
//  getUserInfo(user_id: string, done: (err: any, user?: TeonetUserInfo) => void) {
//    this.getInfo(user_id, false, done);
//  }
//
//  getClientInfo(client_id: string, done: (err: any, client?: TeonetClientInfo) => void) {
//    this.getInfo(client_id, true, done);
//  }
//}
