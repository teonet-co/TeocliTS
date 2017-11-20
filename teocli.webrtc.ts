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

/**
 * Teonet client direct connect with WebRTC
 *
 * Version 0.0.1
 *
 */

import { TeocliCrypto } from 'teocli/teocli.crypto';
import { Base64 } from './teocli.auth';
import * as CryptoJS from 'crypto-js';

import Teocli from 'teocli/teocli';
import 'peerjs/dist/peer';

declare var Peer: any;

class TeocliRTCMap {

  map: any = {};

  /**
   * Add to map
   */
  add(key: string, conn: any = undefined, data: any = {}) {
    //if (!this.exist(key)) {
    this.map[key] = { conn: conn, data: data };
    //}
  }

  /**
   * Check if key exist (and connection with key established)
   */
  exist(key: string) {
    return key in this.map;
  }

  /**
   * Check if key exist and connection with this peer established
   */
  connected(key: string) {
    return this.get(key);
  }  
  
  /**
   * Get connection
   */
  get(key: string) {
    let data = this.map[key];
    return data ? data.conn : undefined;
  }    
}

export class TeocliRTC extends Teocli {

  private peer: any;
  protected client_name: string;
  private map = new TeocliRTCMap();
  private teocliCrypto = new TeocliCrypto(CryptoJS);
  private base64 = new Base64();
  
  private _crypt(key: string) {
    //return this.base64.encode(this.teocliCrypto.hash_short(key));
    return this.teocliCrypto.hash_short(key);
  }

  constructor(ws: WebSocket) {
    super(ws);
    console.log('TeocliRTC::constructor');
    
    setTimeout(() => {
      
      let hash = this._crypt(this.client_name);
      console.log('TeocliRTC::constructor this.client_name:', this.client_name, hash);
      this.peer = new Peer(hash, {key: 'dfsepa5n3o2vgqfr'});
      
      setTimeout(() => {
        console.log('TeocliRTC::constructor this.peer.id:', this.peer.id);
      }, 3000);
      
      this.peer.on('connection', (conn: any) => {
        console.log('TeocliRTC::constructor this peer - on connection', conn);
        // \TODO Add peer to map
        let n = 0, from: string;
        conn.on('data', (data: any) => {
          console.log('TeocliRTC::constructor this peer - on data n = ' + n + ':', data);
          if (!n && !this.map.connected(data)) {
//           this.map.add(data, conn);
           from = data;
          } 
          else {
            let d = JSON.parse(data);
            d.from = from;
            //delete d.to;
            console.log(d);
            this.process(JSON.stringify(d));
          }
          n++;
        });
      });    
      
      }, 3000);
        
//    }, 3000);    
  }

  /**
   * Send by Teocli or WebRTC
   */
  send(data: any): boolean {
    var retval = true;
    var d: any = (typeof data == 'string') ? JSON.parse(data) : data;
    console.debug('TeocliRTC::send to:', data, d.to);
    let conn;
    if ((conn = this.map.get(d.to))) conn.send(data); // Send by WebRTC 
    else {
      retval = super.send(data);                      // Send by Teocli
      if (!this.map.exist(d.to)) this.connect(d.to);  // Try connect by WebRTC
    }
    return retval;
  }

  /**
   * RTC data connect with peer
   */
  connect(key: string) {
    if(this.peer && this.peer.id) {
      super.send(JSON.stringify({ cmd: 255, to: key, data: { peer_id: this.peer.id } }));
      var conn = this.peer.connect(this._crypt(key));
      console.log('TeocliRTC::connect this peer id: ' + this.peer.id + ' connecting to ' + key + ' ...');
      this.map.add(key);
      conn.on('open', () => {
        console.log('TeocliRTC::connect connected to ' + key + ' ...');
        this.map.add(key, conn);
        conn.send(key);
        conn.on('data', (data: any) => {
          console.log('TeocliRTC::connect - on data:', data);          
        });
      });
    }
  }
  
//  process(data: any) {
//    
//  }
}
