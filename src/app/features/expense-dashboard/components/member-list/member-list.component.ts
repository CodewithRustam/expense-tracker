import { Component, EventEmitter, Input, Output } from '@angular/core';
import { InitialsPipe } from '../../../../shared/pipes/initials.pipe';
import { FirstNamePipe } from '../../../../shared/pipes/first-name.pipe';

@Component({
  selector: 'app-member-list',
  templateUrl: './member-list.component.html',
  standalone: false
})
export class MemberListComponent {
  @Input() isLoading = false;
  @Input() users: any[] = [];
  @Input() selectedUser: number | undefined;
  @Input() isNextMonthDisabled = false;

  @Output() onSelectUser = new EventEmitter<number>();
  @Output() onAddMember = new EventEmitter<void>();

  selectUser(userId: number) {
    this.onSelectUser.emit(userId);
  }

  addMember() {
    this.onAddMember.emit();
  }
}
