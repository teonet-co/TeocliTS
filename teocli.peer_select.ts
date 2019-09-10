import { Component, OnDestroy } from '@angular/core';
import { TeonetCli, Teonet } from './teocli.module';
//import { IntervalObservable } from 'rxjs/observable/IntervalObservable';

export type onpeerDisplArEl = { name: string, translate: string, email: string, type: string, time: number };
export type onpeerDisplAr = Array<onpeerDisplArEl>;

@Component({
  selector: 'teonet-peer-select',
  styles: ['\n\
  .border-right {\n\
    border-right: solid 1px #eee;\n\
  }\n\
  .header {\n\
    border: solid 1px #eee;\n\
  }\n\
  '],
  template: '\n\
    <select class="browser-default custom-select" #t (change)="setPeer(t.value)">\n\
      <option [value]="peer.name" [selected]="peer.name == getPeer()" *ngFor="let peer of peers">{{ peer.name }}</option>\n\
    </select>\n\
  \n'
})

/**
 * Peers select class
 */
export class TeonetPeerSelect implements OnDestroy {

  n: number = 0;
  peers: onpeerDisplAr = [];
  private f: Array<any> = [];
  private onpeers: any;

  // private interval = IntervalObservable.create(1000).subscribe(() => { //.subscribe(n => this.n = n);
  //   this.n++;
  //   if (this.isComponentActive()) this.t.peers(Teonet.peer.l0);
  // });

  constructor(private t: TeonetCli) {
    console.log('TeonetPeers::constructor');
    this.f.push(t.whenEvent('onpeers', (data: any): number => {
      console.log('TeonetPeers::constructor: onpeers', data);
      this.peers = data[0][0].data.arp_data_ar;
      if (this.onpeers) this.onpeers();
      return 0;
    }));
    this.t.peers(Teonet.peer.l0);
  }

  getPeer() {
    return Teonet.peer.l0
  }

  setPeer(name) {
    Teonet.peer.l0 = name;
  }

  ngOnDestroy() {
    for (let f of this.f) this.t.unsubscribe(f);
    //this.interval.unsubscribe();
  }

  // setOnpeers(onpeers: any) {
  //   this.onpeers = onpeers;
  // }

  // private isComponentActive(): boolean {
  //   return this.t.isTeonetClientsActive();
  // }
}
