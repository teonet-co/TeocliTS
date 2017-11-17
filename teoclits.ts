import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { TeonetStatus as TS } from './teocli.module';
import { TeonetClients as TC } from './teocli.clients';

import './teocli.global';

@NgModule({
  declarations: [ TS, TC ],
  entryComponents: [ TS, TC ],
  imports: [ BrowserModule ]
})

export class TeocliTsModule { } // IgnoreModule
