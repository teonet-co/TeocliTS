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

import { Teonet, TeonetCli } from './teocli.module';
import { TeocliCrypto } from 'teocli/teocli.crypto';
import * as CryptoJS from 'crypto-js';

/**
 * Class to Encode and Decode Base64 string
 */
export class Base64 {

  private keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  /**
   * Encode string to Base64 string
   *
   * @param {string} input String to encode
   *
   * @return {string} Encoded string
   */
  encode(input: string): string {

    var output = '';
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;

    do {
      chr1 = input.charCodeAt(i++);
      chr2 = input.charCodeAt(i++);
      chr3 = input.charCodeAt(i++);

      enc1 = chr1 >> 2;
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      enc4 = chr3 & 63;

      if (isNaN(chr2)) {
        enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
        enc4 = 64;
      }

      output = output +
        this.keyStr.charAt(enc1) +
        this.keyStr.charAt(enc2) +
        this.keyStr.charAt(enc3) +
        this.keyStr.charAt(enc4);
      chr1 = chr2 = chr3 = '';
      enc1 = enc2 = enc3 = enc4 = '';
    } while (i < input.length);

    return output;
  }

  /**
   * Decode Base64 string to string
   *
   * @param {string} input Base64 string to decode
   *
   * @return {string} Decoded string
   */
  decode(input: string): string {

    var output = '';
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;

    // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
    var base64test = /[^A-Za-z0-9\+\/\=]/g;
    if (base64test.exec(input)) {

      //window.alert(
      console.error("There were invalid base64 characters in the input text.\n" +
        "Valid base64 characters are A-Z, a-z, 0-9, '+', '/',and '='\n" +
        "Expect errors in decoding.");
    }
    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, '');

    do {
      enc1 = this.keyStr.indexOf(input.charAt(i++));
      enc2 = this.keyStr.indexOf(input.charAt(i++));
      enc3 = this.keyStr.indexOf(input.charAt(i++));
      enc4 = this.keyStr.indexOf(input.charAt(i++));

      chr1 = (enc1 << 2) | (enc2 >> 4);
      chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      chr3 = ((enc3 & 3) << 6) | enc4;

      output = output + String.fromCharCode(chr1);

      if (enc3 !== 64) {
        output = output + String.fromCharCode(chr2);
      }
      if (enc4 !== 64) {
        output = output + String.fromCharCode(chr3);
      }

      chr1 = chr2 = chr3 = '';
      enc1 = enc2 = enc3 = enc4 = '';

    } while (i < input.length);

    return output;
  }
}

/**
 * Class to store teonet client data
 */
export class TeonetStorage {
  
  constructor(private key: string) {}
  
  get() {
    return JSON.parse( <string>localStorage.getItem(this.key));
  }
  
  set(value: any) {
    localStorage.setItem(this.key, JSON.stringify(value));
  }
}

/**
 * Class to send clients requests to authentication teonet peer
 */
export class TeonetAuthRequests {

  constructor(private teocli: TeonetCli) {}

  /**
   * Request user info
   *
   * @param {string} name User accessToken
   */
  sendUserInfo(name: string) {

    console.log("TeocliAuthRequests::sendUserInfo", name);

    if (this.teocli !== undefined)
      this.teocli.send('{ "cmd": 132, "to": "' + Teonet.peer.auth + '", "data": ["' + name + '"] }');
  }

  /**
   * Request clients info
   *
   * @param {string} client Client accessToken
   */
  sendClientInfo(client: string) {

    console.log("TeocliAuthRequests::sendClientInfo", client);

    if (this.teocli !== undefined)
      this.teocli.send('{ "cmd": 134, "to": "' + Teonet.peer.auth + '", "data": ["' + client + '"] }');
  }
}

/**
 * Authentication server responce type
 */
declare type response = {status: number, data: any};

/**
 * TeonetAuth class
 *
 */
export class TeonetAuth {

  private $localStorage: any;

  private $location: any;

  private $rootScope: {
    userName:  string,
    userLogin: string
  }

  //\TODO: Implement HTTP to alternative send or depricate this
  private $http: {

  }

  /**
   * Authentication request throught websocket timeout
   */
  private _ws_timeout = 10000;

  /**
   * Method POST constant
   */
  private _POST = "POST";

  /**
   * Method GET constant
   */
  private _GET = "GET";

  /**
   * Last time login or refresh
   */
  private _refreshTime = 0;

  /**
   * Base64 class object to encode text
   */
  private base64 = new Base64();

