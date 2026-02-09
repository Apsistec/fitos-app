/**
 * Help Search Component
 *
 * Debounced search input for help content with results display.
 * Searches across FAQs, guides, and articles.
 */

import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  effect,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonText,
  IonNote,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  searchOutline,
  helpCircleOutline,
  bookOutline,
  documentTextOutline,
} from 'ionicons/icons';
import { HelpService } from '../../services/help.service';
import { AuthService } from '../../../../core/services/auth.service';
import type { SearchResult } from '@fitos/libs';

@Component({
  selector: 'app-help-search',
  standalone: true,
  imports: [
    FormsModule,
    IonSearchbar,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonText,
    IonNote,
  ],
  templateUrl: './help-search.component.html',
  styleUrls: ['./help-search.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpSearchComponent {
  private helpService = inject(HelpService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Signals
  searchQuery = signal<string>('');
  searchResults = signal<SearchResult[]>([]);
  isSearching = signal<boolean>(false);
  showResults = signal<boolean>(false);

  // Debounce timer
  private searchTimeout?: number;

  // Outputs
  resultSelected = output<SearchResult>();

  constructor() {
    addIcons({
      searchOutline,
      helpCircleOutline,
      bookOutline,
      documentTextOutline,
    });

    // Watch for search query changes and debounce
    effect(() => {
      const query = this.searchQuery();
      this.handleSearchChange(query);
    });
  }

  onSearchInput(event: CustomEvent<{ value: string }>): void {
    const query = event.detail.value || '';
    this.searchQuery.set(query);
  }

  onSearchFocus(): void {
    if (this.searchQuery().trim().length >= 2) {
      this.showResults.set(true);
    }
  }

  onSearchBlur(): void {
    // Delay hiding results to allow click events
    setTimeout(() => {
      this.showResults.set(false);
    }, 200);
  }

  onSearchClear(): void {
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.showResults.set(false);
  }

  onResultClick(result: SearchResult): void {
    this.router.navigate([result.route]);
    this.resultSelected.emit(result);
    this.showResults.set(false);
  }

  private handleSearchChange(query: string): void {
    // Clear previous timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    // If query is too short, clear results
    if (query.trim().length < 2) {
      this.searchResults.set([]);
      this.isSearching.set(false);
      this.showResults.set(false);
      return;
    }

    // Set searching state
    this.isSearching.set(true);
    this.showResults.set(true);

    // Debounce search (300ms)
    this.searchTimeout = window.setTimeout(() => {
      this.performSearch(query);
    }, 300);
  }

  private performSearch(query: string): void {
    const userRole = this.authService.profile()?.role;
    if (!userRole) {
      this.isSearching.set(false);
      return;
    }

    const results = this.helpService.searchContent(query, userRole);
    this.searchResults.set(results);
    this.isSearching.set(false);
  }

  getResultIcon(type: SearchResult['type']): string {
    switch (type) {
      case 'faq':
        return 'help-circle-outline';
      case 'guide':
        return 'book-outline';
      case 'article':
        return 'document-text-outline';
      default:
        return 'search-outline';
    }
  }

  getResultTypeLabel(type: SearchResult['type']): string {
    switch (type) {
      case 'faq':
        return 'FAQ';
      case 'guide':
        return 'Guide';
      case 'article':
        return 'Article';
      default:
        return '';
    }
  }
}
