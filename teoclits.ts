import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { TeonetStatus as TS } from './teocli.module';
import { TeonetClients as TC } from './teocli.clients';
import { TeonetPeers as TP } from './teocli.peers';

import './teocli.global';

@NgModule({
  declarations: [ TS, TC, TP ],
  entryComponents: [ TS, TC, TP ],
  imports: [ BrowserModule ]
})

export class TeocliTsModule { } // IgnoreModule