  /**
   * TeocliCrypto (based on CryptoJS) class object
   */
  private teocliCrypto = new TeocliCrypto(CryptoJS);
  
  /**
   * TeonetStorage class object with key 'teonet_user'
   */
  storage = new TeonetStorage('teonet_user');

  /**
   * User class constructor
   */
  constructor(private teocli: TeonetCli) {
    
    this.$localStorage =  {
      
      settings: {
        auth_server_addr: '',
        auth_server_port: '',
        auth_separate: ''
      },

      user: this.storage.get(),
    };

    this.$location = {
      path: (url: string) => {
        console.error('TeonetAuth::$location.path try change location to: ', url);
      }
    };
  }

  /**
   * Check websocker response error
   *
   * @param {any} err
   * @param {response} response
   * @param {any} callback
   */
  private _check_error(err: any, response: response, callback: any) {

    if (err || response.status !== 200) {

      var REQUEST_FAILED = "Request failed";
      if (response) callback(response.status, response.data || REQUEST_FAILED);
      else callback(REQUEST_FAILED, REQUEST_FAILED);

      return true;
    }
    return false;
  };

  /**
   * Make Authentication server URL
   *
   * @returns {string}
   */
  private _auth_server() {
    return 'http://' +
      this.$localStorage.settings.auth_server_addr + ":" +
      this.$localStorage.settings.auth_server_port + '/api/auth/';
  };

  /**
   * Decrypt text with CryptoJS AES
   *
   * @param {string} text
   * @param {string} secret
   *
   * @returns {string}
   */
  private _decrypt(text: string, secret: string) {
    return this.teocliCrypto.decrypt(text, secret);
  };

  /**
   * Encrypt object with CryptoJS AES
   *
   * @param {any} data
   * @param {string} secret
   *
   * @returns {any}
   */
  private _encrypt(data: any, secret: string) {
    return this.teocliCrypto.encrypt(data, secret);;
  };

  /**
   * Get hash of string with CryptoJS SHA512
   *
   * @param {string} text Input text
   * @return {string} Hash of input string
   */
  private _hash(text: string): string {
    return this.teocliCrypto.hash(text);
  }

  /**
   * Encode string with Base64
   */
  private _encode(text: string): string {
    return this.base64.encode(text);
  }
  
  private _decode(text: string): string {
    return this.base64.decode(text);
  }

  /**
   * Extends one object by enother
   *
   * @param {any} myObj Object to extend
   * @param {any} newObj Object to extend from
   */
  private _extend(myObj: any, newObj: any) {
    Object.keys(newObj).forEach(function (key: string, index: number) {
      // key: the name of the object key
      // index: the ordinal position of the key within the object
      myObj[key] = newObj[key];
    });
  }

  /**
   * Check client info and request it if absent
   *
   * @param {any} callback
   */
  private _checkClient(callback: any) {

    var user = this.$localStorage.user;

    if (user && user.clientId && user.clientSecret && user.clientKey) {
      callback(null);
      return;
    }

    // Register client if clientId is absent
    this.registerClient(function (err: any, response: any) {

      if (err) {
        callback(err, response);
        return;
      }
      callback(null);
    });
  };

  /**
   * Set refresh time
   * @returns {undefined}
   */
  private _setRefreshTime() {
    this._refreshTime = Date.now();
  };

  /**
   * Check time to refresh and refresh if need
   *
   * @param {any} callback
   */
  private _checkRefresh(callback: any) {

    if ((Date.now() - this._refreshTime) > 30 * 60 * 1000) this.refresh(callback);
    else callback(null, "Refresh not need now");
  };

  /**
   * Check user login to this application
   *
   * @returns {teocli_auth_L5.$localStorage.user}
   */
  private _checkUserLogin() {

    if (!this.$localStorage.user) this.$location.path("/login");

    return this.$localStorage.user;
  };

  /**
   * Update rootScope userName parameter
   *
   */
  private _updateUserName() {

    if (this._checkUserLogin()) {
      this.$rootScope.userName = this.$localStorage.user.username;
      this.$rootScope.userLogin = "Logout";
    }
    else {
      this.$rootScope.userName = ""; //"Admin";
      this.$rootScope.userLogin = ""; //"Login";
    }
  };
  
  /**
   * Get user from teonet storage
   */
  getUser() {
    return this.$localStorage.user;
  }

