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
 * Version 0.0.2
 *
 */

import Teocli from 'teocli/teocli';
import 'webrtc-adapter';

//type rtcmap = { key: { pc: any, channel: any, data: any } };

export class TeocliRTCMap {

  private map = <any>{};

  /**
   * Create new key in map
   */
  create(key: string, pc: any, channel: any = undefined, data: any = {}) {
    if (key)
     this.map[key] = { pc: pc, channel: channel, data: data };
  }

  /**
   * Add connected channel to map
   */
  add(key: string, channel: any, data: any = {}) {
    if (key && this.map[key] && this.map[key].pc && channel) {
      let pc = this.map[key].pc;
      console.log('!!! pc:', pc, 'cannel: ', channel);
      this.map[key] = { pc: pc, channel: channel, data: data };
    }
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
    return this.getChannel(key);
  }

  /**
   * Get reference to data channel (connection)
   */
  getChannel(key: string) {
    let data = this.map[key];
    return data ? data.channel : undefined;
  }

  /**
   * Get reference to connection
   */
  getConn(key: string) {
    let data = this.map[key];
    return data ? data.pc : undefined;
  }

  /**
   * Delete keys channel
   */
  deleteChannel(key: string) {
    if(key && this.map[key] && this.map[key].channel) {
      this.map[key].channel.close();
      delete this.map[key].channel
    }
  }

  /**
   * Delete key and all it services (channel) from the map
   */
  delete(key: string) {
    if(key && this.map[key]) {
      this.deleteChannel(key); // Close and delete data cannel
      if(this.map[key].pc) {
        this.map[key].pc.close(); // Closes the peer connection.
        delete this.map[key].pc // Delete connection
      }
      delete this.map[key]; // Delete key
    }
  }

  /**
   * Delete all keys
   */
  deleteAll() {
    for(let key in this.map) this.delete(key);
  }

  /**
   * Get pointer to map
   */
  getMap() {
    return this.map;
  }
}

export type CallOptionsType = { video: boolean, audio: boolean, chat: boolean };

export class TeocliRTCSignalingChannel extends Teocli {

  protected client_name: string;
  private map = new TeocliRTCMap();

  protected oncandidate  = <(peer: string) => void> {};
  protected onrtcmessage = <(peer: string, evt: any) => void> {};

  /**
   * Start peer connection - Create new key in the RTC map
   */
  protected startConnection(peer: string, pc: any) {
    //console.log('TeocliRTCSignalingChannel:startConnection', peer, pc);
    this.map.create(peer, pc);
  }

  /**
   * Get existing connection from RTC map
   */
  protected getConnection(peer: string) {
    var pc = this.map.getConn(peer);
    return pc;
  }

  /**
   * Set peer channel connected - Update key in the RTC map
   */
  protected setConnected(peer: string, channel: any) {
    this.map.add(peer, channel);
  }

  /**
   * Remove peer from RTC map
   */
  protected removeConnection(peer: string) {
    this.map.delete(peer);
  }

  /**
   * Send RTC signal command
   */
  protected sendRTC(peer: string, msg: any) {
    if (peer) super.send(JSON.stringify({ cmd: 255, to: peer, data: msg }));
  }

  /**
   * Get WebRTC map
   * @return {any} Pointer to Teonet WebRTC map
   */
  getWebRTCMap() {
    return this.map.getMap();
  }

  /**
   * Process RTC command (cmd = 255)
   */
  onrtc(err: any, p: any) {
    if (!err) {
      //console.log('TeocliRTCSignalingChannel::onrtc Got cmd 255');
      this.onrtcmessage(p.from, p)
    }
    return 1;
  }

  /**
   * Send teonet message by Teocli or WebRTC
   */
  send(data: any): boolean {
    var channel, retval = true;
    var d: any = (typeof data == 'string') ? JSON.parse(data) : data;
    if ((channel = this.map.getChannel(d.to))) {
      d.from = this.client_name;
      //console.log('TeocliRTCSignalingChannel::send :', d, 'channel:', channel);
      channel.send(JSON.stringify(d)); // Send by WebRTC
    }
    else {
      if (!this.map.exist(d.to)) this.oncandidate(d.to); // Create new RTC connection
      retval = super.send(data);    // Send by Teocli
    }
    return retval;
  }

  /**
   * Destroy all connections.
   * Interception Send event to Event Subscribers
   *
   * @param {string} ev Event name
   * @param {object[]) ...obj Objects send to subscribers
   */
  sendEvent(ev: string, ...obj: object[]): void {
    // Disconnect all channels when teonet disconnected
    if(ev == 'teonet-close') {
      console.log('TeocliRTCSignalingChannel::sendEvent ', 'teonet-close', obj);
      this.map.deleteAll();
    }
  }  

