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

import {NgModule, Component, OnDestroy} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {TeonetCli, Teonet, onotherData, onechoData} from './teocli.module';
import {IntervalObservable} from 'rxjs/observable/IntervalObservable';

export type onclientDisplArEl = {name: string, translate: string, type: string, time: number};
export type onclientDisplAr = Array<onclientDisplArEl>;
type onclientsDataAr = Array<{name: string}>;
type onclientsData = {
  cmd: number,
  from: string,
  data: {
    length: number,
    client_data_ar: onclientsDataAr
  }
};
type userInfo = {
  userId: string,
  username: string,
  email: string
};
type clientInfo = {
  clientId: string,
  registerDate: Date,
  data: {
    type: string;
  }
};

@Component({
  selector: 'teonet-clients',
  //    template: "\n\
  //        <div>n = {{ n }}</div>\n\
  //        <div *ngFor='let client of clients; index as i; first as isFirst'>\n\
  //          {{i+1}}/{{clients.length}}. \n\
  //          {{ (client.translate ? client.translate : client.name) }} \n\
  //          {{ (client.type ? '(' + client.type + ')' : '') }} \n\
  //          {{ (client.time ? ' -- ' + client.time + ' ms' : '') }}\n\
  //        </div>"
  //
  //  No: {{i+1}}/{{clients.length}}
  styles: ['\n\
        .teonet-clients-body {\n\
            font-size: 85%;\n\
        }\n\
    '],
  template: '\n\
        <div class="row item item-divider toolbar-background-md">\n\
          <div class="col col-10" col-1>№</div>\n\
          <div class="col">User name</div>\n\
          <div class="col">Client type</div>\n\
          <div class="col col-20 text-right" col-2 text-right>Ping</div>\n\
        </div>\n\
        \n\
        <div class="teonet-clients-body row item" *ngFor="let client of clients; index as i; first as isFirst">\n\
          <div class="col col-10" col-1>{{i+1}}</div>\n\
          <div class="col"><a href="">{{(client.translate ? client.translate : client.name) | slice:0:15}}</a></div>\n\
          <div class="col">{{(client.type ? client.type : "") | slice:0:15}}</div>\n\
          <div class="col col-20 text-right" col-2 text-right>{{(client.time ? client.time : "")}}</div>\n\
        </div>\n'
  //        <div class="text-center padding" ng-hide="clients.length">\n\
  //            <ion-spinner icon="lines"></ion-spinner>\n\
  //        </div>\n'
})
export class TeonetClients implements OnDestroy {

  n: number = 0;
  tabIndex: number;
  clients: onclientDisplAr = [];

  private f: Array<any> = [];

