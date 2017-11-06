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

export interface TeonetEventType {
    TEONET_INIT: string,
    TEONET_CLOSE: string
};      

export type eventSubscribersFunc = (event: string, ...obj: object[]) => number;
export type onotherData = { 
    cmd: number, 
    from: string, 
    data: any 
};

export const Teonet = {
    peer: {
        l0:     'ps-server',
        auth:   'teo-auth'
    }
}

@Injectable()
export class TeonetCli extends Teocli {

    private connect_url: string;
    private teonet_init: boolean;
    private RECONNECT_TIMEOUT: number;
    private isTeonetClientsActiveFunc: ()=> boolean;
    private eventSubscribers: Array<eventSubscribersFunc>;
    static EVENT: TeonetEventType = {        
            TEONET_INIT: 'teonet-init',
            TEONET_CLOSE: 'teonet-close'        
    };

    constructor() {

        console.log("TeonetCli::constructor");
        var connect_url = 'ws://' + 'teomac.ksproject.org:80' + '/ws';
        var ws = new WebSocket(connect_url);
        super(ws);
        this.isTeonetClientsActiveFunc = () => { return true; };
        this.connect_url = connect_url;
        this.RECONNECT_TIMEOUT = 1000;
        this.teonet_init = false;
        this.eventSubscribers = [];
        this.ws = ws;
        this.init();
    }

    private init(): void {

        this.onopen = (ev) => {
            console.log("TeonetCli::teocli.onopen");
            // Send temporarry name login command to L0 server
            this.client_name = "teo-cli-ts-ws-" + Math.floor((Math.random() * 100) + 1);
            this.login(this.client_name);
            this.sendEvent(TeonetCli.EVENT.TEONET_INIT);
            this.teonet_init = true;
        };
        
        this.onclose = (ev) => {
            console.log("TeonetCli::teocli.onclose");
            // Reconnect after timeout
            setTimeout(() => {
                //\TODO Make reconnect  
                delete this.ws;
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
                //this.connect();
            }, this.RECONNECT_TIMEOUT);
            this.sendEvent(TeonetCli.EVENT.TEONET_CLOSE);
            this.teonet_init = false;
        };
        
        this.onerror = function (ev) {};
        
        this.onother = (err, data: object) => {

            console.log("TeonetCli::onother", err, data);

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
            
            if (!processed) this.sendEvent('onother', data);

            return processed;
        }
        this.onecho = (err, data: object) => {
            console.log("TeonetCli::onecho", err, data);
            this.sendEvent('onecho', data);
            return 1;
        }
        
        this.onclients = (err, data: object) => {
            console.log("TeonetCli::onclients", err, data);
            this.sendEvent('onclients', data);
            return 1;
        }
    }

    /**
     * Disconnect TeonetCli
     * 
     */
    disconnect(): void {
        this.ws.close();
    }
    
    /**
     * Is TeonetCli connected and initialized
     * 
     * @returns {boolean} True if connected and initialized
     */
    isInit(): boolean {
        return this.teonet_init;
    }
    
    /**
     * Subscribe to even
     * 
     * @param {eventSubscribersFunc} func 
     */
    subscribe(func: eventSubscribersFunc): void {
        
        this.eventSubscribers.push(func);
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
    
    whenEvent(event: string, func: (...obj: object[]) => number): void {
        this.subscribe((ev: string, ...obj: object[]): number => {
            if (ev == event) {
                func(obj);
            }
            return 0;
        });
    }
        
    whenInit(func: () => void): void {
        this.whenEvent(TeonetCli.EVENT.TEONET_INIT, ()=>{
            func();
            return 0;
        });
        if(this.isInit()) func();
    }

    whenClose(func: () => void): void {
        this.whenEvent(TeonetCli.EVENT.TEONET_CLOSE, ()=>{
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
