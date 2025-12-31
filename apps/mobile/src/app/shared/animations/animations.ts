import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

/**
 * Fade in and slide up animation
 * Usage: [@fadeInUp] on element
 */
export const fadeInUp = trigger('fadeInUp', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(20px)' }),
    animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
  ]),
  transition(':leave', [
    animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(20px)' }))
  ])
]);

/**
 * List stagger animation for multiple items
 * Usage: [@listAnimation]="items.length" on container
 */
export const listStagger = trigger('listAnimation', [
  transition('* => *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(15px)' }),
      stagger(50, [
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ], { optional: true })
  ])
]);

/**
 * Slide in/out animation
 * Usage: [@slideInOut] on element
 */
export const slideInOut = trigger('slideInOut', [
  transition(':enter', [
    style({ transform: 'translateX(100%)' }),
    animate('200ms ease-out', style({ transform: 'translateX(0)' }))
  ]),
  transition(':leave', [
    animate('200ms ease-in', style({ transform: 'translateX(-100%)' }))
  ])
]);

/**
 * Fade in animation (simple)
 * Usage: [@fadeIn] on element
 */
export const fadeIn = trigger('fadeIn', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('300ms ease-in', style({ opacity: 1 }))
  ]),
  transition(':leave', [
    animate('200ms ease-out', style({ opacity: 0 }))
  ])
]);

/**
 * Scale animation
 * Usage: [@scaleIn] on element
 */
export const scaleIn = trigger('scaleIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.9)' }),
    animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
  ])
]);
