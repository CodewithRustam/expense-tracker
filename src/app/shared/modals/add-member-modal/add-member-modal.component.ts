import { Component, Input, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { GroupService, AddMemberPayload } from '../../../core/services/group';

@Component({
  selector: 'app-add-member-modal',
  templateUrl: './add-member-modal.component.html',
  standalone: false
})
export class AddMemberModalComponent implements OnInit {
  @Input() roomId!: number;
  @Input() roomName!: string;

  memberForm!: FormGroup;
  isSubmitting: boolean = false;
  serverErrorMsg: string = ''; // Used for API errors (e.g., "User not found")

  constructor(
    private modalCtrl: ModalController,
    private toastCtrl: ToastController,
    private fb: FormBuilder,
    private groupService: GroupService
  ) { }

  ngOnInit() {
    // Define Industry Standard Validation Rules
    this.memberForm = this.fb.group({
      name: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(50),
        Validators.pattern(/^[a-zA-Z\s]*$/) // Only letters and spaces allowed
      ]],
      email: ['', [
        Validators.required,
        Validators.email,
        // Optional: Stricter Regex for enterprise email validation
        Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$')
      ]]
    });
  }

  // Easy getter for accessing form controls in the HTML template
  get f() { return this.memberForm.controls; }

  dismiss() {
    this.modalCtrl.dismiss();
  }

  async onAddMember() {
    this.serverErrorMsg = '';

    if (this.memberForm.invalid) {
      this.memberForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    const formValues = this.memberForm.value;
    const payload: AddMemberPayload = {
      roomId: this.roomId,
      name: formValues.name.trim(),
      email: formValues.email.trim()
    };

    this.groupService.addMember(payload).subscribe({
      next: async (res) => {
        this.isSubmitting = false;
        if (res.success || res.roomId) {
          const toast = await this.toastCtrl.create({
            message: 'Member added successfully',
            duration: 2000,
            color: 'success',
            position: 'top'
          });
          await toast.present();
          this.modalCtrl.dismiss({ added: true });
        } else {
          this.serverErrorMsg = res.message || 'Failed to add member.';
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        this.serverErrorMsg = err.error?.message || 'Failed to add member. Please try again.';
      }
    });
  }
}