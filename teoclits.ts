import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { TeonetStatus as TS } from './teocli.module';
import { TeonetClients as TC } from './teocli.clients';
import { TeonetPeers as TP } from './teocli.peers';
import { TeonetPeerSelect as TPS } from './teocli.peer_select';

import './teocli.global';

@NgModule({
  declarations: [TS, TC, TP, TPS],
  entryComponents: [TS, TC, TP, TPS],
  imports: [BrowserModule]
})

export class TeocliTsModule { } // IgnoreModule
