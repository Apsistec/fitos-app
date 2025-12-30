import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  // Track concurrent requests
  private _activeRequests = signal(0);
  
  // Public readonly signal for loading state
  readonly isLoading = this._activeRequests.asReadonly();

  /**
   * Increment loading counter
   */
  show(): void {
    this._activeRequests.update(count => count + 1);
  }

  /**
   * Decrement loading counter
   * Only hide when counter reaches 0
   */
  hide(): void {
    this._activeRequests.update(count => Math.max(0, count - 1));
  }
}
