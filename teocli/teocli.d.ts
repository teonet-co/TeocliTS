/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


//export declare class Teocli {

export default class Teocli {
    
    client_name: string;
    
    constructor(ws: WebSocket);
    
    onopen(ev: any): void;
    onclose(ev: any): void;
    onerror(ev: any): void;
    onother(err: any, data: any): number;
    
    login(client_name: string): void;
    echo(to: string, msg: string);
}