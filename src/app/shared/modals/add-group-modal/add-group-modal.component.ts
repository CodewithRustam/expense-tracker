import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ModalController, ToastController } from '@ionic/angular';
import { GroupService } from '../../../core/services/group';

@Component({
  selector: 'app-add-group-modal',
  templateUrl: './add-group-modal.component.html',
  standalone: false
})
export class AddGroupModalComponent implements OnInit {
  groupForm!: FormGroup;
  isSubmitting: boolean = false;
  serverErrorMsg: string = '';

  constructor(
    private modalCtrl: ModalController,
    private fb: FormBuilder,
    private groupService: GroupService,
    private toastCtrl: ToastController
  ) { }

  ngOnInit() {
    this.groupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      members: this.fb.array([])
    });
  }

  get f() { return this.groupForm.controls; }
  get members() { return this.groupForm.get('members') as FormArray; }

  async addMember() {
    this.members.push(this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50), Validators.pattern(/^[a-zA-Z\s]*$/)]],
      email: ['', [Validators.required, Validators.email]] 
    }));
    
    // Automatically increase modal height to show the newly added rows
    const modal = await this.modalCtrl.getTop();
    if (modal) {
      modal.setCurrentBreakpoint(0.9);
    }
  }

  async removeMember(index: number) {
    this.members.removeAt(index);
    
    // If no members are left, shrink it back to the smaller size
    if (this.members.length === 0) {
      const modal = await this.modalCtrl.getTop();
      if (modal) {
        modal.setCurrentBreakpoint(0.5);
      }
    }
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  onCreateGroup() {
    this.serverErrorMsg = '';

    if (this.groupForm.invalid) {
      this.groupForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    const formValues = this.groupForm.value;
    const payload = {
      name: formValues.name.trim(),
      members: formValues.members.map((m: any) => ({
        name: m.name.trim(),
        email: m.email?.trim() || null
      }))
    };

    this.groupService.createGroup(payload).subscribe({
      next: async (res) => {
        this.isSubmitting = false;
        if (res.success || res.roomId) {
          const toast = await this.toastCtrl.create({
            message: 'Group created successfully!',
            duration: 2000,
            color: 'success',
            position: 'top'
          });
          await toast.present();
          this.modalCtrl.dismiss({ added: true });
        } else {
          this.serverErrorMsg = res.message || 'Failed to create group.';
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.serverErrorMsg = err.error?.message || 'Failed to create group. Please try again.';
      }
    });
  }
}