  /**
   * Convert WebRTCNap to Array
   */
  webrtcToAr(webrtc: any) {
    return Object.keys(webrtc).map((key) => {
      return { key: key, data: webrtc[key] };
    });
  }
}

export class TeocliRTC extends TeocliRTCSignalingChannel {

  // RTC configurations (ICE Servers)
  private configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302'},
      { urls: 'turn:turn.bistri.com:80', username: 'homeo', credential: 'homeo' }
    ]
  };
  
  // Cakback registered by VideoCall Page called when remote peer connect it's 
  // tracks: When remote peer make call to this local peer
  private callAnswer:  any; 

  /**
   * TeocliRTC class constructor
   */
  constructor(ws: WebSocket) {
    super(ws);

    console.log('TeocliRTC::constructor');

    this.oncandidate = this.connect; // Start new connection
    this.onrtcmessage = this.processRemoteMessage; // Process remote signal message
  }

  /**
   * Connect to remote peer
   */
  private connect(peer: string) {
    if(peer) {
      //console.log('TeocliRTC::connect to', peer);
      this.createConnection(peer);
    }
    else this.logError({ name: 'TeocliRTC::connect', message: 'Empty peer name' });
  }
  
  /**
   * Process remote peer RTC signal messages
   */
  private processRemoteMessage(peer: string, evt: any) {

    //console.log('TeocliRTC::constructor::onremotemessage from:', peer, 'env:', evt);

    // Get connection or create new
    var pc: any;
    pc = this.getConnection(peer) || this.createConnection(peer, false);
    //if(!pc) pc = this.createConnection(peer, false);

    var message = evt.data;
    if (message.desc) {
      var desc = message.desc;

      // teocli message to quick create this connection
      if (desc.type == 'teocli-start') {
        // Do something ...
      }
      // teocli message to connect media streams
      else if (desc.type == 'teocli-call') {
        // \TODO What do with audioSender and videoSender
        console.log('Got RTC teocli-call signal from peer: ' + peer + ', signal:', message);
//        if (this.localStream) {
//          this.addStream(pc, this.localStream);
//        }
      }
      // if we get an offer, we need to reply with an answer
      else if (desc.type == 'offer') {
        console.log('Got offer', message);
        pc.setRemoteDescription(desc)
          .then(() => {
            return pc.createAnswer();
          })
          .then((answer: any) => {
            return pc.setLocalDescription(answer);
          })
          .then(() => {
            //var str = JSON.stringify({ desc: pc.localDescription });
            this.sendRTC(peer, { desc: pc.localDescription });
          })
          .catch(this.logError);
      }
      // process remote description
      else {
        console.log('Got ' + message.desc.type + ': ', message);
        pc.setRemoteDescription(desc).catch(this.logError);
      }
    }
    else if (message.start) {
      console.log('Got start message', message);
//      started = true;
//      if (audio && audioSendTrack) {
//        audio.sender.replaceTrack(audioSendTrack);
//      }
//      if (video && videoSendTrack) {
//        video.sender.replaceTrack(videoSendTrack);
//      }
    }
    // process ice candidate
    else {
      console.log('Got ice candidate', message);
      pc.addIceCandidate(message.candidate).catch(this.logError);
    }
  }

    /**
   * Create connection between this peer and remote peer
   *
   * @param {string} peer Remote peer name
   */
  private createConnection(peer: string, isInitiator: boolean = true) {

    var channel: any;
    var pc: any = new RTCPeerConnection(this.configuration);

    console.log('TeocliRTC::createConnection to:', peer, 'initiator:', isInitiator);
    this.startConnection(peer, pc);  // Add RTCPeerConnection to RTC map
    this.sendRTC(peer, { desc: { type: 'teocli-start' } }); // Send start commad to receiver

    // send any ice candidates to the other peer
    pc.onicecandidate = (evt: any) => {
      //console.log('TeocliRTC::createConnection onicecandidate', evt);
      this.sendRTC(peer, { candidate: evt.candidate });
    };
    
    // let the "negotiationneeded" event trigger offer generation
    pc.onnegotiationneeded = () => {
      //if(pc.localDescription.type != 'answer') {
      console.log('createConnection::onnegotiationneeded createOffer', pc);
      pc.createOffer()
        .then((offer: any) => {
          return pc.setLocalDescription(offer);
        })
        .then(() => {
          // send the offer to the other peer
          //console.log('TeocliRTC::createConnection onnegotiationneeded', pc.localDescription);
          // \TODO Send last during 0.5 sec
          // let currentTimeInMs = new Date();
          this.sendRTC(peer, { desc: pc.localDescription });
        })
        .catch(this.logError);
      //}  
    };

    // when remote peer connect his media'messa
    pc.ontrack = (e: any) => {
      console.log('pc.ontrack', e);
      // Connect remote stream to the remoteVideo control
      if (this.callAnswer) this.callAnswer(peer, e.streams[0]);
    }

    // Process created channel
    var processChannel = (channel: any) => {
      // When channe lopen
      channel.onopen = () => {
        // e.g. enable send button
        //enableChat(this.channel);
        console.log('TeocliRTC::createConnection processChannel channel.onopen Connected to:', peer);
        this.setConnected(peer, channel);
      };
      channel.onmessage = (event: any) => {
        //console.log('TeocliRTC::createConnection:onmesage', peer, event);
        this.process(event.data);
      }
      // When channel close
      channel.onclose = () => {
        console.log('TeocliRTC::createConnection:onclose', peer);
        this.removeConnection(peer);
        if (this.callAnswer) this.callAnswer(peer);
      }
      // When channel error
      channel.onerror = () => {
        console.log('TeocliRTC::createConnection:onerror', peer);
      }
    }

    // Create chanel if this peer is initiator
    if(isInitiator) {
      channel = pc.createDataChannel('teocli-rtc', { maxRetransmitTime: 3000 });  // in milliseconds); // peer
      //console.log('TeocliRTC::createConnection (createDataChannel) to', peer, channel);
      processChannel(channel);
    }
    // Get channel from RTCPeerConnection if this peer is receiver
    else {
      pc.ondatachannel = (event: any) => {
        channel = event.channel;
        //console.log('TeocliRTC::createConnection (ondatachannel) to', peer, channel);
        processChannel(channel);
      };
    }

    return pc;
  }
    
  /**
   * Add stream to RTCConnection
   */
  protected addStream (pc: any, stream: any, options?: any) {

    if (!options) {
      stream.getTracks().forEach(
        function(track: any) {
          pc.addTrack(track, stream);
        }
      );
    }
    else {
      if (options.video) pc.addTrack(stream.getVideoTracks()[0], stream);
      if (options.audio) pc.addTrack(stream.getAudioTracks()[0], stream);
    }
    console.log('Added local stream to pc');
  }

  /**
   * Show error
   */
  private logError(error: any) {
    console.log('TeocliRTC::logError', error.name + ": " + error.message + ', (error: ', error, ')');
  }
  
  /**
   * Make Call to remote peer
   *
   * @param {string} peer Peer name
   * @param {CallOptionsType} options Options: 
   *                            video - reqiest video, 
   *                            audio - request audio, 
   *                            chat - request chat channel
   * 
   * @return {boolean} true if call send to remotepeer;
   *                   false if peer name empty,
   *                   or peer not connected to this host,
   *                   or if wrong options send (all: video, audio and channel is false)
   */
  call (peer: string,
       localStream?: any,
       options: CallOptionsType = { video: true, audio: true, chat: false },
       ) {

    // Check option and return false if all options lalse
    if (!(options.video || options.audio || options.chat)) return false;

    var pc = this.getConnection(peer);
    if (pc) {

      // Add local tracks to RTC connection
      if (localStream) {
        this.addStream(pc, localStream, options);
        pc.onremovestream = () => {
          if (this.callAnswer) this.callAnswer(peer);
          console.log('onremovestream', peer);
          this.removeTracks(peer);
        }
      }

      // \TODO Create Chat channel
      if (options.chat) { }

      return true;
    }

    return false;
  }
  
  /**
   * Hangup call
   */
  hangup(peer: string) {
    //this.removeConnection(peer);
    this.removeTracks(peer);    
  }

  /**
   * Register remote call answer
   */
  registerCallAnswer(callAnswer: any) {
    this.callAnswer = callAnswer;
  }
  
  /**
   * Remove all media tracks from connection
   */
  removeTracks(peer: string) {
    var pc = this.getConnection(peer);
    if (pc) {
      [/*pc.getReceivers(), */pc.getSenders()].forEach((senderss:any) => {
        senderss.forEach((sender: any) => {
          pc.removeTrack(sender);
        });
      });
    }
  }

  /**
   * UnRegister remote call answer
   */
  unRegisterCallAnswer() {
    this.callAnswer = undefined;
  }

}
