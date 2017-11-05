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

import { NgModule, Component } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { TeonetCli, Teonet, onotherData } from './teocli.module';
import { IntervalObservable } from 'rxjs/observable/IntervalObservable';

export type onclientDisplArEl = { name: string, translate: string, type: string, time: number };
export type onclientDisplAr = Array< onclientDisplArEl >;
type onclientsDataAr = Array< { name: string } >;
type onclientsData = {
    cmd: number,
    from: string,
    data: {
        length: number,
        client_data_ar: onclientsDataAr
    }
};
type onechoData = {
    cmd: number,
    from: string,
    data: {
        msg: string,
        time: number
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
    template: "\n\\n\
        <div>n = {{ n }}</div>\n\
        <div *ngFor='let client of clients; index as i; first as isFirst'>\n\
          {{i+1}}/{{clients.length}}. \n\
          {{ (client.translate ? client.translate : client.name) }} \n\
          {{ (client.type ? '(' + client.type + ')' : '') }} \n\
          {{ (client.time ? ' -- ' + client.time + ' ms' : '') }}\n\
        </div>"
})
export class TeonetClients {

  n: number = 0;
  tabIndex: number;
  clients: onclientDisplAr = [];

  constructor(public t: TeonetCli) {

    console.log('TeonetClients::constructor');

    t.whenInit(()=>{
        console.log('TeonetClients::whenInit');
        t.clients('ps-server');
    });

    t.whenClose(()=>{
        console.log('TeonetClients::whenClose');
        this.clients = [];
    });

    t.whenEvent('onclients', (data: any): number => {

        let need_sort = false;
        let d = <onclientsData>(data[0][0]);
        console.log('TeonetClients::onclients', data, d, this.clients);

        // Remove not existing (disconnected) clients
        let clients = this.clients.filter(
            function(x) {
                return d.data.client_data_ar.inArray(
                    function(e) {
                        return x.name === e.name;
                    },
                    function() { }
                );
            }
        );
        if (clients.length != this.clients.length) {
            this.clients = clients;
            //need_sort = true;
        }

        // Add new clients to clients array
        for(let client of d.data.client_data_ar) {

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
                function(currentElement: onclientDisplArEl) {
                    return currentElement.name === el.name;
                },
                // Done
                (currentElement: onclientDisplArEl) => {
                    console.log('TeonetClients::pushIfNotExist Add element:',
                        currentElement);

                    // Send user_info & client_info requests
                    let name_split = currentElement.name.split(':');
                    if(name_split[0]) {
                        t.send_user_info_request(name_split[0]);
                    }
                    if(name_split[1]) {
                        t.send_client_info_request(name_split[1]);
                    }
                    
                    need_sort = true;
                },
                // Exists
                function(currentElement: onclientDisplArEl) {
                    console.log('TeonetClients::pushIfNotExist Element exists:',
                        currentElement);
                }
            );

            // Send ping to client
            if (client.name != t.client_name)
                t.echo(client.name,'Hello from contact page n = ' + this.n);

        }
        
        // Sort clients array
        if( need_sort)
            this.clients.sort(function(a, b) {
                return a.name == b.name ? (a.type == b.type ? 0 : 
                    (a.type < b.type ? -1 : 1) ) : (a.name < b.name ? -1 : 1);
            });        
        
        return 0;
    });

    t.whenEvent('onother', (data:any): number => {

        var d: onotherData = data[0][0];
        console.log('TeonetClients::onother', data, d);

        // Process ansewers from teo-auth
        if (d.from == Teonet.authPeer) {

            // Process user_info # 133
            if (d.cmd == 133) {

                let user: userInfo = d.data;

                this.clients.inArray(
                    // Comparer
                    function(currentElement: onclientDisplArEl) {
                        let name_split = currentElement.name.split(':');
                        return name_split[0] === user.userId;
                    },
                    // Exists
                    function(currentElement: onclientDisplArEl) {
                        currentElement.translate = user.username;
                    }
                );
            }

            // Process client_info # 135
            else if (d.cmd == 135) {

                let client: clientInfo = d.data;
                console.log('TeonetClients::onother got client typt:', client.data.type);

                this.clients.inArray(
                    // Comparer
                    function(currentElement: onclientDisplArEl) {
                        let name_split = currentElement.name.split(':');
                        return name_split[1] === client.clientId;
                    },
                    // Exists
                    function(currentElement: onclientDisplArEl) {
                        currentElement.type = client.data.type;
                    }
                );
            }
        }
        return 0;
    });

    t.whenEvent('onecho', (data: any): number => {
        var d: onechoData = data[0][0];
        console.log('TeonetClients::onecho', data, d);

        this.clients.inArray(
            // Comparer
            function(currentElement: onclientDisplArEl) {
                return currentElement.name === d.from;
            },
            // Exists
            function(currentElement: onclientDisplArEl) {
                currentElement.time = d.data.time;
            }
        );

        return 0;
    });

    //Send clients list request to L0 server
    t.clients('ps-server');
    //.subscribe(n => this.n = n);
    IntervalObservable.create(1000).subscribe(()=>{
        this.n++;
        if (this.isComponentActive()) t.clients('ps-server');
    });
  }
  
  isComponentActive(): boolean {
      return this.t.isTeonetClientsActive();
  }

}

@NgModule({ 
    declarations: [TeonetClients], 
    imports: [BrowserModule] 
})
export class IgnoreModule {}
