import { Component, Input } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-global-modal',
  templateUrl: './global-modal.component.html',
  styleUrls: ['./global-modal.component.scss'],
  standalone: false
})
export class GlobalModalComponent {
  @Input() message: string = 'Are you sure?';
  @Input() confirmText: string = 'Yes';
  @Input() cancelText: string = 'No';

  constructor(private modalCtrl: ModalController) { }

  dismiss(result: boolean) {
    this.modalCtrl.dismiss(result);
  }
}