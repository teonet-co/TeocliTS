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


import {Teocli} from 'teocli/teocli';

export class TeonetClient {

    private teocli: Teocli;
    private ws: WebSocket;

    constructor() {

        this.connect();
        this.teocli.onopen = function (ev) {};
        this.teocli.onclose = function (ev) {};
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

    connect(): void {

        this.ws = new WebSocket('ws://' + 'teomac.ksproject.org:80' + '/ws');
        this.teocli = new Teocli(this.ws);
    }

    disconnect(): void {
        this.ws.close();
    }

}
