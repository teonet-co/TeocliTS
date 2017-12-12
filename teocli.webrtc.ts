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
import {TeonetClientsTranslate, TeonetUserInfo, TeonetClientInfo} from './teocli.clients';
import Teocli from 'teocli/teocli';
import 'webrtc-adapter';

//type rtcmap = { key: { pc: any, channel: any, data: any } };

export class TeocliRTCMap {

  private map = <any>{};
  private cli = new TeonetClientsTranslate(this.t);

  constructor(private t: any) {

  }

  /**
   * Create new key in map
   */
  create(key: string, pc: any, channel: any = undefined, data: any = {}) {
    if (key) {

      this.map[key] = { pc: pc, channel: channel, data: data, translate: '', type: '' };
      let split_key = this.cli.splitName(key);
      if (split_key.user) {
        this.cli.getUserInfo(split_key.user,
          (err: any, user: TeonetUserInfo) => {
            if (!err && this.map[key]) this.map[key].translate = user.username;
          }
        );
      }
      if (split_key.client) {
        this.cli.getClientInfo(split_key.client,
          (err: any, client: TeonetClientInfo) => {
            if (!err && this.map[key]) this.map[key].type = client.data.type;
          }
        );
      }
    }
  }

  /**
   * Add connected channel to map
   */
  add(key: string, channel: any, data: any = {}) {
    if (key && this.map[key] && this.map[key].pc && channel) {
      let pc = this.map[key].pc;
      console.log('!!! pc:', pc, 'cannel: ', channel);
      this.map[key].channel = channel;
      this.map[key].data = data;
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
  protected map = new TeocliRTCMap(this);
  protected oncandidate  = <(peer: string) => void> {};
  protected onrtcmessage = <(peer: string, evt: any) => void> {};

  /**
   * Start peer connection - Create new key in the RTC map
   */
  protected startConnection(peer: string, pc: any) {
    console.log('TeocliRTCSignalingChannel:startConnection', peer, pc);
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
  webrtcToAr(webrtc?: any) {
    if (!webrtc) webrtc = this.getWebRTCMap();
    return Object.keys(webrtc).map((key) => {
      return { key: key, data: webrtc[key] };
    });
  }
}

export class TeocliRTC extends TeocliRTCSignalingChannel {

  // RTC configurations (ICE Servers)
  private configuration = {
    iceServers: [
      {urls: 'stun:stun.l.google.com:19302'},
      {urls: 'turn:turn.bistri.com:80', username: 'homeo', credential: 'homeo'}
    ]
  };

  // Cakback registered by VideoCall Page called when remote peer connect it's
  // tracks: When remote peer make call to this local peer
  private callAnswer:  any;

  // No dissconect flag when iceConnectionState equal to 'disconnected'
  private nodisconnect_flg: boolean = false;

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
    if(peer) this.createConnection(peer);
  }

  /**
   * Process remote peer RTC signal messages
   */
  private processRemoteMessage(peer: string, evt: any) {

    // Get connection or create new
    var pc: any;
    var message = evt.data;
    
    // Send reset to remote peer and close current connection
    var send_reset = () => {
      this.sendRTC(peer, { desc: { type: 'teocli-reset' } }); // Send reset commad to receiver
      let ch = this.map.getChannel(peer);
      if(ch) {
        console.log('send_reset and !!! Disconnected');
        ch.close();
      }
      else this.removeConnection(peer);
    }
        
    // Reset if teocli-reset send or if teocli-start send and connection already exists
    if(message.desc && message.desc.type == 'teocli-reset' || 
       message.desc && message.desc.type == 'teocli-start' && this.getConnection(peer)) {
       
      console.log('Got RTC \'' + message.desc.type + '\' signal from peer: ' + peer + ', remove existing connection');
      //this.removeConnection(peer);
      //this.map[peer].close();
      //delete this.map[peer]; // Delete key (drop connection)
      //pc = this.getConnection(peer);
      //this.map.getChannel(peer).close();
      //delete this.map.getMap()[peer];
    }

    // Get existing connection or create new one
    pc = this.getConnection(peer); // || this.createConnection(peer, false);

    // Process messages
    if (message.desc) {
      var desc = message.desc;
      // teocli message to create connection
      if (desc.type == 'teocli-start' || desc.type == 'teocli-reset') {
        // Create connection
        console.log('Got RTC ' + desc.type + ' signal from:', peer);
        this.createConnection(peer, false);
      }
      // Connection error
      else if(!pc) {
        console.error('pc not created yet', peer);
      }
      // teocli message to connect media streams
      else if (desc.type == 'teocli-call') {
        // \TODO Used in WebCamera mode to add local stream to pc connection.
        // What do with audioSender and videoSender
        console.log('Got RTC teocli-call signal from peer: ' + peer + ', signal:', message);
        //if (this.localStream) {
        //  this.addStream(pc, this.localStream);
        //}
      }
      // if we get an offer, we need to reply with an answer
      else if (desc.type == 'offer') {
        console.log('Got offer', message);
        this.nodisconnect_flg = false;
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
          .catch((err: any) => {
            send_reset();
            this.logError(err);
          });
      }
      // process remote description
      else {
        console.log('Got ' + message.desc.type + ': ', message);
        pc.setRemoteDescription(desc).catch(this.logError);
      }
    }
    // Process ice candidate
    else if (pc) {
      console.log('Got ice candidate', message);
      pc.addIceCandidate(message.candidate).catch((err: any) => {
        send_reset();
        this.logError(err);
      });
    }
    // Connection error
    else {
      console.error('pc not created yet', peer);
    }
  }

  /**
   * Create connection between this peer and remote peer
   *
   * @param {string} peer Remote peer name
   */
  private createConnection(peer: string, isInitiator: boolean = true) {

    var channel: any;
    var lastTime = 0;
    var t: number = 0;
    const WAIT_NEXT_NEGOTIATION = 50;
    var pc: any = new RTCPeerConnection(this.configuration);

    console.log('TeocliRTC::createConnection to:', peer, 'initiator:', isInitiator);
    
    this.startConnection(peer, pc);  // Add RTCPeerConnection to RTC map
    if(isInitiator) {
      console.log('Send RTC teocli-start signal to:', peer, 'initiator', isInitiator);
      this.sendRTC(peer, { desc: { type: 'teocli-start' } }); // Send start commad to receiver
    }

    // send any ice candidates to the other peer
    pc.onicecandidate = (evt: any) => {
      //console.log('TeocliRTC::createConnection onicecandidate', evt);
      this.sendRTC(peer, { candidate: evt.candidate });
    };

    // when remote peer disocnnected
    pc.oniceconnectionstatechange = (event: any) => {
      console.log('oniceconnectionstatechange:', pc.iceConnectionState, ' event:', event);
      if(pc.iceConnectionState == 'disconnected') {
          //\TODO Close data channel
          // This event happends when remote data channel is disconnected
          // (We processed this even and close local channel).
          //
          // Or it happends when remote media track added to this RTC connection,
          // to stop this event we used nodisconnect_flg: boolean which we set
          // to true when pc.ontrack event hapends.
          let ch: any;
          if(!this.nodisconnect_flg && (ch = this.map.getChannel(peer))) {
            console.log('oniceconnectionstatechange !!! Disconnected - close channel');
            ch.close();
            //this.removeConnection(peer);
          }
      }
      if(pc.iceConnectionState == 'failed') {
          console.log('oniceconnectionstatechange !!! failed');
          this.removeConnection(peer); // Close WebRTC connection
      }
      this.nodisconnect_flg = false;
    }

    // let the "negotiationneeded" event trigger offer generation
    pc.onnegotiationneeded = () => {
      console.log('createConnection::onnegotiationneeded', pc);

      // Generate and Send only last offer during 50 ms
      // The onnegotiationneeded fire every time when we add or delete streams
      // tracks. And we will wait all tracks added or deleted and than send one
      // offer to remote
      let currentTime = new Date().getTime();
      let createOffer = () => {
        console.log('createConnection::onnegotiationneeded createOffer', pc);
        this.nodisconnect_flg = true; // Set no disconnect flag
        pc.createOffer()
          .then((offer: any) => {
            return pc.setLocalDescription(offer);
          })
          .then(() => {
            // Send the offer to the other peer
            this.sendRTC(peer, { desc: pc.localDescription });
          })
          .catch(this.logError);
      };

      if (t && currentTime - lastTime < WAIT_NEXT_NEGOTIATION) clearTimeout(t);
      t = setTimeout(createOffer, WAIT_NEXT_NEGOTIATION);
      lastTime = currentTime;
    };

    // When remote peer connect his media
    pc.ontrack = (e: any) => {
      console.log('pc.ontrack', e);
      this.nodisconnect_flg = true; // Set no disconnect flag
      // Connect remote stream to the remoteVideo control
      if (this.callAnswer) this.callAnswer(peer, e.streams[0]);
    }

    // Process created channel
    var processChannel = (channel: any) => {
      // When channe lopen
      channel.onopen = () => {
        console.log('TeocliRTC::createConnection processChannel channel.onopen',
                    'Connected to:', peer);
        this.setConnected(peer, channel);
      };
      // When message received
      channel.onmessage = (event: any) => {
        //console.log('TeocliRTC::createConnection:onmesage', peer, event);
        this.process(event.data);
      }
      // When channel close
      channel.onclose = () => {
        console.log('TeocliRTC::createConnection:onclose', peer);
        this.removeConnection(peer);
        //this.map.deleteChannel(peer);
        if (this.callAnswer) this.callAnswer(peer);
        this.nodisconnect_flg = false;
      }
      // When channel error
      channel.onerror = () => {
        console.log('TeocliRTC::createConnection:onerror', peer);
      }
    }

    // Create chanel if this peer is initiator
    if(isInitiator) {
      channel = pc.createDataChannel('teocli-rtc', {
        maxRetransmitTime: 3000   // milliseconds
      });
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
   *
   * @param {any} Reference to RTCPeerConnection
   * @param {any} Stream to add to connection
   * @param {any} Options with tracks type (video or audio) to add. If options
   *              is ommited than all strean tracks will be added
   */
  protected addStream (pc: any, stream: any, options?: any) {

    // Add tracks selected in options
    if (!options) {
      stream.getTracks().forEach(
        function(track: any) {
          pc.addTrack(track, stream);
        }
      );
    }
    // Add all tracks
    else {
      if (options.video) pc.addTrack(stream.getVideoTracks()[0], stream);
      if (options.audio) pc.addTrack(stream.getAudioTracks()[0], stream);
    }
    console.log('Stream added to pc');
  }

  /**
   * Show error
   *
   * @param {name: string, nessage: string} error Error to show in console
   */
  private logError(error: any) {
    console.error('TeocliRTC::logError', error.name + ": " + error.message +
      ', (error: ', error, ')');
    //this.removeConnection(peer);
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
   *                         or peer not connected to this host,
   *                         or wrong options send (all: video, audio and
   *                            channel is false)
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

      // \TODO Create Chat data channel
      if (options.chat) { }

      return true;
    }

    return false;
  }

  /**
   * Hangup call
   */
  hangup(peer: string) {
    this.removeTracks(peer);
  }

  /**
   * Register remote call answer
   */
  registerCallAnswer(callAnswer: any) {
    this.callAnswer = callAnswer;
  }

  /**
   * Remove all senders (all senders media tracks) from connection
   */
  removeTracks(peer: string) {
    var pc = this.getConnection(peer);
    if (pc) {
      [/*pc.getReceivers(), */pc.getSenders()].forEach((senderss: any) => {
        senderss.forEach((sender: any) => {
          pc.removeTrack(sender);
        });
      });
    }
  }

  /**
   * Unregister remote call answer
   */
  unRegisterCallAnswer() {
    this.callAnswer = undefined;
  }
}