  /**
   * Register client
   *
   * @param {any} callback
   */
  registerClient(callback: any) {

    var data = {
      //            os: {
      //                type: os.type(),
      //                platform: os.platform(),
      //                arch: os.arch(),
      //                cpus: os.cpus(),
      //                networkInterfaces: os.networkInterfaces()
      //            }
      type: "teonet-lig-i2"
      //teoman_device: device
    };

    var success = (response: response) => {

      //this.$localStorage.user = response.data;
      this._extend(this.$localStorage.user, response.data);

      // Delay before login/register to get time to save data to DataBase
      setTimeout(function () {
        callback(null, response.data);
      }, 100);
    };

    // HTTP request
    if (this.$localStorage.settings && this.$localStorage.settings.auth_separate) {
      console.error('TeonetAuth::registerClient The HTTP request to authentication' +
        'server hase not implemented');
      //\TODO: implement HTTP request
      //      this.$http({
      //
      //        method: this._POST,
      //        url: this._auth_server() + 'register-client',
      //        data: data
      //
      //      }).then(function(response){
      //
      //          success(response);
      //
      //      }, function(response){
      //
      //          callback(response.status, response.data || "Request failed");
      //      });
    }

    // Teocli (websocket) request
    else this.teocli.auth(
      '',                   // To
      this._POST,           // Method
      'register-client',    // URL
      JSON.stringify(data), // Data
      '',                   // Header
      this._ws_timeout,     // Timeout
      (err: any, response: response) => {  // Callback
        console.debug("TeonetAuth::registerClient teocli.auth register-client: ", err, response);
        if (!this._check_error(err, response, callback)) success(response);
      });
  };

  /**
   * Register User
   *
   * @param {string} email
   * @param {string} password
   * @param {string} name
   * @param {string} userData
   * @param {any} callback
   */
  register(email: string, password: string, name: string, userData: string,
    callback: any) {

    this._checkClient((err: any) => {

      if (err) {
        callback(err);
        return;
      }

      var data = {
        email: email,
        hashPassword: this._hash(password),
        username: name,
        userData: userData
      };

      var success = (response: response) => {

        // Decrypt
        var dec = this._decrypt(response.data.data, this.$localStorage.user.clientKey);
        //angular.extend($localStorage.user, JSON.parse(dec.toString()));
        this._extend(this.$localStorage.user, JSON.parse(dec.toString()));

        // Save refresh time
        this._setRefreshTime();

        callback(null, response);
      };

      var user = this.$localStorage.user;

      // HTTP request
      if (this.$localStorage.settings && this.$localStorage.settings.auth_separate) {
        console.error('TeonetAuth::register The HTTP request to authentication' +
          'server hase not implemented');
        //\TODO: Implement HTTP request
        //              this.$http({
        //
        //                method: this._POST,
        //                url: this._auth_server() + 'register',
        //                data: this._encrypt(data, user.clientKey),
        //                headers: {
        //                    'Authorization': 'Basic ' + Base64.encode(user.clientId + ':' + user.clientSecret)
        //                }
        //
        //              }).then(function(response) {
        //
        //                success(response);
        //
        //              }, function(response){
        //
        //                callback(response.status, response.data || "Request failed");
        //
        //              });
      }

      // Teocli (websocket) request
      else this.teocli.auth(
        '',
        this._POST,
        'register',
        JSON.stringify(this._encrypt(data, user.clientKey)),
        "Authorization: Basic " + this._encode(user.clientId + ':' + user.clientSecret),
        this._ws_timeout,
        (err: any, response: response) => {
          console.log("TeonetAuth::register teocli.auth register: ", err, response);
          // Check error
          if (!this._check_error(err, response, callback)) success(response);
        }
      );
    });
  };