  constructor(public t: TeonetCli) {

    console.debug('TeonetClients::constructor');

    this.f.push(t.whenInit(() => {
      console.debug('TeonetClients::whenInit');
      t.clients(Teonet.peer.l0);
    }));

    this.f.push(t.whenClose(() => {
      console.debug('TeonetClients::whenClose');
      this.clients = [];
    }));

    this.f.push(t.whenEvent('onclients', (data: any): number => {

      let need_sort = false;
      let d = <onclientsData>(data[0][0]);
      console.debug('TeonetClients::onclients', data, d, this.clients);

      // Remove not existing (disconnected) clients
      let clients = this.clients.filter(
        function (x) {
          return d.data.client_data_ar.inArray(
            function (e) {
              return x.name === e.name;
            },
            function () {}
          );
        }
      );
      if (clients.length != this.clients.length) {
        this.clients = clients;
        //need_sort = true;
      }

      // Add new clients to clients array
      for (let client of d.data.client_data_ar) {

        let el: onclientDisplArEl = {
          name: client.name,
          translate: '',
          type: '',
          time: 0
        };
        this.clients.pushIfNotExist(
          // Client to add
          el,
          // Comparer
          function (currentElement: onclientDisplArEl) {
            return currentElement.name === el.name;
          },
          // Done
          (currentElement: onclientDisplArEl) => {
            console.debug('TeonetClients::pushIfNotExist Add element:',
              currentElement);

            // Send user_info & client_info requests
            let name_split = currentElement.name.split(':');
            if (name_split[0]) {
              this.sendUserInfo(name_split[0]);
            }
            if (name_split[1]) {
              this.sendClientInfo(name_split[1]);
            }

            need_sort = true;
          },
          // Exists
          function (currentElement: onclientDisplArEl) {
            console.debug('TeonetClients::pushIfNotExist Element exists:',
              currentElement);
          }
        );

        // Send ping to client
        if (client.name != t.getClientName())
          t.echo(client.name, 'Hello from contact page n = ' + this.n);

      }

      // Sort clients array
      if (need_sort)
        this.clients.sort(function (a, b) {
          return a.name == b.name ? (a.type == b.type ? 0 :
            (a.type < b.type ? -1 : 1)) : (a.name < b.name ? -1 : 1);
        });

      return 0;
    }));

    this.f.push(t.whenEvent('onother', (data: any): number => {

      var d: onotherData = data[0][0];
      console.debug('TeonetClients::onother', data, d);

      // Process ansewers from teo-auth
      if (d.from == Teonet.peer.auth) {

        // Process user_info # 133
        if (d.cmd == 133) {

          let user: userInfo = d.data;

          this.clients.inArray(
            // Comparer
            function (currentElement: onclientDisplArEl) {
              let name_split = currentElement.name.split(':');
              return name_split[0] === user.userId;
            },
            // Exists
            function (currentElement: onclientDisplArEl) {
              currentElement.translate = user.username;
            }
          );
        }

        // Process client_info # 135
        else if (d.cmd == 135) {

          let client: clientInfo = d.data;
          console.debug('TeonetClients::onother got client typt:', client.data.type);

          this.clients.inArray(
            // Comparer
            function (currentElement: onclientDisplArEl) {
              let name_split = currentElement.name.split(':');
              return name_split[1] === client.clientId;
            },
            // Exists
            function (currentElement: onclientDisplArEl) {
              currentElement.type = client.data.type;
            }
          );
        }
      }
      return 0;
    }));

    this.f.push(t.whenEvent('onecho', (data: any): number => {
      
      if (!this.isComponentActive()) return 0;
      
      var d: onechoData = data[0][0];
      console.debug('TeonetClients::onecho', data, d);

      this.clients.inArray(
        // Comparer
        function (currentElement: onclientDisplArEl) {
          return currentElement.name === d.from;
        },
        // Exists
        function (currentElement: onclientDisplArEl) {
          currentElement.time = d.data.time;
        }
      );

      return 0;
    }));

    //Send clients list request to L0 server
    t.clients(Teonet.peer.l0);    
    IntervalObservable.create(1000).subscribe(() => { //.subscribe(n => this.n = n);
      this.n++;
      if (this.isComponentActive()) t.clients(Teonet.peer.l0);
    });
  }

  ngOnDestroy() {
    console.debug('TeonetClients::ngOnDestroy');
    for (let f of this.f) this.t.unsubscribe(f);
  }

  private isComponentActive(): boolean {
    return this.t.isTeonetClientsActive();
  }

  // Clients auth requests ---------------------------------------------------

  /**
   * Send user info request
   *
   * @param {string} name Clients accessToken
   * @returns {undefined}
   */
  private sendUserInfo(name: string) {

    console.debug("TeonetCli.send_user_info_request", name);

    //if(teocli !== undefined)
    this.t.send('{ "cmd": 132, "to": "' + Teonet.peer.auth + '", "data": ["' + name + '"] }');
  }

  /**
   * Send clients info request
   *
   * @param {type} client
   * @returns {undefined}
   */
  private sendClientInfo(client: string) {

    console.debug("ClientsController.send_client_info_request", client);

    //if(teocli !== undefined)
    this.t.send('{ "cmd": 134, "to": "' + Teonet.peer.auth + '", "data": ["' + client + '"] }');
  }
}

export class TeonetClientsNum implements OnDestroy {

  num_clients = 0;
  private f: Array<any> = [];

