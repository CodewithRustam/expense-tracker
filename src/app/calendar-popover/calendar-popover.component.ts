import { Component } from '@angular/core';
import { PopoverController } from '@ionic/angular';

@Component({
  selector: 'app-calendar-popover',
  template: `
    <ion-datetime
      presentation="date"
      (ionChange)="selectDate($event)">
    </ion-datetime>
  `,
  standalone:false
})
export class CalendarPopoverComponent {

  constructor(private popoverCtrl: PopoverController) {}

  selectDate(event: any) {
    this.popoverCtrl.dismiss(event.detail.value);
  }
}