  /**
   * User login
   *
   * @param {string} email
   * @param {string} password
   * @param {any} callback
   */
  login(email: string, password: string, callback: any) {

    this._checkClient((err: any, response: any) => {

      if (err) {
        callback(err, response);
        return;
      }

      var data = {
        email: email,
        hashPassword: this._hash(password)
      };

      var success = (response: response) => {
        var dec = this._decrypt(response.data.data, this.$localStorage.user.clientKey);
        //angular.extend($localStorage.user, JSON.parse(dec.toString()));
        this._extend(this.$localStorage.user, JSON.parse(dec.toString()));

        console.log('TeonetAuth::login success $localStorage.user = ', this.$localStorage.user);
        localStorage.setItem('teonet_user', JSON.stringify(this.$localStorage.user));

        this._setRefreshTime();
        callback(null, response || "Request success");
      };

      var user = this.$localStorage.user;

      // HTTP request
      if (this.$localStorage.settings && this.$localStorage.settings.auth_separate) {
        console.error('TeonetAuth::login The HTTP request to authentication' +
          'server hase not implemented');
        //\TODO: Implement HTTP request
        //          this.$http({
        //
        //            method: this._POST,
        //            url: this._auth_server() + 'login',
        //            data: this._encrypt(data, user.clientKey),
        //            headers: {
        //                'Authorization': 'Basic ' + Base64.encode(user.clientId + ':' + user.clientSecret)
        //            }
        //
        //          }).then(function(response) {
        //
        //            success(response);
        //
        //          }, function(response){
        //
        //            callback(response.status, response.data || "Request failed");
        //
        //          });
      }

      // Teocli (websocket) request
      else this.teocli.auth(
        '',
        this._POST, 'login',
        JSON.stringify(this._encrypt(data, user.clientKey)),
        "Authorization: Basic " + this._encode(user.clientId + ':' + user.clientSecret),
        this._ws_timeout,
        (err: any, response: response) => {
          console.log("TeonetAuth::login teocli.auth login:", err, response);
          if (!this._check_error(err, response, callback)) success(response);
        }
      );
    });
  };

  /**
   * Refresh Access Token
   *
   * @param {any} callback
   */
  refresh(callback: any) {

    console.log("TeonetAuth::refresh");

    var user = this.$localStorage.user;
    var data = {refreshToken: user.refreshToken};
    var success = (response: response) => {

      // Decrypt response data and extend user storage
      var dec = this._decrypt(response.data.data, this.$localStorage.user.clientKey);
      //angular.extend($localStorage.user, JSON.parse(dec.toString()));
      this._extend(this.$localStorage.user, JSON.parse(dec.toString()));
      // Save refresh time
      this._setRefreshTime();

      callback(null, response || "Refresh success");
    };
    var error = () => {

      // Remove authorisation tokens
      delete this.$localStorage.user.accessToken;
      delete this.$localStorage.user.refreshToken;
      delete this.$localStorage.user.expiresIn;
    };

    // HTTP request
    if (this.$localStorage.settings && this.$localStorage.settings.auth_separate) {
      console.error('TeonetAuth::refresh The HTTP request to authentication' +
        'server hase not implemented');
      // //\TODO: Implement HTTP request
      //            this.$http({
      //
      //            method: this._POST,
      //            url: this._auth_server() + 'refresh',
      //            data: data,
      //            headers: {
      //                'Authorization': 'Basic ' + Base64.encode(user.clientId + ':' + user.clientSecret)
      //            }
      //
      //        }).then(function(response) {
      //
      //            success(response);
      //
      //        }, function(response){
      //
      //            callback(response.status, response.data || "Refresh failed");
      //            error();
      //        });
    }

    // Teocli (websocket) request
    else this.teocli.auth(
      "", this._POST, 'refresh',
      JSON.stringify(data),
      "Authorization: Basic " + this._encode(user.clientId + ':' + user.clientSecret),
      this._ws_timeout,
      (err: any, response: response) => {
        console.log("TeonetAuth::refresh teocli.auth refresh:", err, response);
        if (this._check_error(err, response, callback)) error();
        else success(response);
      }
    );
  };

  /**
   *
   * Restore (retrieve) user password
   *
   * @param {string} email
   * @param {any} callback
   */
  restore(email: string, callback: any) {

    this._checkClient((err: any) => {

      var user = this.$localStorage.user;
      var data = this._encrypt({email: email}, user.clientKey);
      var success = function (response: response) {

        // Decrypt response data and extend user storage
        //var dec = this._decrypt(response.data.data, $localStorage.user.clientKey);
        //this._extend($localStorage.user, JSON.parse(dec.toString()));
        callback(null, response || "Refresh success");
      };
      var error = function () {
        // Do something ....
      };

      if (err) {
        callback(err);
        return;
      }

      // HTTP request
      if (this.$localStorage.settings && this.$localStorage.settings.auth_separate) {
        console.error('TeonetAuth::restore The HTTP request to authentication' +
          'server hase not imp        lemented');
        //\TODO: Implement HTTP request
        //        this.$http({
        //
        //        method: this._POST,
        //        url: this._auth_server() + 'restore',
        //        data: data,
        //        headers: {
        //            'Authorization': 'Basic ' + Base64.encode(user.clientId + ':' + user.clientSecret)
        //        }
        //
        //        }).then(function(response) {
        //
        //          success(response);
        //
        //        }, function(response){
        //
        //          callback(response.status, response.data || "Retrieve failed");
        //          error();
        //        });
      }
      // Teocli (websocket) request
      else this.teocli.auth(
        '',
        this._POST,
        'restore',
        JSON.stringify(data),
        'Authorization: Basic ' + this._encode(user.clientId + ':' + user.clientSecret),
        this._ws_timeout, (err: any, response: response) => {
          console.log("TeonetAuth::restore teocli.auth restore:", err, response);
          if (this._check_error(err, response, callback)) error();
          else success(response);
        }
      );
    });
  };

