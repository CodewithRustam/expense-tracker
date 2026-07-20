import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { GroupService } from '../../../core/services/group';
import { Toastservice } from '../../../core/services/toastservice';

@Component({
  selector: 'app-remove-member-modal',
  templateUrl: './remove-member-modal.component.html',
  standalone: false
})
export class RemoveMemberModalComponent implements OnInit {
  @Input() roomId!: number;
  @Input() users!: any[];

  isSubmitting: boolean = false;
  serverErrorMsg: string = '';
  removingUserId: number | null = null;

  constructor(
    private modalCtrl: ModalController,
    private toast: Toastservice,
    private groupService: GroupService
  ) { }

  ngOnInit() {
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  selectUser(memberId: number) {
    this.removingUserId = memberId;
  }

  async confirmRemove() {
    if (!this.removingUserId) return;
    
    this.serverErrorMsg = '';
    this.isSubmitting = true;

    this.groupService.removeMember(this.roomId, this.removingUserId).subscribe({
      next: async (res) => {
        this.isSubmitting = false;
        this.removingUserId = null;
        if (res.success || res.isSuccess || res.Success) {
          this.toast.success('Member removed successfully');
          this.modalCtrl.dismiss({ removed: true });
        } else {
          this.serverErrorMsg = res.message || res.Message || 'Failed to remove member.';
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.removingUserId = null;
        this.serverErrorMsg = err.error?.message || err.error?.Message || 'Failed to remove member. Please try again.';
      }
    });
  }
}