  constructor(public t: TeonetCli) {

    console.debug('TeonetClientsNum::constructor');

    this.f.push(t.whenInit(() => {
      console.debug('TeonetClientsNum::whenInit');
      // Send clients number request command to "teo-web" peer
      this.sendClientsNum();
    }));

    this.f.push(t.whenEvent('onother', (data: any): number => {

      let d: onotherData = data[0][0];
      console.debug('TeonetClientsNum::onother', data, d);

      // Process clients number responces
      this.processClientsNum(d);
      return 0;
    }));
  }

  ngOnDestroy() {
    console.debug('TeonetClientsNum::destructor');
    for (let f of this.f) this.t.unsubscribe(f);
    this.sendClientsMumUnsubscribe();
    this.num_clients = 0;
  }

  /**
   * Get clients number answer callback function
   *
   * @param {onotherData} data
   * @returns {number}
   */
  private processClientsNum(data: onotherData) {

    let processed = 0;
    let client = "";
    let client_code = "";
    let clientsNumber = this.num_clients;

    // Process command #85 CMD_L0_CLIENTS_N_ANSWER
    if (data.cmd === 85) {

      type CMD_L0_CLIENTS_N_ANSWER = {numClients: number};

      console.debug("TeonetClientsNum::processClientsNum, data:", data);

      clientsNumber = (<CMD_L0_CLIENTS_N_ANSWER> data.data).numClients;
      this.sendClientsNumSubscribe();
      processed = 1;
    }

    // Process command #83 CMD_SUBSCRIBE_ANSWER
    else if (data.cmd === 83) {

      type CMD_SUBSCRIBE_ANSWER = {ev: number, cmd: number, data: string}

      let byteCharacters = atob((<CMD_SUBSCRIBE_ANSWER> data.data).data);
      for (let i = 0; i < (byteCharacters.length); i++) {
        client_code += byteCharacters.charCodeAt(i) + '.';
      }

      client = atob((<CMD_SUBSCRIBE_ANSWER> data.data).data);

      // L0 client Connected
      if ((<CMD_SUBSCRIBE_ANSWER> data.data).ev === 21) {
        if (byteCharacters.charCodeAt(0)) clientsNumber += 1;
        processed = 1;
      }

      // L0 client Disconnected
      else if ((<CMD_SUBSCRIBE_ANSWER> data.data).ev === 22) {
        clientsNumber -= 1;
        processed = 1;
      }
    }

    if (processed) {

      console.debug("TeonetClientsNum::processClientsNum, data:",
        data, "client:", client, "client_code:", client_code);

      this.num_clients = clientsNumber;
    }

    return processed;
  }

  /**
   * Send clients number request
   *
   * @returns {undefined}
   */
  private sendClientsNum() {

    // Send clients number request
    this.t.send('{ "cmd": 84, "to": "' + Teonet.peer.l0 + '", "data": "JSON" }');
  }

  /**
   * Send subscribe to connect / disconnect client events request
   *
   * @returns {undefined}
   */
  private sendClientsNumSubscribe() {

    // Send CMD_SUBSCRIBE Subscribe to L0 client Connected / Disconnected
    this.t.send('{ "cmd": 81, "to": "' + Teonet.peer.l0 + '", "data": "TEXT:21" }');
    this.t.send('{ "cmd": 81, "to": "' + Teonet.peer.l0 + '", "data": "TEXT:22" }');
  }

  /**
   * Request unsubscribe from Connected / Disconnected events
   *
   * @returns {undefined}
   */
  private sendClientsMumUnsubscribe() {

    // Send CMD_SUBSCRIBE UnSubscribe to L0 client Connected / Disconnected
    if (this.t && this.t.isInit()) {
      this.t.send('{ "cmd": 82, "to": "' + Teonet.peer.l0 + '", "data": "TEXT:21" }');
      this.t.send('{ "cmd": 82, "to": "' + Teonet.peer.l0 + '", "data": "TEXT:22" }');
    }
  }
}

@NgModule({
  declarations: [TeonetClients],
  imports: [BrowserModule]
})
export class TeonetClientsModule {} // IgnoreModule
