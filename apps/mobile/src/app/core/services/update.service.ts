import { Injectable, inject, ApplicationRef } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, first, concat, interval } from 'rxjs';
import { AlertController } from '@ionic/angular/standalone';

@Injectable({ providedIn: 'root' })
export class UpdateService {
  private swUpdate = inject(SwUpdate);
  private alertCtrl = inject(AlertController);
  private appRef = inject(ApplicationRef);

  /**
   * Initialize update checking
   * Call this once in AppComponent
   */
  initUpdateListener(): void {
    if (!this.swUpdate.isEnabled) {
      console.log('[Update Service] Service worker not enabled');
      return;
    }

    // Check for updates when app becomes stable, then every 6 hours
    const appIsStable$ = this.appRef.isStable.pipe(first((isStable) => isStable === true));
    const everyS6Hours$ = interval(6 * 60 * 60 * 1000); // 6 hours
    const everySixHoursOnceAppIsStable$ = concat(appIsStable$, everySixHours$);

    everySixHoursOnceAppIsStable$.subscribe(async () => {
      try {
        const updateFound = await this.swUpdate.checkForUpdate();
        console.log('[Update Service] Update check:', updateFound ? 'Update available' : 'No update');
      } catch (error) {
        console.error('[Update Service] Error checking for updates:', error);
      }
    });

    // Listen for version updates
    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(async (evt) => {
        console.log('[Update Service] New version available:', evt.latestVersion);
        await this.promptUser();
      });

    // Handle unrecoverable state
    this.swUpdate.unrecoverable.subscribe((event) => {
      console.error('[Update Service] Unrecoverable state:', event.reason);
      this.promptReload('An error occurred that requires a reload.');
    });
  }

  /**
   * Prompt user to update the app
   */
  private async promptUser(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Update Available',
      message: 'A new version of FitOS is available. Would you like to update now?',
      buttons: [
        {
          text: 'Later',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Update',
          handler: () => {
            this.activateUpdate();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Prompt user to reload due to error
   */
  private async promptReload(message: string): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Reload Required',
      message,
      buttons: [
        {
          text: 'Reload',
          handler: () => {
            window.location.reload();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Activate the latest version
   */
  private async activateUpdate(): Promise<void> {
    try {
      await this.swUpdate.activateUpdate();
      window.location.reload();
    } catch (error) {
      console.error('[Update Service] Error activating update:', error);
    }
  }

  /**
   * Manually check for updates
   */
  async checkForUpdate(): Promise<boolean> {
    if (!this.swUpdate.isEnabled) {
      return false;
    }

    try {
      return await this.swUpdate.checkForUpdate();
    } catch (error) {
      console.error('[Update Service] Error checking for updates:', error);
      return false;
    }
  }
}
