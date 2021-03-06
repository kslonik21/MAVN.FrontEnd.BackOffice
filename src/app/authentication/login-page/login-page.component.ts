import {Component, OnInit, ViewEncapsulation} from '@angular/core';
import {FormBuilder, Validators} from '@angular/forms';
import {AuthenticationService} from '../authentication.service';
import {AuthTokenService} from 'ngx-api-utils';
import {markFormControlAsTouched} from '../../shared/utils/markFormControlAsTouched';
import {LoginErrorCodes} from './login-error-codes.enum';
import {EmailValidator} from 'src/app/shared/utils/validators';

@Component({
  selector: 'app-login-page',
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class LoginPageComponent implements OnInit {
  loading = false;
  revealPasswordField = true;
  loginErrorMessage: string;
  loginForm = this.fb.group({
    Email: ['', [Validators.required, EmailValidator]],
    Password: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(100)]]
  });

  constructor(
    // services
    private authTokenService: AuthTokenService,
    private authService: AuthenticationService,
    private fb: FormBuilder
  ) {}

  ngOnInit() {}

  onSubmit() {
    markFormControlAsTouched(this.loginForm);

    if (!this.loginForm.valid) {
      return;
    }

    this.loginErrorMessage = '';
    this.loading = true;

    this.authService.login(this.loginForm.value).subscribe(
      response => {
        this.authService.setUserData(response.AdminUser);
        this.authTokenService.value$.next(response.Token);
        this.authService.setCookieToken(response.Token);
      },
      ({error}) => {
        if (error.error === LoginErrorCodes.InvalidCredentials) {
          this.loginErrorMessage = error.message;
          this.loginForm.setErrors({invalidLogin: true});
        } else if (error.error === LoginErrorCodes.InvalidEmailFormat) {
          this.loginErrorMessage = error.message;
          this.loginForm.get('Email').setErrors({email: true});
        } else if (error) {
          this.loginErrorMessage = error.error + ': ' + error.message;
        } else {
          this.loginErrorMessage = 'Unknown error occured, please try again or contact support.';
        }

        console.error(error);

        this.loading = false;
      }
    );
  }

  onTogglePasswordDisplay() {
    this.revealPasswordField = !this.revealPasswordField;
  }
}
