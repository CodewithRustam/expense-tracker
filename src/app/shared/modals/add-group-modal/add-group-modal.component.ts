import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import { GroupService } from '../../../core/services/group';
import { Toastservice } from '../../../core/services/toastservice';

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
    private toastService: Toastservice
  ) { }

  ngOnInit() {
    this.groupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      members: this.fb.array([])
    });
  }

  get f() { return this.groupForm.controls; }
  get members() { return this.groupForm.get('members') as FormArray; }

  get isAddDisabled(): boolean {
    if (this.isSubmitting) return true;
    if (!this.groupForm) return true;
    const name = (this.groupForm.get('name')?.value || '').trim();
    if (!name) return true;
    return this.groupForm.invalid;
  }

  get isAddMemberDisabled(): boolean {
    if (!this.groupForm) return true;
    const name = (this.groupForm.get('name')?.value || '').trim();
    if (!name) return true; // Room name input is empty
    for (const m of this.members.controls) {
      const mName = (m.get('name')?.value || '').trim();
      const mEmail = (m.get('email')?.value || '').trim();
      if (!mName || !mEmail) return true; // Previous member inputs empty
    }
    return false;
  }

  addMember() {
    if (this.isAddMemberDisabled) return;
    this.members.push(this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50), Validators.pattern(/^[a-zA-Z\s]*$/)]],
      email: ['', [Validators.required, Validators.email]] 
    }));
  }

  removeMember(index: number) {
    this.members.removeAt(index);
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
          this.toastService.success('Group created successfully!');
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
