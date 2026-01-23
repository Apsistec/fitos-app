import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSearchbar,
  ToastController, IonIcon } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  searchOutline,
  helpCircleOutline,
} from 'ionicons/icons';
import { FAQAccordionComponent } from '../../components/faq-accordion/faq-accordion.component';
import { HelpService } from '../../services/help.service';
import { AuthService } from '../../../../core/services/auth.service';
import type { FAQItem, HelpCategory, HelpCategoryId } from '@fitos/libs';

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [IonIcon,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonSearchbar,
    FAQAccordionComponent],
  templateUrl: './faq.page.html',
  styleUrls: ['./faq.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FAQPage {
  private helpService = inject(HelpService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastController = inject(ToastController);

  // Signals
  selectedCategory = signal<HelpCategoryId | 'all'>('all');
  searchQuery = signal<string>('');
  expandedFaqIds = signal<Set<string>>(new Set());

  // Computed values
  categories = computed<HelpCategory[]>(() => {
    const role = this.authService.profile()?.role;
    if (!role) return [];
    return this.helpService.getCategories(role);
  });

  filteredFaqs = computed<FAQItem[]>(() => {
    const role = this.authService.profile()?.role;
    if (!role) return [];

    const category = this.selectedCategory();
    const query = this.searchQuery().toLowerCase().trim();

    let faqs = this.helpService.getFAQsByRole(role);

    // Filter by category
    if (category !== 'all') {
      faqs = faqs.filter((faq) => faq.category === category);
    }

    // Filter by search query
    if (query.length >= 2) {
      faqs = faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(query) ||
          faq.answer.toLowerCase().includes(query) ||
          faq.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return faqs;
  });

  constructor() {
    addIcons({
      searchOutline,
      helpCircleOutline,
    });

    // Handle category from route params
    effect(() => {
      const category = this.route.snapshot.paramMap.get('category') as HelpCategoryId;
      if (category) {
        this.selectedCategory.set(category);
      }
    });
  }

  onCategoryChange(event: any): void {
    const category = event.detail.value as HelpCategoryId | 'all';
    this.selectedCategory.set(category);

    // Update URL
    if (category === 'all') {
      this.router.navigate(['/tabs/settings/help/faq']);
    } else {
      this.router.navigate(['/tabs/settings/help/faq', category]);
    }
  }

  onSearchInput(event: any): void {
    const query = event.target.value || '';
    this.searchQuery.set(query);
  }

  onSearchClear(): void {
    this.searchQuery.set('');
  }

  toggleFaq(faqId: string): void {
    const expanded = new Set(this.expandedFaqIds());
    if (expanded.has(faqId)) {
      expanded.delete(faqId);
    } else {
      expanded.add(faqId);
    }
    this.expandedFaqIds.set(expanded);
  }

  isFaqExpanded(faqId: string): boolean {
    return this.expandedFaqIds().has(faqId);
  }

  async onFeedbackHelpful(faqId: string): Promise<void> {
    // In a real implementation, this would send feedback to the backend
    const toast = await this.toastController.create({
      message: 'Thank you for your feedback!',
      duration: 2000,
      color: 'success',
      position: 'bottom',
    });
    await toast.present();
  }

  async onFeedbackNotHelpful(faqId: string): Promise<void> {
    // In a real implementation, this would send feedback to the backend
    const toast = await this.toastController.create({
      message: 'Thank you for your feedback. We\'ll improve this answer.',
      duration: 2000,
      color: 'medium',
      position: 'bottom',
    });
    await toast.present();
  }
}
