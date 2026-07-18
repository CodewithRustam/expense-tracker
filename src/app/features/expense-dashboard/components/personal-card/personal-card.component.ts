import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-personal-card',
  templateUrl: './personal-card.component.html',
  standalone: false
})
export class PersonalCardComponent {
  @Input() isLoadingExpenses = false;
  @Input() users: any[] = [];
  @Input() selectedUser: number | undefined;

  @Output() onSettle = new EventEmitter<any>();

  settle(user: any) {
    this.onSettle.emit(user);
  }
}
