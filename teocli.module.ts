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
import Teocli from 'teocli/teocli';

@Injectable()
export class TeonetClient {
    
    public teocli: Teocli;
    private ws: WebSocket;
    private teonet_init = false;
    private RECONNECT_TIMEOUT = 1000;
    private subscribers: Array<(ev:string) => void> = [];
    EVENT = {
        
        TEONET_INIT: 'teonet-init',
        TEONET_CLOSE: 'teonet-close'
        
    };

    constructor() {

        console.log("TeonetClient::constructor");
        this.connect();
    }

    connect(): void {

        this.ws = new WebSocket('ws://' + 'teomac.ksproject.org:80' + '/ws');
        this.teocli = new Teocli(this.ws);

        this.teocli.onopen = (ev) => {
            console.log("TeonetClient::teocli.onopen");
            // Send temporarry name login command to L0 server
            this.teocli.client_name = "teo-cli-ws-" + Math.floor((Math.random() * 100) + 1);
            this.teocli.login(this.teocli.client_name);
            this.send_event(this.EVENT.TEONET_INIT);
            this.teonet_init = true;
        };
        this.teocli.onclose = (ev) => {
            console.log("TeonetClient::teocli.onclose");
            // Reconnect after timeout
            setTimeout(() => {
              delete this.teocli;
              this.connect();
            }, this.RECONNECT_TIMEOUT);
            this.send_event(this.EVENT.TEONET_CLOSE);
            this.teonet_init = false;
        };
        this.teocli.onerror = function (ev) {};
        this.teocli.onother = function (err, data) {

            console.log("other_func", data);

            var processed = 0;

            // Check login answer
            //            if(data && data.cmd === 96) {
            //
            //                console.log("check login answer" , data);
            //
            //                // Send teocli-init event
            //                self.teocli_login = true;
            //                $rootScope.$broadcast('teocli-init');
            //                $rootScope.networksItems = data.data.networks;
            //                processed = 1;
            //            }

            return processed;
        }
    }

    disconnect(): void {
        this.ws.close();
    }
    
    subscribe(func: (ev:string) => void): void {
        
        this.subscribers.push(func);
    }
    
    private send_event(ev: string): void {
        for (var func of this.subscribers) {
            func(ev);
        }
    }
    
    whenEvent(event: string, func: () => void): void {
        this.subscribe((ev)=>{
            if (ev == event) {
                func();
            }
        });
    }
        
    isInit(): boolean {
        return this.teonet_init;
    }
    
    whenInit(func: () => void): void {
        this.whenEvent(this.EVENT.TEONET_INIT, func);
        if(this.isInit()) func();
    }

    whenClose(func: () => void): void {
        this.whenEvent(this.EVENT.TEONET_CLOSE, func);
    }
}
