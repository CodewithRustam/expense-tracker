import { NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { AddExpenseModalComponent } from './add-expense/add-expense.component';
import { FormsModule } from '@angular/forms';
import { CalendarPopoverComponent } from './calendar-popover/calendar-popover.component';
import { AuthInterceptor } from './interceptors/auth-interceptor'; // Import the interceptor
import { NgApexchartsModule } from 'ng-apexcharts';
import { EditExpenseModal } from './modals/edit-expense-modal/edit-expense-modal.component';
import { NotificationListModal } from './modals/notification-list-modal/notification-list-modal.component';
import { SettleExpenseModalComponent } from './modals/settle-expense-modal/settle-expense-modal.component';
import { ServiceWorkerModule } from '@angular/service-worker';

@NgModule({
  declarations: [AppComponent, AddExpenseModalComponent, CalendarPopoverComponent, EditExpenseModal,NotificationListModal, SettleExpenseModalComponent],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    NgApexchartsModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    })
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true } // Register the interceptor
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}