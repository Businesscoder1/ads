import { Component } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'hostel-admission';
  submissionInProgress = false;
  submissionSuccess = false;
  errorMessage = '';

  formData = {
    fullName: '',
    dob: '',
    gender: '',
    email: '',
    phone: '',
    address: '',
    course: '',
    year: ''
  };

  constructor(private http: HttpClient) {}

  submitForm(form: NgForm) {
    if (form.invalid || this.submissionInProgress) return;

    this.submissionInProgress = true;
    this.submissionSuccess = false;
    this.errorMessage = '';

    this.http.post('http://localhost:3000/admissions', this.formData)
      .subscribe({
        next: (response) => {
          this.submissionSuccess = true;
          this.resetForm(form);
        },
        error: (err) => {
          this.errorMessage = err.error?.message || 'Failed to submit admission. Please try again.';
          console.error('Submission error:', err);
        },
        complete: () => this.submissionInProgress = false
      });
  }

  private resetForm(form: NgForm) {
    this.formData = {
      fullName: '',
      dob: '',
      gender: '',
      email: '',
      phone: '',
      address: '',
      course: '',
      year: ''
    };
    form.resetForm();
  }
}