  /**
   * Update user info
   *
   * @param {string} username
   * @param {any} callback
   */
  changeUsername(username: string, callback: any) {

    this._checkClient((err: any, response: any) => {

      var data = {username: username};
      var success = function (response: response) {

        // Decrypt response data and extend user storage
        //var dec = this._decrypt(response.data.data, $localStorage.user.clientKey);
        //this._extend($localStorage.user, JSON.parse(dec.toString()));
        callback(null, response || "Change name success");
      };
      var error = function () {
        // Do something ....
      };

      if (err) {
        callback(err, response);
        return;
      }

      this._checkRefresh(() => {

        var user = this.$localStorage.user;
        var URL = 'change-username';

        // HTTP request
        if (this.$localStorage.settings && this.$localStorage.settings.auth_separate) {
          console.error('TeonetAuth::restore The HTTP request to authentication' +
            'server hase not imp        lemented');
          //\TODO: Implement HTTP request
          //                   this.$http({
          //
          //                    method: this._POST,
          //                    url: this._auth_server() + URL,
          //                    data: data,
          //                    headers: {
          //                        'Authorization': 'Bearer ' + user.accessToken
          //                    }
          //
          //                }).then(function(response) {
          //
          //                    success(response);
          //
          //                }, function(response){
          //
          //                    callback(response.status, response.data || "Change name failed");
          //                    error();
          //                });
        }
        // Teocli (websocket) request
        else this.teocli.auth(
          '',
          this._POST,
          URL,
          JSON.stringify(data),
          "Authorization: Bearer " + user.accessToken,
          this._ws_timeout,
          (err: any, response: response) => {
            console.log("TeonetAuth::changeUsername teocli.auth.changeUsername:", err, response);
            if (this._check_error(err, response, callback)) error();
            else success(response);
          }
        );
      });
    });
  };

  /**
   * Change user password
   *
   * @param {string} password
   * @param {string} passwordNew
   * @param {any} callback
   */
  changeUserpassword(password: string, passwordNew: string, callback: any) {

    this._checkClient((err: any) => {

      var success = function (response: response) {

        // Decrypt response data and extend user storage
        //var dec = this._decrypt(response.data.data, $localStorage.user.clientKey);
        //angular.extend($localStorage.user, JSON.parse(dec.toString()));
        callback(null, response || "Change password success");
      };
      var error = function () {

        // Do something ....
      };

      if (err) {
        callback(err);
        return;
      }

      this._checkRefresh(() => {

        var URL = 'change-password';
        var user = this.$localStorage.user;
        var data = this._encrypt({
          current: this._hash(password),
          new: this._hash(passwordNew)
        }, user.clientKey);

        // HTTP request
        if (this.$localStorage.settings && this.$localStorage.settings.auth_separate) {
          console.error('TeonetAuth::restore The HTTP request to authentication' +
            'server hase not imp        lemented');
          //\TODO: Implement HTTP request
          //                  this.$http({
          //
          //                    method: this._POST,
          //                    url: this._auth_server() + URL,
          //                    data: data,
          //                    headers: {
          //                        'Authorization': 'Bearer ' + user.accessToken
          //                    }
          //
          //                }).then(function(response) {
          //
          //                    success(response);
          //
          //                }, function(response){
          //
          //                    callback(response.status, response.data || "Change password failed");
          //                    error();
          //                });
        }

        // Teocli (websocket) request
        else this.teocli.auth(
          '',
          this._POST,
          URL,
          JSON.stringify(data),
          "Authorization: Bearer " + user.accessToken,
          this._ws_timeout,
          (err: any, response: response) => {
            console.log("TeonetAuth::changeUsername teocli.auth.changeUserpassword:", err, response);
            if (this._check_error(err, response, callback)) error();
            else success(response);
          }
        );
      });
    });
  };
}
