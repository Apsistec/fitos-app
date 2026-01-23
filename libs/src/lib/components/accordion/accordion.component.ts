import { Component, Input, Output, EventEmitter, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface AccordionItem {
  id: string;
  title: string;
  content: string; // Can be HTML
  isExpanded?: boolean;
}

@Component({
  selector: 'fitos-accordion',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="accordion-container">
      @for (item of items; track item.id; let i = $index) {
        <div class="accordion-item" [class.expanded]="isExpanded(item.id)">
          <button
            class="accordion-header"
            (click)="toggle(item.id)"
            [attr.aria-expanded]="isExpanded(item.id)"
            [attr.aria-controls]="'accordion-content-' + item.id"
          >
            <span class="accordion-title">{{ item.title }}</span>
            <svg
              class="accordion-icon"
              [class.rotated]="isExpanded(item.id)"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          <div
            class="accordion-content-wrapper"
            [class.expanded]="isExpanded(item.id)"
            [id]="'accordion-content-' + item.id"
            [attr.aria-hidden]="!isExpanded(item.id)"
          >
            <div class="accordion-content" [innerHTML]="item.content"></div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .accordion-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .accordion-item {
      background-color: var(--fitos-bg-secondary, #1a1a1a);
      border: 1px solid var(--fitos-border-default, #2a2a2a);
      border-radius: 12px;
      overflow: hidden;
      transition: all 0.25s ease;
    }

    .accordion-item:hover {
      border-color: var(--fitos-border-strong, #3a3a3a);
    }

    .accordion-item.expanded {
      border-color: var(--fitos-accent-primary, #10b981);
    }

    .accordion-header {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      background: transparent;
      border: none;
      cursor: pointer;
      text-align: left;
      transition: all 0.25s ease;
    }

    .accordion-header:hover {
      background-color: rgba(16, 185, 129, 0.05);
    }

    .accordion-header:focus {
      outline: none;
      background-color: rgba(16, 185, 129, 0.08);
    }

    .accordion-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--fitos-text-primary, #ffffff);
      margin-right: 16px;
      flex: 1;
    }

    .accordion-icon {
      flex-shrink: 0;
      color: var(--fitos-accent-primary, #10b981);
      transition: transform 0.25s cubic-bezier(0.4, 0.0, 0.2, 1);
    }

    .accordion-icon.rotated {
      transform: rotate(180deg);
    }

    .accordion-content-wrapper {
      max-height: 0;
      overflow: hidden;
      opacity: 0;
      transition: max-height 0.3s cubic-bezier(0.4, 0.0, 0.2, 1),
                  opacity 0.25s cubic-bezier(0.4, 0.0, 0.2, 1);
    }

    .accordion-content-wrapper.expanded {
      max-height: 2000px;
      opacity: 1;
    }

    .accordion-content {
      padding: 0 24px 20px 24px;
      color: var(--fitos-text-secondary, #b0b0b0);
      line-height: 1.6;
      font-size: 1rem;
    }

    .accordion-content :deep(p) {
      margin: 0 0 12px 0;
    }

    .accordion-content :deep(p:last-child) {
      margin-bottom: 0;
    }

    .accordion-content :deep(ul) {
      margin: 12px 0;
      padding-left: 24px;
    }

    .accordion-content :deep(li) {
      margin: 8px 0;
    }

    .accordion-content :deep(strong) {
      color: var(--fitos-text-primary, #ffffff);
      font-weight: 600;
    }

    .accordion-content :deep(code) {
      background-color: var(--fitos-bg-tertiary, #0d0d0d);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.875rem;
    }

    .accordion-content :deep(h4) {
      margin: 16px 0 8px 0;
    }
  `],
})
export class AccordionComponent implements OnInit {
  @Input() items: AccordionItem[] = [];
  @Input() singleExpand = true; // Only one item can be expanded at a time
  @Input() defaultExpandedId?: string; // ID of item to expand by default

  @Output() itemToggled = new EventEmitter<{ id: string; isExpanded: boolean }>();

  private expandedIds = signal<Set<string>>(new Set());

  ngOnInit() {
    // Set default expanded item
    if (this.defaultExpandedId) {
      this.expandedIds.set(new Set([this.defaultExpandedId]));
    } else if (this.items.length > 0) {
      // Expand first item by default
      this.expandedIds.set(new Set([this.items[0].id]));
    }
  }

  isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  toggle(id: string): void {
    const currentIds = new Set(this.expandedIds());
    const wasExpanded = currentIds.has(id);

    if (this.singleExpand) {
      // Single expand mode: close all others
      currentIds.clear();
      if (!wasExpanded) {
        currentIds.add(id);
      }
    } else {
      // Multi expand mode: toggle this item
      if (wasExpanded) {
        currentIds.delete(id);
      } else {
        currentIds.add(id);
      }
    }

    this.expandedIds.set(currentIds);
    this.itemToggled.emit({ id, isExpanded: !wasExpanded });
  }
}
