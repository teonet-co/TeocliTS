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

import Teocli from 'teocli/teocli';

import 'peerjs/dist/peer';
declare var Peer: any;

export class TeocliRTCMap {

  private map: any = {};

  /**
   * Add to map
   */
  add(key: string, conn: any = undefined, data: any = {}) {
    //if (!this.exist(key)) {
    if(key)
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

  /**
   * Delete key from map
   */
  delete(key: string) {
    delete this.map[key];
  }
  
  getMap() {
    return this.map;
  }
}

export class TeocliRTC extends Teocli {

  private peer: any;
  protected client_name: string;
  private map = new TeocliRTCMap();

  constructor(ws: WebSocket) {
    super(ws);

    console.log('TeocliRTC::constructor this.client_name:', this.client_name);
    
    this.peer = new Peer({key: 'dfsepa5n3o2vgqfr'});

//    setTimeout(() => {
//      console.log('TeocliRTC::constructor Got this.peer.id:', this.peer.id);
//    }, 3000);

    // On connected to this peer
    this.peer.on('connection', (conn: any) => {
      console.log('TeocliRTC::constructor on connection', conn);
      let n = 0, key: string;
      // Process data
      conn.on('data', (data: any) => {
        // First message is peer name
        if (!n) {
          if(!this.map.connected(data)) {
            console.log('TeocliRTC::constructor Connected to:', data);
            this.map.add(data, conn);  // Connected
            key = data // Set key (from)
          }
        }
        // Process received data
        else this.process(data);
        n++;
      });
      // Process disconnect
      conn.on('close', () => {
        console.log('TeocliRTC::constructor Disconnected from:', key);
        this.map.delete(key);
      });
    });
  }

  /**
   * Send by Teocli or WebRTC
   */
  send(data: any): boolean {
    var conn, retval = true;
    var d: any = (typeof data == 'string') ? JSON.parse(data) : data;
    if ((conn = this.map.get(d.to))) {
      d.from = this.client_name;
      conn.send(JSON.stringify(d)); // Send by WebRTC
    }
    else {
      retval = super.send(data);                      // Send by Teocli
      if (!this.map.exist(d.to)) this.sendRTC(d.to);  // Send RTC request
    }
    return retval;
  }

  /**
   * Send RTC request to peer
   */
  private sendRTC(peer: string) {
    if(this.peer && this.peer.id) {
      this.map.add(peer); // Known peer (request was send)
      super.send(JSON.stringify({ cmd: 255, to: peer, data: { peer_id: this.peer.id }}));
    }
  }

  /**
   * RTC data connect with peer (as answer to RTC request)
   */
  private connect(key: string, peer_id: string) {
    if(this.peer && this.peer.id) {
      var conn = this.peer.connect(peer_id); 
      console.log('TeocliRTC::connect  connecting to ' + key + ' ...');
      // On connected to remote peer
      conn.on('open', () => {
        console.log('TeocliRTC::connect Connected to: ' + key);
        this.map.add(key, conn); // Connected
        conn.send(key);
        conn.on('data', this.process);
        conn.on('close', () => {
          console.log('TeocliRTC::connect Disconnect from:', key);
          this.map.delete(key);
        });
      });
    }
  }

  /**
   * Process RTC command (cmd = 255)
   */
  onrtc(err:any, p: any) {
    if(!err) {
      console.log('TeocliRTC::onrtc Got cmd 255');
      if (!this.map.connected(p.from)) this.connect(p.from, p.data.peer_id);
    }
    return 1;
  }
  
  /**
   * Return pointer to Teonet WebRTC map
   */
  getWebRTCMap() {
    return this.map.getMap();
  }
}
